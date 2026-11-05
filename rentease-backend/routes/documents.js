'use strict';

const express = require('express');
const pool = require('../db');
const { ensureLease, ensureBill, ensureReceipt } = require('../documents/issue');
const { leaseAgreement, billingStatement, paymentReceipt } = require('../documents/pdf');

const router = express.Router();
const validId = value => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;

async function authenticated(req, res, next) {
  if (!validId(req.session?.user?.id)) {
    return res.status(401).json({ success: false, message: 'Please sign in.' });
  }
  try {
    const result = await pool.query(
      'SELECT user_id, role, account_status FROM app_users WHERE user_id = $1',
      [req.session.user.id]
    );
    const user = result.rows[0];
    if (!user || String(user.account_status).toLowerCase() !== 'active' || user.role !== req.session.user.role) {
      return res.status(403).json({ success: false, message: 'Please sign in again.' });
    }
    req.actor = { id: Number(user.user_id), role: user.role };
    next();
  } catch (error) {
    next(error);
  }
}

function wantsDownload(req) {
  return String(req.query.download || '') === '1';
}

function sendPdf(res, buffer, filename, download) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${filename}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(buffer);
}

function audit(req, resource, id) {
  const descriptions = {
    lease: 'A lease agreement PDF was opened.',
    bill: 'A billing statement PDF was opened.',
    receipt: 'A verified payment receipt PDF was opened.',
  };
  void pool.query(
    `INSERT INTO security_audit_events
     (event_type, outcome, actor_user_id, actor_role, description, ip_address, target_resource_type, target_resource_id)
     VALUES ('DOCUMENT_ACCESSED', 'success', $1, $2, $3, $4, $5, $6)`,
    [
      req.actor.id,
      req.actor.role,
      descriptions[resource],
      String(req.ip || req.socket?.remoteAddress || '').slice(0, 64),
      resource,
      id,
    ]
  ).catch(error => console.error('[Audit] Document access was not recorded:', error.message));
}

router.use(authenticated);

router.get('/documents/leases/:id', async (req, res, next) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Choose a lease record.' });
  const client = await pool.connect();
  let issued = null;
  let status = '';
  try {
    await client.query('BEGIN');
    const access = await client.query(
      `SELECT l.lease_id, LOWER(l.status) AS status
       FROM leases l
       JOIN units u ON u.unit_id = l.unit_id
       JOIN properties p ON p.property_id = u.property_id
       WHERE l.lease_id = $1
         AND ($2 = 'admin' OR ($2 = 'owner' AND p.owner_id = $3) OR ($2 = 'tenant' AND l.tenant_id = $3))`,
      [req.params.id, req.actor.role, req.actor.id]
    );
    if (!access.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Lease document not found.' });
    }
    status = access.rows[0].status;
    issued = await ensureLease(client, Number(req.params.id));
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
  if (!issued) return res.status(404).json({ success: false, message: 'Lease document not found.' });
  try {
    const pdf = await leaseAgreement(issued, status);
    audit(req, 'lease', Number(req.params.id));
    return sendPdf(res, pdf, `RentEase-Lease-Agreement-${issued.reference_number}.pdf`, wantsDownload(req));
  } catch (error) {
    return next(error);
  }
});

router.get('/documents/bills/:id', async (req, res, next) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Choose a billing record.' });
  const client = await pool.connect();
  let issued = null;
  let live = null;
  try {
    await client.query('BEGIN');
    const access = await client.query(
      `SELECT b.bill_id,
              (b.rent_amount + COALESCE(b.water_charge,0) + COALESCE(b.electricity_charge,0) + COALESCE(b.other_charges,0)) AS total_amount,
              COALESCE((SELECT SUM(py.amount) FROM payments py WHERE py.bill_id = b.bill_id AND py.status = 'verified'), 0) AS verified_amount,
              CASE
                WHEN (b.rent_amount + COALESCE(b.water_charge,0) + COALESCE(b.electricity_charge,0) + COALESCE(b.other_charges,0))
                     - COALESCE((SELECT SUM(py.amount) FROM payments py WHERE py.bill_id = b.bill_id AND py.status = 'verified'), 0) <= 0 THEN 'paid'
                WHEN b.due_date < CURRENT_DATE THEN 'overdue'
                WHEN COALESCE((SELECT SUM(py.amount) FROM payments py WHERE py.bill_id = b.bill_id AND py.status = 'verified'), 0) > 0 THEN 'partially_paid'
                ELSE b.status
              END AS status
       FROM billing b
       JOIN leases l ON l.lease_id = b.lease_id
       JOIN units u ON u.unit_id = l.unit_id
       JOIN properties p ON p.property_id = u.property_id
       WHERE b.bill_id = $1
         AND ($2 = 'admin' OR ($2 = 'owner' AND p.owner_id = $3) OR ($2 = 'tenant' AND l.tenant_id = $3))`,
      [req.params.id, req.actor.role, req.actor.id]
    );
    if (!access.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Billing document not found.' });
    }
    const row = access.rows[0];
    const verified = Number(row.verified_amount);
    const total = Number(row.total_amount);
    live = { status: row.status, verified, balance: Math.max(0, Number((total - verified).toFixed(2))) };
    issued = await ensureBill(client, Number(req.params.id));
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
  if (!issued) return res.status(404).json({ success: false, message: 'Billing document not found.' });
  try {
    const pdf = await billingStatement(issued, live);
    audit(req, 'bill', Number(req.params.id));
    return sendPdf(res, pdf, `RentEase-Billing-Statement-${issued.reference_number}.pdf`, wantsDownload(req));
  } catch (error) {
    return next(error);
  }
});

router.get('/documents/payments/:id', async (req, res, next) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Choose a payment record.' });
  const client = await pool.connect();
  let issued = null;
  try {
    await client.query('BEGIN');
    const access = await client.query(
      `SELECT py.payment_id, LOWER(py.status) AS status
       FROM payments py
       JOIN billing b ON b.bill_id = py.bill_id
       JOIN leases l ON l.lease_id = b.lease_id
       JOIN units u ON u.unit_id = l.unit_id
       JOIN properties p ON p.property_id = u.property_id
       WHERE py.payment_id = $1
         AND ($2 = 'admin' OR ($2 = 'owner' AND p.owner_id = $3) OR ($2 = 'tenant' AND l.tenant_id = $3))`,
      [req.params.id, req.actor.role, req.actor.id]
    );
    if (!access.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Payment document not found.' });
    }
    if (access.rows[0].status !== 'verified') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'A receipt is available only after this payment is verified.',
      });
    }
    issued = await ensureReceipt(client, Number(req.params.id));
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
  if (!issued) {
    return res.status(409).json({
      success: false,
      message: 'A receipt is available only after this payment is verified.',
    });
  }
  try {
    const pdf = await paymentReceipt(issued);
    audit(req, 'receipt', Number(req.params.id));
    return sendPdf(res, pdf, `RentEase-Payment-Receipt-${issued.reference_number}.pdf`, wantsDownload(req));
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
