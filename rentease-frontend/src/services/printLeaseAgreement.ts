import type { RentalLease } from './leases';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[character] || character));
}

function peso(value: string | number | null): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function printLeaseAgreement(lease: RentalLease, targetWindow?: Window | null): void {
  const printWindow = targetWindow || window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Allow pop-ups to generate the lease contract PDF.');
  }

  const tenant = escapeHtml(lease.tenant_name || 'Tenant');
  const owner = escapeHtml(lease.owner_name || 'Property Owner');
  const property = escapeHtml(lease.property_name || 'Rental Property');
  const unit = escapeHtml(`Unit ${lease.unit_number}`);
  const start = escapeHtml(lease.start_date);
  const end = escapeHtml(lease.end_date);
  const leaseId = escapeHtml(String(lease.lease_id));

  printWindow.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>RentEase Lease Contract #${leaseId}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body { color: #172b4d; font: 13px/1.6 Arial, sans-serif; margin: 0; }
    header { border-bottom: 3px solid #176cc9; margin-bottom: 24px; padding-bottom: 14px; }
    .brand { color: #1452a0; font-size: 24px; font-weight: 800; letter-spacing: .5px; }
    .subtle { color: #657895; font-size: 11px; }
    h1 { font-size: 21px; margin: 22px 0 4px; text-align: center; text-transform: uppercase; }
    h2 { border-bottom: 1px solid #d5e0ef; color: #1452a0; font-size: 14px; margin: 22px 0 10px; padding-bottom: 5px; }
    p { margin: 7px 0; }
    .meta { display: flex; justify-content: space-between; gap: 20px; }
    .summary { background: #f2f7fd; border: 1px solid #d6e5f7; border-radius: 6px; margin: 16px 0; padding: 12px 15px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 26px; }
    .label { color: #657895; display: block; font-size: 10px; text-transform: uppercase; }
    .value { font-weight: 700; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 45px; margin-top: 55px; }
    .signature { border-top: 1px solid #172b4d; padding-top: 7px; }
    footer { border-top: 1px solid #d5e0ef; color: #657895; font-size: 10px; margin-top: 40px; padding-top: 9px; text-align: center; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <header><div class="brand">RentEase</div><div class="subtle">Digital Rental Management Platform</div></header>
  <div class="meta"><span>Lease Contract No. ${leaseId}</span><span>Status: ${escapeHtml(lease.status)}</span></div>
  <h1>Residential Lease Agreement</h1>
  <p>This Residential Lease Agreement is entered into by and between the property owner and tenant identified below. Both parties agree to the rental terms recorded in RentEase.</p>
  <h2>1. Parties and Premises</h2>
  <div class="summary grid">
    <div><span class="label">Property Owner</span><span class="value">${owner}</span></div>
    <div><span class="label">Tenant</span><span class="value">${tenant}</span></div>
    <div><span class="label">Property</span><span class="value">${property}</span></div>
    <div><span class="label">Rental Unit</span><span class="value">${unit}</span></div>
  </div>
  <h2>2. Financial Terms</h2>
  <div class="summary grid">
    <div><span class="label">Monthly Rent</span><span class="value">${peso(lease.monthly_rent)}</span></div>
    <div><span class="label">Security Deposit</span><span class="value">${peso(lease.security_deposit)}</span></div>
  </div>
  <h2>3. Lease Period</h2>
  <p>The lease begins on <strong>${start}</strong> and ends on <strong>${end}</strong>, unless ended earlier or extended by a written agreement between the parties.</p>
  <h2>4. General Terms</h2>
  <p>The tenant agrees to pay rent on time, use the premises for lawful residential purposes, keep the unit in good condition, and report maintenance concerns through RentEase. The owner agrees to provide the tenant peaceful use of the premises subject to this agreement and applicable law.</p>
  <p>The security deposit will be handled and returned or applied according to the agreed rental terms and applicable Philippine law. Changes to this agreement should be recorded in writing and acknowledged by both parties.</p>
  <h2>5. Digital Acknowledgment</h2>
  <p>By confirming this lease in RentEase, the tenant acknowledges that they reviewed the terms above and accepted this digital rental agreement. This document is a generated copy of the lease record stored in RentEase.</p>
  <div class="signatures">
    <div class="signature"><strong>${tenant}</strong><br><span class="subtle">Tenant signature / digital acknowledgment<br>Date: ____________________</span></div>
    <div class="signature"><strong>${owner}</strong><br><span class="subtle">Property owner signature<br>Date: ____________________</span></div>
  </div>
  <footer>Generated by RentEase · Lease Contract #${leaseId} · Keep this document for your records.</footer>
</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
}
