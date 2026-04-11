import { CreateIntentForm } from "@/components/create-intent-form";

export default function GetPaidPage() {
  return (
    <>
      <section className="page-header">
        <p className="eyebrow">Get paid</p>
        <h1>Create a payment request</h1>
        <p className="muted">
          Create the off-chain payment record that later maps to a private Umbra
          settlement flow.
        </p>
      </section>

      <CreateIntentForm />
    </>
  );
}
