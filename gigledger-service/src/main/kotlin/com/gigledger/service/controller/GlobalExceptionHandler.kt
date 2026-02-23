package com.gigledger.service.controller

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.server.ResponseStatusException

@RestControllerAdvice
class GlobalExceptionHandler {
    @ExceptionHandler(ResponseStatusException::class)
    fun handleStatusException(ex: ResponseStatusException): ResponseEntity<Map<String, Any?>> {
        val status = ex.statusCode
        return ResponseEntity.status(status)
            .body(
                mapOf(
                    "error" to mapOf(
                        "status" to status.value(),
                        "message" to (ex.reason ?: "Request failed"),
                    ),
                ),
            )
    }

    @ExceptionHandler(Exception::class)
    fun handleGeneric(ex: Exception): ResponseEntity<Map<String, Any?>> {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(
                mapOf(
                    "error" to mapOf(
                        "status" to 500,
                        "message" to "Internal server error",
                    ),
                ),
            )
    }
}
