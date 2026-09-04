import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Factory, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Surevic ERP + AI" },
      { name: "description", content: "Set a new password for your Surevic ERP workspace account." },
      { property: "og:title", content: "Reset password — Surevic ERP + AI" },
      { property: "og:description", content: "Set a new password for your Surevic ERP account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValid(true);
        setReady(true);
      }
    });
    if (isRecovery) {
      // Wait for the recovery session to hydrate via onAuthStateChange.
      const t = setTimeout(() => {
        setReady(true);
        supabase.auth.getSession().then(({ data }) => setValid(!!data.session));
      }, 1500);
      return () => {
        clearTimeout(t);
        sub.subscription.unsubscribe();
      };
    }
    setReady(true);
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Password updated.");
      setTimeout(() => navigate({ to: "/", replace: true }), 1200);
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

        <h1 className="text-lg font-semibold">Set a new password</h1>

        {!ready ? (
          <div className="grid h-24 place-items-center"><Loader2 className="size-5 animate-spin" /></div>
        ) : done ? (
          <p className="rounded-md border bg-card p-3 text-sm text-muted-foreground">
            Password updated — redirecting you to the dashboard…
          </p>
        ) : !valid ? (
          <div className="space-y-3">
            <p className="rounded-md border bg-card p-3 text-sm text-muted-foreground">
              This reset link is invalid or has expired. Request a new one from the sign-in page.
            </p>
            <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/login" })}>
              Back to sign in
            </Button>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div>
              <Label>New password</Label>
              <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <Label>Confirm new password</Label>
              <Input type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Update password
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
