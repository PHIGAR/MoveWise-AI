# Product upgrade verification — 4 November 2026

## Audit and implementation roadmap

The source tree contains one HTML application, a large ES module coordinator, accumulated CSS revisions, six available exercise analyzers, one unavailable registry entry, local/session storage helpers, a server-side Gemini proxy, and local/online battle implementations. Existing analyzer exports, battle contracts and stored session format were retained.

Baseline `npm test`: **57 passed, 1 failed**. The failing progress assertion expected two recent sessions although the summary used a five-session default. The summary now accepts an explicit limit and the assertion explicitly requests two; the default remains five.

Implemented in four increments:

1. Resilient camera startup, cleanup, lazy pinned detector loading, optional `.env` startup.
2. Shared product tokens, responsive surfaces, themes, exercise guides, removal of inactive Pro/notification UI, restoration of hidden exercises/statistics.
3. Combined search/category filters, solo workout pause/resume/restart, history filters and legacy detail navigation, measured-only coaching payloads.
4. Battle loading/validation/reconnection handling, focused tests, browser QA and screenshots.

## Automated verification

Final `npm test`: **72 passed, 0 failed** on Node 24.20.0.

Coverage includes all existing exercise suites, session storage/legacy records, daily goals, streaks, personal bests, weekly progress, local battle assignment/scoring, authenticated online battle timing/results/expiry, Gemini success/quota/malformed-response/timeout fallbacks, plus:

- Thai/English combined category search and unavailable analyzer exclusion.
- Local-calendar history boundaries, future/incomplete record exclusion and stable sorting.
- Repeated pause/resume, elapsed time and restart reset.
- Camera denial, unavailable/busy devices, playback failure, cleanup and late permission grants after navigation.
- Concurrent detector startup, observable load failures, retry and pose-count controls.
- Exercise-specific coaching fields (squat depth cannot become arm ROM).
- Battle reconnect identity, transient SSE retries, malformed events and blocked credential storage.
- New assets/module serving, model MIME type, and denied access to tests, environment files and Git metadata.

`node --check` passed for changed JS modules. `npm start` is checked without an `.env` file. No production deployment or merge was performed.

## Browser verification

In-app Chromium checks at **390×844**, **768×1024**, and **1440×1000**. Dashboard DOM width stayed within the viewport at all three sizes. Inspected navigation, library, workout preparation, history, details, profile/settings and battle UI. Checked loaded image assets and console errors during the synthetic workout; no app errors were observed. MediaPipe emits its normal OpenGL diagnostic warning.

Verified through real browser interactions:

- Combined filters: `squat` + Cardio shows no result; switching to Strength shows Squat.
- Workout preparation shows the correct instructions; camera starts only after Start.
- Actual detector runtime loads from pinned CDN. An unresolved camera request produces a clear timeout and working Retry.
- Synthetic squat landmarks drive the real analyzer and complete 3 reps; pause holds reps and the timer at 00:06 across separate observations, resume works, finish shows results and the AI unavailable fallback.
- Reload retains that synthetic session; history exercise filtering shows matching/empty states and opens the saved movement report.
- Restart opens a dialog and resets reps, metrics and timer; finish is disabled until a new session starts.
- Two browser tabs create/join an online room, select matching Squat, show readiness, toggle readiness and reconnect the same room.
- Light/dark selection persists and renders usable surfaces; skeleton toggle and reduced-motion setting are functional.

Screenshots show empty real-data states, not invented progress. Synthetic data was confined to the isolated fixture origin and not committed.

## Remaining manual/environment checks

- A human real-camera pass is still required for physical movement accuracy, lighting, occlusion, camera permission prompts and mobile Safari. Synthetic landmarks do not establish coaching or exercise safety accuracy.
- Two physical people/devices are needed to verify real-camera Local Battle and a complete online camera match over an unreliable network. Domain/API tests cover results and reconnect behavior; browser checks cover room creation/joining/readiness.
- No Gemini credential was supplied. Real paid-service responses were not requested; success and failure paths use mocks, and the browser confirmed the no-key fallback.
- Persistent battle infrastructure, rate limiting and multi-instance room synchronization remain deployment work. Existing in-memory room storage was preserved and disclosed in the UI/README.
