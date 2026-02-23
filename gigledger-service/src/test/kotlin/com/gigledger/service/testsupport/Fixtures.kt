package com.gigledger.service.testsupport

import com.gigledger.service.model.ClientData
import com.gigledger.service.model.InvoiceDocumentData
import com.gigledger.service.model.LineItemData
import com.gigledger.service.model.SettingsData

object Fixtures {
    fun sampleInvoice(invoiceId: String = "inv-1", invoiceNumber: String = "INV-001"): InvoiceDocumentData {
        return InvoiceDocumentData(
            invoiceId = invoiceId,
            invoiceNumber = invoiceNumber,
            issueDate = "2026-02-20",
            dueDate = "2026-03-20",
            status = "sent",
            currency = "USD",
            subtotalCents = 120_000,
            taxCents = 9_600,
            totalCents = 129_600,
            notes = "Thanks for booking.",
            client = ClientData(
                name = "Neon Nights Venue",
                email = "booking@example.com",
                phone = "+1-555-0101",
                billingAddress = "120 Sunset Blvd"
            ),
            lineItems = listOf(
                LineItemData(
                    description = "DJ performance",
                    quantity = 1.0,
                    unitPriceCents = 120_000,
                    lineTotalCents = 120_000,
                    serviceDate = "2026-02-14",
                    sortOrder = 0
                )
            ),
            settings = SettingsData(
                brandName = "DJ Nova",
                brandEmail = "hello@example.com",
                brandPhone = "+1-555-0199",
                brandAddress = "Los Angeles, CA",
                paymentInstructions = "ACH preferred",
                currency = "USD"
            )
        )
    }
}
