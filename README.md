# Voz Studio

Un estudio de voz a texto con interfaz en español. Inspirado en la organización de un estudio de audio, con identidad propia y sin afiliación con ElevenLabs.

## Funciones

- Subir audio o grabar con el micrófono.
- Transcripción real con Whisper Tiny o Base multilingüe, mediante Transformers.js 4.3.1 en un Web Worker.
- Español, inglés y detección automática de idioma.
- Editor, contador de palabras, copiar y descargar TXT.
- Exportación SRT con marcas temporales del modelo; los tiempos se eliminan al editar porque dejan de corresponder al texto.
- Historial de hasta 20 transcripciones en localStorage, con eliminación individual o completa.
- Cancelación del procesamiento y diseño adaptable al celular.
- Selección automática de WebGPU cuando el navegador y la GPU lo permiten, con recuperación en un Worker nuevo de WASM si falla.
- Tiempos y SRT opcionales para evitar ese trabajo cuando solo necesitas texto.
- Reconocimiento local de hablantes con sherpa-onnx, segmentación pyannote y embeddings de voz, con agrupación sobre el audio completo.
- Etiquetas Persona 1, Persona 2 y más, numeradas por primera aparición y conservadas cuando vuelve la misma voz.
- Detección automática o selección del número de personas, con corrección manual por fragmento.
- TXT, SRT e historial conservan las etiquetas. Si falla la identificación, se conserva la transcripción sin etiquetar.
- Contadores de actividad y fragmentos para distinguir la descarga del procesamiento.

## GitHub Pages

1. Crear un repositorio nuevo y subir todo el contenido de esta carpeta, incluidos `dist`, `tests` y `.github`.
2. En Settings → Pages → Source, seleccionar **GitHub Actions**.
3. Usar `main` como rama principal. El workflow incluido publica `dist` automáticamente.
4. Abrir la URL que entrega el workflow. Todas las rutas son relativas, compatibles con sitios de proyecto.

No requiere backend, claves API ni instalación de dependencias npm. Para desarrollo, servir `dist` por HTTP, por ejemplo `python3 -m http.server 8000 --directory dist`. El micrófono requiere HTTPS o localhost.

## Optimización en la versión 1.3

El modo Rápido es el predeterminado. Reduce el solapamiento repetido del modelo de segmentación: desplazamiento 0.25 para diálogos declarados de dos personas y 0.15 para grupos mayores o detección automática. Detallado mantiene 0.1, como en la versión 1.2. El audio completo y los mismos modelos siguen utilizándose; las etiquetas y sus límites pueden variar. Para voces difíciles, intervenciones muy breves o etiquetas incorrectas, cambia a Detallado.

Los dos archivos del reconocimiento se descargan juntos mientras Whisper ya está transcribiendo. Solo se preparan los archivos: la inferencia de voces comienza después de la transcripción, para no disputar el procesador con Whisper. Un fallo de preparación permite reintentar y no descarta el texto. Cancelar detiene ambos Workers.

Al transcribir otra vez el mismo audio con la misma cantidad de personas y modo de análisis, se reutiliza su cronología acústica sin volver a ejecutar el modelo de voces. El texto de Whisper se vuelve a procesar. Cambiar de audio limpia esa caché; cambiar el número de personas o el modo requiere un análisis nuevo. No se guardan muestras de audio en almacenamiento persistente.

Whisper se conserva entre trabajos cuando el navegador informa al menos 8 GB mediante deviceMemory. En equipos menores o con memoria desconocida, se libera antes del análisis de voces. Elegir 1 persona omite por completo el modelo de voces y evita la alineación de Whisper por palabra: usa los tiempos de segmentos para etiquetar Persona 1.

### Medición del modelo real

Se ejecutó el mismo WASM en un contexto Worker simulado con Node, usando los archivos de modelo descargados previamente. Estos tiempos incluyen inicio e inferencia del reconocimiento; no incluyen la descarga por red ni la transcripción Whisper, y no representan la velocidad del navegador del usuario.

| Audio | Análisis anterior | Rápido | Resultado comprobado |
| --- | --- | --- | --- |
| Diálogo de 20.6 s, dos voces | 16.2 s | 8.3 s | Dos voces y primera voz reconocida al volver |
| Muestra de 56.9 s, cuatro voces | 41.3 s | 26.8 s | Cuatro voces y etiquetas conservadas al volver |

La muestra es 0-four-speakers-zh.wav del proyecto sherpa-onnx. El diálogo de dos voces usa los primeros 13.7 s de esa muestra y repite sus primeros 6.9 s. El modo rápido más agresivo confundió voces en la prueba de cuatro personas, por eso se utiliza un ajuste más conservador fuera de los diálogos declarados de dos personas. Estos controles de identidad y número de voces no son una evaluación general de precisión ni de errores de diarización.

Fuente de la muestra: https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-segmentation-models/0-four-speakers-zh.wav

## Identificación de personas en la versión 1.2

Identificar personas está activado inicialmente. Para mantener la mayor velocidad cuando solo habla una persona, desactívalo. El reconocimiento añade tiempos por palabra de Whisper y una segunda pasada acústica sobre el audio completo. No alterna etiquetas por frases o pausas. El modelo asigna clusters globales de voz; los nombres son etiquetas dentro de cada grabación, no identidades personales.

La primera vez descarga unos 55 MiB adicionales, guardados en Cache Storage si hay espacio. El WASM y los modelos están fijados a una revisión concreta para evitar cambios imprevistos. Los archivos JS de sherpa-onnx v1.13.7 se incluyen sin modificaciones en dist/vendor. Las atribuciones y licencias están en dist/vendor/NOTICE.md y LICENSE. El audio sigue procesándose localmente y nunca se sube a un proveedor de transcripción.

En equipos con poca memoria o memoria desconocida se libera el modelo Whisper antes de cargar los modelos de hablantes. Se termina el Worker de hablantes al concluir, fallar o cancelar para reducir la memoria retenida. GitHub Pages no requiere cabeceras de aislamiento: se usa WASM de un solo hilo. La primera descarga y los tiempos por palabra pueden aumentar considerablemente la espera.

Si sabes que son dos personas, elige 2 personas. La detección automática puede dividir una voz en varias personas o unir voces parecidas. Cada turno incluye una etiqueta editable y un botón para escuchar desde su inicio. Los fragmentos sin coincidencia acústica se marcan Sin identificar y las coincidencias simultáneas se marcan Voces superpuestas. Revisar el resultado sigue siendo necesario. Al editar el texto completo se conservan los nombres escritos, pero se eliminan los tiempos y segmentos para no exportar subtítulos desalineados.

## Rendimiento en la versión 1.1

La versión anterior siempre usaba WASM y generaba tiempos para subtítulos. Ahora usa WebGPU cuando detecta un adaptador compatible. El usuario puede elegir Procesador si su GPU resulta más lenta. La configuración gráfica usa el encoder en fp32 y el decoder en q4; el procesador conserva q8. Se mantiene el mismo modelo multilingüe y el contexto entre fragmentos. La cuantización y el backend pueden producir diferencias en el texto; revisar el resultado sigue siendo necesario.

Transformers.js 4.3.1 incorpora mejoras del backend y la corrección de descargas duplicadas de la versión 4.3. La caché y el modelo cargado se reutilizan; cambiar de backend puede requerir otros archivos de modelo. La aceleración no garantiza una velocidad concreta: depende del navegador, GPU, temperatura y memoria.

Los tiempos son opcionales para transcripciones sin identificación de personas; al identificar varias personas se generan tiempos por palabra para alinear las voces; con 1 persona bastan los tiempos de segmentos. El audio se decodifica directamente a 16 kHz cuando el navegador lo admite, evitando un remuestreo adicional. La interfaz muestra actividad y fragmentos terminados. Un contador de pasos de texto indica actividad y no representa palabras finales ni un porcentaje estimado.

GitHub Pages aloja archivos estáticos y no ejecuta la transcripción en un servidor. Para conseguir tiempos independientes de la potencia del celular habría que usar un servicio de transcripción o un servidor con GPU. Eso requiere otro despliegue y, posiblemente, un costo de uso.

## Uso y límites

Hasta 10 minutos y 60 MiB por archivo. Usa inicialmente audios cortos en dispositivos con poca memoria. MP3, WAV, M4A, OGG, FLAC y otros formatos dependen de los códecs del navegador; si un formato falla, convierte el archivo a MP3 o WAV. El audio se decodifica, convierte a mono y remuestrea a 16 kHz antes de transcribir.

La primera transcripción descarga el modelo desde Hugging Face y el motor desde jsDelivr. Necesita internet y puede tardar varios minutos. El navegador puede conservar el modelo en caché, pero puede borrarlo si falta espacio. La velocidad y precisión dependen del dispositivo, el modelo, el idioma y la claridad del audio. Tiny/Base no prometen el rendimiento ni la precisión del servicio ElevenLabs. La identificación opcional de hablantes se realiza con sherpa-onnx y puede equivocarse con ruido, voces parecidas, intervenciones cortas o voces superpuestas.

El audio se procesa localmente: esta aplicación no lo sube a un servicio de transcripción. Los modelos y bibliotecas se descargan desde proveedores externos; las fuentes tipográficas se descargan desde Google Fonts. Estos proveedores reciben solicitudes de red para sus recursos. Los textos se guardan únicamente en este navegador y no se sincronizan. No guardar transcripciones sensibles en un dispositivo compartido.

## Validación

`npm run check` comprueba la sintaxis. `npm test` comprueba tiempos SRT, mezcla mono, conteo de palabras, recuperación GPU, liberación de memoria, asociación de palabras con voces, voces superpuestas, etiquetas en exportaciones e historial y recuperación ante errores de identificación, preparación en paralelo, caché por audio, análisis rápido o detallado y omisión del modelo cuando solo hay una persona. La integración del micrófono, la descarga del modelo y una transcripción completa necesitan verificación en un navegador real con acceso a las dependencias externas.

Documentación de referencia: https://huggingface.co/docs/transformers.js/api/pipelines
