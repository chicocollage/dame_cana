package com.damecana.app.data.local.entities

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "sets",
    foreignKeys = [
        ForeignKey(
            entity = SessionEntity::class,
            parentColumns = ["session_id"],
            childColumns = ["session_id"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [
        Index(value = ["session_id"]),
        Index(value = ["exercise_name"])
    ]
)
data class SetEntity(
    @PrimaryKey
    @ColumnInfo(name = "set_id")
    val setId: String,

    @ColumnInfo(name = "session_id")
    val sessionId: String,

    @ColumnInfo(name = "exercise_order")
    val exerciseOrder: Int,

    @ColumnInfo(name = "exercise_name")
    val exerciseName: String,

    @ColumnInfo(name = "exercise_id")
    val exerciseId: String? = null,

    @ColumnInfo(name = "machine_id")
    val machineId: String? = null,

    @ColumnInfo(name = "set_index")
    val setIndex: Int,

    @ColumnInfo(name = "load_kg")
    val loadKg: Double,

    @ColumnInfo(name = "reps")
    val reps: Int,

    @ColumnInfo(name = "rir")
    val rir: Double?,

    @ColumnInfo(name = "movement_notes")
    val movementNotes: String? = null,

    @ColumnInfo(name = "comparability_group")
    val comparabilityGroup: String? = null
)
