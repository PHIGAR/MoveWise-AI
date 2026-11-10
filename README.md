# MoveWise AI

Thai fitness coaching built with vanilla HTML/CSS/ES modules, MediaPipe Pose Landmarker, and a Node HTTP server. No build step or runtime npm dependencies.

## Run

Requires Node **22.9 or newer** (verified with Node 24.20).

```sh
npm start
```

Open http://127.0.0.1:4173. `.env` is optional. For optional Gemini coaching, copy `.env.example` to `.env` and configure the server-side `GEMINI_API_KEY`. Never put the key in browser code. Without a key, measured workout feedback and history still work.

Camera access requires localhost or HTTPS. Select an exercise, read the positioning guide, then press Start. First start downloads the pinned MediaPipe 0.10.32 runtime; the pose model is included locally. If loading fails, retry without losing access to the rest of the app.

## Product behavior

- MoveWise 3.0 uses a bright-blue light theme and paired navy dark theme. Styling is separated into semantic tokens, base components, workspace, product screens, workout, battle, and reduced-motion-aware transitions.
- Search in Thai or English and combine it with category filtering. Only registry entries with working analyzers appear as available.
- Pause/resume solo workouts without counting paused time. Backgrounding a solo workout pauses analysis. Restart asks before discarding the current unsaved set. Finish saves the completed session, including zero-rep sessions with unknown metrics kept null. Failed saves can be retried.
- Toggle skeleton visibility and choose a camera layout. Camera tracks stop on exit, restart, playback failure, and page exit. Pausing keeps the camera open and explicitly says so.
- History filters by exercise and 7/30/90 calendar days. Every saved session can open a detail report, including legacy sessions without pose visuals.
- Progress includes a real 28-day activity chart; empty dates remain zero. Measured results remain available without images. Optional movement reports retain skeletons from at most the first three completed reps.
- Profile contains daily goals, light/dark/system themes, and reduced motion. Preferences tolerate blocked storage.
- Local two-person battle and online rooms retain their existing scoring/state contracts. Online connection errors show retry status; a reconnect action restores a saved room identity.

- Press Start/Ready once, then hold the required landmarks in frame for about two seconds. A five-second countdown starts automatically and cancels on tracking loss. Online readiness leases and the countdown are server-controlled.
- Solo supports duration and/or repetition targets; local and online battles support a shared duration. Manual cancellation remains available.
- Pose inference starts at a 20 FPS cap, skips duplicate video frames, and adapts to observed inference time. Compatible browsers run MediaPipe in a reusable classic worker. Unsupported worker/WebGL or bitmap paths fall back to the existing main-thread detector.
- Expanded diagnostics show execution mode, observed FPS, inference and processing timings, startup, rep feedback, main-thread long tasks and main JS heap where available. For benchmark comparisons, `?poseFps=15`, `20`, or `30` selects a cap.
- Quality is a camera-based heuristic. The existing accuracy field is the ratio of completed to attempted reps, not ground-truth recognition accuracy. Coaching compares only supported, measured fields; improvement trends require comparable exercises and measurement versions.

## Data and privacy

The existing `movewise_sessions` format and key are unchanged. Daily goals retain their existing storage key. New preferences use `movewise_preferences`. Online room credentials remain in session storage.

Raw camera video is processed on the device and is not recorded or uploaded. Skeleton capture is off by default. Opting in stores only bounded landmark coordinates on this device; deletion controls are available in Profile and Results. Optional Gemini requests contain exercise-specific measured session summaries and feedback, without video or landmark poses. Online battles send rep counts and calculated metrics.

Online rooms remain in server memory. Use a long-running Node server with SSE support; process restarts lose rooms, and horizontal multi-instance operation needs a shared room backend. The AI serverless endpoint does not add a persistent battle service. No production deployment is included in this change.

## Verification

```sh
npm test
npm run test:browser
```

The second command opens a **test-only** synthetic pose fixture at http://127.0.0.1:4174. It replaces the camera and detector adapters, while retaining the real UI, exercise analyzers, and storage. It never opens a camera and is blocked by the production static-file allowlist. Data created there is test data, isolated by origin from port 4173.

For camera failure checks, use `http://127.0.0.1:4174/?camera=denied` or `?camera=missing`. The fixture generates synthetic squat landmarks, including two distinct people for local battle testing. Its scores are test output, not coaching validation.

See the [MoveWise 2.0 verification report](docs/VERIFICATION_2.md), [14-image issue checklist](docs/SCREENSHOT_ISSUES.md), and [screenshots](docs/screenshots/v2/). The [initial upgrade report](docs/VERIFICATION.md) records the earlier baseline.

The browser regression runner is at http://127.0.0.1:4174/qa after `npm run test:browser`. It uses disposable in-memory fixture storage. `?model=real` runs the actual pinned MediaPipe model on generated non-person video; this measures runtime behavior, not workout accuracy. The test-only “Sample next 10 seconds” control supports warmed measurements. No fixture route is served by `npm start`.

See [3.0 implementation and measurements](docs/VERIFICATION_3.md) for results and remaining hardware-validation limits.
