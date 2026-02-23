package com.gigledger.service.pdf

import com.gigledger.service.model.InvoiceDocumentData
import org.apache.pdfbox.pdmodel.PDDocument
import org.apache.pdfbox.pdmodel.PDPage
import org.apache.pdfbox.pdmodel.PDPageContentStream
import org.apache.pdfbox.pdmodel.common.PDRectangle
import org.apache.pdfbox.pdmodel.font.PDType1Font
import org.apache.pdfbox.pdmodel.font.Standard14Fonts
import org.springframework.stereotype.Component
import java.io.ByteArrayOutputStream
import java.text.NumberFormat
import java.util.Currency
import java.util.Locale

@Component
class InvoicePdfRenderer {
    private val fontRegular = PDType1Font(Standard14Fonts.FontName.HELVETICA)
    private val fontBold = PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD)

    fun render(data: InvoiceDocumentData): ByteArray {
        val document = PDDocument()
        val page = PDPage(PDRectangle.LETTER)
        document.addPage(page)

        val margin = 48f
        val contentWidth = page.mediaBox.width - (margin * 2)
        var y = page.mediaBox.height - margin

        PDPageContentStream(document, page).use { content ->
            fun drawText(text: String, x: Float, yPos: Float, size: Float = 11f, bold: Boolean = false) {
                content.beginText()
                content.setFont(if (bold) fontBold else fontRegular, size)
                content.newLineAtOffset(x, yPos)
                content.showText(text)
                content.endText()
            }

            fun divider(yPos: Float) {
                content.moveTo(margin, yPos)
                content.lineTo(margin + contentWidth, yPos)
                content.stroke()
            }

            val brandName = data.settings?.brandName ?: "GigLedger"
            drawText(brandName, margin, y, 18f, bold = true)
            y -= 18f
            data.settings?.brandEmail?.takeIf { it.isNotBlank() }?.let {
                drawText(it, margin, y)
                y -= 14f
            }
            data.settings?.brandPhone?.takeIf { it.isNotBlank() }?.let {
                drawText(it, margin, y)
                y -= 14f
            }
            data.settings?.brandAddress?.takeIf { it.isNotBlank() }?.let {
                drawText(it, margin, y)
                y -= 14f
            }

            drawText("INVOICE", margin + 360f, page.mediaBox.height - margin, 16f, bold = true)
            drawText("# ${data.invoiceNumber}", margin + 360f, page.mediaBox.height - margin - 18f)
            drawText("Status: ${data.status.uppercase()}", margin + 360f, page.mediaBox.height - margin - 32f)
            drawText("Issue: ${data.issueDate ?: "-"}", margin + 360f, page.mediaBox.height - margin - 46f)
            drawText("Due: ${data.dueDate ?: "-"}", margin + 360f, page.mediaBox.height - margin - 60f)

            y -= 10f
            divider(y)
            y -= 20f

            drawText("Bill To", margin, y, 12f, bold = true)
            y -= 14f
            drawText(data.client?.name ?: "-", margin, y)
            y -= 14f
            data.client?.email?.takeIf { it.isNotBlank() }?.let {
                drawText(it, margin, y)
                y -= 14f
            }
            data.client?.phone?.takeIf { it.isNotBlank() }?.let {
                drawText(it, margin, y)
                y -= 14f
            }
            data.client?.billingAddress?.takeIf { it.isNotBlank() }?.let {
                drawText(it, margin, y)
                y -= 14f
            }

            y -= 8f
            divider(y)
            y -= 18f

            val descX = margin
            val qtyX = margin + 280f
            val unitX = margin + 340f
            val totalX = margin + 430f

            drawText("Description", descX, y, 11f, bold = true)
            drawText("Qty", qtyX, y, 11f, bold = true)
            drawText("Unit", unitX, y, 11f, bold = true)
            drawText("Amount", totalX, y, 11f, bold = true)
            y -= 12f
            divider(y)
            y -= 14f

            data.lineItems.forEach { item ->
                if (y < margin + 120f) {
                    return@forEach
                }

                val description = buildString {
                    append(item.description)
                    item.serviceDate?.takeIf { it.isNotBlank() }?.let { append(" (${it})") }
                }

                drawText(description.take(55), descX, y)
                drawText(trimQty(item.quantity), qtyX, y)
                drawText(formatMoney(item.unitPriceCents, data.currency), unitX, y)
                drawText(formatMoney(item.lineTotalCents, data.currency), totalX, y)
                y -= 14f
            }

            y -= 4f
            divider(y)
            y -= 18f

            val summaryXLabel = margin + 350f
            val summaryXValue = margin + 470f

            drawText("Subtotal:", summaryXLabel, y, bold = true)
            drawText(formatMoney(data.subtotalCents, data.currency), summaryXValue, y)
            y -= 14f
            drawText("Tax:", summaryXLabel, y, bold = true)
            drawText(formatMoney(data.taxCents, data.currency), summaryXValue, y)
            y -= 14f
            drawText("Total:", summaryXLabel, y, 12f, bold = true)
            drawText(formatMoney(data.totalCents, data.currency), summaryXValue, y, 12f, bold = true)

            y -= 26f
            data.settings?.paymentInstructions?.takeIf { it.isNotBlank() }?.let {
                drawText("Payment Instructions", margin, y, 11f, bold = true)
                y -= 14f
                it.chunked(90).forEach { line ->
                    if (y < margin) return@forEach
                    drawText(line, margin, y)
                    y -= 14f
                }
            }

            data.notes?.takeIf { it.isNotBlank() }?.let {
                y -= 8f
                drawText("Notes", margin, y, 11f, bold = true)
                y -= 14f
                it.chunked(90).forEach { line ->
                    if (y < margin) return@forEach
                    drawText(line, margin, y)
                    y -= 14f
                }
            }
        }

        return ByteArrayOutputStream().use { output ->
            document.save(output)
            document.close()
            output.toByteArray()
        }
    }

    private fun formatMoney(cents: Int, currencyCode: String): String {
        val formatter = NumberFormat.getCurrencyInstance(Locale.US)
        formatter.currency = Currency.getInstance(currencyCode.uppercase())
        return formatter.format(cents / 100.0)
    }

    private fun trimQty(value: Double): String {
        return if (value % 1.0 == 0.0) {
            value.toInt().toString()
        } else {
            value.toString()
        }
    }
}
