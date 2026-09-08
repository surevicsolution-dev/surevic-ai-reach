
-- 1. Subscription / licensing columns
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS payment_reference text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS plan_valid_until date,
  ADD COLUMN IF NOT EXISTS subscription_submitted_at timestamptz;

ALTER TABLE public.companies ALTER COLUMN trial_ends_at SET DEFAULT (CURRENT_DATE + 12);

-- 2. Read-only role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'READONLY';

-- 3. Invitations: membership rows may exist before the user signs up
ALTER TABLE public.company_members ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.company_members ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '';
ALTER TABLE public.company_members ADD COLUMN IF NOT EXISTS invited_by uuid;
CREATE UNIQUE INDEX IF NOT EXISTS company_members_company_email_idx
  ON public.company_members (company_id, lower(email)) WHERE email <> '';

-- 4. Membership helpers also honour pending invites matched by email
CREATE OR REPLACE FUNCTION private.is_company_member(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members m
    WHERE m.company_id = _company_id
      AND (m.user_id = auth.uid()
           OR (m.email <> '' AND lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))))
  );
$$;

CREATE OR REPLACE FUNCTION private.has_company_role(_company_id uuid, _roles app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members m
    WHERE m.company_id = _company_id AND m.role = ANY(_roles)
      AND (m.user_id = auth.uid()
           OR (m.email <> '' AND lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))))
  );
$$;

-- 5. Claim pending invites for the signed-in user
CREATE OR REPLACE FUNCTION public.claim_invites()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n integer;
BEGIN
  UPDATE public.company_members m
     SET user_id = auth.uid()
   WHERE m.user_id IS NULL
     AND m.email <> ''
     AND lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_invites() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_invites() TO authenticated;

-- 6. Membership rows also readable/updatable by the invited email
DROP POLICY IF EXISTS "members read membership" ON public.company_members;
CREATE POLICY "members read membership" ON public.company_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR (email <> '' AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
         OR private.is_company_member(company_id));

-- 7. Super admin helper + company access for license review
CREATE OR REPLACE FUNCTION private.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins p WHERE p.user_id = auth.uid())
      OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'info@surevic.com';
$$;

CREATE POLICY "platform admins read companies" ON public.companies
  FOR SELECT TO authenticated USING (private.is_platform_admin());

CREATE POLICY "platform admins update companies" ON public.companies
  FOR UPDATE TO authenticated
  USING (private.is_platform_admin()) WITH CHECK (private.is_platform_admin());
