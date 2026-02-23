package com.gigledger.service.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "gigledger.supabase")
data class SupabaseProperties(
    val url: String,
    val serviceRoleKey: String,
    val jwtIssuer: String,
)
