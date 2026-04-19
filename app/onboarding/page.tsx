"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { ArrowRight, Building2, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMerchantProfileByWalletClient,
  upsertMerchantProfileClient,
} from "@/features/merchant-profiles/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PaymentRail, PrivacyRail } from "@/features/invoices/types";
import { DEFAULT_PROFILE_NOTES } from "@/features/merchant-profiles/constants";
import type { UpsertMerchantProfileInput } from "@/features/merchant-profiles/types";

function getSafeNext(value: string | null) {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return "/dashboard";
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const nextPath = getSafeNext(searchParams.get("next"));
  const [businessName, setBusinessName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [defaultNotes, setDefaultNotes] = useState(DEFAULT_PROFILE_NOTES);
  const [paymentRail, setPaymentRail] = useState<PaymentRail>("solana");
  const [privacyRail, setPrivacyRail] = useState<PrivacyRail>("umbra");
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!publicKey) return;

    let isCancelled = false;
    const walletAddress = publicKey.toBase58();

    async function loadProfile() {
      setIsLoadingProfile(true);
      setError("");

      try {
        const profile = await getMerchantProfileByWalletClient(walletAddress);

        if (!isCancelled && profile) {
          setBusinessName(profile.businessName);
          setContactEmail(profile.contactEmail);
          setBusinessAddress(profile.businessAddress);
          setDefaultNotes(profile.defaultNotes);
          setPaymentRail(profile.paymentRail);
          setPrivacyRail(profile.privacyRail);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load merchant profile.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingProfile(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isCancelled = true;
    };
  }, [publicKey]);

  async function handleSubmit() {
    if (!publicKey) {
      setVisible(true);
      return;
    }

    setIsSubmitting(true);
    setError("");

    const payload: UpsertMerchantProfileInput = {
      walletAddress: publicKey.toBase58(),
      businessName,
      contactEmail,
      businessAddress,
      defaultNotes,
      defaultMint: "USDC",
      paymentRail,
      privacyRail,
    };

    try {
      await upsertMerchantProfileClient(payload);
      toast.success("Company profile saved.");
      router.push(nextPath);
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Unable to save company profile.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!publicKey) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
        <Card className="w-full max-w-md border-card-border text-center shadow-xl shadow-primary/5">
          <CardHeader>
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wallet className="size-5" />
            </div>
            <CardTitle className="font-serif text-2xl">
              Connect wallet to set up DueVault
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We use your Solana wallet as your local merchant identity for this
              hackathon prototype.
            </p>
            <Button className="mt-6 w-full" onClick={() => setVisible(true)}>
              Connect Wallet
            </Button>
            <Button asChild variant="link" className="mt-2">
              <Link href="/">Back to homepage</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded bg-primary font-serif text-lg font-bold text-primary-foreground">
              D
            </div>
            <div>
              <p className="font-serif text-xl font-semibold">DueVault</p>
              <p className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                Company setup
              </p>
            </div>
          </Link>
          <p className="hidden max-w-xs text-right font-mono text-xs text-muted-foreground md:block">
            {publicKey.toBase58()}
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="rounded-xl border border-card-border bg-card/70 p-6 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
              <Building2 className="size-5" />
            </div>
            <h1 className="mt-6 font-serif text-4xl font-semibold tracking-tight">
              Set up your private receivables workspace.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              These details will appear across your invoices, dashboard, and
              checkout experience. You can refine them later in settings.
            </p>
            <div className="mt-8 rounded-lg border border-primary/10 bg-primary/5 p-4 text-sm">
              <p className="font-medium text-primary">Wallet identity</p>
              <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                {publicKey.toBase58()}
              </p>
            </div>
          </div>

          <Card className="border-card-border shadow-xl shadow-primary/5">
            <CardHeader>
              <CardTitle className="font-serif text-2xl">
                Company details
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {isLoadingProfile && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/10 px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Checking for an existing profile...
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>Business Name</Label>
                  <Input
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                    placeholder="North Pier Studio"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Contact Email</Label>
                  <Input
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="billing@company.com"
                    type="email"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Business Address</Label>
                <Input
                  value={businessAddress}
                  onChange={(event) => setBusinessAddress(event.target.value)}
                  placeholder="100 Crypto Way, San Francisco, CA"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Default Invoice Note</Label>
                <Textarea
                  value={defaultNotes}
                  onChange={(event) => setDefaultNotes(event.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>Payment Rail</Label>
                  <Select
                    value={paymentRail}
                    onValueChange={(value) => setPaymentRail(value as PaymentRail)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment rail" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solana">Solana USDC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Privacy Rail</Label>
                  <Select
                    value={privacyRail}
                    onValueChange={(value) => setPrivacyRail(value as PrivacyRail)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select privacy rail" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="umbra">Umbra Protocol</SelectItem>
                      <SelectItem value="none">Public (No Privacy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Solana Wallet</Label>
                <Input
                  readOnly
                  value={publicKey.toBase58()}
                  className="font-mono text-xs text-muted-foreground"
                />
              </div>

              {error && (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                className="mt-2 w-full"
                disabled={isSubmitting}
                onClick={() => void handleSubmit()}
              >
                {isSubmitting ? "Saving..." : "Complete Setup"}
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </main>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
