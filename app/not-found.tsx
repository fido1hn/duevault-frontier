import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="flex max-w-md flex-col items-center gap-5 text-center">
        <div className="flex size-10 items-center justify-center rounded bg-primary font-serif text-xl font-bold text-primary-foreground">
          D
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold tracking-widest text-secondary uppercase">
            Not found
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            This DueVault page could not be found.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The link may be outdated, or the demo route may have moved into the
            new invoice workflow.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/invoices/new">Create invoice</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Return to dashboard</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
