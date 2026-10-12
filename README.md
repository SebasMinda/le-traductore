# Voz Studio

Un estudio de voz a texto con interfaz en español. Inspirado en la organización de un estudio de audio, con identidad propia y sin afiliación con ElevenLabs.

## Funciones

- Subir audio o grabar con el micrófono.
- Transcripción real con Whisper Tiny o Base multilingüe, mediante Transformers.js 3.8.1 en un Web Worker.
- Español, inglés y detección automática de idioma.
- Editor, contador de palabras, copiar y descargar TXT.
- Exportación SRT con marcas temporales del modelo; los tiempos se eliminan al editar porque dejan de corresponder al texto.
- Historial de hasta 20 transcripciones en localStorage, con eliminación individual o completa.
- Cancelación del procesamiento y diseño adaptable al celular.

## GitHub Pages

1. Crear un repositorio nuevo y subir todo el contenido de esta carpeta, incluidos `dist`, `tests` y `.github`.
2. En Settings → Pages → Source, seleccionar **GitHub Actions**.
3. Usar `main` como rama principal. El workflow incluido publica `dist` automáticamente.
4. Abrir la URL que entrega el workflow. Todas las rutas son relativas, compatibles con sitios de proyecto.

No requiere backend, claves API ni instalación de dependencias npm. Para desarrollo, servir `dist` por HTTP, por ejemplo `python3 -m http.server 8000 --directory dist`. El micrófono requiere HTTPS o localhost.

## Uso y límites

Hasta 10 minutos y 60 MiB por archivo. Usa inicialmente audios cortos en dispositivos con poca memoria. MP3, WAV, M4A, OGG, FLAC y otros formatos dependen de los códecs del navegador; si un formato falla, convierte el archivo a MP3 o WAV. El audio se decodifica, convierte a mono y remuestrea a 16 kHz antes de transcribir.

La primera transcripción descarga el modelo desde Hugging Face y el motor desde jsDelivr. Necesita internet y puede tardar varios minutos. El navegador puede conservar el modelo en caché, pero puede borrarlo si falta espacio. La velocidad y precisión dependen del dispositivo, el modelo, el idioma y la claridad del audio. Tiny/Base no prometen el rendimiento ni la precisión del servicio ElevenLabs. No hay separación de hablantes.

El audio se procesa localmente: esta aplicación no lo sube a un servicio de transcripción. Los modelos y bibliotecas se descargan desde proveedores externos; las fuentes tipográficas se descargan desde Google Fonts. Estos proveedores reciben solicitudes de red para sus recursos. Los textos se guardan únicamente en este navegador y no se sincronizan. No guardar transcripciones sensibles en un dispositivo compartido.

## Validación

`npm run check` comprueba la sintaxis. `npm test` comprueba tiempos SRT, mezcla mono y conteo de palabras. La integración del micrófono, la descarga del modelo y una transcripción completa necesitan verificación en un navegador real con acceso a las dependencias externas.

Documentación de referencia: https://huggingface.co/docs/transformers.js/api/pipelines
