CREATE OR REPLACE FUNCTION private.add_creator_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'ADMIN');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companies_add_creator_admin ON public.companies;
CREATE TRIGGER companies_add_creator_admin
AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION private.add_creator_as_admin();

DROP POLICY IF EXISTS "creator read company" ON public.companies;
CREATE POLICY "creator read company" ON public.companies
FOR SELECT TO authenticated
USING (created_by = auth.uid());