import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Factory, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (data.session) {
          await supabase.from("profiles").upsert({ id: data.session.user.id, email, full_name: fullName });
          navigate({ to: "/", replace: true });
        } else {
          setSent(true);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await supabase.from("profiles").upsert({ id: data.user.id, email: data.user.email ?? email });
        navigate({ to: "/", replace: true });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 px-4">
      <div className="panel w-full max-w-sm space-y-4 p-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Factory className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Surevic ERP + AI</p>
            <p className="text-[11px] text-muted-foreground">GST cloud ERP workspace</p>
          </div>
        </div>

        <h1 className="text-lg font-semibold">{mode === "login" ? "Sign in" : "Create your account"}</h1>

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
            {mode === "signup" && (
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
              <Label>Password</Label>
              <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "login" ? "Sign in" : "Sign up"}
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {mode === "login" ? (
            <>New here? <Link to="/signup" className="font-medium text-primary hover:underline">Create an account</Link></>
          ) : (
            <>Already registered? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
