'use strict';

const money = value => Number(Number(value || 0).toFixed(2));

function reference(prefix, id) {
  return `RE-${prefix}-${String(id).padStart(6, '0')}`;
}

const leaseFacts = `
  SELECT l.lease_id,
         TO_CHAR(l.start_date, 'YYYY-MM-DD') AS start_date,
         TO_CHAR(l.end_date, 'YYYY-MM-DD') AS end_date,
         l.monthly_rent,
         l.security_deposit,
         l.status,
         t.full_name AS tenant_name,
         o.full_name AS owner_name,
         p.property_name,
         p.address,
         p.city,
         u.unit_number
  FROM leases l
  JOIN app_users t ON t.user_id = l.tenant_id
  JOIN units u ON u.unit_id = l.unit_id
  JOIN properties p ON p.property_id = u.property_id
  JOIN app_users o ON o.user_id = p.owner_id
  WHERE l.lease_id = $1`;

function leaseSnapshot(row) {
  return {
    lease_id: Number(row.lease_id),
    reference_number: reference('LA', row.lease_id),
    owner_name: row.owner_name,
    tenant_name: row.tenant_name,
    property_name: row.property_name,
    address: row.address || '',
    city: row.city || '',
    unit_number: row.unit_number,
    start_date: row.start_date,
    end_date: row.end_date,
    monthly_rent: money(row.monthly_rent),
    security_deposit: money(row.security_deposit),
    advance_payment: null,
  };
}

async function freezeLease(client, leaseId) {
  const found = await client.query(leaseFacts, [leaseId]);
  const row = found.rows[0];
  if (!row) return null;
  const snapshot = leaseSnapshot(row);
  await client.query(
    `INSERT INTO issued_documents(document_type, source_id, reference_number, snapshot)
     VALUES ('lease_agreement', $1, $2, $3::jsonb)
     ON CONFLICT (document_type, source_id) DO NOTHING`,
    [leaseId, snapshot.reference_number, JSON.stringify(snapshot)]
  );
  return snapshot.reference_number;
}

async function readIssued(client, type, sourceId) {
  const result = await client.query(
    `SELECT reference_number, snapshot, issued_at
     FROM issued_documents
     WHERE document_type = $1 AND source_id = $2`,
    [type, sourceId]
  );
  return result.rows[0] || null;
}

async function ensureLease(client, leaseId) {
  const existing = await readIssued(client, 'lease_agreement', leaseId);
  if (existing) return existing;
  await freezeLease(client, leaseId);
  return readIssued(client, 'lease_agreement', leaseId);
}

async function freezeBill(client, billId) {
  const found = await client.query(
    `SELECT b.bill_id, b.lease_id,
            TO_CHAR(b.billing_period, 'YYYY-MM-DD') AS billing_period,
            TO_CHAR(b.due_date, 'YYYY-MM-DD') AS due_date,
            b.rent_amount, b.water_charge, b.electricity_charge, b.other_charges,
            t.full_name AS tenant_name,
            o.full_name AS owner_name,
            p.property_name, p.address, p.city, u.unit_number
     FROM billing b
     JOIN leases l ON l.lease_id = b.lease_id
     JOIN app_users t ON t.user_id = l.tenant_id
     JOIN units u ON u.unit_id = l.unit_id
     JOIN properties p ON p.property_id = u.property_id
     JOIN app_users o ON o.user_id = p.owner_id
     WHERE b.bill_id = $1`,
    [billId]
  );
  const row = found.rows[0];
  if (!row) return null;
  const earlier = await client.query(
    `SELECT COALESCE(SUM(GREATEST(
        (b.rent_amount + COALESCE(b.water_charge,0) + COALESCE(b.electricity_charge,0) + COALESCE(b.other_charges,0))
        - COALESCE((SELECT SUM(py.amount) FROM payments py WHERE py.bill_id = b.bill_id AND py.status = 'verified'), 0),
      0)), 0) AS balance
     FROM billing b
     WHERE b.lease_id = $1 AND b.bill_id <> $2 AND b.billing_period < $3::date`,
    [row.lease_id, row.bill_id, row.billing_period]
  );
  const rent = money(row.rent_amount);
  const water = money(row.water_charge);
  const electricity = money(row.electricity_charge);
  const other = money(row.other_charges);
  const charges = money(rent + water + electricity + other);
  const previous = money(earlier.rows[0].balance);
  const snapshot = {
    bill_id: Number(row.bill_id),
    lease_id: Number(row.lease_id),
    reference_number: reference('BS', row.bill_id),
    owner_name: row.owner_name,
    tenant_name: row.tenant_name,
    property_name: row.property_name,
    address: row.address || '',
    city: row.city || '',
    unit_number: row.unit_number,
    billing_period: row.billing_period,
    due_date: row.due_date,
    rent_amount: rent,
    water_charge: water,
    electricity_charge: electricity,
    other_charges: other,
    discount_amount: 0,
    previous_outstanding: previous,
    total_charges: charges,
    amount_due_at_issue: money(charges + previous),
  };
  await client.query(
    `INSERT INTO issued_documents(document_type, source_id, reference_number, snapshot)
     VALUES ('billing_statement', $1, $2, $3::jsonb)
     ON CONFLICT (document_type, source_id) DO NOTHING`,
    [billId, snapshot.reference_number, JSON.stringify(snapshot)]
  );
  return snapshot.reference_number;
}

async function ensureBill(client, billId) {
  const existing = await readIssued(client, 'billing_statement', billId);
  if (existing) return existing;
  await freezeBill(client, billId);
  return readIssued(client, 'billing_statement', billId);
}

async function freezeReceipt(client, paymentId) {
  const found = await client.query(
    `SELECT py.payment_id, py.bill_id, py.amount, py.payment_method, py.reference_number,
            py.status, py.payment_date, py.verified_at,
            TO_CHAR(b.billing_period, 'YYYY-MM-DD') AS billing_period,
            (b.rent_amount + COALESCE(b.water_charge,0) + COALESCE(b.electricity_charge,0) + COALESCE(b.other_charges,0)) AS bill_total,
            t.full_name AS tenant_name,
            o.full_name AS owner_name,
            p.property_name, p.address, p.city, u.unit_number
     FROM payments py
     JOIN billing b ON b.bill_id = py.bill_id
     JOIN leases l ON l.lease_id = b.lease_id
     JOIN app_users t ON t.user_id = l.tenant_id
     JOIN units u ON u.unit_id = l.unit_id
     JOIN properties p ON p.property_id = u.property_id
     JOIN app_users o ON o.user_id = p.owner_id
     WHERE py.payment_id = $1`,
    [paymentId]
  );
  const row = found.rows[0];
  if (!row || String(row.status).toLowerCase() !== 'verified') return null;
  const prior = await client.query(
    `SELECT COALESCE(SUM(amount), 0) AS amount
     FROM payments
     WHERE bill_id = $1 AND status = 'verified' AND payment_id <> $2
       AND (
         verified_at < $3
         OR (verified_at = $3 AND payment_id < $2)
         OR (verified_at IS NULL AND $3 IS NOT NULL AND payment_id < $2)
       )`,
    [row.bill_id, row.payment_id, row.verified_at]
  );
  const amount = money(row.amount);
  const billTotal = money(row.bill_total);
  const verifiedBefore = money(prior.rows[0].amount);
  const snapshot = {
    payment_id: Number(row.payment_id),
    bill_id: Number(row.bill_id),
    reference_number: reference('PR', row.payment_id),
    bill_reference_number: reference('BS', row.bill_id),
    owner_name: row.owner_name,
    tenant_name: row.tenant_name,
    property_name: row.property_name,
    address: row.address || '',
    city: row.city || '',
    unit_number: row.unit_number,
    billing_period: row.billing_period,
    amount,
    payment_method: row.payment_method,
    reference_code: row.reference_number || '',
    payment_date: row.payment_date,
    verified_at: row.verified_at,
    bill_total: billTotal,
    verified_before: verifiedBefore,
    outstanding_after: money(Math.max(0, billTotal - verifiedBefore - amount)),
  };
  await client.query(
    `INSERT INTO issued_documents(document_type, source_id, reference_number, snapshot)
     VALUES ('payment_receipt', $1, $2, $3::jsonb)
     ON CONFLICT (document_type, source_id) DO NOTHING`,
    [paymentId, snapshot.reference_number, JSON.stringify(snapshot)]
  );
  return snapshot.reference_number;
}

async function ensureReceipt(client, paymentId) {
  const existing = await readIssued(client, 'payment_receipt', paymentId);
  if (existing) return existing;
  const created = await freezeReceipt(client, paymentId);
  if (!created) return null;
  return readIssued(client, 'payment_receipt', paymentId);
}

module.exports = {
  freezeLease,
  freezeBill,
  freezeReceipt,
  ensureLease,
  ensureBill,
  ensureReceipt,
};
