package com.damecana.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.damecana.app.data.local.entities.MachineEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface MachineDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMachines(machines: List<MachineEntity>)

    @Query("SELECT * FROM machines ORDER BY nombre_visible_estacion ASC")
    fun getAllMachines(): Flow<List<MachineEntity>>
}
