"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { joinWaitlistClient } from "@/features/waitlist/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WaitlistSignupInput } from "@/features/waitlist/types";

type WaitlistFormProps = {
  source?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WaitlistForm({ source = "homepage" }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [useCase, setUseCase] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      const message = "Email is required.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail.toLowerCase())) {
      const message = "Enter a valid email address.";
      setError(message);
      toast.error(message);
      return;
    }

    setIsSubmitting(true);

    const payload: WaitlistSignupInput = {
      email: normalizedEmail,
      name,
      company,
      useCase,
      source,
    };

    try {
      const result = await joinWaitlistClient(payload);

      const message = result.alreadyJoined
        ? "You are already on the DueVault waitlist."
        : "You are on the DueVault waitlist.";

      setSuccessMessage(message);
      toast.success(message);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Unable to join the waitlist.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-5" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="waitlist-name">Name</Label>
          <Input
            id="waitlist-name"
            autoComplete="name"
            placeholder="Your name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="waitlist-company">Company</Label>
          <Input
            id="waitlist-company"
            autoComplete="organization"
            placeholder="Your company"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="waitlist-email">Work email</Label>
        <Input
          id="waitlist-email"
          aria-invalid={Boolean(error)}
          autoComplete="email"
          inputMode="email"
          placeholder="you@company.com"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="waitlist-use-case">
          What would you use DueVault for?
        </Label>
        <Textarea
          id="waitlist-use-case"
          placeholder="Private invoices, stablecoin checkout, client proof packets..."
          rows={4}
          value={useCase}
          onChange={(event) => setUseCase(event.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-md border border-[var(--status-paid)]/20 bg-[var(--status-paid-bg)] px-4 py-3 text-sm text-[var(--status-paid)]">
          <CheckCircle2 className="size-4" />
          {successMessage}
        </div>
      )}

      <Button className="h-12 w-full" disabled={isSubmitting} type="submit">
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {isSubmitting ? "Joining..." : "Join Waitlist"}
      </Button>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        We will only use this to contact you about DueVault access and early
        private receivables pilots.
      </p>
    </form>
  );
}
