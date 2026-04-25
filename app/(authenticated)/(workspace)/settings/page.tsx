"use client";

import { useMemo, useState } from "react";
import { useStandardWallets } from "@privy-io/react-auth/solana";
import { usePrivyUmbraSigner } from "@/hooks/use-privy-umbra-signer";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { useMerchantProfile } from "@/components/merchant-profile-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUmbraRuntimeNetwork } from "@/lib/umbra/config";
import { useSaveUmbraRegistrationMutation } from "@/features/merchant-profiles/queries";
import {
  runMerchantUmbraRegistration,
  type MerchantUmbraRegistrationStepId,
} from "@/features/merchant-profiles/umbra-registration";
import type { UmbraRegistrationStatus } from "@/features/merchant-profiles/types";

export default function SettingsPage() {
  return <SettingsContent />;
}

function SettingsContent() {
  const { profile } = useMerchantProfile();
  const standardWallets = useStandardWallets();
  const {
    wallet: merchantWallet,
    signTransaction,
    signMessage,
  } = usePrivyUmbraSigner(profile.walletAddress);
  const saveUmbraRegistration = useSaveUmbraRegistrationMutation();
  const runtimeNetwork = useMemo(() => getUmbraRuntimeNetwork(), []);
  const [registrationStep, setRegistrationStep] =
    useState<MerchantUmbraRegistrationStepId | null>(null);
  const [registrationError, setRegistrationError] = useState("");
  const isUmbraRegistrationRunning =
    registrationStep !== null &&
    registrationStep !== "complete" &&
    registrationStep !== "error";
  const effectiveUmbraStatus: UmbraRegistrationStatus =
    registrationStep === "complete"
      ? "ready"
      : isUmbraRegistrationRunning
        ? "registering"
        : registrationError
          ? "error"
          : profile.umbraStatus;

  async function handleUmbraSetup() {
    setRegistrationError("");

    if (!merchantWallet) {
      const msg = "Connect the Solana wallet attached to this merchant profile.";
      setRegistrationStep("error");
      setRegistrationError(msg);
      toast.error(msg);
      return;
    }

    try {
      const result = await runMerchantUmbraRegistration({
        wallet: merchantWallet,
        signTransaction,
        signMessage,
        onStep: setRegistrationStep,
      });

      setRegistrationStep("saving");
      await saveUmbraRegistration.mutateAsync(result);
      setRegistrationStep("complete");
      toast.success(
        result.signatures.length > 0
          ? "Umbra setup complete."
          : "Umbra setup already complete.",
      );
    } catch (setupError) {
      const message =
        setupError instanceof Error
          ? setupError.message
          : "Unable to complete Umbra setup.";
      setRegistrationStep("error");
      setRegistrationError(message);
      toast.error(message);
    }
  }

  return (
      <div className="mx-auto flex max-w-4xl flex-col gap-8 p-6 md:p-8">
        <header>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your business profile and privacy rails.
          </p>
        </header>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 border border-border bg-card">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="payment">Payment Rails</TabsTrigger>
            <TabsTrigger value="privacy">Privacy Controls</TabsTrigger>
          </TabsList>

          <div className="mt-8">
            <TabsContent value="general" className="m-0 flex flex-col gap-6">
              <Card className="border-card-border shadow-sm">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Business Profile</CardTitle>
                  <CardDescription>
                    Information displayed on your invoices and checkout pages.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label>Business Name</Label>
                      <Input defaultValue={profile.businessName} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Contact Email</Label>
                      <Input defaultValue={profile.contactEmail} type="email" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Business Address</Label>
                    <Input defaultValue={profile.businessAddress} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Default Notes</Label>
                    <Input defaultValue={profile.defaultNotes} />
                  </div>
                  <Button className="w-fit">Save Changes</Button>
                </CardContent>
              </Card>

              <Card className="border-card-border shadow-sm">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">
                    Notification Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <Label className="text-base">Invoice Viewed</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive an email when a client opens your checkout link.
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <Label className="text-base">Payment Detected</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive an email when a stealth payment hits the network.
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment" className="m-0 flex flex-col gap-6">
              <Card className="border-card-border shadow-sm">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Configured Networks</CardTitle>
                  <CardDescription>
                    Configure which blockchains you accept payments on.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div>
                      <h3 className="font-medium text-primary">Solana (USDC)</h3>
                      <p className="mt-1 font-mono text-sm text-muted-foreground">
                        Wallet: {profile.walletAddress}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4 opacity-50">
                    <div>
                      <h3 className="font-medium">Ethereum (USDC)</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Not configured</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Connect Wallet
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy" className="m-0 flex flex-col gap-6">
              <Card className="border-card-border shadow-sm">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">
                    Umbra Protocol Integration
                  </CardTitle>
                  <CardDescription>
                    Register this merchant wallet for stealth-ready mainnet settlement.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Label className="text-base">Merchant Umbra Setup</Label>
                        <UmbraStatusBadge status={effectiveUmbraStatus} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {getUmbraStatusDescription(effectiveUmbraStatus)}
                      </p>
                    </div>
                    <Button
                      onClick={() => void handleUmbraSetup()}
                      disabled={
                        !standardWallets.ready ||
                        isUmbraRegistrationRunning ||
                        saveUmbraRegistration.isPending
                      }
                    >
                      {isUmbraRegistrationRunning ||
                      saveUmbraRegistration.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="size-4" />
                      )}
                      {profile.umbraStatus === "ready"
                        ? "Recheck Umbra setup"
                        : `Set up Umbra on ${runtimeNetwork}`}
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label>Umbra Network</Label>
                      <Input
                        value={runtimeNetwork}
                        readOnly
                        className="bg-muted/20 font-mono text-xs text-muted-foreground"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Last Checked</Label>
                      <Input
                        value={formatUmbraTimestamp(profile.umbraLastCheckedAt)}
                        readOnly
                        className="bg-muted/20 text-xs text-muted-foreground"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Merchant Wallet</Label>
                    <Input
                      value={profile.umbraWalletAddress ?? profile.walletAddress}
                      readOnly
                      className="bg-muted/20 font-mono text-xs text-muted-foreground"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {UMBRA_SETUP_STEPS.map((step) => (
                      <UmbraStepStatus
                        key={step.id}
                        id={step.id}
                        label={step.label}
                        description={step.description}
                        currentStep={registrationStep}
                        status={effectiveUmbraStatus}
                      />
                    ))}
                  </div>

                  {profile.umbraRegistrationSignatures.length > 0 && (
                    <div className="flex flex-col gap-2 border-t border-border pt-4">
                      <Label>Registration Transactions</Label>
                      <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                        {profile.umbraRegistrationSignatures.length} signature
                        {profile.umbraRegistrationSignatures.length === 1
                          ? ""
                          : "s"}{" "}
                        saved for this merchant setup.
                      </p>
                    </div>
                  )}

                  {registrationError && (
                    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <p>{registrationError}</p>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <Label className="text-base">Stealth Settlement Rail</Label>
                      <p className="text-sm text-muted-foreground">
                        Ready to route incoming payments through this Umbra
                        registration when checkout is connected.
                      </p>
                    </div>
                    <Switch checked={effectiveUmbraStatus === "ready"} disabled />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
  );
}

const UMBRA_SETUP_STEPS: {
  id: Extract<
    MerchantUmbraRegistrationStepId,
    "account" | "encryption" | "anonymous"
  >;
  label: string;
  description: string;
}[] = [
  {
    id: "account",
    label: "Account Init",
    description: "Merchant user account",
  },
  {
    id: "encryption",
    label: "Encryption Key",
    description: "X25519 registration",
  },
  {
    id: "anonymous",
    label: "Anonymous Commitment",
    description: "Receiver-claimable readiness",
  },
];

function UmbraStatusBadge({ status }: { status: UmbraRegistrationStatus }) {
  const label = {
    not_setup: "Not set up",
    registering: "Registering",
    ready: "Ready",
    error: "Error",
  }[status];
  const className = {
    not_setup: "border-border bg-muted text-muted-foreground",
    registering: "border-primary/30 bg-primary/10 text-primary",
    ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
    error: "border-destructive/30 bg-destructive/10 text-destructive",
  }[status];

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

function getUmbraStatusDescription(status: UmbraRegistrationStatus) {
  if (status === "ready") {
    return "This wallet is registered for Umbra confidential and anonymous usage.";
  }

  if (status === "registering") {
    return "Wallet signatures and mainnet registration transactions are in progress.";
  }

  if (status === "error") {
    return "The last Umbra setup attempt did not complete.";
  }

  return "This merchant wallet still needs Umbra registration before stealth payments.";
}

function UmbraStepStatus({
  id,
  label,
  description,
  currentStep,
  status,
}: {
  id: (typeof UMBRA_SETUP_STEPS)[number]["id"];
  label: string;
  description: string;
  currentStep: MerchantUmbraRegistrationStepId | null;
  status: UmbraRegistrationStatus;
}) {
  const stepIndex = UMBRA_SETUP_STEPS.findIndex((step) => step.id === id);
  const currentStepIndex = UMBRA_SETUP_STEPS.findIndex(
    (step) => step.id === currentStep,
  );
  const isComplete =
    status === "ready" ||
    currentStep === "saving" ||
    currentStep === "complete" ||
    (currentStepIndex > stepIndex && currentStepIndex !== -1);
  const isActive = currentStep === id;

  return (
    <div className="flex min-h-24 items-start gap-3 rounded-lg border border-border p-4">
      <div className="mt-0.5 text-primary">
        {isComplete ? (
          <CheckCircle2 className="size-5" />
        ) : isActive ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Circle className="size-5 text-muted-foreground" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function formatUmbraTimestamp(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
