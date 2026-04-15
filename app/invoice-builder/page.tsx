import { redirect } from "next/navigation";

export default function InvoiceBuilderRedirect() {
  redirect("/invoices/new");
}
