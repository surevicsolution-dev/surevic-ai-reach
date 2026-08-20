import type { ErpState, DocItem } from "./types";
import { computeTotals, inr, fmtDate, paidAgainst } from "./gst";

export interface ToolResult {
  tool: string;
  text: string;
  draft?: { partyId?: string; items: DocItem[] };
}

const findParty = (state: ErpState, q: string) => {
  const needle = q.toLowerCase().trim();
  return (
    state.parties.find((p) => p.name.toLowerCase() === needle) ??
    state.parties.find((p) => p.name.toLowerCase().includes(needle)) ??
    state.parties.find((p) => needle.split(/\s+/).some((w) => w.length > 3 && p.name.toLowerCase().includes(w)))
  );
};

const totalOf = (state: ErpState, docId: string) => {
  const d = state.docs.find((x) => x.id === docId)!;
  return computeTotals(d.items, state.company, state.parties.find((p) => p.id === d.partyId)).grandTotal;
};

export function get_party_outstanding(state: ErpState, partyName: string): ToolResult {
  const party = findParty(state, partyName);
  if (!party) return { tool: "get_party_outstanding", text: `Sorry, "${partyName}" naam ka koi party master mein nahi mila.` };
  const invoices = state.docs
    .filter((d) => d.kind === "INVOICE" && d.partyId === party.id && d.status !== "CANCELLED")
    .map((d) => ({ d, bal: +(totalOf(state, d.id) - paidAgainst(d.id, state.payments)).toFixed(2) }))
    .filter((x) => x.bal > 0.5);
  const total = invoices.reduce((a, b) => a + b.bal, 0);
  if (!invoices.length) return { tool: "get_party_outstanding", text: `${party.name} ka koi outstanding nahi hai — account fully settled hai. 👍` };
  const lines = invoices
    .map((x) => `• ${x.d.number} (${fmtDate(x.d.date)}, due ${x.d.dueDate ? fmtDate(x.d.dueDate) : "—"}) — ${inr(x.bal)} [${x.d.status}]`)
    .join("\n");
  return {
    tool: "get_party_outstanding",
    text: `${party.name} ka total outstanding **${inr(total)}** hai across ${invoices.length} invoice(s):\n${lines}\n\nCredit limit ${inr(party.creditLimit)}.`,
  };
}

export function check_product_stock(state: ErpState, query: string): ToolResult {
  const q = query.toLowerCase().trim();
  const hits = state.products.filter(
    (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q),
  );
  if (!hits.length) return { tool: "check_product_stock", text: `"${query}" ke liye koi item inventory mein nahi mila.` };
  const lines = hits
    .slice(0, 8)
    .map((p) => `• ${p.name} (${p.sku}) — ${p.stock} ${p.unit} ${p.stock <= p.minQty ? "⚠️ below reorder level" : "✅"} · ${inr(p.sellingPrice)}`)
    .join("\n");
  return { tool: "check_product_stock", text: `Stock position for "${query}":\n${lines}` };
}

export function get_payment_followups(state: ErpState, date?: string): ToolResult {
  const target = date ?? new Date().toISOString().slice(0, 10);
  const due = state.docs.filter((d) => d.kind === "INVOICE" && d.followUpDate && d.followUpDate <= target);
  if (!due.length) return { tool: "get_payment_followups", text: `${fmtDate(target)} ke liye koi payment follow-up pending nahi hai.` };
  const lines = due
    .map((d) => {
      const party = state.parties.find((p) => p.id === d.partyId);
      const bal = totalOf(state, d.id) - paidAgainst(d.id, state.payments);
      return `• ${party?.name} — ${d.number} — ${inr(bal)} (follow-up ${fmtDate(d.followUpDate!)})`;
    })
    .join("\n");
  return { tool: "get_payment_followups", text: `Follow-ups due till ${fmtDate(target)}:\n${lines}` };
}

export function draft_quotation(state: ErpState, customerName: string, itemsText: string): ToolResult {
  const party = findParty(state, customerName);
  const items: DocItem[] = [];
  const chunks = itemsText.split(/,| and /i);
  for (const chunk of chunks) {
    const qtyMatch = chunk.match(/(\d+)\s*(?:nos|pcs|units|x)?/i);
    const qty = qtyMatch ? parseInt(qtyMatch[1]!, 10) : 1;
    const words = chunk.replace(/\d+\s*(nos|pcs|units|x)?/gi, "").trim().toLowerCase();
    if (!words) continue;
    const prod =
      state.products.find((p) => p.sku.toLowerCase().includes(words)) ??
      state.products.find((p) => p.name.toLowerCase().includes(words)) ??
      state.products.find((p) => words.split(/\s+/).some((w) => w.length > 2 && p.name.toLowerCase().includes(w)));
    if (prod) items.push({ productId: prod.id, name: prod.name, hsn: prod.hsn, qty, rate: prod.sellingPrice, taxRate: prod.taxRate, unit: prod.unit });
  }
  if (!items.length) return { tool: "draft_quotation", text: "Items identify nahi ho paaye. Try: draft quotation for Tata Motors: 5 E3Z-D62, 2 S7-1200" };
  const totals = computeTotals(items, state.company, party);
  const lines = items.map((i) => `• ${i.qty} × ${i.name} @ ${inr(i.rate)}`).join("\n");
  return {
    tool: "draft_quotation",
    text: `Quotation draft ready${party ? ` for ${party.name}` : ""}:\n${lines}\n\nTaxable ${inr(totals.taxable)} · GST ${inr(totals.taxTotal)} · Grand Total **${inr(totals.grandTotal)}**\nOpen the pre-filled quotation form below.`,
    ...(party ? { draft: { partyId: party.id, items } } : { draft: { items } }),
  };
}

export function routeMessage(state: ErpState, msg: string): ToolResult {
  const m = msg.toLowerCase();
  const draftMatch = msg.match(/(?:draft|banao|make|create).*?quotation\s*(?:for|ke liye)?\s*([^:]+):?(.*)/i);
  if (draftMatch) return draft_quotation(state, draftMatch[1]!.trim(), draftMatch[2] ?? "");
  if (/follow ?-?up|today.*due|aaj.*due|receivable.*today/.test(m)) return get_payment_followups(state);
  if (/stock|inventory|available|kitna maal|qty|quantity/.test(m)) {
    const brand = state.products.find((p) => m.includes(p.brand.toLowerCase()))?.brand;
    const term = brand ?? m.replace(/.*(stock|inventory|of|for|kitna|available)/, "").replace(/[?.]/g, "").trim();
    return check_product_stock(state, term || "SICK");
  }
  if (/outstanding|balance|bakaya|due|pending payment|owe/.test(m)) {
    const party = state.parties.find((p) => m.includes(p.name.toLowerCase().split(" ")[0]!.toLowerCase()));
    return get_party_outstanding(state, party?.name ?? msg.replace(/.*(outstanding|balance|bakaya|due|of|for)/, "").trim());
  }
  return {
    tool: "chat",
    text:
      "Main Surevic AI Copilot hoon. Ye poochh sakte ho:\n• *Tata Motors ka outstanding kitna hai?*\n• *SICK sensors ka stock check karo*\n• *Aaj ke payment follow-ups dikhao*\n• *Draft quotation for Bharat Forge: 5 E3Z-D62, 2 S7-1200*",
  };
}
