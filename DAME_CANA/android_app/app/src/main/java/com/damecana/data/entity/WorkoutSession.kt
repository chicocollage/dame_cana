package com.damecana.data.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "workout_sessions")
data class WorkoutSession(
    @PrimaryKey val sessionId: String,
    val date: String, // ISO 8601
    val day: String,
    val title: String,
    val isFinished: Boolean,
    val eventId: String,
    val syncStatus: SyncStatus // PENDING, SYNCED, ERROR
)

enum class SyncStatus { PENDING, SYNCED, ERROR }
