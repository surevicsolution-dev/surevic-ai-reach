import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { seedState } from "./seed";
import type { Doc, DocItem, ErpState, Party, Payment, Product, Role } from "./types";
import { computeTotals, paidAgainst } from "./gst";

const KEY = "surevic-erp-v1";

interface Ctx {
  state: ErpState;
  setRole: (r: Role) => void;
  updateCompany: (patch: Partial<ErpState["company"]>) => void;
  upsertParty: (p: Party) => void;
  removeParty: (id: string) => void;
  upsertProduct: (p: Product) => void;
  removeProduct: (id: string) => void;
  saveDoc: (d: Doc) => void;
  removeDoc: (id: string) => void;
  convertQuotation: (id: string) => Doc | null;
  addPayment: (p: Payment) => void;
  nextNumber: (kind: Doc["kind"]) => string;
  reset: () => void;
  outstandingFor: (partyId: string) => number;
  invoiceBalance: (doc: Doc) => number;
  totalOf: (doc: Doc) => number;
  draft: { partyId?: string; items: DocItem[] } | null;
  setDraft: (d: { partyId?: string; items: DocItem[] } | null) => void;
}

const ErpContext = createContext<Ctx | null>(null);
export const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export function ErpProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ErpState>(seedState);
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState<{ partyId?: string; items: DocItem[] } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState(JSON.parse(raw) as ErpState);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, hydrated]);

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

  const value = useMemo<Ctx>(
    () => ({
      state,
      draft,
      setDraft,
      totalOf,
      invoiceBalance,
      outstandingFor,
      nextNumber,
      setRole: (role) => setState((s) => ({ ...s, role })),
      updateCompany: (patch) => setState((s) => ({ ...s, company: { ...s.company, ...patch } })),
      upsertParty: (p) =>
        setState((s) => ({
          ...s,
          parties: s.parties.some((x) => x.id === p.id)
            ? s.parties.map((x) => (x.id === p.id ? p : x))
            : [p, ...s.parties],
        })),
      removeParty: (id) => setState((s) => ({ ...s, parties: s.parties.filter((p) => p.id !== id) })),
      upsertProduct: (p) =>
        setState((s) => ({
          ...s,
          products: s.products.some((x) => x.id === p.id)
            ? s.products.map((x) => (x.id === p.id ? p : x))
            : [p, ...s.products],
        })),
      removeProduct: (id) => setState((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) })),
      saveDoc: (d) =>
        setState((s) => {
          const existing = s.docs.find((x) => x.id === d.id);
          let products = s.products;
          if (d.kind === "INVOICE") {
            // reverse old consumption, apply new
            const delta = new Map<string, number>();
            existing?.items.forEach((i) => delta.set(i.productId, (delta.get(i.productId) ?? 0) + i.qty));
            d.items.forEach((i) => delta.set(i.productId, (delta.get(i.productId) ?? 0) - i.qty));
            products = s.products.map((p) =>
              delta.has(p.id) ? { ...p, stock: p.stock + (delta.get(p.id) ?? 0) } : p,
            );
          }
          return {
            ...s,
            products,
            docs: existing ? s.docs.map((x) => (x.id === d.id ? d : x)) : [d, ...s.docs],
          };
        }),
      removeDoc: (id) => setState((s) => ({ ...s, docs: s.docs.filter((d) => d.id !== id) })),
      convertQuotation: (id) => {
        const q = state.docs.find((d) => d.id === id);
        if (!q) return null;
        const inv: Doc = {
          ...q,
          id: uid("dc"),
          kind: "INVOICE",
          number: nextNumber("INVOICE"),
          date: new Date().toISOString().slice(0, 10),
          dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          status: "UNPAID",
        };
        delete inv.convertedTo;
        setState((s) => ({
          ...s,
          docs: [inv, ...s.docs.map((d) => (d.id === id ? { ...d, status: "ACCEPTED" as const, convertedTo: inv.id } : d))],
          products: s.products.map((p) => {
            const it = inv.items.find((i) => i.productId === p.id);
            return it ? { ...p, stock: p.stock - it.qty } : p;
          }),
        }));
        return inv;
      },
      addPayment: (p) =>
        setState((s) => {
          const payments = [p, ...s.payments];
          const docs = s.docs.map((d) => {
            if (d.id !== p.invoiceId || d.kind !== "INVOICE") return d;
            const total = computeTotals(d.items, s.company, s.parties.find((x) => x.id === d.partyId)).grandTotal;
            const paid = paidAgainst(d.id, payments);
            return { ...d, status: paid >= total - 0.5 ? ("PAID" as const) : paid > 0 ? ("PARTIAL" as const) : ("UNPAID" as const) };
          });
          return { ...s, payments, docs };
        }),
      reset: () => setState(seedState),
    }),
    [state, draft, totalOf, invoiceBalance, outstandingFor, nextNumber],
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
