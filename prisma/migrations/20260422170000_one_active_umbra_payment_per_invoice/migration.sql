CREATE UNIQUE INDEX "UmbraInvoicePayment_one_active_per_invoice_key"
ON "UmbraInvoicePayment"("invoiceId")
WHERE "status" IN ('submitted', 'confirmed');
