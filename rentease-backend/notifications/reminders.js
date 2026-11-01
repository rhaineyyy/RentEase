// No provider calls here. Durable uniqueness protects overlapping worker runs.
'use strict';
const reminderSQL = `
WITH clock AS (
 SELECT (now() AT TIME ZONE 'Asia/Manila')::date AS today,
 EXTRACT(HOUR FROM now() AT TIME ZONE 'Asia/Manila') AS hour
), events AS (
 SELECT l.tenant_id AS recipient_id,b.bill_id AS resource_id,
 'rent_reminder' AS event_type,'Rent payment reminder' AS subject,
 'RentEase: Bill #'||b.bill_id||' is due '||to_char(b.due_date,'YYYY-MM-DD')||
 '. Please check your outstanding balance in the app.' AS body,
 'rent:'||b.bill_id||':'||b.due_date||':'||c.today AS event_key
 FROM public.billing b JOIN public.leases l ON l.lease_id=b.lease_id CROSS JOIN clock c
 WHERE c.hour>=9 AND lower(l.status)='active' AND lower(b.status) IN ('unpaid','partially_paid','overdue')
 AND b.due_date IN (c.today,c.today+3)
 AND b.rent_amount+COALESCE(b.water_charge,0)+COALESCE(b.electricity_charge,0)+COALESCE(b.other_charges,0)
 > COALESCE((SELECT SUM(py.amount) FROM public.payments py WHERE py.bill_id=b.bill_id AND py.status='verified'),0)
 UNION ALL
 SELECT l.tenant_id,l.lease_id,'lease_expiration','Lease end reminder',
 'RentEase: Lease #'||l.lease_id||' ends '||to_char(l.end_date,'YYYY-MM-DD')||
 '. Contact your property owner for next steps.',
 'lease:'||l.lease_id||':'||l.end_date||':'||c.today
 FROM public.leases l CROSS JOIN clock c
 WHERE c.hour>=9 AND lower(l.status)='active' AND l.end_date IN (c.today,c.today+7)
)
INSERT INTO public.notification_outbox(recipient_id,channel,event_type,resource_id,subject,body,dedupe_key)
SELECT e.recipient_id,ch,e.event_type,e.resource_id,e.subject,e.body,e.event_key||':'||ch
FROM events e JOIN public.app_users u ON u.user_id=e.recipient_id
CROSS JOIN unnest(ARRAY['sms','email']) AS ch
WHERE lower(u.account_status)='active'
ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
RETURNING notification_id`;
// Recheck before dispatch: queued reminders must not outlive payment/lease changes.
async function eligible(pool, job) {
 if(!['rent_reminder','lease_expiration'].includes(job.event_type)) return true;
 const {rows}=await pool.query(`SELECT EXISTS (
 SELECT 1 FROM public.leases l CROSS JOIN (SELECT (now() AT TIME ZONE 'Asia/Manila')::date AS today) c
 WHERE $1='lease_expiration' AND l.lease_id=$2 AND l.tenant_id=$3 AND lower(l.status)='active'
 AND l.end_date IN(c.today,c.today+7) AND $4='lease:'||l.lease_id||':'||l.end_date||':'||c.today||':'||$5
 UNION ALL
 SELECT 1 FROM public.billing b JOIN public.leases l ON l.lease_id=b.lease_id
 CROSS JOIN (SELECT (now() AT TIME ZONE 'Asia/Manila')::date AS today) c
 WHERE $1='rent_reminder' AND b.bill_id=$2 AND l.tenant_id=$3 AND lower(l.status)='active'
 AND lower(b.status) IN('unpaid','partially_paid','overdue') AND b.due_date IN(c.today,c.today+3)
 AND $4='rent:'||b.bill_id||':'||b.due_date||':'||c.today||':'||$5
 AND b.rent_amount+COALESCE(b.water_charge,0)+COALESCE(b.electricity_charge,0)+COALESCE(b.other_charges,0)
 > COALESCE((SELECT SUM(amount) FROM public.payments WHERE bill_id=b.bill_id AND status='verified'),0)
 ) AS eligible`,[job.event_type,job.resource_id,job.recipient_id,job.dedupe_key,job.channel]);
 return rows[0].eligible;
}
module.exports={reminderSQL,eligible};
