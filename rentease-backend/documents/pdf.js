'use strict';

const PDFDocument = require('pdfkit');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function peso(value) {
  const amount = Number(value);
  const formatted = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
  return `PHP ${formatted}`;
}

function longDate(value) {
  const text = String(value || '').slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return 'Not recorded';
  return `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}, ${match[1]}`;
}

function longMonth(value) {
  const match = /^(\d{4})-(\d{2})/.exec(String(value || ''));
  if (!match) return 'Not recorded';
  return `${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

function manilaDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return longDate(value);
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function manilaDateTime(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function addressOf(snapshot) {
  return [snapshot.address, snapshot.city].filter(part => String(part || '').trim()).join(', ') || 'Address not recorded';
}

function methodLabel(value) {
  const labels = {
    gcash: 'GCash',
    cash: 'Cash',
    bank_transfer: 'Bank transfer',
    other: 'Other',
  };
  return labels[String(value || '').toLowerCase()] || String(value || 'Not recorded');
}

function leaseStatus(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'pending') {
    return {
      label: 'Awaiting tenant acceptance',
      acceptance: 'The tenant has not accepted this lease in RentEase. It is not fully executed.',
    };
  }
  if (value === 'active') {
    return {
      label: 'Active — accepted in RentEase',
      acceptance: 'The tenant accepted this lease by confirming it in RentEase. No handwritten signature is stored.',
    };
  }
  if (value === 'completed') {
    return {
      label: 'Completed — previously accepted in RentEase',
      acceptance: 'The tenant accepted this lease in RentEase, and the lease has since been completed. No handwritten signature is stored.',
    };
  }
  return {
    label: value ? value : 'Not recorded',
    acceptance: 'No acceptance record is stored for this status.',
  };
}

function billStatus(status) {
  const value = String(status || '').toLowerCase();
  const labels = {
    paid: 'Paid',
    unpaid: 'Unpaid',
    overdue: 'Overdue',
    partially_paid: 'Partially paid',
  };
  return labels[value] || (value ? value.replaceAll('_', ' ') : 'Not recorded');
}

function render(draw) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 48, bottom: 64, left: 48, right: 48 },
      bufferPages: true,
      compress: false,
      info: { Author: 'RentEase', Producer: 'RentEase' },
    });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.on('pageAdded', () => {
      doc.font('Helvetica').fontSize(8).fillColor('#5c6b7e')
        .text('RentEase', 48, 28, { lineBreak: false });
      doc.y = 48;
    });
    draw(doc);
    const range = doc.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
      doc.switchToPage(index);
      const saved = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.font('Helvetica').fontSize(8).fillColor('#5c6b7e').text(
        `RentEase  ·  Page ${index + 1} of ${range.count}`,
        48,
        doc.page.height - 32,
        { width: doc.page.width - 96, align: 'center', lineBreak: false, height: 12 }
      );
      doc.page.margins.bottom = saved;
    }
    doc.end();
  });
}

function contentWidth(doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function ensureSpace(doc, height) {
  if (doc.y + height > doc.page.height - 72) doc.addPage();
}

function heading(doc, title, reference) {
  doc.save();
  doc.rect(0, 0, doc.page.width, 78).fill('#12315c');
  doc.restore();
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18)
    .text('RentEase', 48, 22, { lineBreak: false });
  doc.font('Helvetica').fontSize(9).fillColor('#d6e4f6')
    .text('Property rental records', 48, 46, { lineBreak: false });
  doc.fillColor('#12315c').font('Helvetica-Bold').fontSize(16)
    .text(title, 48, 96, { width: 330, lineBreak: false });
  doc.font('Helvetica').fontSize(9).fillColor('#5c6b7e')
    .text(reference, 390, 100, { width: 157, align: 'right', lineBreak: false });
  doc.y = 124;
}

function section(doc, title) {
  ensureSpace(doc, 36);
  doc.moveDown(0.4);
  doc.fillColor('#12315c').font('Helvetica-Bold').fontSize(12).text(title, { width: contentWidth(doc) });
  const y = doc.y + 2;
  doc.moveTo(48, y).lineTo(doc.page.width - 48, y).strokeColor('#d5deea').lineWidth(1).stroke();
  doc.y = y + 10;
}

function paragraph(doc, text) {
  ensureSpace(doc, 36);
  doc.fillColor('#243246').font('Helvetica').fontSize(10)
    .text(text, 48, doc.y, { width: contentWidth(doc), lineGap: 2 });
  doc.moveDown(0.3);
}

function pair(doc, leftLabel, leftValue, rightLabel, rightValue) {
  const width = (contentWidth(doc) - 16) / 2;
  const left = String(leftValue || 'Not recorded');
  const right = String(rightValue || 'Not recorded');
  doc.font('Helvetica').fontSize(10);
  const leftHeight = doc.heightOfString(left, { width });
  const rightHeight = doc.heightOfString(right, { width });
  const height = 16 + Math.max(leftHeight, rightHeight);
  ensureSpace(doc, height + 8);
  const y = doc.y;
  writeField(doc, leftLabel, left, 48, y, width);
  writeField(doc, rightLabel, right, 48 + width + 16, y, width);
  doc.y = y + height + 8;
}

function writeField(doc, label, value, x, y, width) {
  doc.font('Helvetica').fontSize(8).fillColor('#5c6b7e')
    .text(String(label).toUpperCase(), x, y, { width, lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#1c2b3a')
    .text(String(value), x, y + 12, { width });
}

function table(doc, headers, rows, widths) {
  const draw = (cells, header) => {
    doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
    const heights = cells.map((cell, index) => doc.heightOfString(String(cell), { width: widths[index] - 12 }));
    const height = Math.max(18, ...heights) + 10;
    ensureSpace(doc, height);
    const top = doc.y;
    let x = 48;
    if (header) {
      doc.save();
      doc.rect(48, top, widths.reduce((sum, width) => sum + width, 0), height).fill('#e8eef6');
      doc.restore();
    }
    cells.forEach((cell, index) => {
      doc.fillColor(header ? '#12315c' : '#243246')
        .font(header ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(9)
        .text(String(cell), x + 6, top + 5, { width: widths[index] - 12 });
      x += widths[index];
    });
    doc.moveTo(48, top + height).lineTo(48 + widths.reduce((sum, width) => sum + width, 0), top + height)
      .strokeColor('#d5deea').lineWidth(0.6).stroke();
    doc.y = top + height;
  };
  draw(headers, true);
  rows.forEach(row => draw(row, false));
  doc.moveDown(0.4);
}

async function leaseAgreement(issued, status) {
  const snapshot = issued.snapshot;
  const state = leaseStatus(status);
  const buffer = await render(doc => {
    doc.info.Title = `RentEase Lease Agreement ${snapshot.reference_number}`;
    heading(doc, 'Lease Agreement', snapshot.reference_number);
    pair(doc, 'Date of issuance', manilaDate(issued.issued_at), 'Contract status', state.label);
    section(doc, 'Parties');
    pair(doc, 'Property owner', snapshot.owner_name, 'Tenant', snapshot.tenant_name);
    section(doc, 'Premises');
    pair(doc, 'Property', snapshot.property_name, 'Unit number', snapshot.unit_number);
    paragraph(doc, addressOf(snapshot));
    section(doc, 'Term and charges recorded on the lease');
    table(doc, ['Item', 'Recorded value'], [
      ['Lease start', longDate(snapshot.start_date)],
      ['Lease end', longDate(snapshot.end_date)],
      ['Monthly rent', peso(snapshot.monthly_rent)],
      ['Security deposit', peso(snapshot.security_deposit)],
      ['Advance payment', snapshot.advance_payment == null ? 'No advance payment is stored on this lease.' : peso(snapshot.advance_payment)],
    ], [220, 279]);
    section(doc, 'Payment timing');
    paragraph(doc, 'Monthly rent is billed by the property owner in RentEase. Each billing statement carries its own due date. This lease record does not store a separate standing due day.');
    paragraph(doc, 'The security deposit above is the amount saved on the lease. It is not proof that the deposit has been paid. Deposit payments are recorded separately and count only after the owner verifies them.');
    section(doc, 'What this record covers');
    paragraph(doc, 'This agreement copies the lease saved in RentEase: the parties, premises, dates, monthly rent, and security deposit shown above. It does not add obligations, house rules, or penalties that were not stored with the lease.');
    section(doc, 'Acceptance');
    pair(doc, 'Owner record', snapshot.owner_name, 'How the owner is recorded', 'The owner prepared this lease in RentEase. No signature image is stored.');
    pair(doc, 'Tenant record', snapshot.tenant_name, 'Tenant acceptance', state.acceptance);
    paragraph(doc, 'A blank signature line is not shown because RentEase does not store handwritten signatures. Acceptance is the tenant confirmation recorded on the lease.');
  });
  return buffer;
}

async function billingStatement(issued, live) {
  const snapshot = issued.snapshot;
  const buffer = await render(doc => {
    doc.info.Title = `RentEase Billing Statement ${snapshot.reference_number}`;
    heading(doc, 'Billing Statement', snapshot.reference_number);
    pair(doc, 'Date issued', manilaDate(issued.issued_at), 'Payment due date', longDate(snapshot.due_date));
    section(doc, 'Issued by and billed to');
    pair(doc, 'Property owner', snapshot.owner_name, 'Tenant', snapshot.tenant_name);
    pair(doc, 'Property', snapshot.property_name, 'Unit number', snapshot.unit_number);
    paragraph(doc, addressOf(snapshot));
    pair(doc, 'Billing period', longMonth(snapshot.billing_period), 'Lease reference', `Lease #${snapshot.lease_id}`);
    section(doc, 'Charges issued');
    table(doc, ['Description', 'Amount'], [
      [`Monthly rent for ${longMonth(snapshot.billing_period)}`, peso(snapshot.rent_amount)],
      ['Water', peso(snapshot.water_charge)],
      ['Electricity', peso(snapshot.electricity_charge)],
      ['Other charges', peso(snapshot.other_charges)],
      ['Discounts or adjustments', snapshot.discount_amount ? peso(snapshot.discount_amount) : 'None recorded'],
      ['Earlier outstanding balance on this lease', peso(snapshot.previous_outstanding)],
    ], [340, 159]);
    ensureSpace(doc, 48);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#12315c')
      .text(`Total amount due when issued: ${peso(snapshot.amount_due_at_issue)}`, 48, doc.y, { width: contentWidth(doc) });
    doc.moveDown(0.6);
    section(doc, 'Payment status');
    pair(doc, 'Status of this bill', billStatus(live.status), 'Verified payments on this bill', peso(live.verified));
    pair(doc, 'Bill charges', peso(snapshot.total_charges), 'Remaining balance of this bill', peso(live.balance));
    paragraph(doc, 'The charge lines above stay as they were when this statement was first prepared. The payment status uses verified payments recorded in RentEase when this file is opened. A pending or rejected submission is not treated as paid.');
    section(doc, 'How to pay');
    paragraph(doc, 'Pay from Billing in RentEase. Cash, GCash, bank transfer, and other methods can be submitted for the property owner to verify. Online checkout is available only when it has been enabled. This statement does not add a bank account or a payment reference that was not saved with the bill.');
    paragraph(doc, 'A payment receipt is issued only after a payment is verified. This page is a billing statement, not a receipt.');
  });
  return buffer;
}

async function paymentReceipt(issued) {
  const snapshot = issued.snapshot;
  const buffer = await render(doc => {
    doc.info.Title = `RentEase Payment Receipt ${snapshot.reference_number}`;
    heading(doc, 'Payment Receipt', snapshot.reference_number);
    pair(doc, 'Receipt status', 'Verified payment', 'Verified on', manilaDateTime(snapshot.verified_at));
    section(doc, 'Payment received');
    ensureSpace(doc, 42);
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#12315c')
      .text(peso(snapshot.amount), 48, doc.y, { width: contentWidth(doc) });
    doc.moveDown(0.5);
    paragraph(doc, 'This receipt covers only the verified amount above. It is not a receipt for any pending, failed, or rejected transaction.');
    section(doc, 'Parties and premises');
    pair(doc, 'Property owner', snapshot.owner_name, 'Tenant', snapshot.tenant_name);
    pair(doc, 'Property', snapshot.property_name, 'Unit number', snapshot.unit_number);
    paragraph(doc, addressOf(snapshot));
    section(doc, 'Transaction');
    table(doc, ['Item', 'Recorded value'], [
      ['Payment method', methodLabel(snapshot.payment_method)],
      ['Transaction reference', snapshot.reference_code || 'None recorded'],
      ['Payment date', manilaDateTime(snapshot.payment_date)],
      ['Applied to statement', snapshot.bill_reference_number],
      ['Billing period', longMonth(snapshot.billing_period)],
      ['Statement charges', peso(snapshot.bill_total)],
      ['Verified on this bill before this receipt', peso(snapshot.verified_before)],
      ['Balance of this bill after this payment', peso(snapshot.outstanding_after)],
    ], [250, 249]);
    paragraph(doc, snapshot.outstanding_after > 0
      ? 'This payment did not clear the whole bill. The balance above is what remained on this bill after this verified amount.'
      : 'After this verified amount, no balance remained on this bill.');
  });
  return buffer;
}

module.exports = { leaseAgreement, billingStatement, paymentReceipt };
