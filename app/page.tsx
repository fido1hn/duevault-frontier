"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  CircleCheckBig,
  FileCheck,
  LockKeyhole,
  ReceiptText,
  Shield,
} from "lucide-react";

import MagicRings from "@/components/effects/magic-rings";
import { Button } from "@/components/ui/button";

const promiseItems = [
  {
    title: "Issue invoice",
    body: "Send itemized receivables with a stablecoin checkout that still reads like a business document.",
    icon: ReceiptText,
    accent: "bg-secondary",
    iconClass: "bg-secondary/10 text-secondary",
    glow: "bg-secondary/15",
  },
  {
    title: "Collect privately",
    body: "Route Solana USDC payments through Umbra stealth settlement instead of exposing treasury links.",
    icon: LockKeyhole,
    accent: "bg-primary",
    iconClass: "bg-primary/10 text-primary",
    glow: "bg-primary/10",
  },
  {
    title: "Prove selectively",
    body: "Share invoice-specific proof packets with accountants, auditors, or clients without revealing everything else.",
    icon: FileCheck,
    accent: "bg-[var(--status-paid)]",
    iconClass: "bg-[var(--status-paid-bg)] text-[var(--status-paid)]",
    glow: "bg-[var(--status-paid)]/10",
  },
];

const heroProofPoints = [
  "Invoice-first workflow",
  "Umbra private settlement",
  "Accountant-ready proof",
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground selection:bg-secondary/20 selection:text-secondary-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-75"
          style={{
            background:
              "radial-gradient(circle at 50% 20%, hsl(40 80% 45% / 0.12), transparent 32rem), radial-gradient(circle at 50% 8%, hsl(184 52% 14% / 0.12), transparent 28rem), linear-gradient(135deg, hsl(40 30% 96%), hsl(40 33% 98%))",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(40 20% 88% / 0.72) 1px, transparent 1px), linear-gradient(90deg, hsl(40 20% 88% / 0.58) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute left-1/2 top-6 h-[46rem] w-[min(108vw,66rem)] -translate-x-1/2 opacity-90 [mask-image:radial-gradient(circle,black_48%,transparent_78%)]">
          <MagicRings
            color="#b9852f"
            colorTwo="#113537"
            ringCount={7}
            speed={1.05}
            attenuation={8.5}
            lineThickness={1.9}
            baseRadius={0.16}
            radiusStep={0.095}
            scaleRate={0.28}
            opacity={0.58}
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

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded bg-primary font-serif text-lg font-bold text-primary-foreground shadow-sm">
              D
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl font-semibold leading-none">
                DueVault
              </span>
              <span className="mt-1 hidden text-[10px] font-medium tracking-[0.22em] text-muted-foreground uppercase sm:block">
                Private receivables
              </span>
            </div>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Button asChild size="sm">
              <Link href="/waitlist">Join Waitlist</Link>
            </Button>
          </nav>
        </header>

        <main className="flex-1">
          <section className="mx-auto flex min-h-[calc(100svh-88px)] w-full max-w-7xl flex-col items-center justify-center px-6 py-16 text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="mx-auto flex max-w-5xl flex-col items-center">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-background/55 px-3 py-1 text-xs font-semibold tracking-wide text-secondary uppercase shadow-sm backdrop-blur">
                <Shield className="size-3.5" />
                Private accounts receivable on Solana
              </div>

              <h1 className="text-balance font-serif text-5xl leading-[0.98] tracking-[-0.045em] text-foreground sm:text-6xl lg:text-7xl">
                Private receivables for stablecoin businesses.
              </h1>

              <p className="mt-7 max-w-4xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
                DueVault lets merchants, freelancers, agencies create invoices,
                share private checkout links, collect USDC, settle privately,
                and share invoice-specific proof with auditors without exposing
                their full wallet history.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button asChild size="lg" className="h-14 px-8 text-base">
                  <Link href="/waitlist">
                    Join Waitlist <ArrowRight className="size-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-14 bg-card/45 px-8 text-base backdrop-blur">
                  <Link href="/pay/DV-1007">View Sample Checkout</Link>
                </Button>
              </div>

              <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
                {heroProofPoints.map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-[var(--status-paid)]" />
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>
          </section>

          <section className="mx-auto w-full max-w-7xl px-6 pb-24 pt-4">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="mx-auto max-w-3xl text-center">
              <p className="font-mono text-xs tracking-[0.22em] text-secondary uppercase">
                Private by default
              </p>
              <h2 className="mt-4 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                One receivables flow, private by default.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Create the invoice, collect the payment, and reveal only the
                proof each stakeholder needs.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {promiseItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.article
                    key={item.title}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{
                      duration: 0.48,
                      delay: index * 0.08,
                      ease: "easeOut",
                    }}
                    className="group relative overflow-hidden rounded-xl border border-card-border bg-card/75 p-6 shadow-xl shadow-primary/5 backdrop-blur transition-transform duration-300 hover:-translate-y-1">
                    <div
                      className={`absolute inset-x-0 top-0 h-1 ${item.accent}`}
                    />
                    <div
                      className={`absolute right-[-4rem] top-[-4rem] size-40 rounded-full blur-3xl ${item.glow}`}
                    />
                    <div
                      className={`mb-12 flex size-12 items-center justify-center rounded-lg ${item.iconClass}`}>
                      <Icon className="size-5" />
                    </div>
                    <h3 className="font-serif text-2xl font-medium">
                      {item.title}
                    </h3>
                    <p className="mt-4 leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </motion.article>
                );
              })}
            </div>
          </section>
        </main>

        <footer className="mx-auto w-full max-w-7xl px-6 pb-10">
          <div className="flex flex-col justify-between gap-6 border-t border-border/60 pt-8 md:flex-row md:items-center">
            <div>
              <p className="text-xs text-muted-foreground">
                &copy; 2026 DueVault. Built for Colosseum
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <CircleCheckBig className="size-4 text-emerald-600" />
              <span>Solana &bull; USDC &bull; Umbra</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
