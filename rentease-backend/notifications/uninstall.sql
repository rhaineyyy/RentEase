BEGIN;
DROP TRIGGER IF EXISTS rentease_notification_event ON public.app_users;
DROP TRIGGER IF EXISTS rentease_notification_event ON public.applications;
DROP TRIGGER IF EXISTS rentease_notification_event ON public.leases;
DROP TRIGGER IF EXISTS rentease_notification_event ON public.billing;
DROP TRIGGER IF EXISTS rentease_notification_event ON public.payments;
DROP TRIGGER IF EXISTS rentease_notification_event ON public.security_deposit_payments;
DROP TRIGGER IF EXISTS rentease_notification_event ON public.maintenance_requests;
DROP TRIGGER IF EXISTS rentease_notification_event ON public.security_deposit_settlements;
DROP TRIGGER IF EXISTS rentease_notification_event ON public.security_deposit_refunds;
COMMIT;
-- Logs retained. Stop worker before uninstalling.
