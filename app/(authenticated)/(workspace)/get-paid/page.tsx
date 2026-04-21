import { redirect } from "next/navigation";

export default function GetPaidRedirect() {
  redirect("/invoices/new");
}
