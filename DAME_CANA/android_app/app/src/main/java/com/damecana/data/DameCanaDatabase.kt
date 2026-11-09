package com.damecana.data

import androidx.room.Database
import androidx.room.RoomDatabase
import com.damecana.data.entity.*
import com.damecana.data.dao.DameCanaDao

@Database(
    entities = [Exercise::class, ProgramSlot::class, WorkoutSession::class, WorkoutSet::class],
    version = 1,
    exportSchema = false
)
abstract class DameCanaDatabase : RoomDatabase() {
    abstract fun dameCanaDao(): DameCanaDao
}
