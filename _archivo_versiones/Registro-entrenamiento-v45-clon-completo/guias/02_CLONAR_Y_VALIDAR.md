# Reproducción y aceptación

## Ejecutar la fuente

Necesitas Node.js >=22.13.0, npm y acceso al registro npm para reinstalar dependencias. El proyecto se validó en Windows con Node.js 24.15.0. Usa el package-lock.json incluido; no actualices versiones durante la clonación.

Desde la carpeta extraída, en PowerShell:

```powershell
Set-Location '.\app'
npm ci
npm test
npm run dev
```

Abre la URL Local que indique el servidor y `/app/index.html`. `npm test` compila y ejecuta las pruebas; la versión exportada superó 133 pruebas. Para compilación y servidor de producción local: `npm run build` y `npm run start`.

Si faltan los enlaces de ejecutables en node_modules/.bin tras una instalación interrumpida, ejecuta `npm rebuild` y repite. No cambies dependencias para ocultar errores. Los binarios nativos dependen del sistema; npm ci debe ejecutarse en el destino.

## Vista estática alternativa

Para revisar exclusivamente la PWA, sirve `app/public/` por HTTP y abre `/app/index.html`; no abras el HTML con file://. Esto reproduce la interfaz local pero no el Worker, el acceso privado de Sites ni el servidor del proyecto. Service worker y Wake Lock requieren un contexto seguro, incluido localhost.

## Nuevo despliegue

La configuración original se incluye intacta como evidencia. Para un nuevo proyecto Sites, crea un Site distinto y reemplaza project_id solo en la copia destinada a ese nuevo Site. Mantén acceso privado si la app contiene datos personales. Nunca empujes al repositorio original ni despliegues sobre su identificador sin petición explícita.

En otro alojamiento, configura el origen HTTPS, la ruta `/app/`, el acceso, las cabeceras y el servidor equivalente. El acceso privado de Sites es una función de la plataforma, no un login transportable dentro del ZIP. El tar de despliegue es evidencia/artefacto de Sites; conserva su identidad y no lo publiques directamente como un nuevo Site.

## Servicios externos

Las funciones de finalizar/sincronizar, check-in y Comandos IA conservan el endpoint original. Una copia con ese endpoint sigue apuntando al servicio de Daniel; para un clon independiente, configura un servicio propio antes de enviar datos de prueba. Nunca pruebes escritura contra el backend original sin autorización.

Cliente y pruebas documentan el formato de transporte, las respuestas y la cola. No se incluye la implementación de Apps Script ni una exportación de sus Sheets. No afirmar que la clonación independiente de esa parte está terminada sin disponer de ellos.

## Lista de aceptación

1. Comparar aspecto en 360/384/412 px y escritorio con referencia y CSS originales.
2. Preparar una nota, revisar prescripción y comprobar que resultados nuevos quedan vacíos.
3. Registrar series en un origen local de prueba; recargar y comprobar recuperación de borrador.
4. Finalizar una vez, verificar historial y no duplicación al importar.
5. Comparar máquina/Smith/TRX/autocarga y ajustes distintos: no transferir referencias incompatibles.
6. Ver tres referencias compatibles del hip thrust sin truncar el historial completo.
7. Girar tarjeta, abrir variantes, volver con botón y Escape, conservar valores; ningún control de registro provoca el giro.
8. Revisar temporizador, pausa, ajustes ±15 s, alarma y panel RIR. Audio y suspensión requieren dispositivo real.
9. Verificar caché, recursos y apertura offline después de una carga online completa.
10. Probar exportación/importación JSON y PDF; validar el servicio externo solo en un entorno autorizado.

Los datos de prueba en app/tests son fixtures, no sesiones personales realizadas. Las plantillas internas no sustituyen al programa actual del entrenador.
