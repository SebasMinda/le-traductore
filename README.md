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
- Contadores de actividad y fragmentos para distinguir la descarga del procesamiento.

## GitHub Pages

1. Crear un repositorio nuevo y subir todo el contenido de esta carpeta, incluidos `dist`, `tests` y `.github`.
2. En Settings → Pages → Source, seleccionar **GitHub Actions**.
3. Usar `main` como rama principal. El workflow incluido publica `dist` automáticamente.
4. Abrir la URL que entrega el workflow. Todas las rutas son relativas, compatibles con sitios de proyecto.

No requiere backend, claves API ni instalación de dependencias npm. Para desarrollo, servir `dist` por HTTP, por ejemplo `python3 -m http.server 8000 --directory dist`. El micrófono requiere HTTPS o localhost.

## Rendimiento en la versión 1.1

La versión anterior siempre usaba WASM y generaba tiempos para subtítulos. Ahora usa WebGPU cuando detecta un adaptador compatible. El usuario puede elegir Procesador si su GPU resulta más lenta. La configuración gráfica usa el encoder en fp32 y el decoder en q4; el procesador conserva q8. Se mantiene el mismo modelo multilingüe y el contexto entre fragmentos. La cuantización y el backend pueden producir diferencias en el texto; revisar el resultado sigue siendo necesario.

Transformers.js 4.3.1 incorpora mejoras del backend y la corrección de descargas duplicadas de la versión 4.3. La caché y el modelo cargado se reutilizan; cambiar de backend puede requerir otros archivos de modelo. La aceleración no garantiza una velocidad concreta: depende del navegador, GPU, temperatura y memoria.

Los tiempos están desactivados inicialmente y se pueden activar para descargar SRT. El audio se decodifica directamente a 16 kHz cuando el navegador lo admite, evitando un remuestreo adicional. La interfaz muestra actividad y fragmentos terminados. Un contador de pasos de texto indica actividad y no representa palabras finales ni un porcentaje estimado.

GitHub Pages aloja archivos estáticos y no ejecuta la transcripción en un servidor. Para conseguir tiempos independientes de la potencia del celular habría que usar un servicio de transcripción o un servidor con GPU. Eso requiere otro despliegue y, posiblemente, un costo de uso.

## Uso y límites

Hasta 10 minutos y 60 MiB por archivo. Usa inicialmente audios cortos en dispositivos con poca memoria. MP3, WAV, M4A, OGG, FLAC y otros formatos dependen de los códecs del navegador; si un formato falla, convierte el archivo a MP3 o WAV. El audio se decodifica, convierte a mono y remuestrea a 16 kHz antes de transcribir.

La primera transcripción descarga el modelo desde Hugging Face y el motor desde jsDelivr. Necesita internet y puede tardar varios minutos. El navegador puede conservar el modelo en caché, pero puede borrarlo si falta espacio. La velocidad y precisión dependen del dispositivo, el modelo, el idioma y la claridad del audio. Tiny/Base no prometen el rendimiento ni la precisión del servicio ElevenLabs. No hay separación de hablantes.

El audio se procesa localmente: esta aplicación no lo sube a un servicio de transcripción. Los modelos y bibliotecas se descargan desde proveedores externos; las fuentes tipográficas se descargan desde Google Fonts. Estos proveedores reciben solicitudes de red para sus recursos. Los textos se guardan únicamente en este navegador y no se sincronizan. No guardar transcripciones sensibles en un dispositivo compartido.

## Validación

`npm run check` comprueba la sintaxis. `npm test` comprueba tiempos SRT, mezcla mono y conteo de palabras. La integración del micrófono, la descarga del modelo y una transcripción completa necesitan verificación en un navegador real con acceso a las dependencias externas.

Documentación de referencia: https://huggingface.co/docs/transformers.js/api/pipelines
