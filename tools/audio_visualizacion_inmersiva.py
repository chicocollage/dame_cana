"""Generador de Audio Inmersivo para Visualización y Priming Neuromuscular (8-10 min).
Incluye:
  1. Síntesis matemática de Lecho Binaural Estéreo (Portadora 196 Hz / 206 Hz = 10 Hz Alfa -> 7 Hz Theta)
     con ruido rosa filtrado para inducción bioeléctrica pasiva.
  2. Guion modular con silencios kinestésicos prolongados (15 a 40 s) para recreación motora.
  3. Soporte para Edge-TTS (gratuito) y ElevenLabs.
  4. Mezcla profesional estéreo automatizada con FFmpeg.
"""

import argparse
import asyncio
import os
import subprocess
import sys
from pathlib import Path
import numpy as np
from scipy.io import wavfile

# Bloques del guion con sus tiempos de silencio posterior (en segundos)
BLOQUES_GUION = [
    (
        "Comenzamos liberando cualquier tensión residual acumulada. "
        "Separa ligeramente los dientes y suelta por completo la mandíbula. "
        "Deja que la lengua repose floja en la base de la boca. "
        "Suelta el contorno de los ojos y la frente. "
        "Siente cómo tus hombros caen lejos de las orejas. Tu cuerpo entra en un espacio de absoluta seguridad biológica.",
        15
    ),
    (
        "Inicia una respiración suave y profunda. "
        "Inhala por la nariz en cuatro segundos... Uno... dos... tres... cuatro... "
        "Y exhala lentamente por la boca en ocho segundos... Ocho... siete... seis... cinco... cuatro... tres... dos... uno. "
        "Siente el peso y la calidez en tus extremidades. Déjate caer.",
        25
    ),
    (
        "Repite otro ciclo a tu ritmo. Inhalando expansión en las costillas, "
        "y vaciando todo el aire sin prisa. Permite que el pulso sonoro guíe a tu cerebro hacia una calma profunda y estable.",
        30
    ),
    (
        "Ahora, abre tu espacio de visualización motora. "
        "Te colocas mentalmente dentro de la sala de entrenamiento, viviendo la escena en primera persona desde tus propios ojos. "
        "Mañana es el Día A. Te sitúas frente a la sentadilla Hack Matrix. "
        "Sientes la textura fría y sólida de los agarres. Ajustas tus pies en el tercio medio superior de la plataforma. "
        "Apoyas tu espalda y tu sacro con firmeza absoluta contra el respaldo.",
        20
    ),
    (
        "Desbloqueas la máquina. Sientes los cincuenta kilos descansando sobre tus hombros con total solidez. "
        "Inicias la bajada en tres segundos lentos y controlados... Tres... dos... uno... "
        "Llegas a la profundidad máxima. Pausa de un segundo de piedra abajo. Cero rebote. "
        "Siente cómo la fascia del polo inferior del glúteo se tensa y se estira. "
        "Y desde los talones, empujas la plataforma hacia arriba. Fuerza limpia, potente, coordinada. "
        "Tómate los próximos segundos para sentir mentalmente las repeticiones diez, once y doce de esta serie.",
        35
    ),
    (
        "La Hack está dominada. Respira hondo y pasa ahora al Hip Thrust. "
        "Noventa kilos o el nuevo incremento en la barra. Colocas la almohadilla sobre tu pelvis. "
        "Ajustas los pies para que las tibias queden verticales a noventa grados en el tope. "
        "Inspiras, fijas el abdomen y empujas el suelo con fuerza desde los talones.",
        15
    ),
    (
        "Arriba. Bloqueo horizontal perfecto. "
        "Sostienes un segundo entero de contracción isométrica máxima en el glúteo mayor. "
        "Tensión pura, sin arqueo lumbar ni dolor articular. "
        "Controlas la bajada y preparas la siguiente. "
        "Siente en los próximos segundos el ritmo, la potencia y la seguridad en cada repetición.",
        35
    ),
    (
        "Ahora, lleva tu atención a tu mapa corporal completo. "
        "Siente el tono del transverso y los oblicuos inferiores contrayendo el abdomen hacia dentro, "
        "marcando esa silueta limpia y profunda sobre las caderas. "
        "Siente la amplitud y densidad de tus hombros. "
        "La estructura que estás construyendo es sólida, eficiente y armónica.",
        40
    ),
    (
        "Durante el siguiente minuto de silencio, permite que tu sistema nervioso consolide estos patrones motores. "
        "No fuerces ningún pensamiento. Deja que las conexiones sinápticas se asienten.",
        60
    ),
    (
        "Es momento de regresar. "
        "Toma una inhalación profunda y expansiva... "
        "Aprieta suavemente los puños durante dos segundos sintiendo la energía despierta y disponible... "
        "Y suelta el aire, abriendo lentamente los ojos. "
        "Tu cuerpo está descansado, tu mente está en calma y tu sistema neuromuscular está listo para mañana.",
        10
    )
]


def sintetizar_lecho_binaural(duracion_segundos: float, output_wav: str, freq_base: float = 196.0, freq_beat_inicio: float = 10.0, freq_beat_fin: float = 7.0, sr: int = 44100):
    """
    Genera un lecho estéreo binaural con portadora suave y descenso de 10 Hz (Alfa) a 7 Hz (Theta),
    acompañado de ruido rosa filtrado a bajo volumen para anclar la Red Neuronal por Defecto.
    """
    print(f"[Audio-Engine] Sintetizando lecho binaural ({duracion_segundos:.1f} s, {freq_beat_inicio}->{freq_beat_fin} Hz)...")
    t = np.linspace(0, duracion_segundos, int(sr * duracion_segundos), endpoint=False)
    
    # Rampa de frecuencia del pulso (de 10 Hz Alfa a 7 Hz Theta en los primeros 5 min, luego sube a 10 Hz)
    mid_point = duracion_segundos * 0.75
    beat_freq = np.piecewise(
        t,
        [t < mid_point, t >= mid_point],
        [
            lambda t: freq_beat_inicio + (freq_beat_fin - freq_beat_inicio) * (t / mid_point),
            lambda t: freq_beat_fin + (freq_beat_inicio - freq_beat_fin) * ((t - mid_point) / (duracion_segundos - mid_point))
        ]
    )
    
    # Fase acumulada para frecuencia variable
    fase_izq = 2 * np.pi * freq_base * t
    fase_der = 2 * np.pi * (freq_base + beat_freq) * t
    
    canal_izq = np.sin(fase_izq) * 0.12
    canal_der = np.sin(fase_der) * 0.12
    
    # Añadir lecho de ruido rosa suave (filtro 1/f aproximado)
    ruido_blanco = np.random.normal(0, 1, len(t))
    # Integrador con fuga para simular ruido rosa/marrón
    ruido_suave = np.zeros_like(ruido_blanco)
    for i in range(1, len(ruido_blanco)):
        ruido_suave[i] = 0.985 * ruido_suave[i-1] + 0.015 * ruido_blanco[i]
    ruido_suave = (ruido_suave / (np.max(np.abs(ruido_suave)) + 1e-6)) * 0.035
    
    # Fade-in de 5 s y Fade-out de 8 s
    fade_in_len = int(5 * sr)
    fade_out_len = int(8 * sr)
    fade_in = np.linspace(0, 1, fade_in_len)
    fade_out = np.linspace(1, 0, fade_out_len)
    
    envelope = np.ones(len(t))
    envelope[:fade_in_len] = fade_in
    envelope[-fade_out_len:] = fade_out
    
    izq = (canal_izq + ruido_suave) * envelope
    der = (canal_der + ruido_suave) * envelope
    
    # Convertir a 16-bit PCM estéreo
    estereo = np.vstack((izq, der)).T
    estereo_int16 = np.int16(np.clip(estereo, -1.0, 1.0) * 32767)
    
    wavfile.write(output_wav, sr, estereo_int16)
    print(f"[Audio-Engine] Lecho binaural guardado en: {output_wav}")


async def sintetizar_locucion_completa(temp_dir: Path, voz: str = "es-ES-AlvaroNeural", rate: str = "-15%"):
    import edge_tts
    archivos_piezas = []
    
    for idx, (texto, silencio_post) in enumerate(BLOQUES_GUION):
        voz_file = temp_dir / f"voz_{idx:02d}.mp3"
        print(f"[Edge-TTS] Generando bloque {idx+1}/{len(BLOQUES_GUION)}...")
        comunicador = edge_tts.Communicate(texto, voz, rate=rate, pitch="-3Hz")
        await comunicador.save(str(voz_file))
        archivos_piezas.append((str(voz_file), silencio_post))
        
    return archivos_piezas


def construir_timeline_voz_ffmpeg(archivos_piezas, output_voz_wav: str, sr: int = 44100):
    """
    Concatena las locuciones intercalando silencios exactos usando filtros de FFmpeg.
    """
    print("[Audio-Engine] Ensamblando pista de voz con silencios kinestésicos...")
    # Crear un archivo de lista para concat con silencios
    inputs = []
    filter_complex = []
    
    # Generamos un silencio wav reutilizable
    for idx, (voz_mp3, silencio_sec) in enumerate(archivos_piezas):
        inputs.extend(["-i", voz_mp3])
    
    # Construir cadena concat con apad / adelay o concatenación secuencial
    # Para máxima compatibilidad, generamos un script ffmpeg concat
    concat_list_file = Path(output_voz_wav).parent / "concat_list.txt"
    silencio_base_wav = Path(output_voz_wav).parent / "silencio_temp.wav"
    
    # Crear silencio de 1 segundo en wav
    silencio_1s = np.zeros(sr, dtype=np.int16)
    wavfile.write(str(silencio_base_wav), sr, silencio_1s)
    
    with open(concat_list_file, "w", encoding="utf-8") as f:
        for idx, (voz_mp3, silencio_sec) in enumerate(archivos_piezas):
            # Convertir mp3 a wav intermedio para evitar problemas de timestamp en concat
            wav_intermedio = Path(output_voz_wav).parent / f"voz_wav_{idx:02d}.wav"
            subprocess.run(["ffmpeg", "-y", "-i", voz_mp3, "-ar", str(sr), "-ac", "1", str(wav_intermedio)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            f.write(f"file '{wav_intermedio.name}'\n")
            
            # Insertar silencio
            silencio_bloque = Path(output_voz_wav).parent / f"silencio_{idx:02d}.wav"
            sil_data = np.zeros(int(silencio_sec * sr), dtype=np.int16)
            wavfile.write(str(silencio_bloque), sr, sil_data)
            f.write(f"file '{silencio_bloque.name}'\n")
            
    # Concat
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_list_file),
        "-ar", str(sr),
        "-ac", "2",
        output_voz_wav
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"[Audio-Engine] Pista de voz ensamblada en: {output_voz_wav}")


def obtener_duracion_wav(wav_path: str) -> float:
    sr, data = wavfile.read(wav_path)
    return len(data) / sr


def mezclar_voz_y_binaural(voz_wav: str, binaural_wav: str, output_mp3: str):
    """
    Mezcla la voz con el lecho binaural usando FFmpeg (voz al centro/clara + binaural envolvente).
    """
    print(f"[Audio-Engine] Mezclando voz y lecho binaural a MP3 final: {output_mp3}...")
    cmd = [
        "ffmpeg", "-y",
        "-i", voz_wav,
        "-i", binaural_wav,
        "-filter_complex",
        "[0:a]volume=1.15[v]; [1:a]volume=0.85[b]; [v][b]amix=inputs=2:duration=first:dropout_transition=3[out]",
        "-map", "[out]",
        "-c:a", "libmp3lame",
        "-b:a", "192k",
        output_mp3
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"[Audio-Engine] ¡Master final generado con éxito en {output_mp3}!")


def main():
    parser = argparse.ArgumentParser(description="Generador Inmersivo de Visualización (8-10 min) con Ondas Binaurales")
    parser.add_argument("--output", default="outputs/visualizacion_inmersiva_8min.mp3", help="Ruta de salida del MP3")
    parser.add_argument("--voz", default="es-ES-AlvaroNeural", help="Voz Edge-TTS")
    parser.add_argument("--rate", default="-15%", help="Velocidad de locución")
    args = parser.parse_args()
    
    out_file = Path(args.output).resolve()
    out_file.parent.mkdir(parents=True, exist_ok=True)
    temp_dir = out_file.parent / "_temp_audio"
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Sintetizar bloques de locución
    piezas = asyncio.run(sintetizar_locucion_completa(temp_dir, voz=args.voz, rate=args.rate))
    
    # 2. Ensamblar pista de voz con pausas amplias
    voz_wav = str(temp_dir / "pista_voz_completa.wav")
    construir_timeline_voz_ffmpeg(piezas, voz_wav)
    
    # 3. Medir duración exacta de la pista de voz
    duracion_total = obtener_duracion_wav(voz_wav)
    print(f"[Audio-Engine] Duración total del guion con silencios: {duracion_total/60:.2f} minutos ({duracion_total:.1f} s)")
    
    # 4. Sintetizar lecho binaural sincronizado a la duración exacta
    binaural_wav = str(temp_dir / "pista_binaural.wav")
    sintetizar_lecho_binaural(duracion_total + 4.0, binaural_wav)
    
    # 5. Mezclar ambas pistas en MP3 final
    mezclar_voz_y_binaural(voz_wav, binaural_wav, str(out_file))
    
    # Limpieza de archivos temporales
    for f in temp_dir.glob("*.*"):
        try:
            f.unlink()
        except Exception:
            pass
    try:
        temp_dir.rmdir()
    except Exception:
        pass


if __name__ == "__main__":
    main()
