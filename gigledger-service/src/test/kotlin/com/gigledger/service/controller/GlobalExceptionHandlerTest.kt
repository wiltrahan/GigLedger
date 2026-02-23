package com.gigledger.service.controller

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException

class GlobalExceptionHandlerTest {
    private val handler = GlobalExceptionHandler()

    @Test
    fun `handleStatusException returns status and reason`() {
        val response = handler.handleStatusException(ResponseStatusException(HttpStatus.FORBIDDEN, "No access"))

        assertEquals(403, response.statusCode.value())
        val error = response.body?.get("error") as Map<*, *>
        assertEquals(403, error["status"])
        assertEquals("No access", error["message"])
    }

    @Test
    fun `handleGeneric returns internal error payload`() {
        val response = handler.handleGeneric(RuntimeException("boom"))

        assertEquals(500, response.statusCode.value())
        val error = response.body?.get("error") as Map<*, *>
        assertEquals(500, error["status"])
        assertEquals("Internal server error", error["message"])
    }
}
