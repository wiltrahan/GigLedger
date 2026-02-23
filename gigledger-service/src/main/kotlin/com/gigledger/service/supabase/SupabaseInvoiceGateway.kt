package com.gigledger.service.supabase

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.gigledger.service.config.SupabaseProperties
import com.gigledger.service.model.ClientData
import com.gigledger.service.model.InvoiceDocumentData
import com.gigledger.service.model.LineItemData
import com.gigledger.service.model.SettingsData
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import org.springframework.web.server.ResponseStatusException
import org.springframework.http.HttpStatus

@Component
class SupabaseInvoiceGateway(
    private val supabaseProperties: SupabaseProperties,
    private val objectMapper: ObjectMapper,
) {
    private val restClient: RestClient = RestClient.builder()
        .baseUrl(supabaseProperties.url)
        .defaultHeader("apikey", supabaseProperties.serviceRoleKey)
        .defaultHeader("Authorization", "Bearer ${supabaseProperties.serviceRoleKey}")
        .build()

    fun fetchInvoiceForUser(invoiceId: String, userId: String): InvoiceDocumentData {
        val invoiceNode = fetchInvoiceRecord(invoiceId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found")

        val ownerId = invoiceNode.path("user_id").asText()
        if (ownerId != userId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Invoice does not belong to authenticated user")
        }

        val settingsNode = fetchSettingsForUser(userId)

        return toInvoiceDocument(invoiceNode, settingsNode)
    }

    fun fetchInvoiceByShareToken(token: String): InvoiceDocumentData {
        val responseText = restClient.post()
            .uri("/rest/v1/rpc/get_shared_invoice_by_token")
            .contentType(MediaType.APPLICATION_JSON)
            .body(mapOf("p_token" to token))
            .retrieve()
            .body(String::class.java)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Shared invoice not found")

        val root = objectMapper.readTree(responseText)
        val payload = unwrapRpcPayload(root)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Shared invoice not found")

        val invoice = payload.path("invoice")
        if (invoice.isMissingNode || invoice.isNull) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Shared invoice not found")
        }

        val clientNode = payload.path("client").takeIf { !it.isMissingNode && !it.isNull }
        val settingsNode = payload.path("settings").takeIf { !it.isMissingNode && !it.isNull }
        val lineItemsNode = payload.path("line_items")

        val lineItems = if (lineItemsNode.isArray) {
            lineItemsNode.map {
                LineItemData(
                    description = it.path("description").asText(""),
                    quantity = it.path("quantity").asDouble(0.0),
                    unitPriceCents = it.path("unit_price_cents").asInt(0),
                    lineTotalCents = it.path("line_total_cents").asInt(0),
                    serviceDate = it.path("service_date").asText(null),
                    sortOrder = it.path("sort_order").asInt(0),
                )
            }.sortedBy { it.sortOrder }
        } else {
            emptyList()
        }

        return InvoiceDocumentData(
            invoiceId = invoice.path("id").asText(),
            invoiceNumber = invoice.path("invoice_number").asText("Invoice"),
            issueDate = invoice.path("issue_date").asText(null),
            dueDate = invoice.path("due_date").asText(null),
            status = invoice.path("status").asText("draft"),
            currency = invoice.path("currency").asText("USD"),
            subtotalCents = invoice.path("subtotal_cents").asInt(0),
            taxCents = invoice.path("tax_cents").asInt(0),
            totalCents = invoice.path("total_cents").asInt(0),
            notes = invoice.path("notes").asText(null),
            client = clientNode?.let { parseClient(it) },
            lineItems = lineItems,
            settings = settingsNode?.let { parseSettings(it) },
        )
    }

    private fun fetchInvoiceRecord(invoiceId: String): JsonNode? {
        val responseText = restClient.get()
            .uri { builder ->
                builder
                    .path("/rest/v1/invoices")
                    .queryParam("id", "eq.$invoiceId")
                    .queryParam(
                        "select",
                        "id,user_id,invoice_number,issue_date,due_date,status,currency,subtotal_cents,tax_cents,total_cents,notes," +
                            "client:clients(name,email,phone,billing_address)," +
                            "line_items:invoice_line_items(description,quantity,unit_price_cents,line_total_cents,service_date,sort_order)",
                    )
                    .queryParam("limit", "1")
                    .build()
            }
            .retrieve()
            .body(String::class.java)
            ?: return null

        val root = objectMapper.readTree(responseText)
        if (!root.isArray || root.isEmpty) return null
        return root.first()
    }

    private fun fetchSettingsForUser(userId: String): JsonNode? {
        val responseText = restClient.get()
            .uri { builder ->
                builder
                    .path("/rest/v1/settings")
                    .queryParam("user_id", "eq.$userId")
                    .queryParam("select", "brand_name,brand_email,brand_phone,brand_address,payment_instructions,currency")
                    .queryParam("limit", "1")
                    .build()
            }
            .retrieve()
            .body(String::class.java)
            ?: return null

        val root = objectMapper.readTree(responseText)
        if (!root.isArray || root.isEmpty) return null
        return root.first()
    }

    private fun unwrapRpcPayload(root: JsonNode): JsonNode? {
        if (root.isNull || root.isMissingNode) return null
        if (root.isObject) return root
        if (root.isArray && root.size() > 0) {
            val first = root.first()
            if (first.isObject && first.has("get_shared_invoice_by_token")) {
                return first.get("get_shared_invoice_by_token")
            }
            return first
        }
        return null
    }

    private fun toInvoiceDocument(invoiceNode: JsonNode, settingsNode: JsonNode?): InvoiceDocumentData {
        val lineItemsNode = invoiceNode.path("line_items")
        val lineItems = if (lineItemsNode.isArray) {
            lineItemsNode.map {
                LineItemData(
                    description = it.path("description").asText(""),
                    quantity = it.path("quantity").asDouble(0.0),
                    unitPriceCents = it.path("unit_price_cents").asInt(0),
                    lineTotalCents = it.path("line_total_cents").asInt(0),
                    serviceDate = it.path("service_date").asText(null),
                    sortOrder = it.path("sort_order").asInt(0),
                )
            }.sortedBy { it.sortOrder }
        } else {
            emptyList()
        }

        return InvoiceDocumentData(
            invoiceId = invoiceNode.path("id").asText(),
            invoiceNumber = invoiceNode.path("invoice_number").asText("Invoice"),
            issueDate = invoiceNode.path("issue_date").asText(null),
            dueDate = invoiceNode.path("due_date").asText(null),
            status = invoiceNode.path("status").asText("draft"),
            currency = invoiceNode.path("currency").asText("USD"),
            subtotalCents = invoiceNode.path("subtotal_cents").asInt(0),
            taxCents = invoiceNode.path("tax_cents").asInt(0),
            totalCents = invoiceNode.path("total_cents").asInt(0),
            notes = invoiceNode.path("notes").asText(null),
            client = parseClient(invoiceNode.path("client")),
            lineItems = lineItems,
            settings = settingsNode?.let { parseSettings(it) },
        )
    }

    private fun parseClient(node: JsonNode?): ClientData? {
        if (node == null || node.isNull || node.isMissingNode) return null
        return ClientData(
            name = node.path("name").asText(null),
            email = node.path("email").asText(null),
            phone = node.path("phone").asText(null),
            billingAddress = node.path("billing_address").asText(null),
        )
    }

    private fun parseSettings(node: JsonNode?): SettingsData? {
        if (node == null || node.isNull || node.isMissingNode) return null
        return SettingsData(
            brandName = node.path("brand_name").asText(null),
            brandEmail = node.path("brand_email").asText(null),
            brandPhone = node.path("brand_phone").asText(null),
            brandAddress = node.path("brand_address").asText(null),
            paymentInstructions = node.path("payment_instructions").asText(null),
            currency = node.path("currency").asText(null),
        )
    }
}
