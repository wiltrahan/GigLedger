package com.gigledger.service.pdf

import com.gigledger.service.testsupport.Fixtures
import org.apache.pdfbox.Loader
import org.apache.pdfbox.text.PDFTextStripper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class InvoicePdfRendererTest {
    private val renderer = InvoicePdfRenderer()

    @Test
    fun `render produces a non-empty valid pdf with expected text`() {
        val invoice = Fixtures.sampleInvoice(invoiceNumber = "INV-RENDER-01")

        val pdf = renderer.render(invoice)

        assertTrue(pdf.isNotEmpty())

        Loader.loadPDF(pdf).use { document ->
            assertEquals(1, document.numberOfPages)
            val text = PDFTextStripper().getText(document)
            assertTrue(text.contains("INV-RENDER-01"))
            assertTrue(text.contains("DJ Nova"))
            assertTrue(text.contains("Neon Nights Venue"))
        }
    }
}
