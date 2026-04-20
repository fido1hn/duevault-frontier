"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, BadgeCheck, LockKeyhole, ReceiptText } from "lucide-react";

import { WaitlistForm } from "@/components/waitlist-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MagicRings = dynamic(() => import("@/components/effects/magic-rings"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

function getWaitlistSource(source: string | null, ref: string | null) {
  return source || ref || "homepage";
}

function WaitlistContent() {
  const searchParams = useSearchParams();
  const waitlistSource = getWaitlistSource(
    searchParams.get("source"),
    searchParams.get("ref"),
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-6 py-8 text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(circle at 50% 18%, hsl(40 80% 45% / 0.13), transparent 30rem), radial-gradient(circle at 74% 12%, hsl(184 52% 14% / 0.11), transparent 24rem), linear-gradient(135deg, hsl(40 30% 96%), hsl(40 33% 98%))",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(40 20% 88% / 0.72) 1px, transparent 1px), linear-gradient(90deg, hsl(40 20% 88% / 0.58) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute left-1/2 top-[-3rem] h-[38rem] w-[min(110vw,58rem)] -translate-x-1/2 opacity-80 [mask-image:radial-gradient(circle,black_42%,transparent_76%)]">
          <MagicRings
            color="#b9852f"
            colorTwo="#113537"
            ringCount={6}
            speed={0.9}
            attenuation={9.5}
            lineThickness={1.7}
            baseRadius={0.17}
            radiusStep={0.09}
            scaleRate={0.22}
            opacity={0.48}
            blur={0.35}
            noiseAmount={0.025}
            rotation={-8}
            ringGap={1.35}
            fadeIn={0.45}
            fadeOut={2.35}
            followMouse={false}
            clickBurst={false}
          />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded bg-primary font-serif text-lg font-bold text-primary-foreground shadow-sm">
              D
            </div>
            <div>
              <p className="font-serif text-xl font-semibold">DueVault</p>
              <p className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                Private receivables
              </p>
            </div>
          </Link>
          <Button asChild variant="outline" className="bg-card/45">
            <Link href="/">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
        </header>

        <section className="grid flex-1 gap-8 py-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-background/55 px-3 py-1 text-xs font-semibold tracking-wide text-secondary uppercase shadow-sm backdrop-blur">
              <BadgeCheck className="size-3.5" />
              Early access waitlist
            </div>
            <h1 className="mt-8 font-serif text-5xl leading-[0.98] tracking-[-0.045em] text-foreground sm:text-6xl">
              Be first to invoice and collect privately.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              DueVault is private accounts receivable for stablecoin businesses:
              invoice clients, collect Solana USDC, settle through Umbra, and
              share invoice-specific proof without exposing your treasury.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-card-border bg-card/65 p-5 shadow-lg shadow-primary/5 backdrop-blur">
                <ReceiptText className="size-5 text-secondary" />
                <p className="mt-4 font-serif text-xl font-medium">
                  Built for real billing
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Invoices, checkout links, status tracking, and customer-ready
                  proof packets.
                </p>
              </div>
              <div className="rounded-xl border border-card-border bg-card/65 p-5 shadow-lg shadow-primary/5 backdrop-blur">
                <LockKeyhole className="size-5 text-primary" />
                <p className="mt-4 font-serif text-xl font-medium">
                  Private by default
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Protect merchant and client payment activity while still
                  staying audit-friendly.
                </p>
              </div>
            </div>
          </div>

          <Card className="border-card-border bg-card/85 shadow-2xl shadow-primary/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="font-serif text-3xl">
                Join the waitlist
              </CardTitle>
              <CardDescription className="leading-relaxed">
                Tell us where DueVault fits into your receivables workflow. We
                will prioritize early users with active stablecoin billing needs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WaitlistForm source={waitlistSource} />
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

export default function WaitlistPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background" />
      }
    >
      <WaitlistContent />
    </Suspense>
  );
}
