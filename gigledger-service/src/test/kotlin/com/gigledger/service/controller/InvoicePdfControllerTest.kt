package com.gigledger.service.controller

import com.gigledger.service.pdf.InvoicePdfRenderer
import com.gigledger.service.supabase.SupabaseInvoiceGateway
import com.gigledger.service.testsupport.Fixtures
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.security.oauth2.jwt.Jwt

class InvoicePdfControllerTest {
    private val gateway = mockk<SupabaseInvoiceGateway>()
    private val renderer = mockk<InvoicePdfRenderer>()
    private val controller = InvoicePdfController(gateway, renderer)

    @Test
    fun `authenticated invoice endpoint returns pdf response`() {
        val invoice = Fixtures.sampleInvoice(invoiceId = "inv-123", invoiceNumber = "INV-123")
        val pdfBytes = byteArrayOf(1, 2, 3, 4)
        val jwt = Jwt.withTokenValue("token")
            .header("alg", "none")
            .claim("sub", "user-1")
            .build()

        every { gateway.fetchInvoiceForUser("inv-123", "user-1") } returns invoice
        every { renderer.render(invoice) } returns pdfBytes

        val response = controller.getInvoicePdf("inv-123", jwt)

        assertEquals(200, response.statusCode.value())
        assertEquals(MediaType.APPLICATION_PDF, response.headers.contentType)
        assertEquals("inline; filename=invoice-INV-123.pdf", response.headers[HttpHeaders.CONTENT_DISPOSITION]?.first())
        assertArrayEquals(pdfBytes, response.body)
        verify(exactly = 1) { gateway.fetchInvoiceForUser("inv-123", "user-1") }
        verify(exactly = 1) { renderer.render(invoice) }
    }

    @Test
    fun `public invoice endpoint returns pdf response`() {
        val invoice = Fixtures.sampleInvoice(invoiceId = "inv-public", invoiceNumber = "INV-PUBLIC")
        val pdfBytes = byteArrayOf(9, 8, 7)

        every { gateway.fetchInvoiceByShareToken("share-token") } returns invoice
        every { renderer.render(invoice) } returns pdfBytes

        val response = controller.getPublicInvoicePdf("share-token")

        assertEquals(200, response.statusCode.value())
        assertEquals(MediaType.APPLICATION_PDF, response.headers.contentType)
        assertEquals("inline; filename=invoice-INV-PUBLIC.pdf", response.headers[HttpHeaders.CONTENT_DISPOSITION]?.first())
        assertArrayEquals(pdfBytes, response.body)
        verify(exactly = 1) { gateway.fetchInvoiceByShareToken("share-token") }
        verify(exactly = 1) { renderer.render(invoice) }
    }
}
