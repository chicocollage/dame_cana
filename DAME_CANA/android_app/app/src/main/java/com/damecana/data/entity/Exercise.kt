package com.damecana.data.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "exercises")
data class Exercise(
    @PrimaryKey val id: String,
    val name: String,
    val region: String,
    val comparabilityGroup: String?,
    val evidenceLevel: String?
)
