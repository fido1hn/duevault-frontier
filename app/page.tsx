"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  CircleCheckBig,
  EyeOff,
  FileCheck,
  Landmark,
  LockKeyhole,
  ReceiptText,
  Scale,
  Shield,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { WalletProfileActionShell } from "@/components/wallet-profile-action-shell";
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_POSITIONING } from "@/lib/brand";

const MagicRings = dynamic(() => import("@/components/effects/magic-rings"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

const howItWorksItems = [
  {
    title: BRAND_POSITIONING.homepageDirection[0].title,
    body: BRAND_POSITIONING.homepageDirection[0].body,
    icon: ReceiptText,
    accent: "bg-secondary",
    iconClass: "bg-secondary/10 text-secondary",
    glow: "bg-secondary/15",
  },
  {
    title: BRAND_POSITIONING.homepageDirection[1].title,
    body: BRAND_POSITIONING.homepageDirection[1].body,
    icon: LockKeyhole,
    accent: "bg-primary",
    iconClass: "bg-primary/10 text-primary",
    glow: "bg-primary/10",
  },
  {
    title: BRAND_POSITIONING.homepageDirection[2].title,
    body: BRAND_POSITIONING.homepageDirection[2].body,
    icon: FileCheck,
    accent: "bg-[var(--status-paid)]",
    iconClass: "bg-[var(--status-paid-bg)] text-[var(--status-paid)]",
    glow: "bg-[var(--status-paid)]/10",
  },
];

const heroProofPoints = [
  "Umbra private settlement",
  "Signature-scoped audit grants",
  "Merchant-owned customer records",
];

const publicLedgerRows = [
  ["Merchant wallet", "7rQ...2wB"],
  ["Customer wallet", "H4m...9Ks"],
  ["Amount", "2,400 USDC"],
  ["Timing", "May 8, 14:32 UTC"],
];

const dueVaultRows = [
  ["Onchain view", "Opaque Umbra payment"],
  ["Business record", "Stored with merchant"],
  ["Audit access", "Selected invoices only"],
  ["Scope", "Exact payment signatures"],
];

const comparisonRows = [
  {
    option: BRAND_NAME,
    posture:
      "Private Solana settlement with invoice-grade records and scoped auditor disclosure.",
    tradeoff:
      "Best when a business wants stablecoin speed without publishing its receivables graph.",
  },
  {
    option: "Stripe",
    posture:
      "Familiar billing and reporting, but custodial and traditional-rails first.",
    tradeoff:
      "Good operational UX, weaker fit for self-custodial stablecoin-native businesses.",
  },
  {
    option: "Public Solana invoicing",
    posture:
      "Fast settlement with visible wallets, amounts, timing, and counterparty patterns.",
    tradeoff:
      "Useful for simple transfers, risky for businesses with customer or revenue privacy needs.",
  },
  {
    option: "Doing nothing",
    posture: "Wallet transfers, spreadsheets, screenshots, and manual reconciliation.",
    tradeoff:
      "Cheap at first, expensive when taxes, audits, or customer trust enter the picture.",
  },
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
                {BRAND_NAME}
              </span>
              <span className="mt-1 hidden text-[10px] font-medium tracking-[0.22em] text-muted-foreground uppercase sm:block">
                Private stablecoin AR
              </span>
            </div>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <WalletProfileActionShell destination="/dashboard" size="sm">
              Login
            </WalletProfileActionShell>
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
                {BRAND_POSITIONING.eyebrow}
              </div>

              <h1 className="text-balance font-serif text-5xl leading-[0.98] tracking-[-0.045em] text-foreground sm:text-6xl lg:text-7xl">
                {BRAND_POSITIONING.heroTitle}
              </h1>

              <p className="mt-7 max-w-4xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
                {BRAND_POSITIONING.heroDescription}
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button asChild size="lg" className="h-14 px-8 text-base">
                  <WalletProfileActionShell destination="/dashboard">
                    Start invoicing privately <ArrowRight className="size-5" />
                  </WalletProfileActionShell>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-14 bg-card/45 px-8 text-base backdrop-blur">
                  <Link href="/demo/pay/DV-1007">View demo checkout</Link>
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
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="mx-auto max-w-3xl text-center">
              <p className="font-mono text-xs tracking-[0.22em] text-secondary uppercase">
                Privacy contrast
              </p>
              <h2 className="mt-4 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                Public rails should not become public books.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Solana makes settlement fast and final. It also makes payment
                metadata easy to follow unless privacy is designed into the
                receivables workflow.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              <motion.article
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.48, ease: "easeOut" }}
                className="overflow-hidden rounded-xl border border-card-border bg-card/75 shadow-xl shadow-primary/5 backdrop-blur">
                <div className="flex items-center justify-between border-b border-border/60 px-6 py-5">
                  <div>
                    <h3 className="font-serif text-2xl font-medium">
                      Public Solana invoicing
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Wallet graphs become business intelligence.
                    </p>
                  </div>
                  <Landmark className="size-6 text-secondary" />
                </div>
                <div className="p-6">
                  <div className="rounded-lg border border-border/70 bg-background/70 p-4 font-mono text-sm">
                    {publicLedgerRows.map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-4 border-b border-border/50 py-3 last:border-0">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-semibold text-foreground">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 leading-relaxed text-muted-foreground">
                    Customers, amounts, timing, and wallet relationships can
                    become visible to competitors, vendors, and curious
                    observers.
                  </p>
                </div>
              </motion.article>

              <motion.article
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.48, delay: 0.08, ease: "easeOut" }}
                className="overflow-hidden rounded-xl border border-card-border bg-card/75 shadow-xl shadow-primary/5 backdrop-blur">
                <div className="flex items-center justify-between border-b border-border/60 px-6 py-5">
                  <div>
                    <h3 className="font-serif text-2xl font-medium">
                      DueVault
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Private by default, disclosable by grant.
                    </p>
                  </div>
                  <EyeOff className="size-6 text-primary" />
                </div>
                <div className="p-6">
                  <div className="rounded-lg border border-border/70 bg-background/70 p-4 font-mono text-sm">
                    {dueVaultRows.map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-4 border-b border-border/50 py-3 last:border-0">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-semibold text-foreground">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 leading-relaxed text-muted-foreground">
                    The merchant keeps the business ledger off public rails,
                    then gives auditors wallet-gated access to only the selected
                    evidence.
                  </p>
                </div>
              </motion.article>
            </div>
          </section>

          <section className="mx-auto w-full max-w-7xl px-6 pb-24">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="mx-auto max-w-3xl text-center">
              <p className="font-mono text-xs tracking-[0.22em] text-secondary uppercase">
                How it works
              </p>
              <h2 className="mt-4 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                Issue, collect, disclose.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                {BRAND_POSITIONING.foundationDescription}
              </p>
            </motion.div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {howItWorksItems.map((item, index) => {
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

          <section className="mx-auto w-full max-w-7xl px-6 pb-24">
            <div className="grid items-center gap-10 lg:grid-cols-[0.86fr_1.14fr]">
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.55, ease: "easeOut" }}>
                <p className="font-mono text-xs tracking-[0.22em] text-secondary uppercase">
                  Grant workflow video
                </p>
                <h2 className="mt-4 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                  A 20-second proof of selective disclosure.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  The homepage proof moment is the compliance flow: choose
                  invoice evidence, issue a scoped grant, and let the auditor
                  review only the records their wallet is authorized to see.
                </p>
                <div className="mt-7 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1">
                    Merchant selects evidence
                  </span>
                  <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1">
                    Grant freezes signatures
                  </span>
                  <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1">
                    Auditor sees scope
                  </span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="overflow-hidden rounded-xl border border-card-border bg-card/75 shadow-xl shadow-primary/5 backdrop-blur">
                <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-[#d66a4d]" />
                    <span className="size-2.5 rounded-full bg-[#d6a84d]" />
                    <span className="size-2.5 rounded-full bg-[#4da776]" />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    scoped-grant-demo.svg
                  </span>
                </div>
                <img
                  src="/grant-workflow-demo.svg"
                  alt="Animated DueVault workflow showing merchant evidence selection, scoped grant issuance, and auditor review"
                  className="aspect-video w-full bg-[#f8f1e3] object-cover"
                />
              </motion.div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-7xl px-6 pb-24">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="mx-auto max-w-3xl text-center">
              <p className="font-mono text-xs tracking-[0.22em] text-secondary uppercase">
                Competitive frame
              </p>
              <h2 className="mt-4 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                The privacy wedge between Stripe and raw onchain billing.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Stablecoin businesses should not have to choose between
                custodial comfort and a public map of their receivables.
              </p>
            </motion.div>

            <div className="mt-12 overflow-hidden rounded-xl border border-card-border bg-card/75 shadow-xl shadow-primary/5 backdrop-blur">
              {comparisonRows.map((row) => (
                <div
                  key={row.option}
                  className="grid gap-4 border-b border-border/60 p-6 last:border-0 md:grid-cols-[0.45fr_1fr_1fr] md:items-start">
                  <div className="flex items-center gap-3">
                    {row.option === BRAND_NAME ? (
                      <Scale className="size-5 text-primary" />
                    ) : (
                      <CircleCheckBig className="size-5 text-muted-foreground" />
                    )}
                    <h3 className="font-serif text-xl font-medium">
                      {row.option}
                    </h3>
                  </div>
                  <p className="leading-relaxed text-foreground">
                    {row.posture}
                  </p>
                  <p className="leading-relaxed text-muted-foreground">
                    {row.tradeoff}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto w-full max-w-5xl px-6 pb-28 text-center">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="rounded-xl border border-card-border bg-card/80 px-6 py-12 shadow-xl shadow-primary/5 backdrop-blur sm:px-10">
              <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                Bring stablecoin receivables into the business stack.
              </h2>
              <p className="mx-auto mt-4 max-w-3xl leading-relaxed text-muted-foreground">
                {BRAND_DESCRIPTION}
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button asChild size="lg" className="h-14 px-8 text-base">
                  <WalletProfileActionShell destination="/dashboard">
                    Open dashboard <ArrowRight className="size-5" />
                  </WalletProfileActionShell>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-14 bg-background/50 px-8 text-base">
                  <Link href="/demo/pay/DV-1007">See checkout</Link>
                </Button>
              </div>
            </motion.div>
          </section>
        </main>

        <footer className="mx-auto w-full max-w-7xl px-6 pb-10">
          <div className="flex flex-col justify-between gap-6 border-t border-border/60 pt-8 md:flex-row md:items-center">
            <div>
              <p className="text-xs text-muted-foreground">
                &copy; 2026 {BRAND_NAME}. Built for Colosseum
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
