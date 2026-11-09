package com.damecana.data.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "program_slots")
data class ProgramSlot(
    @PrimaryKey val slotId: String,
    val programVersion: String,
    val day: String,
    val order: Int,
    val exerciseSelector: String,
    val mainRegion: String,
    val defaultSets: Int,
    val defaultReps: String,
    val defaultRir: String,
    val restTime: String
)
