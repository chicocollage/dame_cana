package com.damecana.app.data.local.entities

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Entity(tableName = "sessions")
data class SessionEntity(
    @PrimaryKey
    @ColumnInfo(name = "session_id")
    val sessionId: String = generateSessionId(),

    @ColumnInfo(name = "fecha")
    val fecha: Long = System.currentTimeMillis(),

    @ColumnInfo(name = "dia")
    val dia: String,

    @ColumnInfo(name = "titulo")
    val titulo: String,

    @ColumnInfo(name = "finished")
    val finished: Boolean = false,

    @ColumnInfo(name = "record_quality")
    val recordQuality: String? = null,

    @ColumnInfo(name = "program_version")
    val programVersion: String = "v3.3"
) {
    companion object {
        fun generateSessionId(date: Date = Date()): String {
            val formatter = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault())
            return "SES_${formatter.format(date)}"
        }
    }
}
