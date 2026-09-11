# Drishti — original Canvas animated explainer

A standalone, silent **90-second, 1920×1080, 30 fps** animated short. All film artwork is drawn with the Canvas 2D API and browser-native JavaScript modules. No React, p5, Motion, SVG, remote images, inference service or screen recording is used by the film. The existing operational React application and earlier SVG studies are preserved separately.

## Preview and edit

- `npm run film:preview` serves the film independently at **http://127.0.0.1:4191/canvas-film/index.html**. It needs neither a Vite build nor the operational store.
- Vite dev/production also serves **/canvas-film/index.html**. Use the explicit HTML path on static hosting. The old **/presentation** entry redirects here.
- The player starts paused, including for reduced-motion users. Play, pause/resume, restart, frame scrub, chapter seek, subtitles and fullscreen are outside the movie stage.
- `?t=35.5` or `?frame=1065` seeks on load. `?subtitles=0` turns off dialogue. `?capture=1` hides the player and fixes the Canvas at 1920×1080.
- **script.js** handles the player, Canvas composition and synchronous `window.renderFrame(frameNumber, {subtitles: true|false})` export contract. Await `window.filmReady` before drawing. The acknowledgement includes the normalized frame, scene, dimensions and subtitle setting.
- **art.js** contains the original shared illustrated world, characters and vehicles. **scenes.js** choreographs the eight scenes. **timeline.js** supplies the pure integer-frame scene/caption math. All film motion derives from the requested frame, never from a separate timer or random source.

## Narration alignment

**narration.json** preserves the approved four-speaker wording and scene time windows. Phrase strings currently divide their window proportionally by word count; these are rehearsal timings, not measured alignment to an audio recording. Subtitles concatenate to the exact original dialogue, including the closing line.

Once narration is recorded, each string may instead be `{ "text": "exact phrase", "start": 8.0, "end": 9.5 }`, with absolute times in seconds. Use objects for every phrase within that cue. Invalid, overlapping or out-of-window phrase times fail loudly. Gaps are allowed in explicitly aligned phrases. Scene times stay fixed: a different overall running time requires editing the scene timeline too. Captions longer than two lines fail validation instead of shrinking silently.

No voiceover, music, lip-sync or audio synchronization is fabricated. Record voices later using the delivered timecoded cue sheet and import them into an editor.

## Deterministic PNG → MP4 export

- `npm run film:render` captures both clean and subtitled masters into **exports/drishti-canvas/** (ignored by git). Install dependencies first with the project's normal npm setup. Set `CHROME_PATH` if Chrome is not installed at a standard Linux path.
- The exporter uses **Puppeteer**, not screen recording: seek integer frame → await synchronous Canvas draw acknowledgement → screenshot a 1920×1080 PNG → write with backpressure to ffmpeg. Only a single screenshot per variant is held at a time.
- Both masters use the same renderer. Subtitles are painted directly for the rehearsal variant; clean frames never contain dialogue. The export does not apply a second subtitle filter.
- Bundled `ffmpeg-static` and `ffprobe-static` are used. `FFMPEG_PATH` and `FFPROBE_PATH` can override them. Missing H.264 support fails before capture.
- Options: `--out=/absolute/directory`, `--variant=clean`, `--variant=subtitled`, `--frames=60` (explicit short smoke test), `--keep-frames` (save sequential PNGs as well as stream them). Full film exports require all 2,700 frames. Existing movie files are never overwritten.
- Deliverables: **drishti-clean.mp4**, **drishti-subtitled.mp4**, **drishti.srt**, **voiceover-cues.md**, narration JSON, ffprobe metadata and a manifest recording source/font hashes, browser version, resolution, fps and actual frame count. Masters are H.264, yuv420p, CFR 30 fps, fast-start, silent. The manifest marks short smoke renders as partial.
- Captions/SRT always describe the full 90-second film, including when making a partial smoke render.
- `.partial.mp4` is renamed only after encoding and ffprobe validation succeed. A failed run may leave partial files for diagnosis; select another output directory to retry.
- Pixel determinism is guaranteed under the same renderer, assets, browser and platform; cross-browser/font-rasterizer pixel equality is not claimed.

## QA and boundaries

`npm run film:qa` uses Puppeteer to capture a 24-frame contact sheet and checks all 2,700 draw calls, caption boundaries, repeated/out-of-order image equality, the held end card, player controls, reduced motion, mobile layout and absence of React/external requests. Outputs default to **/tmp/drishti-canvas-qa/**; `FILM_QA_OUT` overrides it. The ordinary `npm test`, `npm run typecheck`, and production build still cover the existing application.

This is an original illustrated explainer, not a copy of any channel's characters or compositions. Stylized Chennai geography is illustrative. Fleet AI, candidate matching and reinspection are simulated product-vision workflows; matches are not identities, and closure requires an official. Planning is a demo scenario estimate. Only Drishti's map is updated after government approval. There is no predictive hazard service or live bus-arrival feed.

The locally embedded DM Sans fonts retain their **SIL Open Font License**, included in **assets/OFL.txt**.