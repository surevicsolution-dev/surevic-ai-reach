import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Check, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { useErp } from "@/lib/erp/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your organization — Surevic ERP" },
      { name: "description", content: "Create your GST-ready business workspace in two quick steps." },
      { property: "og:title", content: "Set up your organization — Surevic ERP" },
      { property: "og:description", content: "Create your GST-ready business workspace in two quick steps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OnboardingPage,
});

const STATES: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "27": "Maharashtra", "29": "Karnataka", "30": "Goa", "32": "Kerala", "33": "Tamil Nadu",
  "34": "Puducherry", "36": "Telangana", "37": "Andhra Pradesh",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const INDUSTRIES = [
  "Automation & Electrical", "Manufacturing", "Trading & Distribution", "Services",
  "Retail", "Construction", "IT & Software", "Other",
];

function OnboardingPage() {
  const { createCompany, user, companies } = useErp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [stateCode, setStateCode] = useState("27");
  const [address, setAddress] = useState("");

  const [baseCurrency, setBaseCurrency] = useState("INR");
  const [fyStartMonth, setFyStartMonth] = useState("4");
  const [industry, setIndustry] = useState("Automation & Electrical");

  const onGstin = (raw: string) => {
    const v = raw.toUpperCase().slice(0, 15);
    setGstin(v);
    const code = v.slice(0, 2);
    if (STATES[code]) { setStateCode(code); setState(STATES[code]!); }
  };

  const submit = async () => {
    setBusy(true);
    const id = await createCompany(name.trim(), {
      legalName: name.trim(), gstin, state, stateCode, address,
      country: "India", baseCurrency, fyStartMonth: Number(fyStartMonth), industry,
    });
    setBusy(false);
    if (id) navigate({ to: "/" });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-xl space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Set up your organization</h1>
            <p className="text-xs text-muted-foreground">Signed in as {user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {[1, 2].map((s) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <span className={`grid size-6 place-items-center rounded-full text-[11px] font-semibold ${
                step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {step > s ? <Check className="size-3.5" /> : s}
              </span>
              <span className={step >= s ? "font-medium" : "text-muted-foreground"}>
                {s === 1 ? "Business profile" : "Regional preferences"}
              </span>
              {s === 1 && <div className="h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        <div className="panel space-y-3 p-6">
          {step === 1 ? (
            <>
              <div><Label>Organization name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Surevic Automation Pvt. Ltd." /></div>
              <div><Label>GSTIN (optional)</Label>
                <Input className="tabular" value={gstin} onChange={(e) => onGstin(e.target.value)} placeholder="27ABCDE1234F1Z5" />
                <p className="mt-1 text-[11px] text-muted-foreground">State is detected automatically from the GSTIN prefix.</p></div>
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <div><Label>State</Label><Input value={state} onChange={(e) => setState(e.target.value)} /></div>
                <div><Label>State code</Label><Input className="tabular" value={stateCode} onChange={(e) => setStateCode(e.target.value)} /></div>
              </div>
              <div><Label>Registered address</Label>
                <Textarea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Plot 21, MIDC, Pune 411019" /></div>
              <div className="flex justify-between pt-1">
                {companies.length > 0 ? (
                  <Button variant="ghost" onClick={() => navigate({ to: "/select-organization" })}>Cancel</Button>
                ) : <span />}
                <Button disabled={!name.trim()} onClick={() => setStep(2)}>Continue <ArrowRight className="size-4" /></Button>
              </div>
            </>
          ) : (
            <>
              <div><Label>Country</Label><Input value="India" readOnly className="bg-muted/50" /></div>
              <div><Label>Base currency</Label>
                <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">₹ INR — Indian Rupee</SelectItem>
                    <SelectItem value="USD">$ USD — US Dollar</SelectItem>
                    <SelectItem value="AED">AED — UAE Dirham</SelectItem>
                  </SelectContent>
                </Select></div>
              <div><Label>Financial year starts</Label>
                <Select value={fyStartMonth} onValueChange={setFyStartMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div><Label>Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div className="flex justify-between pt-1">
                <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="size-4" /> Back</Button>
                <Button disabled={busy} onClick={submit}>
                  {busy && <Loader2 className="size-4 animate-spin" />} Create organization
                </Button>
              </div>
            </>
          )}
        </div>
        <p className="text-center text-[11px] text-muted-foreground">
          You become the ADMIN of this workspace. Load sample data later from Settings → Danger Zone.
        </p>
      </div>
    </div>
  );
}
