# MoveWise 2.0 verification — 4 November 2026

## Scope and implementation

Continues the existing `feat/premium-product-upgrade` branch and draft PR #1. The follow-up baseline was **72 passing tests**. All 14 supplied screenshots are traced in [SCREENSHOT_ISSUES.md](SCREENSHOT_ISSUES.md); private attachments and personal camera footage remain outside Git.

The roadmap was: replace the contradictory style cascade with semantic components; redesign every major flow around real data; reduce avoidable live-workout work; verify populated states and fix issues found in a second browser review. The vanilla stack, exercise registry/analyzers, Gemini API contract, battle scoring, and existing storage keys/schema remain intact.

- Replaced the 15,530-line legacy stylesheet and competing overrides with seven focused styling modules behind one entrypoint. Light/dark text and surfaces have explicit paired tokens.
- Redesigned dashboard, library, camera preparation/live controls, results/coaching, progress/history, profile/settings, and local/online battle. Removed duplicate dashboard statistics and calendar regions.
- Added 28 local-calendar-day activity buckets, accessible actual-data bars, compact personal bests, bounded movement previews, and independent profile content/settings columns.
- Paced pose inference to at most 20 fps, skipped unchanged live text/status mutations, removed forced rep layout reads, avoided hidden-dashboard rendering on Finish, and consolidated navigation handlers. Analyzer timestamps remain real elapsed timestamps.
- Fixed first-use local battle exercise selection, camera startup failure navigation, desktop search focus loss, and mobile fixed navigation being captured by a retained animation transform. Local countdown clears when the match starts; online HUD shows actual provisional scores, reps, server countdown, and connection errors.

## Automated checks

Final `npm test`: **78 passed, 0 failed**, Node 24.20.0. See [complete output](test-results-v2.txt). Existing analyzer, storage, camera, detector, coaching, battle domain/API, and static-serving tests continue to pass.

Six new tests cover 28-day calendar/year boundaries and invalid/future/incomplete sessions; inference pacing/reset; unchanged-text mutation suppression; light and dark semantic text contrast; and bounded movement preview output/clearing legacy visuals. `node --check app.js` and `node --check src/ui/battleUI.js` passed. `git diff --check` passed after whitespace cleanup.

## Browser verification

Used in-app Chromium with production localhost port 4173 and the isolated synthetic fixture on 4174. Checked representative **390×844**, **768×1024**, and **1440×1000** widths. Measured document widths stayed inside the viewport. Populated dark dashboard, library, workout, results, progress and profile had no failures in the sampled visible-text contrast audit. This sampled audit is not a complete WCAG conformance claim.

1. Navigation: sidebar and mobile bottom navigation, combined search/category filtering, desktop search focus, profile navigation, camera layout selection and Escape dismissal work. Fixed mobile navigation was rechecked at the viewport bottom after screen animation completed. Exercise image assets loaded; the image-free challenge uses its text fallback.
2. Workout/results: synthetic squat input drives the real analyzer; pause freezes counts/time, resume continues, Finish saves and opens a readable report. A mobile run completed 9 reps in 16 seconds. Skeleton controls work. Existing history survives reload. The no-key AI fallback is explicit; advice is not presented as a Gemini response.
3. Camera failures: separate denied and unavailable-device fixture URLs show distinct Thai explanations, Retry, idle metrics, and disabled Finish. No camera opened during these fixture checks.
4. Progress/profile: saved synthetic sessions populate weekly/monthly history, goals, bests, and exercise metrics. Light/dark selectors and reduced-motion preference persist. Profile headers are clear of the fixed workspace bar; the mobile/tablet layouts reflow.
5. Battle: two distinct synthetic people reach readiness, select Squat, run the local countdown/full 60-second match and reach a draw. Two browser clients create/join a room, select Squat, ready, run a full online match and reach a draw (79–79 in that run). Invalid room input produces a clear error. Reload reconnects the same room identity. No captured app console errors in these runs. Existing automated tests cover transient SSE errors, reconnect identity and room expiry; a physical unreliable-network match remains manual.

The debug-only result-generation measurement was **16 ms in one synthetic run**, compared with the supplied 1,960 ms interaction warning. These measure different things: this is not a real-camera INP benchmark or performance guarantee. A real device trace is required to validate end-to-end responsiveness under MediaPipe load.

## Visual evidence

Screenshots contain actual empty-state data or clearly labeled synthetic fixture output, never personal footage or fabricated production progress.

| View | Screenshot |
|---|---|
| Light dashboard, desktop | [01](screenshots/v2/01-dashboard-desktop-light.jpg) |
| Dark dashboard, mobile | [02](screenshots/v2/02-dashboard-mobile-dark.jpg) |
| Dark live workout, mobile | [03](screenshots/v2/03-workout-mobile-dark.jpg) |
| Dark results, desktop / mobile | [04](screenshots/v2/04-results-dark-desktop.jpg), [05](screenshots/v2/05-results-mobile-dark.jpg) |
| Dark profile / progress | [06](screenshots/v2/06-profile-dark.jpg), [07](screenshots/v2/07-progress-mobile-dark.jpg) |
| Local / online battle results | [08](screenshots/v2/08-local-battle-results.jpg), [09](screenshots/v2/09-online-battle-results.jpg) |
| Local live battle, mobile | [13](screenshots/v2/13-battle-live-mobile.jpg) |
| Tablet dashboard | [10](screenshots/v2/10-dashboard-tablet.jpg) |
| Camera denied | [11](screenshots/v2/11-camera-denied.jpg) |
| Light library, desktop | [12](screenshots/v2/12-library-desktop-light.jpg) |

## Remaining manual checks and deployment limits

Real-camera movement accuracy, lighting/occlusion, physical two-person assignment, mobile Safari, real-device INP and unreliable-network camera matches need human/device testing. No Gemini credential was supplied; no paid request was made. Mock service tests and no-key browser fallback passed. Landmark simulation does not establish coaching accuracy or exercise safety.

Online rooms still use the existing in-memory Node/SSE backend. Persistent room storage, multi-instance synchronization and production infrastructure remain separate work. No production deploy or PR merge was performed.
