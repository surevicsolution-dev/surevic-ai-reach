import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useErp } from "@/lib/erp/store";
import { routeMessage } from "@/lib/erp/copilot-tools";
import type { DocItem } from "@/lib/erp/types";

interface Msg {
  role: "user" | "ai";
  text: string;
  tool?: string;
  draft?: { partyId?: string; items: DocItem[] };
}

const SUGGESTIONS = [
  "Tata Motors ka outstanding kitna hai?",
  "SICK ka stock check karo",
  "Aaj ke payment follow-ups",
  "Draft quotation for Bharat Forge: 5 E3Z-D62, 2 S7-1200",
];

export function Copilot() {
  const { state, setDraft } = useErp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "ai",
      text: "Namaste! Main Surevic Copilot hoon 🤖 — outstanding, stock, follow-ups aur quotation drafting sab kar sakta hoon. Bataiye kya chahiye?",
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    setTimeout(() => {
      const res = routeMessage(state, text);
      setMsgs((m) => [...m, { role: "ai", text: res.text, tool: res.tool, ...(res.draft ? { draft: res.draft } : {}) }]);
      setBusy(false);
    }, 420);
  };

  return (
    <div className="no-print">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-float)] transition-transform hover:scale-105"
        >
          <Sparkles className="size-4" />
          Ask Copilot
          <kbd className="rounded bg-primary-foreground/15 px-1.5 py-0.5 text-[10px]">Alt+K</kbd>
        </button>
      )}

      {open && (
        <div className="fixed bottom-4 right-4 z-50 flex h-[min(620px,85vh)] w-[min(410px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-float)]">
          <div className="flex items-center gap-2 border-b bg-sidebar px-4 py-3 text-sidebar-foreground">
            <span className="grid size-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Bot className="size-4" />
            </span>
            <div className="flex-1 leading-tight">
              <p className="text-sm font-semibold">Surevic AI Copilot</p>
              <p className="text-[11px] text-sidebar-foreground/60">Connected to live ERP data</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close copilot" className="rounded p-1 hover:bg-sidebar-accent">
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[86%] whitespace-pre-wrap rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  {m.tool && m.tool !== "chat" && (
                    <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      tool · {m.tool}
                    </p>
                  )}
                  {m.text.split("**").map((part, idx) => (idx % 2 ? <strong key={idx}>{part}</strong> : part))}
                  {m.draft && (
                    <Button
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => {
                        setDraft(m.draft!);
                        setOpen(false);
                        navigate({ to: "/doc/new/$kind", params: { kind: "quotation" } });
                      }}
                    >
                      Open pre-filled quotation
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {busy && <p className="px-1 text-xs text-muted-foreground">Copilot soch raha hai…</p>}
            <div ref={endRef} />
          </div>

          <div className="border-t px-3 py-2">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent/20 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask in Hinglish or English…" />
              <Button type="submit" size="icon" disabled={busy}>
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
