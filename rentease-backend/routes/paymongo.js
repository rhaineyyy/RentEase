'use strict';

const crypto = require('crypto');
const express = require('express');
const pool = require('../db');
const { freezeReceipt } = require('../documents/issue');

const router = express.Router();
const validId = value => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;

function gatewayConfig() {
  const secret = process.env.PAYMONGO_SECRET_KEY?.trim() || '';
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET?.trim() || '';
  return {
    secret,
    webhookSecret,
    live: secret.startsWith('sk_live_'),
    enabled: secret.startsWith('sk_test_') || secret.startsWith('sk_live_'),
  };
}

function publicUrl() {
  return (process.env.APP_PUBLIC_URL || 'http://localhost:8100').replace(/\/$/, '');
}

async function authenticatedTenant(req, res, next) {
  const id = req.session?.user?.id;
  if (!validId(id)) return res.status(401).json({ success: false, message: 'Please sign in.' });
  try {
    const { rows } = await pool.query(
      'SELECT user_id, role, account_status, full_name, email FROM app_users WHERE user_id = $1',
      [id]
    );
    const user = rows[0];
    if (!user || String(user.account_status).toLowerCase() !== 'active' || user.role !== 'tenant' || req.session.user.role !== 'tenant') {
      return res.status(403).json({ success: false, message: 'An active tenant account is required.' });
    }
    req.currentUser = user;
    next();
  } catch (error) {
    next(error);
  }
}

function paymentMethod(sourceType) {
  const source = String(sourceType || '').toLowerCase();
  if (source === 'gcash') return 'gcash';
  if (source === 'dob' || source === 'brankas') return 'bank_transfer';
  return 'other';
}

router.post('/payments/checkout', authenticatedTenant, async (req, res, next) => {
  const config = gatewayConfig();
  if (!config.enabled) {
    return res.status(503).json({
      success: false,
      message: 'Online payment is not configured yet. Submit the payment for owner verification instead.',
    });
  }

  const billId = req.body?.bill_id;
  const amount = Number(req.body?.amount);
  if (!validId(billId) || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Choose a bill and a positive amount.' });
  }

  const centavos = Math.round(amount * 100);
  if (centavos < 100 || Math.abs(centavos - amount * 100) > 0.001) {
    return res.status(400).json({ success: false, message: 'Enter a valid peso amount with at most two decimal places.' });
  }

  const reference = `RE${billId}T${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`.slice(0, 80);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bill = await client.query(
      `SELECT b.bill_id,
              (b.rent_amount + COALESCE(b.water_charge,0) + COALESCE(b.electricity_charge,0) + COALESCE(b.other_charges,0)) AS total_amount,
              COALESCE((SELECT SUM(py.amount) FROM payments py WHERE py.bill_id = b.bill_id AND py.status = 'verified'), 0) AS verified_amount,
              l.tenant_id
       FROM billing b
       JOIN leases l ON l.lease_id = b.lease_id
       WHERE b.bill_id = $1
       FOR UPDATE OF b`,
      [billId]
    );
    const row = bill.rows[0];
    if (!row || Number(row.tenant_id) !== Number(req.currentUser.user_id)) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Bill not found.' });
    }
    const outstanding = Number(row.total_amount) - Number(row.verified_amount);
    if (outstanding <= 0 || amount > outstanding + 0.001) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'That amount is more than the unpaid balance.' });
    }

    const created = await client.query(
      `INSERT INTO payments(bill_id, amount, payment_method, reference_number, status, gateway_provider, gateway_status)
       VALUES ($1, $2, 'other', $3, 'pending_gateway', 'paymongo', 'pending')
       RETURNING payment_id`,
      [billId, amount.toFixed(2), reference]
    );
    const paymentId = created.rows[0].payment_id;
    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.secret}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            billing: { name: req.currentUser.full_name, email: req.currentUser.email },
            send_email_receipt: false,
            show_description: true,
            show_line_items: true,
            reference_number: reference,
            description: `RentEase bill #${billId}`,
            line_items: [{
              currency: 'PHP',
              amount: centavos,
              name: `RentEase bill #${billId}`,
              quantity: 1,
            }],
            payment_method_types: ['gcash', 'paymaya', 'card', 'dob'],
            success_url: `${publicUrl()}/tenant?payment=processing`,
            cancel_url: `${publicUrl()}/tenant?payment=cancelled`,
            metadata: { payment_id: String(paymentId), bill_id: String(billId) },
          },
        },
      }),
      signal: AbortSignal.timeout(20000),
    });
    const payload = await response.json().catch(() => ({}));
    const checkout = payload?.data;
    if (!response.ok || !checkout?.id || !checkout?.attributes?.checkout_url) {
      await client.query('ROLLBACK');
      return res.status(502).json({ success: false, message: 'The payment service did not start a checkout. No payment was recorded.' });
    }
    await client.query(
      `UPDATE payments SET gateway_checkout_id = $2, gateway_status = 'awaiting_payment' WHERE payment_id = $1`,
      [paymentId, checkout.id]
    );
    await client.query('COMMIT');
    return res.status(201).json({
      success: true,
      checkout_url: checkout.attributes.checkout_url,
      reference,
      message: 'Complete the payment with the provider. RentEase updates the bill only after the provider confirms it.',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
});

function signatureMatches(rawBody, header, secret, live) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(String(header).split(',').map(part => {
    const index = part.indexOf('=');
    return [part.slice(0, index).trim(), part.slice(index + 1).trim()];
  }));
  const given = live ? parts.li : parts.te;
  if (!parts.t || !given || !/^\d+$/.test(parts.t)) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(parts.t));
  if (age > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex');
  const left = Buffer.from(expected);
  const right = Buffer.from(given);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function webhook(req, res) {
  const config = gatewayConfig();
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  if (!config.enabled || !config.webhookSecret || !signatureMatches(rawBody, req.get('paymongo-signature'), config.webhookSecret, config.live)) {
    return res.status(401).json({ success: false, message: 'Webhook signature was rejected.' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid webhook payload.' });
  }

  const eventId = event?.data?.id;
  const eventType = event?.data?.attributes?.type;
  const resource = event?.data?.attributes?.data;
  if (!eventId || !eventType || !resource) return res.status(400).json({ success: false, message: 'Incomplete webhook event.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const seen = await client.query(
      `INSERT INTO payment_gateway_events(event_id, event_type) VALUES ($1, $2) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
      [eventId, eventType]
    );
    if (!seen.rows.length) {
      await client.query('COMMIT');
      return res.json({ success: true, duplicate: true });
    }

    const attributes = resource.attributes || {};
    const metadata = attributes.metadata || {};
    const paymentId = validId(metadata.payment_id) ? Number(metadata.payment_id) : null;
    const checkoutId = eventType.startsWith('checkout_session') ? resource.id : attributes.checkout_session_id || null;
    const found = await client.query(
      `SELECT payment_id, bill_id, amount, status
       FROM payments
       WHERE ($1::int IS NOT NULL AND payment_id = $1)
          OR ($2::text IS NOT NULL AND gateway_checkout_id = $2)
       ORDER BY payment_id DESC
       LIMIT 1
       FOR UPDATE`,
      [paymentId, checkoutId]
    );
    const payment = found.rows[0];
    if (!payment) {
      await client.query('COMMIT');
      return res.json({ success: true, ignored: true });
    }
    await client.query('UPDATE payment_gateway_events SET payment_id = $2 WHERE event_id = $1', [eventId, payment.payment_id]);

    const paid = eventType.endsWith('payment.paid') || attributes.status === 'paid';
    const failed = eventType.endsWith('payment.failed') || attributes.status === 'failed';
    const sourceType = attributes.payments?.[0]?.attributes?.source?.type || attributes.source?.type;

    if (paid && payment.status !== 'verified') {
      const bill = await client.query(
        `SELECT b.bill_id,
                (b.rent_amount + COALESCE(b.water_charge,0) + COALESCE(b.electricity_charge,0) + COALESCE(b.other_charges,0)) AS total_amount,
                COALESCE((SELECT SUM(py.amount) FROM payments py WHERE py.bill_id = b.bill_id AND py.status = 'verified'), 0) AS verified_amount
         FROM billing b WHERE b.bill_id = $1 FOR UPDATE`,
        [payment.bill_id]
      );
      const outstanding = Number(bill.rows[0].total_amount) - Number(bill.rows[0].verified_amount);
      if (Number(payment.amount) > outstanding + 0.001) {
        await client.query(
          `UPDATE payments SET status = 'failed', gateway_status = 'amount_mismatch', gateway_checkout_id = COALESCE(gateway_checkout_id, $2) WHERE payment_id = $1`,
          [payment.payment_id, checkoutId]
        );
      } else {
        await client.query(
          `UPDATE payments
           SET status = 'verified', gateway_status = 'paid', payment_method = $2,
               gateway_checkout_id = COALESCE(gateway_checkout_id, $3), verified_at = NOW()
           WHERE payment_id = $1`,
          [payment.payment_id, paymentMethod(sourceType), checkoutId]
        );
        const sums = await client.query(
          `SELECT COALESCE(SUM(amount), 0) AS amount FROM payments WHERE bill_id = $1 AND status = 'verified'`,
          [payment.bill_id]
        );
        const total = Number(bill.rows[0].total_amount);
        const paidAmount = Number(sums.rows[0].amount);
        const nextStatus = paidAmount >= total - 0.001 ? 'paid' : paidAmount > 0 ? 'partially_paid' : 'unpaid';
        await client.query('UPDATE billing SET status = $1 WHERE bill_id = $2', [nextStatus, payment.bill_id]);
        await freezeReceipt(client, payment.payment_id);
      }
    } else if (failed && payment.status === 'pending_gateway') {
      await client.query(
        `UPDATE payments SET status = 'failed', gateway_status = 'failed', gateway_checkout_id = COALESCE(gateway_checkout_id, $2) WHERE payment_id = $1`,
        [payment.payment_id, checkoutId]
      );
    }

    await client.query('COMMIT');
    return res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('PayMongo webhook failed:', error.message);
    return res.status(500).json({ success: false, message: 'Webhook could not be stored.' });
  } finally {
    client.release();
  }
}

module.exports = { router, webhook };
