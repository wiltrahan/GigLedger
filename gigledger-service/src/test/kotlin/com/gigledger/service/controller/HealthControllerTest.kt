package com.gigledger.service.controller

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class HealthControllerTest {
    private val controller = HealthController()

    @Test
    fun `health returns ok status`() {
        val response = controller.health()

        assertEquals("ok", response["status"])
    }
}
