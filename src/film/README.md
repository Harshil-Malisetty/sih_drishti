# Drishti: Scene 01

Open `/film/scene-1`. Only the eight-second Government opening from the approved
two-minute storyboard is implemented. Product routes and role sessions are not
changed. Playback is opt-in, including when reduced motion is preferred.

## Technical decision

| Approach | Fit for this proof of concept |
| --- | --- |
| Canvas 2D + existing Motion library | Selected. Original path-based character poses, hand/facial articulation, layered backgrounds, continuous camera movement, deterministic seeking, high-DPI output. No new dependency. |
| React/SVG/CSS | Available, but no character rig or film timeline exists. DOM transforms alone would not deliver the required illustration and acting. |
| PixiJS with Spine/Rive assets | Useful for a larger rigged production, but none of these runtimes or authored rigs is present. Adds an asset-authoring and licensing/tooling decision. |
| Remotion | Strong candidate for frame-accurate full-video rendering, audio assembly and export later. Not installed; does not itself supply illustration or character acting. |

React owns only transport controls. Motion supplies the playback clock; the
renderer is a deterministic function of time. Static painted layers and Path2D
objects are cached. The canvas scales to device pixel ratio, capped at 3840px,
and exports clean 1920 x 1080 PNG frames without player chrome or captions.

## Shot direction

- 0.00-1.15: The official anticipates and raises her open hand toward a fixed CCTV.
- 1.15-2.55: Hold the presentation; breathing, speech poses, blink and street traffic.
- 2.55-4.20: Hand lowers, eyebrows shift, mouth relaxes and eyeline turns toward the uncovered street.
- 3.30-6.75: Continuous lateral camera reveal with foreground/background parallax and a gentle pullback. The CCTV stays physically fixed, facing away from the side street.
- 5.50-7.15: A cyclist slows at standing water beyond the obstructing corner shop.
- 7.15-8.00: A metropolitan bus crosses the foreground as an outgoing wipe. Scene 02 does not begin.

Narration: "We invest heavily in CCTV. But fixed cameras cannot follow everything
happening across a city that keeps moving."

The local WAV is explicitly a synthetic guide voice. Facial speech poses are
timed approximation, not phoneme-level lip sync; final acting/timing should be
revisited against the recorded actor. Architecture is stylized and geographically
suggestive, not a surveyed reproduction of the junction.

## Review and checks

Play/pause, restart, seek, speed, guide sound, optional captions, fullscreen and
PNG frame capture are provided. Focus the player for Space, arrow, Home and End
controls. Playback pauses when the tab is hidden and stops on unmount.

`npm run typecheck`

`npm test -- --run tests/film-scene.test.ts`

Do not extend this into the remaining scenes until the visual direction is approved.