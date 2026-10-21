-- Service-only webhook reconciliation. The row lock prevents two callbacks
-- from downgrading each other's status. No email is sent by this function.
CREATE OR REPLACE FUNCTION public.record_collection_email_event(
 p_resend_id text, p_event_type text, p_occurred_at timestamptz,
 p_claim_id uuid DEFAULT NULL, p_invoice_id uuid DEFAULT NULL, p_reminder_type text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE r public.reminders%ROWTYPE; next_status text; old_rank int; new_rank int;
BEGIN
 IF p_resend_id IS NULL OR length(p_resend_id) NOT BETWEEN 1 AND 200 OR p_occurred_at IS NULL THEN
   RAISE EXCEPTION 'Événement invalide' USING ERRCODE = '22023';
 END IF;
 next_status := CASE p_event_type WHEN 'email.sent' THEN 'sent' WHEN 'email.delivered' THEN 'delivered'
   WHEN 'email.opened' THEN 'opened' WHEN 'email.clicked' THEN 'clicked' WHEN 'email.bounced' THEN 'bounced'
   WHEN 'email.complained' THEN 'complained' WHEN 'email.failed' THEN 'failed'
   WHEN 'email.suppressed' THEN 'bounced' ELSE NULL END;
 IF next_status IS NULL THEN RETURN false; END IF;
 SELECT * INTO r FROM public.reminders WHERE resend_id = p_resend_id ORDER BY created_at LIMIT 1 FOR UPDATE;
 IF NOT FOUND AND p_claim_id IS NOT NULL AND p_invoice_id IS NOT NULL AND p_reminder_type IS NOT NULL THEN
   -- Tags are trusted only after the caller verifies the provider signature.
   -- Bind all three IDs and never steal a claim already linked to another email.
   SELECT * INTO r FROM public.reminders WHERE id = p_claim_id AND invoice_id = p_invoice_id
     AND type = p_reminder_type AND (resend_id IS NULL OR resend_id = p_resend_id) FOR UPDATE;
 END IF;
 IF r.id IS NULL THEN RETURN false; END IF;
 old_rank := CASE r.status WHEN 'pending' THEN 0 WHEN 'sent' THEN 1 WHEN 'delivered' THEN 2
   WHEN 'opened' THEN 3 WHEN 'clicked' THEN 4 ELSE 5 END;
 new_rank := CASE next_status WHEN 'sent' THEN 1 WHEN 'delivered' THEN 2 WHEN 'opened' THEN 3 WHEN 'clicked' THEN 4 ELSE 5 END;
 UPDATE public.reminders SET resend_id = p_resend_id,
   status = CASE WHEN new_rank > old_rank THEN next_status ELSE r.status END,
   sent_at = CASE WHEN next_status = 'sent' THEN least(sent_at, p_occurred_at) ELSE sent_at END,
   delivered_at = CASE WHEN next_status = 'delivered' THEN least(delivered_at, p_occurred_at) ELSE delivered_at END,
   opened_at = CASE WHEN next_status = 'opened' THEN least(opened_at, p_occurred_at) ELSE opened_at END,
   clicked_at = CASE WHEN next_status = 'clicked' THEN least(clicked_at, p_occurred_at) ELSE clicked_at END,
   bounced_at = CASE WHEN next_status = 'bounced' THEN least(bounced_at, p_occurred_at) ELSE bounced_at END,
   complained_at = CASE WHEN next_status = 'complained' THEN least(complained_at, p_occurred_at) ELSE complained_at END
 WHERE id = r.id;
 IF next_status IN ('bounced', 'complained') THEN
   UPDATE public.invoices SET reminders_paused = true, updated_at = now()
     WHERE id = r.invoice_id AND user_id = r.user_id AND reminders_paused = false;
 END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.record_collection_email_event(text,text,timestamptz,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_collection_email_event(text,text,timestamptz,uuid,uuid,text) TO service_role;
