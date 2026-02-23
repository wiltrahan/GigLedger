package com.gigledger.service.controller

import com.gigledger.service.pdf.InvoicePdfRenderer
import com.gigledger.service.supabase.SupabaseInvoiceGateway
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController

@RestController
class InvoicePdfController(
    private val invoiceGateway: SupabaseInvoiceGateway,
    private val pdfRenderer: InvoicePdfRenderer,
) {
    @GetMapping("/api/pdf/invoice/{invoiceId}", produces = [MediaType.APPLICATION_PDF_VALUE])
    fun getInvoicePdf(
        @PathVariable invoiceId: String,
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<ByteArray> {
        val userId = jwt.subject
        val invoice = invoiceGateway.fetchInvoiceForUser(invoiceId, userId)
        val pdf = pdfRenderer.render(invoice)

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=invoice-${invoice.invoiceNumber}.pdf")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf)
    }

    @GetMapping("/public/invoice/{token}/pdf", produces = [MediaType.APPLICATION_PDF_VALUE])
    fun getPublicInvoicePdf(@PathVariable token: String): ResponseEntity<ByteArray> {
        val invoice = invoiceGateway.fetchInvoiceByShareToken(token)
        val pdf = pdfRenderer.render(invoice)

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=invoice-${invoice.invoiceNumber}.pdf")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf)
    }
}
