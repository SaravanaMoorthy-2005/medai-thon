# Third-party notices

- All hospital meshes, equipment geometry, patients, staff, visitors and assembly placement are authored procedural geometry. No third-party 3D asset files are used.
- Cutaway: interaction reference only, [imsemoo/cutaway](https://github.com/imsemoo/cutaway), MIT. No code/assets copied.
- DM Sans: locally bundled through `@fontsource/dm-sans`, SIL Open Font License. See `public/DM-Sans-LICENSE.txt` and the installed package license.
- MediaPipe Tasks Vision: Google, Apache-2.0. WASM runtime copied from the pinned npm dependency in `package-lock.json` to `public/mediapipe/wasm`. The Hand Tracking model card explicitly identifies Apache License 2.0 on page 2.
- Official HandLandmarker model: https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task . Downloaded 27 October 2026. SHA256: `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`.
- MediaPipe license: `public/mediapipe/LICENSE`. Model card: https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Hand%20Tracking%20%28Lite_Full%29%20with%20Fairness%20Oct%202021.pdf . Landmark estimation is not a validated hygiene-technique assessment.
- React, Three.js, React Three Fiber, Drei, Zustand, Fastify, Zod and supporting dependencies retain their respective package licenses in `node_modules`. ECharts is Apache-2.0; Lucide icons use ISC. Exact resolved versions are in `package-lock.json`.
