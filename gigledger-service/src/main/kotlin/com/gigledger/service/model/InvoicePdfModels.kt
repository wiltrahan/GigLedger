package com.gigledger.service.model

data class InvoiceDocumentData(
    val invoiceId: String,
    val invoiceNumber: String,
    val issueDate: String?,
    val dueDate: String?,
    val status: String,
    val currency: String,
    val subtotalCents: Int,
    val taxCents: Int,
    val totalCents: Int,
    val notes: String?,
    val client: ClientData?,
    val lineItems: List<LineItemData>,
    val settings: SettingsData?,
)

data class ClientData(
    val name: String?,
    val email: String?,
    val phone: String?,
    val billingAddress: String?,
)

data class LineItemData(
    val description: String,
    val quantity: Double,
    val unitPriceCents: Int,
    val lineTotalCents: Int,
    val serviceDate: String?,
    val sortOrder: Int,
)

data class SettingsData(
    val brandName: String?,
    val brandEmail: String?,
    val brandPhone: String?,
    val brandAddress: String?,
    val paymentInstructions: String?,
    val currency: String?,
)
