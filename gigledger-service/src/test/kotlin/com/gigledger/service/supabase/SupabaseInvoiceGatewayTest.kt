package com.gigledger.service.supabase

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.gigledger.service.config.SupabaseProperties
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException

class SupabaseInvoiceGatewayTest {
    private val objectMapper = jacksonObjectMapper()
    private val server = MockWebServer()

    @AfterEach
    fun tearDown() {
        server.shutdown()
    }

    private fun gateway(): SupabaseInvoiceGateway {
        server.start()
        val baseUrl = server.url("/").toString().removeSuffix("/")
        return SupabaseInvoiceGateway(
            supabaseProperties = SupabaseProperties(
                url = baseUrl,
                serviceRoleKey = "service-key",
                jwtIssuer = "https://example.supabase.co/auth/v1"
            ),
            objectMapper = objectMapper
        )
    }

    @Test
    fun `fetchInvoiceForUser returns invoice when user owns row`() {
        val gateway = gateway()

        server.enqueue(
            MockResponse().setBody(
                """
                [
                  {
                    "id": "inv-1",
                    "user_id": "user-1",
                    "invoice_number": "INV-001",
                    "issue_date": "2026-02-10",
                    "due_date": "2026-03-10",
                    "status": "sent",
                    "currency": "USD",
                    "subtotal_cents": 120000,
                    "tax_cents": 9600,
                    "total_cents": 129600,
                    "notes": "N",
                    "client": {"name": "Client A", "email": "a@example.com", "phone": "123", "billing_address": "Addr"},
                    "line_items": [{"description": "DJ", "quantity": 1, "unit_price_cents": 120000, "line_total_cents": 120000, "service_date": "2026-02-01", "sort_order": 0}]
                  }
                ]
                """.trimIndent()
            )
        )
        server.enqueue(
            MockResponse().setBody(
                """
                [
                  {
                    "brand_name": "DJ Nova",
                    "brand_email": "hello@example.com",
                    "brand_phone": "555",
                    "brand_address": "LA",
                    "payment_instructions": "ACH",
                    "currency": "USD"
                  }
                ]
                """.trimIndent()
            )
        )

        val invoice = gateway.fetchInvoiceForUser("inv-1", "user-1")

        assertEquals("INV-001", invoice.invoiceNumber)
        assertEquals("Client A", invoice.client?.name)
        assertEquals(129600, invoice.totalCents)
        assertEquals("DJ Nova", invoice.settings?.brandName)

        val first = server.takeRequest()
        assertTrue(first.path!!.startsWith("/rest/v1/invoices"))
        assertEquals("service-key", first.getHeader("apikey"))
        assertEquals("Bearer service-key", first.getHeader("Authorization"))

        val second = server.takeRequest()
        assertTrue(second.path!!.startsWith("/rest/v1/settings"))
    }

    @Test
    fun `fetchInvoiceForUser throws 404 when invoice missing`() {
        val gateway = gateway()
        server.enqueue(MockResponse().setBody("[]"))

        val ex = assertThrows<ResponseStatusException> {
            gateway.fetchInvoiceForUser("missing", "user-1")
        }

        assertEquals(HttpStatus.NOT_FOUND, ex.statusCode)
    }

    @Test
    fun `fetchInvoiceForUser throws 403 when ownership mismatch`() {
        val gateway = gateway()
        server.enqueue(
            MockResponse().setBody(
                """
                [{
                  "id": "inv-1",
                  "user_id": "other-user",
                  "invoice_number": "INV-001",
                  "status": "sent",
                  "currency": "USD",
                  "subtotal_cents": 0,
                  "tax_cents": 0,
                  "total_cents": 0,
                  "client": null,
                  "line_items": []
                }]
                """.trimIndent()
            )
        )

        val ex = assertThrows<ResponseStatusException> {
            gateway.fetchInvoiceForUser("inv-1", "user-1")
        }

        assertEquals(HttpStatus.FORBIDDEN, ex.statusCode)
    }

    @Test
    fun `fetchInvoiceByShareToken parses rpc object payload`() {
        val gateway = gateway()
        server.enqueue(
            MockResponse().setBody(
                """
                {
                  "invoice": {
                    "id": "inv-share",
                    "invoice_number": "INV-SHARE",
                    "issue_date": "2026-01-01",
                    "due_date": "2026-01-15",
                    "status": "sent",
                    "currency": "USD",
                    "subtotal_cents": 10000,
                    "tax_cents": 0,
                    "total_cents": 10000,
                    "notes": "Shared"
                  },
                  "client": {"name": "Client B"},
                  "settings": {"brand_name": "DJ Public"},
                  "line_items": [
                    {"id": "li-2", "description": "B", "quantity": 1, "unit_price_cents": 5000, "line_total_cents": 5000, "sort_order": 1},
                    {"id": "li-1", "description": "A", "quantity": 1, "unit_price_cents": 5000, "line_total_cents": 5000, "sort_order": 0}
                  ]
                }
                """.trimIndent()
            )
        )

        val invoice = gateway.fetchInvoiceByShareToken("token-1")

        assertEquals("INV-SHARE", invoice.invoiceNumber)
        assertEquals("Client B", invoice.client?.name)
        assertEquals("DJ Public", invoice.settings?.brandName)
        assertEquals("A", invoice.lineItems.first().description)

        val request = server.takeRequest()
        assertEquals("POST", request.method)
        assertEquals("/rest/v1/rpc/get_shared_invoice_by_token", request.path)
        assertTrue(request.body.readUtf8().contains("token-1"))
    }

    @Test
    fun `fetchInvoiceByShareToken parses wrapped rpc array payload`() {
        val gateway = gateway()
        server.enqueue(
            MockResponse().setBody(
                """
                [
                  {
                    "get_shared_invoice_by_token": {
                      "invoice": {
                        "id": "inv-wrap",
                        "invoice_number": "INV-WRAP",
                        "status": "sent",
                        "currency": "USD",
                        "subtotal_cents": 100,
                        "tax_cents": 0,
                        "total_cents": 100
                      },
                      "line_items": []
                    }
                  }
                ]
                """.trimIndent()
            )
        )

        val invoice = gateway.fetchInvoiceByShareToken("token-wrap")

        assertEquals("INV-WRAP", invoice.invoiceNumber)
        assertEquals(100, invoice.totalCents)
    }
}
