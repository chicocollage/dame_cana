package com.damecana.data.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.ForeignKey
import androidx.room.Index

@Entity(
    tableName = "workout_sets",
    foreignKeys = [
        ForeignKey(
            entity = WorkoutSession::class,
            parentColumns = ["sessionId"],
            childColumns = ["sessionId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("sessionId")]
)
data class WorkoutSet(
    @PrimaryKey val setId: String,
    val sessionId: String,
    val exerciseOrder: Int,
    val exerciseName: String,
    val loadKg: Double?,
    val reps: Int,
    val rir: String,
    val perSide: Boolean,
    val completed: Boolean
)
