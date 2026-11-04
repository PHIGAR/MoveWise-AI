# MoveWise 2.0 — screenshot issue checklist

The 14 supplied images are treated as bug reports. Original attachments stay outside Git, particularly the personal camera images. Repeated screenshots are tracked individually below. The source audit used the existing branch/PR #1 and a passing 72-test baseline.

| Image | Finding and source | Correction / verification |
|---|---|---|
| 1 | Live metrics use white tiles and pale dark-theme text; narrow controls and truncated labels. Conflicting `style.css`/`product.css` rules. | Replaced cascade with `tokens.css` + `workout.css`: paired tile/text colors, wrapping labels, 44px controls and grouped session actions. Populated dark workout checked with synthetic landmarks. |
| 2 | Same contrast failure with skeleton disabled; selected text masks the underlying problem. | Skeleton remains independently functional; metric readability no longer depends on selection or skeleton state. Checked in both states. |
| 3 | Huge movement illustration precedes the summary, cluttered trails, unreadable result score; reported 1,960ms interaction. | Summary leads; visualization uses bounded height/latest 3 trails. Semantic result colors. Removed forced rep layout reads, duplicate navigation handlers and hidden-dashboard work during finish; paced inference and skipped unchanged status mutations. Synthetic generation measured separately, not claimed as real-camera INP. |
| 4 | Narrow result cards force Thai labels into fragments; inconsistent score/time typography. | Flexible three-stat summary, stable numeric scale, responsive single-column results, Thai wrapping without forced character breaks. |
| 5 | White daily-goal surface with pale green text in dark results. | Daily goal owns its paired surface/text tokens in every placement. Populated results screenshot includes the goal. |
| 6 | Coaching panels and fallback message use light surfaces with dark-theme text; duplicate advice and oversized blocks. | No nested white cards: a two-column text section, clear warning tokens, duplicate focus sentence hidden, responsive stack. |
| 7 | Unselected coaching text becomes nearly invisible. | Same correction as 6, verified without text selection in populated dark results. |
| 8 | Duplicate of 7. | Tracked independently; same underlying component correction. |
| 9 | Green identity, oversized hero/goal, duplicated sidebar statistics, performance warning. | Bright blue compact dashboard with real goal, weekly summary, registry exercises and recent sessions; duplicate rail profile/calendar removed. Navigation executes once per action. |
| 10 | White exercise-shelf wrapper against dark page; pale title; awkward challenge text and unbalanced rows. | Shelf uses background directly, paired exercise surfaces, responsive compact cards and normal Thai wrapping. No unavailable analyzer is promoted. |
| 11 | Very narrow mostly blank crop: insufficient evidence to identify an individual control or route. | Explicit evidence limit. Checked screen bounds/overflow at 390, 768 and 1440 widths; did not invent a diagnosis for the crop. |
| 12 | Local camera overlays cover much of the body; large unused gaps; setup lacks a clear selected-exercise flow. | Status/score bands moved to frame edges; bounded typography, mobile portrait layout, visible timer and exit. Fixed a first-use bug that discarded exercise selection while `localBattleState` was null. Synthetic two-person setup confirms selected Squat. |
| 13 | Duplicate of 12. | Same implementation and independent tracking; no personal footage used as a fixture or committed. |
| 14 | Header clipped by workspace bar, low-contrast selector, large inconsistent profile regions. | Explicit shell offset; native select inherits themed surface/text; compact stats and independent content/settings columns eliminate row gaps. |

## External overlays and evidence limits

The screenshots include browser selection highlights and a black INP/debug toolbar. Those are not components rendered by this repository. Local checks inspect the actual application without copying or hiding third-party browser UI. The application performance paths behind the warning were investigated and improved; full real-camera INP still requires target-device measurement.

## Review passes

1. Rebuilt semantic styles and checked populated workout/results, dashboard and profile. This exposed a dashboard rail selector mismatch and excess profile grid gaps; corrected the actual markup/layout.
2. Checked both themes, mobile/tablet/desktop reflow, real saved synthetic history, camera adapter error cases, and local/online match state. Screenshots and final test results are linked in `VERIFICATION_2.md`.
