import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { seedCompany, seedDocs, seedParties, seedPayments, seedProducts } from "./seed";
import type { Company, Doc, DocItem, ErpState, Party, Payment, Product, Role } from "./types";
import { computeTotals, paidAgainst } from "./gst";
import { metaOf } from "./doc-kinds";

import {
  fromCompany, fromDoc, fromParty, fromPayment, fromProduct,
  toAudit, toCompany, toDoc, toParty, toPayment, toProduct, type AuditEntry,
} from "./mappers";

const COMPANY_KEY = "surevic-erp-company";

export interface CompanyRef { id: string; name: string; role: Role; gstin: string; trialEndsAt: string }

interface Ctx {
  state: ErpState;
  user: User | null;
  loading: boolean;
  companies: CompanyRef[];
  companyId: string | null;
  audit: AuditEntry[];
  switchCompany: (id: string) => void;
  createCompany: (name: string, patch?: Partial<Company>) => Promise<string | null>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (...roles: Role[]) => boolean;
  setRole: (r: Role) => void;
  updateCompany: (patch: Partial<Company>) => void;
  upsertParty: (p: Party) => void;
  removeParty: (id: string) => void;
  upsertProduct: (p: Product) => void;
  removeProduct: (id: string) => void;
  bulkUpsertParties: (rows: Party[]) => Promise<void>;
  bulkUpsertProducts: (rows: Product[]) => Promise<void>;
  saveDoc: (d: Doc) => void;
  removeDoc: (id: string) => void;
  convertQuotation: (id: string) => Doc | null;
  convertDoc: (id: string, target?: Doc["kind"]) => Doc | null;
  addPayment: (p: Payment) => void;
  nextNumber: (kind: Doc["kind"]) => string;
  hasSelection: boolean;

  loadSampleData: () => Promise<void>;
  wipeData: () => Promise<void>;
  reset: () => void;
  outstandingFor: (partyId: string) => number;
  invoiceBalance: (doc: Doc) => number;
  totalOf: (doc: Doc) => number;
  draft: { partyId?: string; items: DocItem[] } | null;
  setDraft: (d: { partyId?: string; items: DocItem[] } | null) => void;
}

const ErpContext = createContext<Ctx | null>(null);
export const uid = (_p?: string) =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

const emptyCompany: Company = {
  id: "", name: "", legalName: "", gstin: "", pan: "", state: "", stateCode: "", address: "",
  phone: "", email: "", website: "", bankName: "", accountNo: "", ifsc: "", upiId: "",
  invoicePrefix: "INV-", quotePrefix: "QTN-", terms: [],
  country: "India", baseCurrency: "INR", fyStartMonth: 4, industry: "", trialEndsAt: "",
};


const emptyState: ErpState = {
  company: emptyCompany, role: "ADMIN", parties: [], products: [], docs: [], payments: [],
};

export function ErpProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyRef[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  const [state, setState] = useState<ErpState>(emptyState);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [draft, setDraft] = useState<{ partyId?: string; items: DocItem[] } | null>(null);
  const companyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------- audit ---------- */
  const logAudit = useCallback(
    async (action: string, entity: string, entityId: string, summary: string) => {
      if (!companyId) return;
      const row = {
        company_id: companyId,
        user_email: user?.email ?? "",
        action, entity, entity_id: entityId, summary,
      };
      const { data, error } = await supabase.from("audit_log").insert(row).select().single();
      if (!error && data) setAudit((a) => [toAudit(data), ...a].slice(0, 300));
    },
    [companyId, user],
  );

  const fail = (error: { message: string } | null, what: string) => {
    if (error) toast.error(`${what} failed: ${error.message}`);
    return !!error;
  };

  /* ---------- session ---------- */
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      if (!data.user) setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  /* ---------- memberships ---------- */
  const loadCompanies = useCallback(async () => {
    if (!user) {
      setCompanies([]); setCompanyId(null); setState(emptyState); setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("company_members")
      .select("role, company_id, companies(id, name, gstin, trial_ends_at)")
      .eq("user_id", user.id);
    if (error) { toast.error(error.message); setLoading(false); return; }
    const list: CompanyRef[] = (data ?? [])
      .filter((m) => m.companies)
      .map((m) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = m.companies as any;
        return {
          id: c.id, name: c.name, role: m.role as Role,
          gstin: c.gstin ?? "", trialEndsAt: c.trial_ends_at ?? "",
        };
      });
    setCompanies(list);
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem(COMPANY_KEY) : null;
    const storedValid = list.find((c) => c.id === stored)?.id ?? null;
    // Only auto-select when the user has exactly one workspace; otherwise let
    // the organization picker decide.
    const pick = storedValid ?? (list.length === 1 ? (list[0]?.id ?? null) : null);
    setHasSelection(!!pick);
    setCompanyId(pick);
    if (!pick) { setState(emptyState); setLoading(false); }
  }, [user]);


  useEffect(() => { void loadCompanies(); }, [loadCompanies]);

  /* ---------- data ---------- */
  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [co, pa, pr, dc, py, au] = await Promise.all([
      supabase.from("companies").select("*").eq("id", companyId).maybeSingle(),
      supabase.from("parties").select("*").eq("company_id", companyId).order("name"),
      supabase.from("products").select("*").eq("company_id", companyId).order("name"),
      supabase.from("docs").select("*").eq("company_id", companyId).order("date", { ascending: false }),
      supabase.from("payments").select("*").eq("company_id", companyId).order("date", { ascending: false }),
      supabase.from("audit_log").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(300),
    ]);
    const role = companies.find((c) => c.id === companyId)?.role ?? "ADMIN";
    setState({
      company: co.data ? toCompany(co.data) : emptyCompany,
      role,
      parties: (pa.data ?? []).map(toParty),
      products: (pr.data ?? []).map(toProduct),
      docs: (dc.data ?? []).map(toDoc),
      payments: (py.data ?? []).map(toPayment),
    });
    setAudit((au.data ?? []).map(toAudit));
    setLoading(false);
  }, [companyId, companies]);

  useEffect(() => { void loadData(); }, [loadData]);

  const switchCompany = useCallback((id: string) => {
    localStorage.setItem(COMPANY_KEY, id);
    setHasSelection(true);
    setCompanyId(id);
  }, []);


  const createCompany = useCallback(
    async (name: string, patch?: Partial<Company>) => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("companies")
        .insert({ name, ...fromCompany(patch ?? {}) })
        .select()
        .single();
      if (fail(error, "Create company") || !data) return null;
      // Membership (creator = ADMIN) is created by a database trigger.
      await loadCompanies();
      switchCompany(data.id);
      return data.id as string;
    },
    [user, loadCompanies, switchCompany],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null); setCompanies([]); setCompanyId(null); setState(emptyState);
  }, []);

  /* ---------- derived ---------- */
  const totalOf = useCallback(
    (doc: Doc) => computeTotals(doc.items, state.company, state.parties.find((p) => p.id === doc.partyId)).grandTotal,
    [state.company, state.parties],
  );
  const invoiceBalance = useCallback(
    (doc: Doc) => +(totalOf(doc) - paidAgainst(doc.id, state.payments)).toFixed(2),
    [state.payments, totalOf],
  );
  const outstandingFor = useCallback(
    (partyId: string) =>
      state.docs
        .filter((d) => d.kind === "INVOICE" && d.partyId === partyId && d.status !== "CANCELLED")
        .reduce((a, d) => a + invoiceBalance(d), 0),
    [state.docs, invoiceBalance],
  );
  const nextNumber = useCallback(
    (kind: Doc["kind"]) => {
      const prefix =
        kind === "INVOICE"
          ? state.company.invoicePrefix || "INV-"
          : kind === "QUOTATION"
            ? state.company.quotePrefix || "QTN-"
            : metaOf(kind).prefix;
      const nums = state.docs
        .filter((d) => d.kind === kind)
        .map((d) => parseInt(d.number.replace(/\D/g, "").slice(-5), 10) || 0);
      const next = (nums.length ? Math.max(...nums) : 0) + 1;
      return `${prefix}${String(next).padStart(5, "0")}`;
    },
    [state.docs, state.company],
  );


  const can = useCallback((...roles: Role[]) => roles.includes(state.role), [state.role]);

  /* ---------- mutations ---------- */
  const updateCompany = useCallback(
    (patch: Partial<Company>) => {
      setState((s) => ({ ...s, company: { ...s.company, ...patch } }));
      if (!companyId) return;
      if (companyTimer.current) clearTimeout(companyTimer.current);
      companyTimer.current = setTimeout(async () => {
        const { error } = await supabase.from("companies").update(fromCompany(patch)).eq("id", companyId);
        if (!fail(error, "Save company")) void logAudit("UPDATE", "COMPANY", companyId, "Company profile updated");
      }, 800);
    },
    [companyId, logAudit],
  );

  const upsertParty = useCallback(
    (p: Party) => {
      const row = { ...p, companyId: companyId ?? p.companyId };
      const isNew = !state.parties.some((x) => x.id === p.id);
      setState((s) => ({
        ...s,
        parties: isNew ? [row, ...s.parties] : s.parties.map((x) => (x.id === p.id ? row : x)),
      }));
      void (async () => {
        const { error } = await supabase.from("parties").upsert(fromParty(row));
        if (!fail(error, "Save party")) void logAudit(isNew ? "CREATE" : "UPDATE", "PARTY", row.id, row.name);
      })();
    },
    [companyId, state.parties, logAudit],
  );

  const removeParty = useCallback(
    (id: string) => {
      const name = state.parties.find((p) => p.id === id)?.name ?? id;
      setState((s) => ({ ...s, parties: s.parties.filter((p) => p.id !== id) }));
      void (async () => {
        const { error } = await supabase.from("parties").delete().eq("id", id);
        if (!fail(error, "Delete party")) void logAudit("DELETE", "PARTY", id, name);
      })();
    },
    [state.parties, logAudit],
  );

  const upsertProduct = useCallback(
    (p: Product) => {
      const row = { ...p, companyId: companyId ?? p.companyId };
      const isNew = !state.products.some((x) => x.id === p.id);
      setState((s) => ({
        ...s,
        products: isNew ? [row, ...s.products] : s.products.map((x) => (x.id === p.id ? row : x)),
      }));
      void (async () => {
        const { error } = await supabase.from("products").upsert(fromProduct(row));
        if (!fail(error, "Save product")) void logAudit(isNew ? "CREATE" : "UPDATE", "PRODUCT", row.id, row.name);
      })();
    },
    [companyId, state.products, logAudit],
  );

  const removeProduct = useCallback(
    (id: string) => {
      const name = state.products.find((p) => p.id === id)?.name ?? id;
      setState((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }));
      void (async () => {
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (!fail(error, "Delete product")) void logAudit("DELETE", "PRODUCT", id, name);
      })();
    },
    [state.products, logAudit],
  );

  const bulkUpsertParties = useCallback(
    async (rows: Party[]) => {
      if (!companyId || !rows.length) return;
      const payload = rows.map((r) => fromParty({ ...r, companyId }));
      const { error } = await supabase.from("parties").upsert(payload);
      if (fail(error, "Import parties")) return;
      await logAudit("IMPORT", "PARTY", "csv", `${rows.length} parties imported from CSV`);
      await loadData();
    },
    [companyId, logAudit, loadData],
  );

  const bulkUpsertProducts = useCallback(
    async (rows: Product[]) => {
      if (!companyId || !rows.length) return;
      const payload = rows.map((r) => fromProduct({ ...r, companyId }));
      const { error } = await supabase.from("products").upsert(payload);
      if (fail(error, "Import products")) return;
      await logAudit("IMPORT", "PRODUCT", "csv", `${rows.length} products imported from CSV`);
      await loadData();
    },
    [companyId, logAudit, loadData],
  );

  const persistStock = useCallback(async (products: Product[]) => {
    await Promise.all(
      products.map((p) => supabase.from("products").update({ stock: p.stock }).eq("id", p.id)),
    );
  }, []);

  const saveDoc = useCallback(
    (d: Doc) => {
      const doc = { ...d, companyId: companyId ?? d.companyId };
      const existing = state.docs.find((x) => x.id === doc.id);
      let changedProducts: Product[] = [];
      setState((s) => {
        let products = s.products;
        if (doc.kind === "INVOICE") {
          const delta = new Map<string, number>();
          existing?.items.forEach((i) => delta.set(i.productId, (delta.get(i.productId) ?? 0) + i.qty));
          doc.items.forEach((i) => delta.set(i.productId, (delta.get(i.productId) ?? 0) - i.qty));
          products = s.products.map((p) =>
            delta.has(p.id) && delta.get(p.id) !== 0 ? { ...p, stock: p.stock + (delta.get(p.id) ?? 0) } : p,
          );
          changedProducts = products.filter((p, i) => p !== s.products[i]);
        }
        return {
          ...s,
          products,
          docs: existing ? s.docs.map((x) => (x.id === doc.id ? doc : x)) : [doc, ...s.docs],
        };
      });
      void (async () => {
        const { error } = await supabase.from("docs").upsert(fromDoc(doc));
        if (fail(error, "Save document")) return;
        if (changedProducts.length) await persistStock(changedProducts);
        await logAudit(
          existing ? "UPDATE" : "CREATE",
          doc.kind,
          doc.id,
          `${doc.number} · ${doc.items.length} line item(s)`,
        );
      })();
    },
    [companyId, state.docs, logAudit, persistStock],
  );

  const removeDoc = useCallback(
    (id: string) => {
      const doc = state.docs.find((d) => d.id === id);
      setState((s) => ({ ...s, docs: s.docs.filter((d) => d.id !== id) }));
      void (async () => {
        const { error } = await supabase.from("docs").delete().eq("id", id);
        if (!fail(error, "Delete document")) await logAudit("DELETE", doc?.kind ?? "DOC", id, doc?.number ?? id);
      })();
    },
    [state.docs, logAudit],
  );

  const convertDoc = useCallback(
    (id: string, target?: Doc["kind"]) => {
      const q = state.docs.find((d) => d.id === id);
      if (!q || !companyId) return null;
      const to = target ?? metaOf(q.kind).convertTo;
      if (!to) return null;
      const inv: Doc = {
        ...q,
        id: uid(),
        companyId,
        kind: to,
        number: nextNumber(to),
        date: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        status: "UNPAID",
      };

      delete inv.convertedTo;
      const updatedQ: Doc = { ...q, status: "ACCEPTED", convertedTo: inv.id };
      const changed: Product[] = [];
      const sign = to === "BILL" ? 1 : -1;
      setState((s) => ({
        ...s,
        docs: [inv, ...s.docs.map((d) => (d.id === id ? updatedQ : d))],
        products: s.products.map((p) => {
          const it = inv.items.find((i) => i.productId === p.id);
          if (!it) return p;
          const next = { ...p, stock: p.stock + sign * it.qty };
          changed.push(next);
          return next;
        }),
      }));
      void (async () => {
        const { error } = await supabase.from("docs").insert(fromDoc(inv));
        if (fail(error, "Convert document")) return;
        await supabase.from("docs").update({ status: "ACCEPTED", converted_to: inv.id }).eq("id", id);
        await persistStock(changed);
        await logAudit("CONVERT", to, inv.id, `${q.number} → ${inv.number}`);
      })();
      return inv;
    },
    [state.docs, companyId, nextNumber, logAudit, persistStock],
  );

  const convertQuotation = useCallback((id: string) => convertDoc(id, "INVOICE"), [convertDoc]);


  const addPayment = useCallback(
    (p: Payment) => {
      const pay = { ...p, companyId: companyId ?? p.companyId };
      let updatedDoc: Doc | undefined;
      setState((s) => {
        const payments = [pay, ...s.payments];
        const docs = s.docs.map((d) => {
          if (d.id !== pay.invoiceId || d.kind !== "INVOICE") return d;
          const total = computeTotals(d.items, s.company, s.parties.find((x) => x.id === d.partyId)).grandTotal;
          const paid = paidAgainst(d.id, payments);
          updatedDoc = { ...d, status: paid >= total - 0.5 ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID" };
          return updatedDoc;
        });
        return { ...s, payments, docs };
      });
      void (async () => {
        const { error } = await supabase.from("payments").insert(fromPayment(pay));
        if (fail(error, "Record payment")) return;
        if (updatedDoc) await supabase.from("docs").update({ status: updatedDoc.status }).eq("id", updatedDoc.id);
        await logAudit("CREATE", "PAYMENT", pay.id, `${pay.direction} ₹${pay.amount} · ${pay.mode} ${pay.reference}`);
      })();
    },
    [companyId, logAudit],
  );

  /* ---------- danger zone ---------- */
  const wipeData = useCallback(async () => {
    if (!companyId) return;
    await supabase.from("payments").delete().eq("company_id", companyId);
    await supabase.from("docs").delete().eq("company_id", companyId);
    await supabase.from("products").delete().eq("company_id", companyId);
    await supabase.from("parties").delete().eq("company_id", companyId);
    await logAudit("WIPE", "COMPANY", companyId, "All transactional and master data deleted");
    await loadData();
  }, [companyId, logAudit, loadData]);

  const loadSampleData = useCallback(async () => {
    if (!companyId) return;
    const partyIds = new Map(seedParties.map((p) => [p.id, uid()]));
    const productIds = new Map(seedProducts.map((p) => [p.id, uid()]));
    const docIds = new Map(seedDocs.map((d) => [d.id, uid()]));

    await supabase.from("companies").update(fromCompany({ ...seedCompany, id: companyId })).eq("id", companyId);
    await supabase.from("parties").insert(
      seedParties.map((p) => fromParty({ ...p, id: partyIds.get(p.id)!, companyId })),
    );
    await supabase.from("products").insert(
      seedProducts.map((p) => fromProduct({ ...p, id: productIds.get(p.id)!, companyId })),
    );
    await supabase.from("docs").insert(
      seedDocs.map((d) =>
        fromDoc({
          ...d,
          id: docIds.get(d.id)!,
          companyId,
          partyId: partyIds.get(d.partyId)!,
          items: d.items.map((i) => ({ ...i, productId: productIds.get(i.productId)! })),
        }),
      ),
    );
    await supabase.from("payments").insert(
      seedPayments.map((p) =>
        fromPayment({
          ...p,
          id: uid(),
          companyId,
          partyId: partyIds.get(p.partyId)!,
          ...(p.invoiceId ? { invoiceId: docIds.get(p.invoiceId)! } : {}),
        }),
      ),
    );
    await logAudit("SEED", "COMPANY", companyId, "Sample data loaded");
    await loadData();
  }, [companyId, logAudit, loadData]);

  const value = useMemo<Ctx>(
    () => ({
      state, user, loading, companies, companyId, audit,
      switchCompany, createCompany, signOut, can,
      refresh: loadData,
      draft, setDraft, totalOf, invoiceBalance, outstandingFor, nextNumber,
      setRole: () => toast.info("Your role is managed by the company admin."),
      updateCompany, upsertParty, removeParty, upsertProduct, removeProduct,
      bulkUpsertParties, bulkUpsertProducts,
      saveDoc, removeDoc, convertQuotation, addPayment,
      loadSampleData, wipeData,
      reset: () => void loadData(),
    }),
    [
      state, user, loading, companies, companyId, audit, switchCompany, createCompany, signOut, can,
      loadData, draft, totalOf, invoiceBalance, outstandingFor, nextNumber, updateCompany, upsertParty,
      removeParty, upsertProduct, removeProduct, bulkUpsertParties, bulkUpsertProducts, saveDoc, removeDoc,
      convertQuotation, addPayment, loadSampleData, wipeData,
    ],
  );

  return <ErpContext.Provider value={value}>{children}</ErpContext.Provider>;
}

export function useErp() {
  const ctx = useContext(ErpContext);
  if (!ctx) throw new Error("useErp must be used inside ErpProvider");
  return ctx;
}

export function useParty(id?: string) {
  const { state } = useErp();
  return state.parties.find((p) => p.id === id);
}
