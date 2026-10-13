# Speaker recognition dependencies

The two JavaScript files in this directory are unmodified sherpa-onnx
WebAssembly artifacts, release v1.13.7, maintained by k2-fsa and Xiaomi.
Source: https://github.com/k2-fsa/sherpa-onnx/tree/v1.13.7
License: Apache-2.0, https://www.apache.org/licenses/LICENSE-2.0
Copyright sherpa-onnx contributors and Xiaomi Corporation.

The runtime downloads the matching models and WASM from the pinned mirror:
https://huggingface.co/Transcripta/sherpa-onnx-speaker-diarization-wasm/tree/e978abbb67d995f48e26a9950db4025e297574d5

Segmentation: pyannote/segmentation-3.0, MIT license, pyannote contributors.
https://huggingface.co/pyannote/segmentation-3.0

Speaker embeddings: 3D-Speaker / WeSpeaker, VoxCeleb-trained weights.
The mirror attributes these weights under CC-BY-4.0.
https://github.com/modelscope/3D-Speaker
https://github.com/wenet-e2e/wespeaker
https://creativecommons.org/licenses/by/4.0/

Models run locally; no audio is sent to these providers. The models and runtime
are used unmodified. Speaker labels are estimates, not identity verification.
