CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  user_email text NOT NULL DEFAULT '',
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read audit" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_company_member(company_id));

CREATE POLICY "members insert audit" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id) AND user_id = auth.uid());

CREATE INDEX audit_log_company_created_idx ON public.audit_log (company_id, created_at DESC);

REVOKE EXECUTE ON FUNCTION public.has_company_role(uuid, public.app_role[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_company_member(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_company_role(uuid, public.app_role[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_company_member(uuid) TO authenticated, service_role;