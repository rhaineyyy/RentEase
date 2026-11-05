BEGIN;
CREATE TABLE IF NOT EXISTS public.notification_outbox (
 notification_id bigserial PRIMARY KEY,
 recipient_id integer NOT NULL REFERENCES public.app_users(user_id),
 channel text NOT NULL CHECK(channel IN ('sms','email')),
 event_type text NOT NULL, resource_id bigint NOT NULL,
 subject text NOT NULL, body text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','accepted','failed','skipped','unknown')),
 provider_id text, error_code text,
 created_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz
);
CREATE INDEX IF NOT EXISTS notification_pending_idx ON public.notification_outbox(notification_id) WHERE status='pending';
CREATE TABLE IF NOT EXISTS public.user_notifications (
 notification_id bigserial PRIMARY KEY,
 recipient_id integer NOT NULL REFERENCES public.app_users(user_id),
 event_key text NOT NULL,
 title text NOT NULL,
 body text NOT NULL,
 is_read boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 read_at timestamptz,
 UNIQUE (recipient_id, event_key)
);
CREATE INDEX IF NOT EXISTS user_notifications_unread_idx ON public.user_notifications(recipient_id) WHERE is_read = false;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS google_sub text;
CREATE UNIQUE INDEX IF NOT EXISTS app_users_google_sub_unique ON public.app_users(google_sub) WHERE google_sub IS NOT NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS gateway_provider text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS gateway_checkout_id text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS gateway_status text;
CREATE UNIQUE INDEX IF NOT EXISTS payments_gateway_checkout_unique ON public.payments(gateway_checkout_id) WHERE gateway_checkout_id IS NOT NULL;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (status IN ('pending_verification','pending_gateway','verified','rejected','failed','cancelled'));
CREATE TABLE IF NOT EXISTS public.payment_gateway_events (
 event_id text PRIMARY KEY,
 payment_id integer REFERENCES public.payments(payment_id),
 event_type text NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.rentease_enqueue(recipient integer, event text, resource bigint, title text, message text)
RETURNS void LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF recipient IS NOT NULL THEN
  INSERT INTO public.user_notifications(recipient_id, event_key, title, body)
  VALUES (recipient, event || ':' || resource::text, title, message)
  ON CONFLICT (recipient_id, event_key) DO NOTHING;
  INSERT INTO public.notification_outbox(recipient_id,channel,event_type,resource_id,subject,body,dedupe_key)
  SELECT recipient,c,event,resource,title,'RentEase: '||message,
         event || ':' || resource::text || ':' || recipient::text || ':' || c
  FROM unnest(ARRAY['sms','email']) AS c
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.rentease_notify_event() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE
 n jsonb := to_jsonb(NEW); previous jsonb; tenant integer; owner integer;
 unit integer; lease integer; resource bigint; state text; kind text; message text;
 owner_admin integer;
BEGIN
 IF TG_OP='UPDATE' THEN previous:=to_jsonb(OLD); END IF;
 state:=lower(COALESCE(n->>'status',n->>'account_status',''));
 IF TG_OP='UPDATE' AND COALESCE(n->>'status',n->>'account_status','') IS NOT DISTINCT FROM
 COALESCE(previous->>'status',previous->>'account_status','') THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='app_users' THEN
  IF TG_OP='INSERT' AND lower(COALESCE(n->>'role',''))='owner' AND state='pending' THEN
   FOR owner_admin IN SELECT user_id FROM public.app_users WHERE role='admin' AND lower(account_status)='active' LOOP
    PERFORM public.rentease_enqueue(owner_admin,'owner_registration',NEW.user_id,'Owner registration','A property owner account is waiting for approval.');
   END LOOP;
  ELSIF TG_OP='UPDATE' AND state IN ('active','rejected') THEN
   PERFORM public.rentease_enqueue(NEW.user_id,'account_'||state,NEW.user_id,'Account update',
    CASE WHEN state='active' THEN 'Your account is approved. You can now sign in.' ELSE 'Your registration was rejected. Contact the administrator for details.' END);
  END IF;
  RETURN NEW;
 END IF;
 lease:=NULLIF(n->>'lease_id','')::integer;
 IF TG_TABLE_NAME='payments' THEN
  SELECT b.lease_id INTO lease FROM public.billing b WHERE b.bill_id=(n->>'bill_id')::integer;
 ELSIF TG_TABLE_NAME='security_deposit_refunds' THEN
  SELECT s.lease_id INTO lease FROM public.security_deposit_settlements s WHERE s.settlement_id=(n->>'settlement_id')::integer;
 END IF;
 IF lease IS NOT NULL THEN
  SELECT l.tenant_id,l.unit_id INTO tenant,unit FROM public.leases l WHERE l.lease_id=lease;
 ELSE
  tenant:=(n->>'tenant_id')::integer; unit:=(n->>'unit_id')::integer;
 END IF;
 SELECT p.owner_id INTO owner FROM public.units u JOIN public.properties p ON p.property_id=u.property_id WHERE u.unit_id=unit;
 IF TG_TABLE_NAME='applications' THEN
  resource:=(n->>'application_id')::bigint;
  IF TG_OP='INSERT' THEN
   PERFORM public.rentease_enqueue(owner,'applications_insert',resource,'New rental application','A new rental application requires your review.');
   INSERT INTO public.notification_outbox(recipient_id,channel,event_type,resource_id,subject,body)
   VALUES(tenant,'email','application_acknowledgment',resource,'Application submitted','RentEase: Your rental application was submitted. Please wait for the owner to review it.');
  ELSIF TG_OP='UPDATE' AND state='approved' THEN
   PERFORM public.rentease_enqueue(tenant,'applications_approved',resource,'Application approved','Your rental application was approved. Check RentEase for your lease.');
  ELSIF TG_OP='UPDATE' AND state='rejected' THEN
   PERFORM public.rentease_enqueue(tenant,'applications_rejected',resource,'Application rejected','Your rental application was rejected or the unit was reserved for another applicant.');
  END IF;
 ELSIF TG_TABLE_NAME='leases' THEN
  resource:=(n->>'lease_id')::bigint;
  IF TG_OP='INSERT' THEN
   PERFORM public.rentease_enqueue(tenant,'leases_insert',resource,'Lease ready','Your lease is ready. Open My Lease to review it and download the agreement.');
  ELSIF TG_OP='UPDATE' AND state='active' THEN
   PERFORM public.rentease_enqueue(owner,'leases_active',resource,'Lease confirmed','Your tenant confirmed the lease. It is now active.');
  ELSIF TG_OP='UPDATE' AND state='completed' THEN
   PERFORM public.rentease_enqueue(tenant,'leases_completed',resource,'Lease completed','Your lease is completed. Check RentEase for deposit settlement updates.');
  END IF;
 ELSIF TG_TABLE_NAME='billing' THEN
  resource:=(n->>'bill_id')::bigint;
  IF TG_OP='INSERT' THEN
   PERFORM public.rentease_enqueue(tenant,'billing_insert',resource,'New rent bill','A new billing statement is available. Open Billing to view or download it.');
  END IF;
 ELSIF TG_TABLE_NAME='payments' THEN
  resource:=(n->>'payment_id')::bigint;
  IF TG_OP='INSERT' AND state='pending_verification' THEN
   PERFORM public.rentease_enqueue(owner,'payments_insert',resource,'Payment submitted','A rent payment was submitted and needs your verification.');
  ELSIF TG_OP='UPDATE' AND state='verified' THEN
   PERFORM public.rentease_enqueue(tenant,'payments_verified',resource,'Payment verified','Your payment was verified. Open Billing to view or download the receipt.');
   PERFORM public.rentease_enqueue(owner,'payments_verified_owner',resource,'Payment confirmed','A rent payment was confirmed and applied to the bill.');
  ELSIF TG_OP='UPDATE' AND state='rejected' THEN
   PERFORM public.rentease_enqueue(tenant,'payments_rejected',resource,'Payment rejected','Your rent payment was rejected. Check RentEase or contact the owner.');
  ELSIF TG_OP='UPDATE' AND state IN ('failed','cancelled') THEN
   PERFORM public.rentease_enqueue(tenant,'payments_'||state,resource,'Payment update','Your online payment was not completed. You can try again from Billing.');
  END IF;
 ELSIF TG_TABLE_NAME='security_deposit_payments' THEN
  resource:=(n->>'deposit_payment_id')::bigint;
  IF TG_OP='INSERT' THEN
   PERFORM public.rentease_enqueue(owner,'security_deposit_payments_insert',resource,'Deposit submitted','A security deposit payment needs your verification.');
  ELSIF TG_OP='UPDATE' AND state='verified' THEN
   PERFORM public.rentease_enqueue(tenant,'security_deposit_payments_verified',resource,'Deposit verified','Your security deposit payment was verified.');
  ELSIF TG_OP='UPDATE' AND state='rejected' THEN
   PERFORM public.rentease_enqueue(tenant,'security_deposit_payments_rejected',resource,'Deposit rejected','Your security deposit payment was rejected. Check RentEase for details.');
  END IF;
 ELSIF TG_TABLE_NAME='maintenance_requests' THEN
  resource:=(n->>'request_id')::bigint;
  IF TG_OP='INSERT' THEN
   PERFORM public.rentease_enqueue(owner,'maintenance_requests_insert',resource,'Maintenance request','A new maintenance request requires your review.');
  ELSIF TG_OP='UPDATE' AND state='assigned' THEN
   PERFORM public.rentease_enqueue(tenant,'maintenance_requests_assigned',resource,'Maintenance update','Your maintenance request is assigned.');
  ELSIF TG_OP='UPDATE' AND state='in_progress' THEN
   PERFORM public.rentease_enqueue(tenant,'maintenance_requests_in_progress',resource,'Maintenance update','Work on your maintenance request is in progress.');
  ELSIF TG_OP='UPDATE' AND state='completed' THEN
   PERFORM public.rentease_enqueue(tenant,'maintenance_requests_completed',resource,'Maintenance update','Your maintenance request is completed.');
  ELSIF TG_OP='UPDATE' AND state='cancelled' THEN
   PERFORM public.rentease_enqueue(tenant,'maintenance_requests_cancelled',resource,'Maintenance update','Your maintenance request was cancelled.');
  END IF;
 ELSIF TG_TABLE_NAME='security_deposit_settlements' THEN
  resource:=(n->>'settlement_id')::bigint;
  IF TG_OP='UPDATE' AND state='finalized' THEN
   PERFORM public.rentease_enqueue(tenant,'security_deposit_settlements_finalized',resource,'Settlement finalized','Your deposit settlement is finalized. Open RentEase to review deductions and refund balance.');
  ELSIF TG_OP='UPDATE' AND state='settled' THEN
   PERFORM public.rentease_enqueue(tenant,'security_deposit_settlements_settled',resource,'Settlement settled','Your deposit settlement is settled. You can view or print it in RentEase.');
  END IF;
 ELSIF TG_TABLE_NAME='security_deposit_refunds' THEN
  resource:=(n->>'refund_id')::bigint;
  IF TG_OP='INSERT' THEN
   PERFORM public.rentease_enqueue(tenant,'security_deposit_refunds_insert',resource,'Refund recorded','A deposit refund was recorded. Open RentEase to check and confirm receipt.');
  ELSIF TG_OP='UPDATE' AND state='confirmed' THEN
   PERFORM public.rentease_enqueue(owner,'security_deposit_refunds_confirmed',resource,'Refund confirmed','Your tenant confirmed receipt of a deposit refund.');
  ELSIF TG_OP='UPDATE' AND state='cancelled' THEN
   PERFORM public.rentease_enqueue(tenant,'security_deposit_refunds_cancelled',resource,'Refund update','A deposit refund record was cancelled. Check RentEase for details.');
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS rentease_notification_event ON public.app_users;
CREATE TRIGGER rentease_notification_event AFTER INSERT OR UPDATE ON public.app_users FOR EACH ROW EXECUTE FUNCTION public.rentease_notify_event();
DROP TRIGGER IF EXISTS rentease_notification_event ON public.applications;
CREATE TRIGGER rentease_notification_event AFTER INSERT OR UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.rentease_notify_event();
DROP TRIGGER IF EXISTS rentease_notification_event ON public.leases;
CREATE TRIGGER rentease_notification_event AFTER INSERT OR UPDATE ON public.leases FOR EACH ROW EXECUTE FUNCTION public.rentease_notify_event();
DROP TRIGGER IF EXISTS rentease_notification_event ON public.billing;
CREATE TRIGGER rentease_notification_event AFTER INSERT OR UPDATE ON public.billing FOR EACH ROW EXECUTE FUNCTION public.rentease_notify_event();
DROP TRIGGER IF EXISTS rentease_notification_event ON public.payments;
CREATE TRIGGER rentease_notification_event AFTER INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.rentease_notify_event();
DROP TRIGGER IF EXISTS rentease_notification_event ON public.security_deposit_payments;
CREATE TRIGGER rentease_notification_event AFTER INSERT OR UPDATE ON public.security_deposit_payments FOR EACH ROW EXECUTE FUNCTION public.rentease_notify_event();
DROP TRIGGER IF EXISTS rentease_notification_event ON public.maintenance_requests;
CREATE TRIGGER rentease_notification_event AFTER INSERT OR UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.rentease_notify_event();
DROP TRIGGER IF EXISTS rentease_notification_event ON public.security_deposit_settlements;
CREATE TRIGGER rentease_notification_event AFTER INSERT OR UPDATE ON public.security_deposit_settlements FOR EACH ROW EXECUTE FUNCTION public.rentease_notify_event();
DROP TRIGGER IF EXISTS rentease_notification_event ON public.security_deposit_refunds;
CREATE TRIGGER rentease_notification_event AFTER INSERT OR UPDATE ON public.security_deposit_refunds FOR EACH ROW EXECUTE FUNCTION public.rentease_notify_event();
ALTER TABLE public.notification_outbox ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE UNIQUE INDEX IF NOT EXISTS notification_dedupe_idx ON public.notification_outbox(dedupe_key) WHERE dedupe_key IS NOT NULL;
COMMIT;
