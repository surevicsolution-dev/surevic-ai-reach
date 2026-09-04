import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Factory, Loader2, ReceiptIndianRupee, Boxes, BarChart3, Users, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const USPS = [
  { icon: ReceiptIndianRupee, title: "GST Invoicing", desc: "CGST / SGST / IGST handled automatically on every document." },
  { icon: Boxes, title: "Inventory Management", desc: "Live stock, low-stock alerts and part-number search." },
  { icon: BarChart3, title: "Real-Time Reports", desc: "Receivables, ageing and revenue updated as you bill." },
  { icon: Users, title: "Multi-user Access", desc: "Admin, Sales, Accounts and Warehouse roles per organization." },
];

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => setTab(mode), [mode]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  const google = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result?.error) throw result.error;
      if (!("redirected" in result && result.redirected)) navigate({ to: "/", replace: true });
    } catch (e) {
      toast.error((e as Error).message || "Google sign-in could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    if (!email.trim()) {
      toast.error("Enter your email first, then click Forgot password.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent — check your inbox.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      if (tab === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
        });
        if (error) throw error;
        if (data.session) {
          await supabase.from("profiles").upsert({ id: data.session.user.id, email, full_name: fullName });
          toast.success("Account created — let's set up your organization.");
          navigate({ to: "/", replace: true });
        } else {
          setSent(true);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await supabase.from("profiles").upsert({ id: data.user.id, email: data.user.email ?? email });
        toast.success("Welcome back.");
        navigate({ to: "/", replace: true });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const switchTab = (v: string) => {
    const next = v as "login" | "signup";
    setTab(next);
    setSent(false);
    navigate({ to: next === "login" ? "/login" : "/signup", replace: true });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[2fr_3fr]">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{ background: "radial-gradient(120% 90% at 0% 0%, hsl(var(--sidebar-accent)/0.55), transparent 60%)" }}
        />
        <div className="relative flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Factory className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="text-base font-semibold">Surevic ERP + AI</p>
            <p className="text-[11px] text-sidebar-foreground/60">GST cloud ERP workspace</p>
          </div>
        </div>

        <div className="relative space-y-6">
          <h2 className="max-w-sm text-2xl font-semibold leading-snug">
            Run billing, stock and receivables for every one of your organizations.
          </h2>
          <ul className="space-y-4">
            {USPS.map((u) => (
              <li key={u.title} className="flex gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
                  <u.icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">{u.title}</p>
                  <p className="text-xs text-sidebar-foreground/60">{u.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-[11px] text-sidebar-foreground/60">
          <CheckCircle2 className="size-3.5" /> Data isolated per organization · Role-based access
        </p>
      </aside>

      {/* Form panel */}
      <main className="grid place-items-center bg-muted/30 px-4 py-10">
        <div className="w-full max-w-sm space-y-5">
          <div className="flex items-center gap-2.5 lg:hidden">
            <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <Factory className="size-5" />
            </span>
            <p className="text-sm font-semibold">Surevic ERP + AI</p>
          </div>

          <div className="panel space-y-5 p-6">
            <Tabs value={tab} onValueChange={switchTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </Tabs>

            <div>
              <h1 className="text-lg font-semibold">
                {tab === "login" ? "Sign in to your workspace" : "Create your account"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {tab === "login" ? "Use your work email or continue with Google." : "Set up your first organization in two quick steps."}
              </p>
            </div>

            <Button variant="outline" className="w-full" disabled={busy} onClick={() => void google()}>
              <GoogleMark /> Continue with Google
            </Button>

            <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>

            {sent ? (
              <p className="rounded-md border bg-card p-3 text-sm text-muted-foreground">
                Check your inbox — we sent a confirmation link to <b>{email}</b>. Confirm it, then sign in.
              </p>
            ) : (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
              >
                {tab === "signup" && (
                  <div>
                    <Label>Full name</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Rajeev Setiya" />
                  </div>
                )}
                <div>
                  <Label>Work email</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.in" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Password</Label>
                    {tab === "login" && (
                      <button type="button" onClick={() => void forgotPassword()} className="text-xs font-medium text-primary hover:underline">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  {tab === "login" ? "Sign in" : "Create account"}
                </Button>
              </form>
            )}
          </div>

          <p className="text-center text-[11px] text-muted-foreground">
            By continuing you agree to keep your organization data accurate for GST filing.
          </p>
        </div>
      </main>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.5 2.6 30.1.5 24 .5 14.6.5 6.5 5.9 2.6 13.7l7.8 6.1C12.3 13.6 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.2-3.2-.5-4.7H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.3z" />
      <path fill="#FBBC05" d="M10.4 28.2a14.6 14.6 0 0 1 0-8.4l-7.8-6.1a23.5 23.5 0 0 0 0 20.6l7.8-6.1z" />
      <path fill="#34A853" d="M24 47.5c6.1 0 11.3-2 15.4-5.7l-7.5-5.8c-2.1 1.4-4.8 2.2-7.9 2.2-6.4 0-11.7-4.1-13.6-9.9l-7.8 6.1C6.5 42.1 14.6 47.5 24 47.5z" />
    </svg>
  );
}
