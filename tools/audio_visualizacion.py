"""Generador de audio para Visualización y Priming Neuromuscular.
Soporta dos motores:
  1. edge-tts: Calidad neural excelente (Microsoft Azure), 100% gratuito y sin API key.
  2. elevenlabs: Motor ElevenLabs oficial (requiere ELEVENLABS_API_KEY o flag --api-key).
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path

# Guion adaptado para ondas Alfa/Theta y equivalencia funcional motora
GUION_VISUALIZACION = """
Comenzamos soltando cualquier tensión residual. 
Separa ligeramente los dientes. Relaja la mandíbula y deja que la lengua descanse floja en la base de la boca. 
Suelta la tensión alrededor de tus ojos. 
Siente cómo tus hombros bajan lejos de las orejas. El cuerpo entra en un espacio de absoluta seguridad biológica.

Inhala suave por la nariz en cuatro segundos... 
Uno... dos... tres... cuatro... 
Y exhala despacio por la boca en ocho segundos... 
Ocho... siete... seis... cinco... cuatro... tres... dos... uno. 
Siente el peso de tu cuerpo apoyado sobre el suelo. Pesadez cálida en manos y piernas. Ondas de calma profunda.

Ahora, dirige tu atención hacia adentro. Mañana es el Día A. 
Te ves desde dentro de tus propios ojos entrando a la sala de entrenamiento. 
Te colocas en la sentadilla Hack Matrix. Sientes el tacto frío del acero en las manos, el apoyo firme y denso del respaldo en tus lumbares y sacro. 
Tus pies están en el tercio medio superior de la plataforma. La posición es sólida.

Inicias el descenso. Tres segundos controlados hacia el fondo... Tres... dos... uno...
Siente la apertura profunda de tu cadera. 
Pausa estricta de un segundo abajo. De piedra. Cero rebote. 
La fascia del polo inferior del glúteo se estira al máximo. 
Y desde el talón, empujas la plataforma con potencia estable. 
Sientes cómo los cuádriceps y el glúteo mayor se activan con una fuerza limpia. 
Repetición diez... repetición once... repetición doce. 
Bloqueo controlado. La serie está consolidada.

Respira hondo... Y pasa ahora a la máquina de hip thrust.
Cargas noventa kilos o el nuevo incremento. Sientes la almohadilla sobre la pelvis. Los pies a noventa grados.
Tomas aire, fijas el abdomen y empujas el suelo con los talones. 
Arriba. Bloqueo horizontal perfecto. 
Sostienes un segundo de contracción máxima. Tensión pura, sólida, sin peaje lumbar.
Bajas en control. Tienes el control absoluto del movimiento.

Por último, recorre tu mapa corporal. 
Siente el tono del transverso y los oblicuos inferiores compactando el cinturón abdominal, creando esa línea nítida y profunda hacia la cadera. 
Siente la densidad lateral en tus hombros, y la estructura fuerte, equilibrada y simétrica que estás construyendo día a día.

Toma una inhalación profunda... 
Aprieta suavemente los puños durante dos segundos sintiendo la energía disponible... 
Y suelta el aire, abriendo los ojos con una alerta serena, limpia y enfocada. 
Tu sistema nervioso está listo.
""".strip()


async def generar_con_edge_tts(texto: str, output_path: str, voz: str = "es-ES-AlvaroNeural", rate: str = "-15%", pitch: str = "-3Hz"):
    import edge_tts
    print(f"[edge-tts] Generando audio con voz {voz} (rate={rate}, pitch={pitch})...")
    comunicador = edge_tts.Communicate(texto, voz, rate=rate, pitch=pitch)
    await comunicador.save(output_path)
    print(f"[edge-tts] Audio guardado con éxito en: {output_path}")


def generar_con_elevenlabs(texto: str, output_path: str, api_key: str, voice_id: str = "onwK4e9ZLuTAKqWW03F9"):
    """
    voice_id por defecto: Daniel / George o voz masculina profunda y solemne.
    Usa el endpoint directo v1/text-to-speech/{voice_id}.
    """
    import requests
    print(f"[elevenlabs] Generando audio con voice_id={voice_id}...")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json"
    }
    payload = {
        "text": texto,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.85,           # Muy estable, evita sobresaltos o cambios bruscos
            "similarity_boost": 0.75,
            "style": 0.15,
            "use_speaker_boost": True
        }
    }
    resp = requests.post(url, json=payload, headers=headers)
    if resp.status_code != 200:
        raise RuntimeError(f"Error en ElevenLabs ({resp.status_code}): {resp.text}")
    
    with open(output_path, "wb") as f:
        f.write(resp.content)
    print(f"[elevenlabs] Audio guardado con éxito en: {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Generador de audio para Visualización y Priming Neuromuscular")
    parser.add_argument("--motor", choices=["auto", "edge-tts", "elevenlabs"], default="auto", help="Motor TTS a emplear")
    parser.add_argument("--output", default="outputs/visualizacion_dia_a.mp3", help="Ruta del archivo mp3 de salida")
    parser.add_argument("--api-key", default=None, help="API Key de ElevenLabs (si se usa ese motor)")
    parser.add_argument("--voice-id", default="onwK4e9ZLuTAKqWW03F9", help="Voice ID de ElevenLabs (Daniel/George)")
    parser.add_argument("--edge-voice", default="es-ES-AlvaroNeural", help="Voz para edge-tts (ej. es-ES-AlvaroNeural o es-ES-ElviraNeural)")
    parser.add_argument("--rate", default="-15%", help="Velocidad para edge-tts (ej. -15%% para entonación pausada)")
    
    args = parser.parse_args()
    
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    api_key_el = args.api_key or os.getenv("ELEVENLABS_API_KEY") or os.getenv("ELEVEN_API_KEY")
    
    motor = args.motor
    if motor == "auto":
        motor = "elevenlabs" if api_key_el else "edge-tts"
        
    print(f"Motor seleccionado: {motor}")
    if motor == "elevenlabs":
        if not api_key_el:
            print("ERROR: No se encontró API key de ElevenLabs. Usa --api-key o define ELEVENLABS_API_KEY. Fallback a edge-tts.")
            asyncio.run(generar_con_edge_tts(GUION_VISUALIZACION, str(output_path), voz=args.edge_voice, rate=args.rate))
        else:
            generar_con_elevenlabs(GUION_VISUALIZACION, str(output_path), api_key_el, voice_id=args.voice_id)
    else:
        asyncio.run(generar_con_edge_tts(GUION_VISUALIZACION, str(output_path), voz=args.edge_voice, rate=args.rate))


if __name__ == "__main__":
    main()
