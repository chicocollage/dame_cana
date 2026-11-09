package com.damecana.data.api

import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query
import retrofit2.http.Body

interface DameCanaApiService {

    // Sincronización BIDIRECCIONAL: Obtener datos de Google Sheets (doGet)
    @GET("exec")
    suspend fun getCatalogAndProgram(
        @Query("auth_token") token: String
    ): SyncGetResponse

    // Enviar sesiones finalizadas (doPost)
    @POST("exec")
    suspend fun uploadSession(
        @Body payload: SessionPayload
    ): SyncPostResponse
}

data class SyncGetResponse(
    val ok: Boolean,
    val timestamp: String?,
    val error: String?,
    val machines: List<Map<String, String>>?,
    val active_program: List<Map<String, String>>?
)

data class SyncPostResponse(
    val ok: Boolean,
    val status: String,
    val message: String?
)

// Representa el formato training_log.v1 que el script espera
data class SessionPayload(
    val auth_token: String,
    val schema: String = "training_log.v1",
    val exported_at: String,
    val sessions: List<Map<String, Any>>,
    val sets: List<Map<String, Any>>
)
