"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Download, EyeOff, FileCheck, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { primaryInvoice, recentProofs } from "@/fixtures/demo-data";

export default function ProofsPage() {
  const [email, setEmail] = useState("accountant@northpier.studio");
  const [generated, setGenerated] = useState(false);

  function handleGenerate() {
    setGenerated(true);
    toast.success("Proof packet generated and sent securely");
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-6 md:p-8">
        <header>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
            Selective Disclosure
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate verifiable proofs of specific invoices without exposing your
            entire wallet history.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Card className="border-card-border shadow-sm">
            <CardContent className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded bg-primary/10 text-primary">
                  <FileCheck className="size-5" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-medium">Proof Packet</h2>
                  <p className="text-sm text-muted-foreground">
                    Invoice {primaryInvoice.id}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Recipient Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    The recipient will receive a secure link to view the verified proof.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="mb-3 flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="mr-2 size-4" /> What will be shared
                  </h3>
                  <ul className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 font-mono text-xs">
                    {[
                      ["Invoice ID:", primaryInvoice.id],
                      ["Amount:", primaryInvoice.amount],
                      ["Mint:", "EPjFWdd... (USDC)"],
                      ["Payment Status:", "Settled"],
                      ["Timestamp:", "Apr 15, 2026, 14:32 UTC"],
                      ["Tx Reference:", "5KJy...Fg3x"],
                    ].map(([label, value]) => (
                      <li key={label} className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{label}</span>
                        <span>{value}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-3 flex items-center text-sm font-medium text-amber-600 dark:text-amber-400">
                    <EyeOff className="mr-2 size-4" /> What remains private
                  </h3>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground">
                    <li>Your total treasury balance</li>
                    <li>Other invoices and clients</li>
                    <li>Your main wallet address</li>
                    <li>Historical transaction volume</li>
                  </ul>
                </div>
              </div>

              <div className="pt-6">
                {!generated ? (
                  <Button onClick={handleGenerate} className="h-12 w-full text-base">
                    Generate & Send Proof Packet
                  </Button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-center"
                  >
                    <ShieldCheck className="size-8 text-emerald-600" />
                    <div>
                      <h4 className="font-medium text-emerald-800 dark:text-emerald-400">
                        Proof Packet Sent
                      </h4>
                      <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-500/80">
                        {email} has been granted access to view this proof.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-emerald-500/30 bg-transparent text-emerald-700 hover:bg-emerald-500/10"
                    >
                      <Download className="size-3" /> Download PDF
                    </Button>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>

          <section className="flex flex-col gap-6">
            <h2 className="font-serif text-lg font-medium">Recent Proofs</h2>
            <div className="flex flex-col gap-3">
              {recentProofs.map((proof) => (
                <div
                  key={proof.id}
                  className="flex items-center justify-between rounded-lg border border-card-border bg-card p-4"
                >
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <FileCheck className="size-4 text-muted-foreground" /> {proof.id}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Shared with: {proof.target}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-background font-mono text-[10px]">
                      {proof.status}
                    </Badge>
                    <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                      {proof.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
  );
}
