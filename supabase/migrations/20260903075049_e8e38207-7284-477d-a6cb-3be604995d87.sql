ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS license_valid_until date,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own platform admin row"
ON public.platform_admins FOR SELECT TO authenticated
USING (user_id = auth.uid());