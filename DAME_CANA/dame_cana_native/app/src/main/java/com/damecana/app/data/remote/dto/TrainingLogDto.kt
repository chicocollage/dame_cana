package com.damecana.app.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class TrainingLogDto(
    @SerialName("schema") val schema: String = "training_log.v1",
    @SerialName("exported_at") val exportedAt: String = "",
    @SerialName("session") val session: SessionDto,
    @SerialName("exercises") val exercises: List<ExerciseDto>
)

@Serializable
data class SessionDto(
    @SerialName("id") val id: String,
    @SerialName("date") val date: String,
    @SerialName("day") val day: String,
    @SerialName("title") val title: String,
    @SerialName("finished") val finished: Boolean,
    @SerialName("record_quality") val recordQuality: String? = "HIGH",
    @SerialName("exercise_count") val exerciseCount: Int = 0,
    @SerialName("planned_set_count") val plannedSetCount: Int = 0,
    @SerialName("recorded_set_count") val recordedSetCount: Int = 0
)

@Serializable
data class ExerciseDto(
    @SerialName("index") val index: Int,
    @SerialName("exercise_id") val exerciseId: String? = null,
    @SerialName("name") val name: String,
    @SerialName("machine_id") val machineId: String? = null,
    @SerialName("comparability_group") val comparabilityGroup: String? = null,
    @SerialName("identity") val identity: ExerciseIdentityDto = ExerciseIdentityDto(),
    @SerialName("result") val result: ExerciseResultDto
)

@Serializable
data class ExerciseIdentityDto(
    @SerialName("variant") val variant: String = "",
    @SerialName("machine_settings") val machineSettings: String = "",
    @SerialName("load_basis") val loadBasis: String = "WEIGHT_PLATE"
)

@Serializable
data class ExerciseResultDto(
    @SerialName("movement_notes") val movementNotes: String = "",
    @SerialName("sets") val sets: List<SetDto>
)

@Serializable
data class SetDto(
    @SerialName("index") val index: Int,
    @SerialName("load_kg") val loadKg: Double,
    @SerialName("reps") val reps: Int,
    @SerialName("rir") val rir: Double? = null
)
