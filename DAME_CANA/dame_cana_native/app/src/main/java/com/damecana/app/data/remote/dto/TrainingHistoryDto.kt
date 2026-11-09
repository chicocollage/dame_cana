package com.damecana.app.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class TrainingHistoryDto(
    @SerialName("schema") val schema: String = "training_history.v1",
    @SerialName("exported_at") val exportedAt: String? = null,
    @SerialName("sessions") val sessions: List<TrainingLogDto> = emptyList()
)
