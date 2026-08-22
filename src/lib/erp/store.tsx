import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Doc, DocItem, ErpState, Party, Payment, Product, Role } from "./types";
import { computeTotals, paidAgainst } from "./gst";
import {
  fromCompany, fromDoc, fromParty, fromPayment, fromProduct,
  toAudit, toCompany, toDoc, toParty, toPayment, toProduct, type AuditEntry,
} from "./mappers";
import { emptyCompany, sampleDataFor } from "./seed";

export const uid = (_prefix?: string) =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const LAST_CO_KEY = "surevic-active-company";

export type Permission =
  | "masters" | "sales" | "accounts" | "inventory" | "settings" | "audit";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: ["masters", "sales", "accounts", "inventory", "settings", "audit"],
  SALES: ["masters", "sales", "inventory"],
  ACCOUNTS: ["accounts", "sales", "audit"],
  WAREHOUSE: ["inventory"],
};

export interface CompanyOption { id: string; name: string; role: Role }

interface Ctx {
  state: ErpState;
  loading: boolean;
  ready: boolean;
  role: Role;
  can: (p: Permission) => boolean;
  profile: { id: string; email: string; fullName: string } | null;
  companies: CompanyOption[];
  companyId: string;
  switchCompany: (id: string) => void;
  audit: AuditEntry[];
  refresh: () => Promise<void>;
  updateCompany: (patch: Partial<ErpState["company"]>) => void;
  upsertParty: (p: Party) => void;
  removeParty: (id: string) => void;
  importParties: (rows: Party[]) => Promise<void>;
  upsertProduct: (p: Product) => void;
  removeProduct: (id: string) => void;
  importProducts: (rows: Product[]) => Promise<void>;
  saveDoc: (d: Doc) => void;
  removeDoc: (id: string) => void;
  convertQuotation: (id: string) => Doc | null;
  addPayment: (p: Payment) => void;
  nextNumber: (kind: Doc["kind"]) => string;
  loadSampleData: () => Promise<void>;
  wipeAllData: () => Promise<void>;
  outstandingFor: (partyId: string) => number;
  invoiceBalance: (doc: Doc) => number;
  totalOf: (doc: Doc) => number;
  draft: { partyId?: string; items: DocItem[] } | null;
  setDraft: (d: { partyId?: string; items: DocItem[] } | null) => void;
}

const ErpContext = createContext<Ctx | null>(null);

const emptyState = (): ErpState => ({
  company: emptyCompany(""),
  role: "ADMIN",
  parties: [],
  products: [],
  docs: [],
  payments: [],
});

export function ErpProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ErpState>(emptyState);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyId, setCompanyId] = useState<string>("");
  const [profile, setProfile] = useState<Ctx["profile"]>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<{ partyId?: string; items: DocItem[] } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  /* ---------- audit ---------- */
  const log = useCallback(
    async (action: string, entity: string, entityId: string, summary: string) => {
      if (!companyId) return;
      const { data } = await supabase
        .from("audit_log")
        .insert({
          company_id: companyId,
          user_email: profile?.email ?? "",
          action, entity, entity_id: entityId, summary,
        })
        .select()
        .maybeSingle();
      if (data) setAudit((a) => [toAudit(data), ...a]);
    },
    [companyId, profile?.email],
  );

  /* ---------- bootstrap: profile + companies ---------- */
  const loadCompanies = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) { setLoading(false); return; }
    setProfile({
      id: user.id,
      email: user.email ?? "",
      fullName: (user.user_metadata?.["full_name"] as string) ?? user.email ?? "",
    });

    const { data: memberships } = await supabase
      .from("company_members")
      .select("company_id, role, companies(id, name)")
      .eq("user_id", user.id);

    const opts: CompanyOption[] = (memberships ?? [])
      .filter((m) => m.companies)
      .map((m) => ({
        id: m.company_id,
        name: (m.companies as { name: string }).name,
        role: m.role as Role,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    setCompanies(opts);
    const stored = typeof window !== "undefined" ? localStorage.getItem(LAST_CO_KEY) : null;
    const pick = opts.find((o) => o.id === stored)?.id ?? opts[0]?.id ?? "";
    setCompanyId(pick);
    if (!pick) { setLoading(false); setReady(true); }
  }, []);

  useEffect(() => { void loadCompanies(); }, [loadCompanies]);

  /* ---------- load company data ---------- */
  const loadCompanyData = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    const [co, parties, products, docs, payments, auditRows] = await Promise.all([
      supabase.from("companies").select("*").eq("id", id).maybeSingle(),
      supabase.from("parties").select("*").eq("company_id", id).order("name"),
      supabase.from("products").select("*").eq("company_id", id).order("name"),
      supabase.from("docs").select("*").eq("company_id", id).order("date", { ascending: false }),
      supabase.from("payments").select("*").eq("company_id", id).order("date", { ascending: false }),
      supabase.from("audit_log").select("*").eq("company_id", id).order("created_at", { ascending: false }).limit(300),
    ]);

    const role = companies.find((c) => c.id === id)?.role ?? "ADMIN";
    setState({
      company: co.data ? toCompany(co.data) : emptyCompany(id),
      role,
      parties: (parties.data ?? []).map(toParty),
      products: (products.data ?? []).map(toProduct),
      docs: (docs.data ?? []).map(toDoc),
      payments: (payments.data ?? []).map(toPayment),
    });
    setAudit((auditRows.data ?? []).map(toAudit));
    setLoading(false);
    setReady(true);
  }, [companies]);

  useEffect(() => {
    if (!companyId) return;
    localStorage.setItem(LAST_CO_KEY, companyId);
    void loadCompanyData(companyId);
  }, [companyId, loadCompanyData]);

  const refresh = useCallback(async () => {
    await loadCompanies();
    if (companyId) await loadCompanyData(companyId);
  }, [loadCompanies, loadCompanyData, companyId]);

  /* ---------- derived ---------- */
  const totalOf = useCallback(
    (doc: Doc) =>
      computeTotals(doc.items, state.company, state.parties.find((p) => p.id === doc.partyId)).grandTotal,
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
      const prefix = kind === "INVOICE" ? state.company.invoicePrefix : state.company.quotePrefix;
      const nums = state.docs
        .filter((d) => d.kind === kind)
        .map((d) => parseInt(d.number.replace(/\D/g, "").slice(-4), 10) || 0);
      const next = (nums.length ? Math.max(...nums) : 0) + 1;
      return `${prefix}${String(next).padStart(4, "0")}`;
    },
    [state.docs, state.company],
  );

  /* ---------- mutations ---------- */
  const persistProducts = useCallback(async (list: Product[]) => {
    if (!list.length) return;
    await supabase.from("products").upsert(list.map(fromProduct));
  }, []);

  const value = useMemo<Ctx>(() => {
    const role = state.role;
    return {
      state, loading, ready, role, audit, profile, companies, companyId, refresh,
      draft, setDraft, totalOf, invoiceBalance, outstandingFor, nextNumber,
      can: (p) => ROLE_PERMISSIONS[role].includes(p),
      switchCompany: (id) => { setCompanyId(id); },

      updateCompany: (patch) => {
        setState((s) => ({ ...s, company: { ...s.company, ...patch } }));
        void supabase.from("companies").update(fromCompany(patch)).eq("id", companyId);
      },

      upsertParty: (p) => {
        const isNew = !state.parties.some((x) => x.id === p.id);
        setState((s) => ({
          ...s,
          parties: isNew ? [p, ...s.parties] : s.parties.map((x) => (x.id === p.id ? p : x)),
        }));
        void supabase.from("parties").upsert(fromParty({ ...p, companyId })).then(() =>
          log(isNew ? "CREATE" : "UPDATE", "PARTY", p.id, p.name));
      },
      removeParty: (id) => {
        const name = state.parties.find((p) => p.id === id)?.name ?? id;
        setState((s) => ({ ...s, parties: s.parties.filter((p) => p.id !== id) }));
        void supabase.from("parties").delete().eq("id", id).then(() => log("DELETE", "PARTY", id, name));
      },
      importParties: async (rows) => {
        const withCo = rows.map((r) => ({ ...r, companyId }));
        await supabase.from("parties").upsert(withCo.map(fromParty));
        setState((s) => ({ ...s, parties: [...withCo, ...s.parties] }));
        await log("IMPORT", "PARTY", "", `${rows.length} parties imported from CSV`);
      },

      upsertProduct: (p) => {
        const isNew = !state.products.some((x) => x.id === p.id);
        setState((s) => ({
          ...s,
          products: isNew ? [p, ...s.products] : s.products.map((x) => (x.id === p.id ? p : x)),
        }));
        void supabase.from("products").upsert(fromProduct({ ...p, companyId })).then(() =>
          log(isNew ? "CREATE" : "UPDATE", "PRODUCT", p.id, p.name));
      },
      removeProduct: (id) => {
        const name = state.products.find((p) => p.id === id)?.name ?? id;
        setState((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }));
        void supabase.from("products").delete().eq("id", id).then(() => log("DELETE", "PRODUCT", id, name));
      },
      importProducts: async (rows) => {
        const withCo = rows.map((r) => ({ ...r, companyId }));
        await supabase.from("products").upsert(withCo.map(fromProduct));
        setState((s) => ({ ...s, products: [...withCo, ...s.products] }));
        await log("IMPORT", "PRODUCT", "", `${rows.length} products imported from CSV`);
      },

      saveDoc: (d) => {
        const doc = { ...d, companyId };
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
            ...s, products,
            docs: existing ? s.docs.map((x) => (x.id === doc.id ? doc : x)) : [doc, ...s.docs],
          };
        });
        void (async () => {
          await supabase.from("docs").upsert(fromDoc(doc));
          await persistProducts(changedProducts);
          await log(existing ? "UPDATE" : "CREATE", doc.kind, doc.id, `${doc.number} · ${doc.items.length} line(s)`);
        })();
      },
      removeDoc: (id) => {
        const doc = state.docs.find((d) => d.id === id);
        setState((s) => ({ ...s, docs: s.docs.filter((d) => d.id !== id) }));
        void supabase.from("docs").delete().eq("id", id).then(() =>
          log("DELETE", doc?.kind ?? "DOC", id, doc?.number ?? id));
      },

      convertQuotation: (id) => {
        const q = state.docs.find((d) => d.id === id);
        if (!q) return null;
        const inv: Doc = {
          ...q,
          id: uid(),
          kind: "INVOICE",
          number: nextNumber("INVOICE"),
          date: new Date().toISOString().slice(0, 10),
          dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          status: "UNPAID",
        };
        delete inv.convertedTo;
        const updatedQ: Doc = { ...q, status: "ACCEPTED", convertedTo: inv.id };
        let changedProducts: Product[] = [];
        setState((s) => {
          const products = s.products.map((p) => {
            const it = inv.items.find((i) => i.productId === p.id);
            return it ? { ...p, stock: p.stock - it.qty } : p;
          });
          changedProducts = products.filter((p, i) => p !== s.products[i]);
          return {
            ...s,
            products,
            docs: [inv, ...s.docs.map((d) => (d.id === id ? updatedQ : d))],
          };
        });
        void (async () => {
          await supabase.from("docs").upsert([fromDoc(inv), fromDoc(updatedQ)]);
          await persistProducts(changedProducts);
          await log("CONVERT", "INVOICE", inv.id, `${q.number} converted to ${inv.number}`);
        })();
        return inv;
      },

      addPayment: (p) => {
        const pay = { ...p, companyId };
        let changedDocs: Doc[] = [];
        setState((s) => {
          const payments = [pay, ...s.payments];
          const docs = s.docs.map((d) => {
            if (d.id !== pay.invoiceId || d.kind !== "INVOICE") return d;
            const total = computeTotals(d.items, s.company, s.parties.find((x) => x.id === d.partyId)).grandTotal;
            const paid = paidAgainst(d.id, payments);
            const status = paid >= total - 0.5 ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID";
            return { ...d, status } as Doc;
          });
          changedDocs = docs.filter((d, i) => d !== s.docs[i]);
          return { ...s, payments, docs };
        });
        void (async () => {
          await supabase.from("payments").insert(fromPayment(pay));
          if (changedDocs.length) await supabase.from("docs").upsert(changedDocs.map(fromDoc));
          await log("CREATE", "PAYMENT", pay.id, `${pay.mode} ₹${pay.amount} · ${pay.reference}`);
        })();
      },

      loadSampleData: async () => {
        const data = sampleDataFor(companyId);
        await supabase.from("companies").update(fromCompany(data.company)).eq("id", companyId);
        await supabase.from("parties").upsert(data.parties.map(fromParty));
        await supabase.from("products").upsert(data.products.map(fromProduct));
        await supabase.from("docs").upsert(data.docs.map(fromDoc));
        await supabase.from("payments").upsert(data.payments.map(fromPayment));
        await log("SEED", "COMPANY", companyId, "Sample data loaded");
        await loadCompanyData(companyId);
      },

      wipeAllData: async () => {
        await supabase.from("payments").delete().eq("company_id", companyId);
        await supabase.from("docs").delete().eq("company_id", companyId);
        await supabase.from("products").delete().eq("company_id", companyId);
        await supabase.from("parties").delete().eq("company_id", companyId);
        await log("WIPE", "COMPANY", companyId, "All transactional data deleted");
        await loadCompanyData(companyId);
      },
    };
  }, [
    state, loading, ready, audit, profile, companies, companyId, draft,
    totalOf, invoiceBalance, outstandingFor, nextNumber, log, refresh, loadCompanyData, persistProducts,
  ]);

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
