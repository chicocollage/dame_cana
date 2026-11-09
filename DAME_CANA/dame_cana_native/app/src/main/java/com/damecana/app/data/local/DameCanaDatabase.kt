package com.damecana.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.damecana.app.data.local.dao.MachineDao
import com.damecana.app.data.local.dao.SessionDao
import com.damecana.app.data.local.dao.SetDao
import com.damecana.app.data.local.dao.WorkoutImportDao
import com.damecana.app.data.local.entities.MachineEntity
import com.damecana.app.data.local.entities.SessionEntity
import com.damecana.app.data.local.entities.SetEntity

@Database(
    entities = [SessionEntity::class, SetEntity::class, MachineEntity::class],
    version = 1,
    exportSchema = false
)
abstract class DameCanaDatabase : RoomDatabase() {
    abstract fun sessionDao(): SessionDao
    abstract fun setDao(): SetDao
    abstract fun machineDao(): MachineDao
    abstract fun workoutImportDao(): WorkoutImportDao
}
