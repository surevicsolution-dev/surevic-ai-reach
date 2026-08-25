CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM public, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_company_member(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.company_members m WHERE m.company_id = _company_id AND m.user_id = auth.uid());
$function$;

CREATE OR REPLACE FUNCTION private.has_company_role(_company_id uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members m
    WHERE m.company_id = _company_id AND m.user_id = auth.uid() AND m.role = ANY(_roles)
  );
$function$;

REVOKE ALL ON FUNCTION private.is_company_member(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION private.has_company_role(uuid, public.app_role[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.is_company_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_company_role(uuid, public.app_role[]) TO authenticated, service_role;

-- audit_log
DROP POLICY IF EXISTS "members insert audit" ON public.audit_log;
DROP POLICY IF EXISTS "members read audit" ON public.audit_log;
CREATE POLICY "members insert audit" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (private.is_company_member(company_id) AND user_id = auth.uid());
CREATE POLICY "members read audit" ON public.audit_log FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

-- companies
DROP POLICY IF EXISTS "admins delete company" ON public.companies;
DROP POLICY IF EXISTS "admins update company" ON public.companies;
DROP POLICY IF EXISTS "members read company" ON public.companies;
CREATE POLICY "admins delete company" ON public.companies FOR DELETE TO authenticated
  USING (private.has_company_role(id, ARRAY['ADMIN'::public.app_role]));
CREATE POLICY "admins update company" ON public.companies FOR UPDATE TO authenticated
  USING (private.has_company_role(id, ARRAY['ADMIN'::public.app_role]))
  WITH CHECK (private.has_company_role(id, ARRAY['ADMIN'::public.app_role]));
CREATE POLICY "members read company" ON public.companies FOR SELECT TO authenticated
  USING (private.is_company_member(id));

-- company_members
DROP POLICY IF EXISTS "admins delete membership" ON public.company_members;
DROP POLICY IF EXISTS "admins update membership" ON public.company_members;
DROP POLICY IF EXISTS "members read membership" ON public.company_members;
DROP POLICY IF EXISTS "self join own company" ON public.company_members;
CREATE POLICY "admins delete membership" ON public.company_members FOR DELETE TO authenticated
  USING (private.has_company_role(company_id, ARRAY['ADMIN'::public.app_role]));
CREATE POLICY "admins update membership" ON public.company_members FOR UPDATE TO authenticated
  USING (private.has_company_role(company_id, ARRAY['ADMIN'::public.app_role]))
  WITH CHECK (private.has_company_role(company_id, ARRAY['ADMIN'::public.app_role]));
CREATE POLICY "members read membership" ON public.company_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_company_member(company_id));
CREATE POLICY "self join own company" ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_members.company_id AND c.created_by = auth.uid()))
    OR private.has_company_role(company_id, ARRAY['ADMIN'::public.app_role])
  );

-- docs
DROP POLICY IF EXISTS "members read docs" ON public.docs;
DROP POLICY IF EXISTS "sales accounts update docs" ON public.docs;
DROP POLICY IF EXISTS "sales delete docs" ON public.docs;
DROP POLICY IF EXISTS "sales insert docs" ON public.docs;
CREATE POLICY "members read docs" ON public.docs FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));
CREATE POLICY "sales accounts update docs" ON public.docs FOR UPDATE TO authenticated
  USING (private.has_company_role(company_id, ARRAY['ADMIN'::public.app_role,'SALES'::public.app_role,'ACCOUNTS'::public.app_role]))
  WITH CHECK (private.has_company_role(company_id, ARRAY['ADMIN'::public.app_role,'SALES'::public.app_role,'ACCOUNTS'::public.app_role]));
CREATE POLICY "sales delete docs" ON public.docs FOR DELETE TO authenticated
  USING (private.has_company_role(company_id, ARRAY['ADMIN'::public.app_role,'SALES'::public.app_role]));
CREATE POLICY "sales insert docs" ON public.docs FOR INSERT TO authenticated
  WITH CHECK (private.has_company_role(company_id, ARRAY['ADMIN'::public.app_role,'SALES'::public.app_role]));

-- parties
DROP POLICY IF EXISTS "members read parties" ON public.parties;
DROP POLICY IF EXISTS "sales write parties" ON public.parties;
CREATE POLICY "members read parties" ON public.parties FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));
CREATE POLICY "sales write parties" ON public.parties FOR ALL TO authenticated
  USING (private.has_company_role(company_id, ARRAY['ADMIN'::public.app_role,'SALES'::public.app_role]))
  WITH CHECK (private.has_company_role(company_id, ARRAY['ADMIN'::public.app_role,'SALES'::public.app_role]));

-- payments
DROP POLICY IF EXISTS "accounts write payments" ON public.payments;
DROP POLICY IF EXISTS "members read payments" ON public.payments;
CREATE POLICY "accounts write payments" ON public.payments FOR ALL TO authenticated
  USING (private.has_company_role(company_id, ARRAY['ADMIN'::public.app_role,'ACCOUNTS'::public.app_role]))
  WITH CHECK (private.has_company_role(company_id, ARRAY['ADMIN'::public.app_role,'ACCOUNTS'::public.app_role]));
CREATE POLICY "members read payments" ON public.payments FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

-- products
DROP POLICY IF EXISTS "members read products" ON public.products;
DROP POLICY IF EXISTS "stock write products" ON public.products;
CREATE POLICY "members read products" ON public.products FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));
CREATE POLICY "stock write products" ON public.products FOR ALL TO authenticated
  USING (private.has_company_role(company_id, ARRAY['ADMIN'::public.app_role,'WAREHOUSE'::public.app_role,'SALES'::public.app_role]))
  WITH CHECK (private.has_company_role(company_id, ARRAY['ADMIN'::public.app_role,'WAREHOUSE'::public.app_role,'SALES'::public.app_role]));

DROP FUNCTION IF EXISTS public.is_company_member(uuid);
DROP FUNCTION IF EXISTS public.has_company_role(uuid, public.app_role[]);