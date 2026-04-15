import { redirect } from "next/navigation";

export default function SettlementRedirect() {
  redirect("/invoices/DV-1007/settlement");
}
