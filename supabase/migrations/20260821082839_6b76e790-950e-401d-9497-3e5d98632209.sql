CREATE TYPE public.app_role AS ENUM ('ADMIN','SALES','ACCOUNTS','WAREHOUSE');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text NOT NULL DEFAULT '',
  gstin text NOT NULL DEFAULT '',
  pan text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  state_code text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  bank_name text NOT NULL DEFAULT '',
  account_no text NOT NULL DEFAULT '',
  ifsc text NOT NULL DEFAULT '',
  upi_id text NOT NULL DEFAULT '',
  invoice_prefix text NOT NULL DEFAULT 'INV-',
  quote_prefix text NOT NULL DEFAULT 'QTN-',
  terms text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'ADMIN',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;

CREATE OR REPLACE FUNCTION public.is_company_member(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_members m WHERE m.company_id = _company_id AND m.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.has_company_role(_company_id uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members m
    WHERE m.company_id = _company_id AND m.user_id = auth.uid() AND m.role = ANY(_roles)
  );
$$;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read company" ON public.companies FOR SELECT TO authenticated USING (public.is_company_member(id));
CREATE POLICY "anyone create company" ON public.companies FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "admins update company" ON public.companies FOR UPDATE TO authenticated USING (public.has_company_role(id, ARRAY['ADMIN']::public.app_role[])) WITH CHECK (public.has_company_role(id, ARRAY['ADMIN']::public.app_role[]));
CREATE POLICY "admins delete company" ON public.companies FOR DELETE TO authenticated USING (public.has_company_role(id, ARRAY['ADMIN']::public.app_role[]));

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read membership" ON public.company_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_company_member(company_id));
CREATE POLICY "self join own company" ON public.company_members FOR INSERT TO authenticated WITH CHECK (
  (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.created_by = auth.uid()))
  OR public.has_company_role(company_id, ARRAY['ADMIN']::public.app_role[])
);
CREATE POLICY "admins update membership" ON public.company_members FOR UPDATE TO authenticated USING (public.has_company_role(company_id, ARRAY['ADMIN']::public.app_role[])) WITH CHECK (public.has_company_role(company_id, ARRAY['ADMIN']::public.app_role[]));
CREATE POLICY "admins delete membership" ON public.company_members FOR DELETE TO authenticated USING (public.has_company_role(company_id, ARRAY['ADMIN']::public.app_role[]));

CREATE TABLE public.parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'CUSTOMER',
  gstin text NOT NULL DEFAULT '',
  pan text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  state_code text NOT NULL DEFAULT '',
  billing_address text NOT NULL DEFAULT '',
  shipping_address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  credit_limit numeric NOT NULL DEFAULT 0,
  opening_balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parties TO authenticated;
GRANT ALL ON public.parties TO service_role;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read parties" ON public.parties FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "sales write parties" ON public.parties FOR ALL TO authenticated
  USING (public.has_company_role(company_id, ARRAY['ADMIN','SALES']::public.app_role[]))
  WITH CHECK (public.has_company_role(company_id, ARRAY['ADMIN','SALES']::public.app_role[]));

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT '',
  hsn text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT 'NOS',
  cost_price numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 18,
  stock numeric NOT NULL DEFAULT 0,
  min_qty numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read products" ON public.products FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "stock write products" ON public.products FOR ALL TO authenticated
  USING (public.has_company_role(company_id, ARRAY['ADMIN','WAREHOUSE','SALES']::public.app_role[]))
  WITH CHECK (public.has_company_role(company_id, ARRAY['ADMIN','WAREHOUSE','SALES']::public.app_role[]));

CREATE TABLE public.docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kind text NOT NULL,
  number text NOT NULL,
  date date NOT NULL DEFAULT current_date,
  due_date date,
  party_id uuid REFERENCES public.parties(id) ON DELETE SET NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'DRAFT',
  notes text,
  po_ref text,
  follow_up_date date,
  converted_to uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.docs TO authenticated;
GRANT ALL ON public.docs TO service_role;
ALTER TABLE public.docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read docs" ON public.docs FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "sales insert docs" ON public.docs FOR INSERT TO authenticated
  WITH CHECK (public.has_company_role(company_id, ARRAY['ADMIN','SALES']::public.app_role[]));
CREATE POLICY "sales accounts update docs" ON public.docs FOR UPDATE TO authenticated
  USING (public.has_company_role(company_id, ARRAY['ADMIN','SALES','ACCOUNTS']::public.app_role[]))
  WITH CHECK (public.has_company_role(company_id, ARRAY['ADMIN','SALES','ACCOUNTS']::public.app_role[]));
CREATE POLICY "sales delete docs" ON public.docs FOR DELETE TO authenticated
  USING (public.has_company_role(company_id, ARRAY['ADMIN','SALES']::public.app_role[]));

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT current_date,
  party_id uuid REFERENCES public.parties(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.docs(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  mode text NOT NULL DEFAULT 'BANK',
  reference text NOT NULL DEFAULT '',
  direction text NOT NULL DEFAULT 'IN',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read payments" ON public.payments FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "accounts write payments" ON public.payments FOR ALL TO authenticated
  USING (public.has_company_role(company_id, ARRAY['ADMIN','ACCOUNTS']::public.app_role[]))
  WITH CHECK (public.has_company_role(company_id, ARRAY['ADMIN','ACCOUNTS']::public.app_role[]));

CREATE INDEX idx_parties_company ON public.parties(company_id);
CREATE INDEX idx_products_company ON public.products(company_id);
CREATE INDEX idx_docs_company ON public.docs(company_id);
CREATE INDEX idx_payments_company ON public.payments(company_id);
CREATE INDEX idx_members_user ON public.company_members(user_id);