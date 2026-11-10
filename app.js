import { analyzeJumpingJackMetrics, JUMPING_JACK_METRIC_LANDMARKS } from "./src/ai/analysis/jumpingJackMetrics.js";
import { setText } from "./src/ui/liveUpdates.js";
import { createPreparation, reachedTarget } from "./src/core/preparation.js";
import { createPosePerformance } from "./src/core/posePerformance.js";
import { summarizeIssues } from "./src/ai/issuePatterns.js";
import { createMetricAverage } from "./src/core/metricAverage.js";
import { renderMonthlyActivity } from "./src/ui/monthlyActivity.js";
import { createCoachingSession } from "./src/ai/coachingSession.js";
import { createSessionClock } from "./src/core/sessionClock.js";
import { matchesExercise, filterHistory } from "./src/core/catalog.js";
import { renderExerciseGuide } from "./src/ui/exerciseGuide.js";
import { initializePreferences } from "./src/ui/preferences.js";
import {
    initializePoseDetector,
    detectPose,
    setPoseCount,
    getPoseDetectorStatus
} from "./src/ai/pose/detector.js";

import {
    initializeCamera,
    stopCamera
} from "./src/core/camera.js";

import {
    createJumpingJackAnalyzer
} from "./src/exercises/jumpingJack.js";

import {
    createExerciseAnalyzer,
    getAvailableExercises,
    getAvailableWorkoutExercises,
    getExerciseById
} from "./src/exercises/exerciseRegistry.js";

import {
    SIX_SEVEN_REQUIRED_LANDMARKS,
    validateSixSevenLandmarks
} from "./src/exercises/sixSeven.js";

import {
    createSession
} from "./src/core/session.js";

import {
    saveSession,
    getSessions,
    getSessionById
} from "./src/core/storage.js";

import {
    generateRecommendation,
    getMeasurementVersion
} from "./src/ai/recommendation/recommendation.js";

import {
    getWeeklyProgress
} from "./src/core/progress/weeklyProgress.js";

import {
    getPersonalBests
} from "./src/core/progress/personalBest.js";

import {
    getCurrentStreak,
    getLongestStreak
} from "./src/core/progress/streak.js";

import {
    DEFAULT_DAILY_GOAL,
    MAX_DAILY_GOAL,
    getDailyGoal,
    getDailyGoalProgress,
    setDailyGoal
} from "./src/core/progress/dailyGoal.js";

import {
    getExerciseProgress
} from "./src/core/progress/exerciseProgress.js";

import {
    validateLandmarks
} from "./src/ai/pose/landmarks.js";

import {
    createLandmarkPose,
    createMovementVisual,
    isValidMovementVisual,
    getMovementMetricDefinitions,
    summarizeMovementMetrics
} from "./src/core/movementVisual.js";

import {
    renderMovementVisual
} from "./src/ai/visualization/movementVisualizer.js";

import {
    mediaAssets
} from "./src/assets/mediaAssets.js";

import {
    getOptionalAICoaching
} from "./src/api/aiCoach.js";

import {
    resetWorkout
} from "./src/core/workout.js";

import {
    createBattleUI
} from "./src/ui/battleUI.js";

import {
    assignLocalBattlePoses,
    calculateLocalBattleResult,
    createLocalBattleAnalyzers,
    hasDistinctLocalBattlePlayers,
    isLocalBattlePoseValid,
    LOCAL_BATTLE_DURATION_SECONDS,
    LOCAL_BATTLE_LOST_GRACE_MS,
    summarizeLocalBattlePlayer,
    updateLocalBattlePresence
} from "./src/core/battle/localBattle.js";

import {
    createBattleState,
    transitionBattleState
} from "./src/core/battle/battleState.js";

/* =========================================================
   MOVEWISE AI
   FINAL DEMO

   Camera
      ↓
   Pose Estimation
      ↓
   Skeleton
      ↓
   Angle Engine
      ↓
   ROM
      ↓
   Symmetry
      ↓
   Movement Quality
      ↓
   State Machine
      ↓
   Rep Counter
      ↓
   Session Analysis
      ↓
   AI Recommendation
========================================================= */

/* =========================================================
   DOM
========================================================= */

const $ = id =>
    document.getElementById(id);

const homeScreen =
    $("home-screen");

const exerciseScreen =
    $("exercise-screen");

const resultScreen =
    $("result-screen");

const progressScreen =
    $("activity-screen");

const profileScreen =
    $("profile-screen");

const movementReportScreen =
    $("movement-report-screen");

const video =
    $("webcam");

const canvas =
    $("output_canvas");

const ctx =
    canvas.getContext("2d");

const status =
    $("status");

const startButton =
    $("start");

const startButtonLabel =
    startButton?.querySelector(".start-button-label");

const finishButton =
    $("finish-exercise");

const repElement =
    $("rep");

const repExerciseLabel =
    $("rep-exercise-label");

const formElement =
    $("form");

const feedbackElement =
    $("feedback");

const formScoreElement =
    $("form-score");

const scoreBar =
    $("score-bar");

const poseStatus =
    $("pose-status");

const confidenceElement =
    $("confidence");

const movementStateElement =
    $("squat-state");

const timerElement =
    $("timer");

const exerciseNameElement =
    $("exercise-name");

const cameraModeToggle =
    $("camera-mode-toggle");

const cameraModeSheet =
    $("camera-mode-sheet");

const cameraModeClose =
    $("camera-mode-close");

const cameraModeOptions =
    $("camera-mode-options");

const cameraHintElement =
    $("camera-hint");

/* Result */

const resultReps =
    $("result-reps");

const resultQuality =
    $("result-quality");

const resultQualityBar =
    $("result-quality-bar");

const resultAccuracy =
    $("result-accuracy");

const resultAccuracyBar =
    $("result-accuracy-bar");

const resultTime =
    $("result-time");

const resultExerciseName =
    $("result-exercise-name");

const aiInsightTitle =
    $("ai-insight-title");

const aiInsight =
    $("ai-insight");

const aiRecommendation =
    $("ai-recommendation");

const aiInsightStrength =
    $("ai-insight-strength");

const aiInsightImprovement =
    $("ai-insight-improvement");

const remoteAICoach =
    $("remote-ai-coach");

const remoteAISummary =
    $("remote-ai-summary");

const remoteAIStrengths =
    $("remote-ai-strengths");

const remoteAIImprovement =
    $("remote-ai-improvement");

const remoteAINextTip =
    $("remote-ai-next-tip");

const remoteAIUnavailable =
    $("remote-ai-unavailable");

/* Real-time */

const liveROM =
    $("live-rom");

const liveROMBar =
    $("live-rom-bar");

const liveArmROM =
    $("live-arm-rom");

const liveLegROM =
    $("live-leg-rom");

const liveSymmetry =
    $("live-symmetry");

const liveSymmetryBar =
    $("live-symmetry-bar");

const liveLeftAngle =
    $("live-left-angle");

const liveRightAngle =
    $("live-right-angle");

const liveLeftAngleLabel =
    $("live-left-angle-label");

const liveRightAngleLabel =
    $("live-right-angle-label");

const liveQuality =
    $("live-quality");

const liveQualityLabel =
    $("live-quality-label");

const liveMetricsExercise =
    $("live-metrics-exercise");

const liveMetricOneLabel =
    $("live-metric-one-label");

const liveMetricOne =
    $("live-metric-one");

const liveMetricTwoLabel =
    $("live-metric-two-label");

const liveMetricTwo =
    $("live-metric-two");

const liveMetricThreeLabel =
    $("live-metric-three-label");

const liveMetricThree =
    $("live-metric-three");

const exerciseLibrary =
    $("exercise-library");

const homeHeroImage =
    document.querySelector(".home-hero-art img");

const homeWeeklyProgress =
    $("home-weekly-progress");

const homePersonalBests =
    $("home-personal-bests");

const homeDailyGoal =
    $("home-daily-goal");

const homeNextWorkout =
    $("home-next-workout");

const homeRecentActivity =
    $("home-recent-activity");

const homeTodayActivitySection =
    $("home-today-activity-section");

const homeTodayActivity =
    $("home-today-activity");

const homeTodayWorkouts =
    $("home-today-workouts");

const homeTodayReps =
    $("home-today-reps");

const homeTodayQuality =
    $("home-today-quality");

const homeTodayDuration =
    $("home-today-duration");

const homeRecentWorkouts =
    $("home-recent-workouts");

const homeQuickExercises =
    $("home-quick-exercises");

const progressTotalSessions =
    $("progress-total-sessions");

const progressTotalReps =
    $("progress-total-reps");

const progressAverageQuality =
    $("progress-average-quality");

const progressAverageAccuracy =
    $("progress-average-accuracy");

const progressBestQuality =
    $("progress-best-quality");

const progressAverageDuration =
    $("progress-average-duration");

const progressRecentSessions =
    $("progress-recent-sessions");

const progressQualityTrend =
    $("progress-quality-trend");

const progressEmptyState =
    $("activity-empty-state");

const activityWeeklyProgress =
    $("activity-weekly-progress");

const activityStreak =
    $("activity-streak");

const activityPersonalBests =
    $("activity-personal-bests");

const activityExerciseProgress =
    $("activity-exercise-progress");

const progressAIInsight =
    $("progress-ai-insight");

const movementPoseContainer =
    $("movement-visual-result");

const movementMetricContainer =
    $("movement-metrics-result");

const reportPoseContainer =
    $("session-movement-visual");

const reportMetricContainer =
    $("session-movement-metrics");

const reportTitle =
    $("session-report-title");

const reportDate =
    $("session-report-date");

const reportReps =
    $("session-report-reps");

const reportQuality =
    $("session-report-quality");

const profileWorkouts =
    $("profile-workouts");

const profileReps =
    $("profile-reps");

const profileQuality =
    $("profile-quality");

const profileCurrentStreak =
    $("profile-current-streak");

const profileLongestStreak =
    $("profile-longest-streak");

const profileProgress =
    $("profile-progress");

const profilePersonalBests =
    $("profile-personal-bests");

const profileExerciseProgress =
    $("profile-exercise-progress");

const resultDailyGoal =
    $("result-daily-goal");

const dailyGoalValue =
    $("daily-goal-value");

const dailyGoalSaveStatus =
    $("daily-goal-save-status");

let activitySelectedExercise = "";
let profileSelectedExercise = "";

/* =========================================================
   AI
========================================================= */

const sessionClock = createSessionClock();
let sessionPaused = false;
let startupId = 0;
let running = false;

let sessionActive = false;

let sessionStarting = false;

const poseFrameGate = createPosePerformance();
const requestedPoseFPS = Number(new URLSearchParams(location.search).get('poseFps'));
if ([15, 20, 30].includes(requestedPoseFPS)) poseFrameGate.setFPS(requestedPoseFPS);
const preparation = createPreparation();
const localPreparation = createPreparation({ countdownMs: 0 });
const onlinePreparation = createPreparation({ countdownMs: 0 });
let workoutStarted = false;
let lastTrackingAt = -Infinity;
let preparationTimer = null;
let sessionTarget = { seconds: 0, reps: 0 };
let lastMetricsUIAt = -Infinity;
let lastCoachAt = -Infinity;
let lastCoachMessage = '';
let inferenceStartedAt = 0;
let inferenceEndedAt = 0;
let lastInferenceMs = null;
let repOnFrame = false;
let diagnosticTimer = null;
let pipelineStartedAt = 0;
let startupLatencyMs = null;
let predictFrame = null;
function schedulePredict() {
    cancelAnimationFrame(predictFrame);
    predictFrame = requestAnimationFrame(predict);
}

let lastVideoTime = -1;

/* =========================================================
   TIMER
========================================================= */

let timerInterval = null;

let sessionStartTime = null;

let sessionSaved = false;
let battleModeActive = false;
let localBattlePreparing = false;
let localBattleActive = false;
let localBattleState = null;
let localBattleSelectedExercise = "jumping-jack";
let localBattleAnalyzers = [];
let localBattleCenters = [null, null];
let localBattlePresence = [
    { visible: false, lostAt: null, graceExpired: false, lastSeenAt: null },
    { visible: false, lostAt: null, graceExpired: false, lastSeenAt: null }
];
let localBattleCurrentQuality = [null, null];
let localBattleValidPlayers = [false, false];
let localBattleEntryButton = null;
let localBattleCountdownTimer = null;
let localBattleTimer = null;
let localBattleEndsAt = null;
let localBattleReadyState = "not-found";
let localBattleIdentityLost = false;
let battleMetricsTimer = null;

/* =========================================================
   REP
========================================================= */

/* =========================================================
   SESSION DATA
========================================================= */

let sessionROMValues = createMetricAverage();

let sessionSymmetryValues = createMetricAverage();

let movementVisualReps = [];

let movementMetricRecords = [];

let pendingMovementPoses = [];

let currentMovementPose = null;

let lastMovementPoseCapture = 0;

let currentResultSession = null;

let resultCoachRequestId = 0;

let currentMovementMetrics = {

    leftArmAngle: 0,

    rightArmAngle: 0,

    leftLegAngle: 0,

    rightLegAngle: 0,

    armROM: 0,

    legROM: 0,

    symmetry: 0,

    quality: 0

};

/* =========================================================
   CONFIG
========================================================= */

const CONFIG = {

    minVisibility: 0.10,

    fullBodyVisibility: 0.25,

    handUpOffset: 0.03,

    footOpenRatio: 1.35,

    footClosedRatio: 1.10,

    repCooldown: 700,

    armOpenTarget: 145,

    armClosedTarget: 45,

    legOpenTarget: 1.35,

    legClosedTarget: 1.10

};

/* =========================================================
   REQUIRED LANDMARKS
========================================================= */

const REQUIRED_LANDMARKS = {
    "jumping-jack": JUMPING_JACK_METRIC_LANDMARKS,
    squat: [23, 24, 25, 26, 27, 28],
    "push-up": [11, 12, 13, 14, 15, 16, 23, 24, 27, 28],
    lunge: [23, 24, 25, 26, 27, 28],
    "bicep-curl": [11, 12, 13, 14, 15, 16]
};

const LOCAL_BATTLE_FULL_BODY_LANDMARKS = [
    0,
    11,
    12,
    23,
    24,
    27,
    28
];

const jumpingJackAnalyzer =
    createJumpingJackAnalyzer({
        handUpOffset: CONFIG.handUpOffset,
        footOpenRatio: CONFIG.footOpenRatio,
        footClosedRatio: CONFIG.footClosedRatio,
        repCooldown: CONFIG.repCooldown
    });

const squatAnalyzer =
    createExerciseAnalyzer("squat");

const pushUpAnalyzer =
    createExerciseAnalyzer("push-up");

const lungeAnalyzer =
    createExerciseAnalyzer("lunge");

const bicepCurlAnalyzer =
    createExerciseAnalyzer("bicep-curl");

const sixSevenAnalyzer =
    createExerciseAnalyzer("six-seven");

const exerciseAnalyzers = {
    "jumping-jack": jumpingJackAnalyzer,
    squat: squatAnalyzer,
    "push-up": pushUpAnalyzer,
    lunge: lungeAnalyzer,
    "bicep-curl": bicepCurlAnalyzer,
    "six-seven": sixSevenAnalyzer
};

let activeExerciseId =
    "jumping-jack";

let sixSevenLabelSnapshot = null;

function getActiveExerciseAnalyzer() {
    return exerciseAnalyzers[activeExerciseId]
        || jumpingJackAnalyzer;
}

/* =========================================================
   SCREEN
========================================================= */

function showScreen(screen) {
    if (screen !== exerciseScreen && (sessionActive || sessionStarting) && !battleModeActive && !localBattlePreparing && !localBattleActive) stopSession();

    document
        .querySelectorAll(".screen")
        .forEach(
            element => {

                element.classList.remove(
                    "active"
                );

            }
        );

    if (screen) {

        screen.classList.add(
            "active"
        );

    }

    if (screen === homeScreen && document.body.dataset.initialized === "true") updateHomeProgress();
    if (screen) {
        const nav = ({"home-screen":"home", "analyze-screen":"analyze", "activity-screen":"progress", "profile-screen":"profile", "battle-screen":"battle"})[screen.id];
        if (nav) {
            document.querySelectorAll("[data-nav]").forEach(button => {
                const active = button.dataset.nav === nav;
                button.classList.toggle("active", active);
                if (active) button.setAttribute("aria-current", "page");
                else button.removeAttribute("aria-current");
            });
        }
        screen.setAttribute("tabindex", "-1");
        screen.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: "instant" });
    }
    document.body.classList.toggle(
        "workout-active",
        screen === exerciseScreen
    );

}

function enterWorkout() {
    if (sessionActive || sessionStarting) {
        return sessionActive;
    }

    setCameraMode("standard");
    showScreen(exerciseScreen);
    prepareExercise();
    renderExerciseGuide($("exercise-guide"), activeExerciseId);
    if (battleModeActive) return startSession({ deferTimer: true });
}

function setCameraMode(mode) {
    if (!["standard", "focus", "fullscreen"].includes(mode)) {
        throw new RangeError(`Unknown camera view mode: ${mode}`);
    }

    exerciseScreen?.classList.toggle(
        "camera-mode-focus",
        mode === "focus"
    );
    exerciseScreen?.classList.toggle(
        "camera-mode-fullscreen",
        mode === "fullscreen"
    );

    clearFullscreenCameraOverrides();

    cameraModeOptions
        ?.querySelectorAll("[data-camera-mode]")
        .forEach(option => {
            option.setAttribute(
                "aria-checked",
                String(option.dataset.cameraMode === mode)
            );
        });
}

function clearFullscreenCameraOverrides() {
    [video, canvas].forEach(element => {
        element.style.left = "";
        element.style.top = "";
        element.style.width = "";
        element.style.height = "";
        element.style.right = "";
        element.style.bottom = "";
        element.style.objectFit = "";
    });
}

cameraModeToggle?.addEventListener("click", () => {
    if (!cameraModeSheet?.open) {
        cameraModeSheet?.showModal();
        cameraModeToggle.setAttribute("aria-expanded", "true");
    }
});

cameraModeOptions?.addEventListener("click", event => {
    const option = event.target.closest("[data-camera-mode]");

    if (!option || !cameraModeOptions.contains(option)) {
        return;
    }

    setCameraMode(option.dataset.cameraMode);
    cameraModeSheet.close();
});

cameraModeOptions?.addEventListener("keydown", event => {
    if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key)) {
        return;
    }

    const options = [
        ...cameraModeOptions.querySelectorAll("[data-camera-mode]")
    ];
    const selectedIndex = options.findIndex(
        option => option.getAttribute("aria-checked") === "true"
    );
    const direction = ["ArrowDown", "ArrowRight"].includes(event.key)
        ? 1
        : -1;
    const nextIndex =
        (selectedIndex + direction + options.length) % options.length;

    event.preventDefault();
    setCameraMode(options[nextIndex].dataset.cameraMode);
    options[nextIndex].focus();
    cameraModeSheet.close();
});

cameraModeClose?.addEventListener("click", () => {
    cameraModeSheet?.close();
});

cameraModeSheet?.addEventListener("close", () => {
    cameraModeToggle?.setAttribute("aria-expanded", "false");
    cameraModeToggle?.focus();
});

/* =========================================================
   NAVIGATION
========================================================= */

$("jumping-jack-card")?.addEventListener(

    "click",

    () => {

        enterWorkout();

    }

);

$("back-home")?.addEventListener(

    "click",

    () => {
        if (localBattlePreparing || localBattleActive) {
            leaveLocalBattle();
        }
        else {
            stopSession();
            showScreen(homeScreen);
        }

    }

);

$("home-button")?.addEventListener(

    "click",

    () => {
        if (localBattlePreparing || localBattleActive) {
            leaveLocalBattle();
        }
        else {
            stopSession();
            showScreen(homeScreen);
        }

    }

);

$("again-button")?.addEventListener(
    "click",
    () => {
        enterWorkout();
    }
);

/* =========================================================
   UI
========================================================= */

function setStatus(text, tracking = false) {
    if (!status || (status.dataset.message === text && status.dataset.tracking === String(tracking))) return;
    status.dataset.message = text;
    status.dataset.tracking = String(tracking);
    status.replaceChildren();
    if (tracking) {
        const dot = document.createElement("span");dot.className = "live-dot";dot.setAttribute("aria-hidden", "true");status.append(dot);
    }
    status.append(document.createTextNode(text));
}

function setCoach(
    title,
    message
) {
    const now = performance.now();
    const urgent = /ตรวจจับ|กล้อง|ตำแหน่ง|ไม่พบ|เตรียม|นับถอยหลัง|พัก/.test(title);
    if (message === lastCoachMessage) return;
    if (!urgent && now - lastCoachAt < 1800) return;
    lastCoachAt = now;
    lastCoachMessage = message;

    const feedbackTitles = { ready: "พร้อมฝึก", movement: "กำลังเคลื่อนไหว", depth: "ช่วงการเคลื่อนไหว", form: "ตรวจสอบตำแหน่ง", quality: "คุณภาพการเคลื่อนไหว", symmetry: "สมดุล", success: "ทำได้แล้ว" };
    title = feedbackTitles[title] || title;
    if (formElement) {

        formElement.classList.toggle(
            "is-success",
            title === "ท่าถูกต้อง" ||
                title === "ทำสำเร็จ 1 ครั้ง"
        );
        setText(formElement, title);

    }

    if (feedbackElement) {

        setText(feedbackElement, message);

    }

}

function updateScore(
    score
) {

    score =
        Math.round(
            Math.max(
                0,
                Math.min(
                    100,
                    score
                )
            )
        );

    if (formScoreElement) {

        setText(formScoreElement, `${score}%`);

    }

    if (scoreBar) {

        const width = `${score}%`;
        if (scoreBar.style.width !== width) scoreBar.style.width = width;

    }

}

function updateMovementState() {

    const labels = {

        CLOSED:
            "ท่าเริ่มต้น",

        OPENING:
            "กำลังกาง",

        OPEN:
            "กางเต็มที่",

        CLOSING:
            "กำลังหุบ",

        STANDING:
            "ท่ายืน",

        DESCENDING:
            "กำลังย่อตัว",

        BOTTOM:
            "ท่าล่าง",

        ASCENDING:
            "กำลังยืนขึ้น",

        UP:
            "ท่าเริ่มต้น",

        DOWN:
            "กำลังลง",

        BOTTOM:
            "ท่าล่าง"

    };

    if (movementStateElement) {

        setText(movementStateElement, labels[getActiveExerciseAnalyzer().getState().state] || "กำลังเคลื่อนไหว");

    }

}

/* =========================================================
   TIMER
========================================================= */

function formatTime(
    seconds
) {

    const minutes =
        Math.floor(
            seconds / 60
        );

    const remaining =
        seconds % 60;

    return (

        String(minutes)
            .padStart(2, "0")

        +

        ":"

        +

        String(remaining)
            .padStart(2, "0")

    );

}

function startTimer() {
    stopTimer();
    sessionStartTime = Date.now();
    sessionClock.start();
    timerInterval = setInterval(() => {
        setText(timerElement, formatTime(getSessionDuration()));
        if (!battleModeActive && reachedTarget({ duration: getSessionDuration(), repetitions: getActiveExerciseAnalyzer().getState().repetitions }, sessionTarget)) finishButton.click();
    }, 250);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function getSessionDuration() { return sessionClock.seconds(); }

/* =========================================================
   RESET
========================================================= */

function resetSessionData() {
    setText($("workout-preparation"), '');
    setText($("pipeline-values"), 'รอภาพจากกล้อง');
    workoutStarted = false;
    lastCoachMessage = '';
    lastCoachAt = lastMetricsUIAt = -Infinity;

    resetWorkout(
        Object.values(exerciseAnalyzers),
        repElement
    );

    sessionSaved =
        false;

    sessionStartTime = null;
    sessionClock.reset();

    sessionROMValues = createMetricAverage();

    sessionSymmetryValues = createMetricAverage();

    movementVisualReps = [];

    movementMetricRecords = [];

    currentResultSession = null;

    pendingMovementPoses = [];

    currentMovementPose = null;

    lastMovementPoseCapture = 0;

    const saveWarning = $("session-save-warning");
    if (saveWarning) {
        saveWarning.hidden = true;
    }

    currentMovementMetrics = {

        leftArmAngle: 0,

        rightArmAngle: 0,

        leftLegAngle: 0,

        rightLegAngle: 0,

        armROM: 0,

        legROM: 0,

        symmetry: 0,

        quality: 0

    };

}

/* =========================================================
   PREPARE
========================================================= */

function prepareExercise() {

    stopSession();
    document.body.classList.remove("workout-camera-error");

    resetSessionData();

    resetLiveUI();

    updateScore(0);
    if (formScoreElement) formScoreElement.textContent = "--";

    if (timerElement) {
        timerElement.textContent = "00:00";
    }

    if (poseStatus) {

        setText(poseStatus, "--");

    }

    if (confidenceElement) {

        setText(confidenceElement, "--");

    }

    setStatus(
        "พร้อมเตรียมกล้องและ AI"
    );

    setCoach(

        "พร้อมเริ่ม",

        "กดปุ่มเพื่อเริ่มการวิเคราะห์ด้วย AI"

    );

    if (startButton) {

        startButton.disabled =
            false;

        if (startButtonLabel) {
            startButtonLabel.textContent = "เริ่มออกกำลังกาย";
        }

    }

    clearCanvas();

}

function sanitizeBattleName(value, fallback) {
    const cleaned = String(value ?? "")
        .replace(/[<>]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    if (!cleaned) {
        return fallback;
    }

    return cleaned.slice(0, 18);
}

function getBattleExerciseLabel(exerciseId) {
    const exercise = getAvailableExercises().find(item => item.id === exerciseId);
    return exercise?.name || exerciseId || "Exercise";
}

function ensureLocalBattleUI() {
    const battlePage = document.querySelector(".battle-page");
    if (!battlePage || battlePage.querySelector("#battle-local-panel")) {
        return;
    }

    const localPanel = document.createElement("section");
    localPanel.id = "battle-local-panel";
    localPanel.className = "battle-local-panel";
    localPanel.hidden = true;
    localPanel.innerHTML = `
        <div class="battle-local-header">
            <div>
                <span class="dashboard-eyebrow">LOCAL BATTLE</span>
                <h3>แข่งกับเพื่อนบนเครื่องเดียว</h3>
            </div>
        </div>
        <div class="battle-local-grid">
            <div class="battle-local-player-card">
                <label for="battle-local-player-one">ผู้เล่น 1</label>
                <input id="battle-local-player-one" type="text" maxlength="18" value="Player 1" />
            </div>
            <div class="battle-local-player-card">
                <label for="battle-local-player-two">ผู้เล่น 2</label>
                <input id="battle-local-player-two" type="text" maxlength="18" value="Player 2" />
            </div>
        </div>
        <div id="battle-local-exercises" class="battle-local-exercises"></div>
        <button id="battle-local-continue" class="start-button" type="button">เตรียมกล้องสำหรับ 2 คน</button>
        <div id="battle-local-final" class="battle-local-final" hidden>
            <span class="dashboard-eyebrow">BATTLE COMPLETE</span>
            <h3 id="battle-local-final-title"></h3>
            <div id="battle-local-scoreboard" class="battle-local-scoreboard"></div>
            <div class="battle-local-actions">
                <button id="battle-local-replay" class="start-button" type="button">แข่งอีกครั้ง</button>
                <button id="battle-local-home" class="secondary-button" type="button">กลับหน้าหลัก</button>
            </div>
        </div>
    `;

    const setup = document.querySelector(".battle-setup");
    const intro = document.querySelector(".battle-intro");
    if (setup && intro) {
        const localBtn = document.createElement("button");
        localBtn.id = "battle-local-button";
        localBtn.type = "button";
        localBtn.className = "secondary-button";
        localBtn.textContent = "Local Battle";
        localBtn.addEventListener("click", () => {
            localBtn.hidden = true;
            document.body.classList.add("local-battle-setup");
            renderLocalBattleSetup();
        });
        localBattleEntryButton = localBtn;
        intro.appendChild(localBtn);
    }

    battlePage.appendChild(localPanel);
    const continueButton = localPanel.querySelector("#battle-local-continue");
    const replayButton = localPanel.querySelector("#battle-local-replay");
    const homeButton = localPanel.querySelector("#battle-local-home");

    continueButton.addEventListener("click", startLocalBattleSetup);
    replayButton.addEventListener("click", () => {
        startLocalBattleSetup();
    });
    homeButton.addEventListener("click", () => {
        leaveLocalBattle();
    });
    ensureLocalBattleCameraUI();
    renderLocalBattleExercises();
}

function ensureLocalBattleCameraUI() {
    const cameraCard = document.querySelector(".camera-card");
    if (!cameraCard || cameraCard.querySelector("#local-battle-overlay")) {
        return;
    }

    const overlay = document.createElement("section");
    overlay.id = "local-battle-overlay";
    overlay.className = "local-battle-overlay";
    overlay.hidden = true;
    overlay.setAttribute("aria-label", "Local Battle live status");
    overlay.innerHTML = `
        <header class="local-battle-overlay-header">
            <strong>MOVEWISE BATTLE</strong>
            <span id="local-battle-exercise-label"></span>
        </header>
        <div class="local-battle-guides">
            <div><strong>PLAYER 1 · LEFT</strong><span id="local-battle-player-one-status">Not detected</span></div>
            <div><strong>PLAYER 2 · RIGHT</strong><span id="local-battle-player-two-status">Not detected</span></div>
        </div>
        <p id="local-battle-instruction" aria-live="polite">ให้ผู้เล่นทั้งสองคนอยู่ในเฟรม</p>
        <div id="local-battle-countdown" class="local-battle-countdown" aria-live="assertive"></div>
        <button id="local-battle-start" class="start-button" type="button" disabled hidden>พร้อมเริ่มพร้อมกัน</button>
        <div class="local-battle-live">
            <div><strong id="local-battle-player-one-name">PLAYER 1</strong><span><b id="local-battle-player-one-reps">0</b> REPS</span><span><b id="local-battle-player-one-quality">--</b>% QUALITY</span><span>SCORE <b id="local-battle-player-one-score">0</b></span></div>
            <div><strong id="local-battle-player-two-name">PLAYER 2</strong><span><b id="local-battle-player-two-reps">0</b> REPS</span><span><b id="local-battle-player-two-quality">--</b>% QUALITY</span><span>SCORE <b id="local-battle-player-two-score">0</b></span></div>
        </div>
        <strong id="local-battle-timer" class="local-battle-timer">01:00</strong>
        <button id="local-battle-exit" class="secondary-button" type="button">ออกจากการแข่งขัน</button>
    `;
    cameraCard.before(overlay);
    overlay.querySelector("#local-battle-start")
        .addEventListener("click", startLocalBattleCountdown);
    overlay.querySelector("#local-battle-exit")
        .addEventListener("click", leaveLocalBattle);
}

function renderLocalBattleExercises() {
    const container = document.getElementById("battle-local-exercises");
    if (!container) return;

    const exercises = getAvailableExercises();
    const current = localBattleSelectedExercise || exercises[0]?.id || "squat";
    container.replaceChildren(...exercises.map(exercise => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "battle-exercise-option";
        button.textContent = exercise.name;
        button.setAttribute("aria-pressed", String(exercise.id === current));
        button.dataset.exerciseId = exercise.id;
        button.addEventListener("click", () => {
            localBattleSelectedExercise = exercise.id;
            if (localBattleState) {
                localBattleState.exerciseId = exercise.id;
            }
            renderLocalBattleExercises();
        });
        return button;
    }));
}

function renderLocalBattleSetup() {
    const panel = document.getElementById("battle-local-panel");
    if (!panel) return;
    const final = document.getElementById("battle-local-final");
    final.hidden = true;
    const setup = panel.querySelector("#battle-local-continue");
    if (setup) {
        setup.hidden = false;
    }
    panel.hidden = false;
    renderLocalBattleExercises();
}

async function startLocalBattleSetup() {
    const playerOneInput = document.getElementById("battle-local-player-one");
    const playerTwoInput = document.getElementById("battle-local-player-two");
    const selectedExercise = document.querySelector("#battle-local-exercises .battle-exercise-option[aria-pressed='true']")?.dataset.exerciseId;

    const playerOneName = sanitizeBattleName(playerOneInput?.value, "Player 1");
    const playerTwoName = sanitizeBattleName(playerTwoInput?.value, "Player 2");

    if (!selectedExercise) {
        return;
    }

    let domainState = createBattleState();
    domainState = transitionBattleState(domainState, "CREATE_ROOM", {
        roomCode: "LOCAL",
        playerId: "local-player-1"
    });
    domainState = transitionBattleState(domainState, "JOIN_ROOM", {
        playerId: "local-player-2"
    });
    domainState = transitionBattleState(domainState, "START_SELECTION");
    for (const playerId of ["local-player-1", "local-player-2"]) {
        domainState = transitionBattleState(domainState, "SELECT_EXERCISE", {
            playerId,
            exerciseId: selectedExercise
        });
    }

    localBattleState = {
        exerciseId: selectedExercise,
        players: [{ name: playerOneName }, { name: playerTwoName }],
        domainState,
        results: null
    };

    localBattleAnalyzers = createLocalBattleAnalyzers(selectedExercise);
    localBattleCenters = [null, null];
    localBattlePresence = [
        { visible: false, lostAt: null, graceExpired: false, lastSeenAt: null },
        { visible: false, lostAt: null, graceExpired: false, lastSeenAt: null }
    ];
    localBattleCurrentQuality = [null, null];
    localBattleValidPlayers = [false, false];
    localBattlePreparing = true;
    localBattleActive = false;
    battleModeActive = false;
    localBattleReadyState = "not-found";
    localBattleIdentityLost = false;
    activeExerciseId = selectedExercise;
    updateExerciseLabels();
    setCameraMode("standard");
    document.getElementById("battle-local-panel").hidden = true;
    document.getElementById("battle-local-continue").hidden = true;
    if (finishButton) {
        finishButton.disabled = true;
    }
    showScreen(exerciseScreen);
    prepareExercise();
    try {
        await setPoseCount(2);
        const overlay = document.getElementById("local-battle-overlay");
        overlay.hidden = false;
        document.body.classList.add("local-battle-camera");
        document.getElementById("local-battle-exercise-label").textContent =
            getBattleExerciseLabel(selectedExercise);
        document.getElementById("local-battle-player-one-name").textContent =
            playerOneName.toUpperCase();
        document.getElementById("local-battle-player-two-name").textContent =
            playerTwoName.toUpperCase();
        document.getElementById("local-battle-start").hidden = true;
        document.getElementById("local-battle-start").disabled = true;
        document.getElementById("local-battle-countdown").textContent = "";
        setText(document.getElementById('local-battle-timer'), formatTime(localBattleDuration()));
        updateLocalBattleLiveUI();
        if (!await startSession({ deferTimer: true })) {
            throw new Error("Unable to start the camera for Local Battle");
        }
    }
    catch (error) {
        const reason = feedbackElement?.textContent || error.message;
        await leaveLocalBattle();
        showScreen($("battle-screen"));
        const message = $("battle-message");
        message.textContent = `เตรียมกล้องสำหรับแข่งไม่สำเร็จ · ${reason}`;
        message.hidden = false;
        message.classList.add("is-error");
    }
}

function startLocalBattleCountdown() {
    if (
        !localBattlePreparing ||
        localBattleReadyState !== "ready" ||
        !localBattleState ||
        localBattleState.domainState.status !== "ready"
    ) {
        return;
    }

    const startsAt = Date.now();
    localBattleState.domainState = transitionBattleState(
        localBattleState.domainState,
        "START_COUNTDOWN",
        { countdownStartsAt: startsAt }
    );
    const countdownEndsAt = startsAt + 5000;
    const countdownElement = document.getElementById("local-battle-countdown");
    const startButton = document.getElementById("local-battle-start");
    startButton.disabled = true;

    clearInterval(localBattleCountdownTimer);
    localBattleCountdownTimer = setInterval(() => {
        if (localBattleReadyState !== "ready") {
            cancelLocalBattleCountdown();
            return;
        }

        const remaining = countdownEndsAt - Date.now();
        if (remaining > 0) {
            countdownElement.textContent = String(
                Math.ceil(remaining / 1000)
            );
            return;
        }

        clearInterval(localBattleCountdownTimer);
        localBattleCountdownTimer = null;
        countdownElement.textContent = "";
        const startedAt = countdownEndsAt;
        localBattleState.domainState = transitionBattleState(
            localBattleState.domainState,
            "START_BATTLE",
            { startedAt }
        );
        localBattlePreparing = false;
        localBattleActive = true;
        document.getElementById("local-battle-start").hidden = true;
        localBattleEndsAt = startedAt + localBattleDuration() * 1000;
        document.getElementById("local-battle-timer").textContent =
            formatTime(localBattleDuration());
        startLocalBattleTimer();
    }, 50);
}

function cancelLocalBattleCountdown() {
    localPreparation.arm();
    if (!localBattleCountdownTimer) {
        return;
    }

    clearInterval(localBattleCountdownTimer);
    localBattleCountdownTimer = null;
    document.getElementById("local-battle-countdown").textContent = "";
    document.getElementById("local-battle-start").disabled = true;
    document.getElementById("local-battle-instruction").textContent =
        "ให้ผู้เล่นทั้งสองคนอยู่ในเฟรม";
    if (localBattleState) {
        localBattleState.domainState = createReadyLocalBattleState(
            localBattleState.exerciseId
        );
    }
}

function createReadyLocalBattleState(exerciseId) {
    let state = createBattleState();
    state = transitionBattleState(state, "CREATE_ROOM", {
        roomCode: "LOCAL",
        playerId: "local-player-1"
    });
    state = transitionBattleState(state, "JOIN_ROOM", {
        playerId: "local-player-2"
    });
    state = transitionBattleState(state, "START_SELECTION");
    for (const playerId of ["local-player-1", "local-player-2"]) {
        state = transitionBattleState(state, "SELECT_EXERCISE", {
            playerId,
            exerciseId
        });
        if (playerId === "local-player-1") {
            continue;
        }
    }
    state = transitionBattleState(state, "SET_READY", {
        playerId: "local-player-1",
        ready: true
    });
    return transitionBattleState(state, "SET_READY", {
        playerId: "local-player-2",
        ready: true
    });
}

function startLocalBattleTimer() {
    clearInterval(localBattleTimer);
    localBattleTimer = setInterval(() => {
        if (!localBattleActive || !localBattleEndsAt) {
            return;
        }
        const remaining = Math.max(
            0,
            Math.ceil((localBattleEndsAt - Date.now()) / 1000)
        );
        setText(document.getElementById("local-battle-timer"), formatTime(remaining));
        if (remaining === 0) {
            void finishLocalBattle();
        }
    }, 100);
}

function updateLocalBattleLiveUI() {
    if (!localBattleAnalyzers.length) {
        return;
    }

    const first = summarizeLocalBattlePlayer(
        localBattleAnalyzers[0],
        localBattleCurrentQuality[0]
    );
    const second = summarizeLocalBattlePlayer(
        localBattleAnalyzers[1],
        localBattleCurrentQuality[1]
    );
    const { outcome } = calculateLocalBattleResult(
        { name: localBattleState.players[0].name, metrics: first },
        { name: localBattleState.players[1].name, metrics: second }
    );
    const values = [
        { metrics: first, score: outcome.playerScore },
        { metrics: second, score: outcome.opponentScore }
    ];

    values.forEach((player, index) => {
        const prefix = index === 0
            ? "local-battle-player-one"
            : "local-battle-player-two";
        setText(document.getElementById(`${prefix}-reps`), String(player.metrics.repetitions));
        setText(document.getElementById(`${prefix}-quality`), player.metrics.quality === null ? "--" : String(player.metrics.quality));
        setText(document.getElementById(`${prefix}-score`), String(player.score));
        const status = localBattlePresence[index];
        const statusText = status.visible
            ? localBattleValidPlayers[index]
                ? "พร้อมแล้ว"
                : "ให้เห็นร่างกายเต็มตัว"
            : status.lastSeenAt !== null
                ? status.graceExpired
                    ? "ยังไม่อยู่ในเฟรม · กำลังแข่งขัน"
                    : "กลับเข้ามาในเฟรม"
                : "ยังไม่พบผู้เล่น";
        setText(document.getElementById(
            index === 0
                ? "local-battle-player-one-status"
                : "local-battle-player-two-status"
        ), statusText);
    });
}

function processLocalBattleFrame(poses) {
    if (!localBattleState || !localBattleAnalyzers.length) {
        return;
    }

    const assignment = assignLocalBattlePoses(poses, localBattleCenters);
    if (localBattleActive && !assignment.players.some(Boolean)) localBattleIdentityLost = true;
    localBattleCenters = assignment.centers;
    const now = performance.now();
    const validPlayers = assignment.players.map((landmarks, index) => {
        const required = [
            ...LOCAL_BATTLE_FULL_BODY_LANDMARKS,
            ...(REQUIRED_LANDMARKS[localBattleState.exerciseId]
                || REQUIRED_LANDMARKS["jumping-jack"])
        ];
        return isLocalBattlePoseValid(
            landmarks,
            required,
            CONFIG.fullBodyVisibility
        );
    });
    const previousValidPlayers = localBattleValidPlayers;
    const nextPresence = updateLocalBattlePresence(
        localBattlePresence,
        assignment.players,
        Date.now()
    );
    nextPresence.forEach((presence, index) => {
        if (
            localBattleActive &&
            (
                (
                    localBattlePresence[index].visible &&
                    !presence.visible
                ) ||
                (
                    previousValidPlayers[index] &&
                    !validPlayers[index]
                )
            )
        ) {
            localBattleAnalyzers[index].resetMovementState();
        }
    });
    localBattlePresence = nextPresence;
    localBattleValidPlayers = validPlayers;
    validPlayers.forEach((valid, index) => { if (!valid) localBattleCurrentQuality[index] = null; });

    drawBattleSkeletons(
        assignment.players,
        assignment.players.some(Boolean)
            ? []
            : poses.slice(0, assignment.detectedCount)
    );

    const bothReady =
        assignment.detectedCount === 2 &&
        hasDistinctLocalBattlePlayers(assignment.centers) &&
        validPlayers[0] &&
        validPlayers[1];
    const instruction = document.getElementById("local-battle-instruction");
    const startButton = document.getElementById("local-battle-start");
    if (localBattlePreparing) {
        const readiness = localPreparation.update(bothReady, now);
        if (bothReady) {
            localBattleReadyState = "ready";
            if (localBattleState.domainState.players.some(player => !player.ready)) {
                localBattleState.domainState = transitionBattleState(
                    localBattleState.domainState,
                    "SET_READY",
                    { playerId: "local-player-1", ready: true }
                );
                localBattleState.domainState = transitionBattleState(
                    localBattleState.domainState,
                    "SET_READY",
                    { playerId: "local-player-2", ready: true }
                );
            }
            setText(instruction, readiness.phase === 'active' ? "ผู้เล่นทั้งสองพร้อมเริ่ม" : "อยู่ในเฟรมให้มั่นคง 2 วินาที");
            startButton.hidden = true;
            if (readiness.phase === 'active') startLocalBattleCountdown();
        }
        else {
            localBattleReadyState = assignment.detectedCount === 0
                ? "not-found"
                : assignment.detectedCount === 1
                    ? "one-person"
                    : "incomplete";
            instruction.textContent = assignment.detectedCount === 0
                ? "ไม่พบผู้เล่น"
                : assignment.detectedCount === 1
                    ? "ต้องมีผู้เล่น 2 คน"
                    : hasDistinctLocalBattlePlayers(assignment.centers)
                        ? "ให้ผู้เล่นทั้งสองคนอยู่ในเฟรม"
                        : "แยกไปยืนฝั่งซ้ายและขวา";
            startButton.hidden = true;
            startButton.disabled = true;
        }
    }
    else if (localBattleActive) {
        if (localBattleIdentityLost) {
            localBattleAnalyzers.forEach(analyzer => analyzer.resetMovementState());
            setText(instruction, 'หยุดนับ: แยกผู้เล่นไม่ชัดเจน โปรดออกแล้วเริ่มแมตช์ใหม่ เพื่อป้องกันการสลับผู้เล่น');
            drawBattleSkeletons([null, null], poses);
            return;
        }
        instruction.textContent = localBattlePresence.some(
            player => !player.visible
        )
            ? "ผู้เล่นที่หายไป: กลับเข้ามาในเฟรม"
            : "ทั้งสองคนกำลังออกกำลังกาย";

        assignment.players.forEach((landmarks, index) => {
            if (!landmarks || !validPlayers[index]) {
                return;
            }
            const analyzer = localBattleAnalyzers[index];
            const movement = analyzer.analyze(landmarks);
            const metrics = localBattleState.exerciseId === "jumping-jack"
                ? analyzeMovementMetrics(landmarks, movement)
                : {
                    ...movement,
                    quality: movement.quality ??
                        movement.movementQuality ??
                        0
                };
            if (!metrics) { analyzer.resetMovementState(); localBattleCurrentQuality[index] = null; return; }
            localBattleCurrentQuality[index] = metrics.quality;
            analyzer.process(movement, metrics, now);
        });
    }

    updateLocalBattleLiveUI();

    if (
        localBattleState.domainState.status === "countdown" &&
        !bothReady
    ) {
        cancelLocalBattleCountdown();
    }
}

function drawBattleSkeletons(players, unassignedPoses = []) {
    clearCanvas();
    const colors = ["#62e8b7", "#f4c65e"];
    const assigned = players.some(Boolean);
    players.forEach((landmarks, index) => {
        if (landmarks) {
            drawSkeleton(landmarks, {
                clearBefore: false,
                color: colors[index] || "#ffffff",
                label: index === 0 ? "P1" : "P2"
            });
        }
    });
    if (!assigned) {
        unassignedPoses.forEach(landmarks => {
            drawSkeleton(landmarks, {
                clearBefore: false,
                color: "#ffffff"
            });
        });
    }
}

async function finishLocalBattle() {
    if (!localBattleActive || !localBattleState) {
        return;
    }

    localBattleActive = false;
    localBattlePreparing = false;
    battleModeActive = false;
    clearInterval(localBattleTimer);
    localBattleTimer = null;
    localBattleEndsAt = null;
    const metrics = localBattleAnalyzers.map((analyzer, index) =>
        summarizeLocalBattlePlayer(
            analyzer,
            localBattleCurrentQuality[index]
        )
    );
    localBattleState.results = calculateLocalBattleResult(
        { name: localBattleState.players[0].name, metrics: metrics[0] },
        { name: localBattleState.players[1].name, metrics: metrics[1] }
    );
    localBattleState.domainState = transitionBattleState(
        localBattleState.domainState,
        "FINISH_BATTLE",
        {
            finishedAt: Date.now(),
            reason: "time",
            winnerId: localBattleState.results.winnerIndex === null
                ? null
                : `local-player-${localBattleState.results.winnerIndex + 1}`
        }
    );
    localBattleState.domainState = transitionBattleState(
        localBattleState.domainState,
        "SHOW_RESULT"
    );
    stopSession();
    document.getElementById("local-battle-overlay").hidden = true;
    document.body.classList.remove("local-battle-camera");
    if (finishButton) {
        finishButton.disabled = false;
    }
    try {
        await setPoseCount(1);
    }
    catch (error) {
        console.error("Failed to restore single-person pose detection:", error);
        setStatus("Could not restore single-person detection");
    }
    showScreen($("battle-screen"));
    renderLocalBattleResult();
}

function renderLocalBattleResult() {
    const panel = document.getElementById("battle-local-panel");
    const final = document.getElementById("battle-local-final");
    const board = document.getElementById("battle-local-scoreboard");
    const title = document.getElementById("battle-local-final-title");
    if (!panel || !final || !board || !localBattleState?.results) {
        return;
    }

    const result = localBattleState.results;
    title.textContent = result.winnerIndex === null
        ? "เสมอกัน"
        : `${result.players[result.winnerIndex].name.toUpperCase()} ชนะ`;
    board.replaceChildren(...result.players.map(player => {
        const card = document.createElement("div");
        card.className = "battle-local-score-card";
        const name = document.createElement("h4");
        name.textContent = player.name;
        const reps = document.createElement("strong");
        reps.textContent = `${player.repetitions} REPS`;
        const quality = document.createElement("span");
        quality.textContent = `${player.quality ?? "--"}% QUALITY`;
        const score = document.createElement("small");
        score.textContent = `${player.score} SCORE`;
        card.append(name, reps, quality, score);
        return card;
    }));
    panel.hidden = false;
    final.hidden = false;
    document.getElementById("battle-local-continue").hidden = true;
}

async function leaveLocalBattle() {
    localBattlePreparing = false;
    localBattleActive = false;
    battleModeActive = false;
    clearInterval(localBattleCountdownTimer);
    clearInterval(localBattleTimer);
    localBattleCountdownTimer = null;
    localBattleTimer = null;
    localBattleEndsAt = null;
    stopSession();
    document.getElementById("local-battle-overlay").hidden = true;
    document.body.classList.remove("local-battle-camera");
    if (finishButton) {
        finishButton.disabled = false;
    }
    try {
        await setPoseCount(1);
    }
    catch (error) {
        console.error("Failed to restore single-person pose detection:", error);
        setStatus("Could not restore single-person detection");
    }
    document.getElementById("battle-local-panel").hidden = true;
    document.body.classList.remove("local-battle-setup");
    if (localBattleEntryButton) {
        localBattleEntryButton.hidden = false;
    }
    showScreen(homeScreen);
}

/* =========================================================
   CANVAS
========================================================= */

function syncCanvasSize() {

    if (
        !video.videoWidth ||
        !video.videoHeight
    ) {

        return;

    }

    if (

        canvas.width !==
        video.videoWidth

        ||

        canvas.height !==
        video.videoHeight

    ) {

        canvas.width =
            video.videoWidth;

        canvas.height =
            video.videoHeight;

    }

}

function clearCanvas() {

    ctx.clearRect(

        0,
        0,
        canvas.width,
        canvas.height

    );

}

function captureMovementPose(landmarks) {
    if (!$("capture-skeleton").checked || movementVisualReps.length >= 3) return;
    const pose = createLandmarkPose(landmarks);

    if (!pose) {
        currentMovementPose = null;
        pendingMovementPoses = [];
        return;
    }

    currentMovementPose = pose;
    const now = performance.now();

    if (now - lastMovementPoseCapture >= 150) {
        pendingMovementPoses.push(pose);
        pendingMovementPoses = pendingMovementPoses.slice(-36);
        lastMovementPoseCapture = now;
    }
}

function getCompletedRepMetrics(record) {
    const source = {
        ...currentMovementMetrics,
        ...(record || {})
    };

    const metrics = {};
    const availableKeys = [
        "armROM",
        "legROM",
        "kneeAngle",
        "elbowAngle",
        "depth",
        "alignment",
        "stability",
        "speed",
        "symmetry",
        "elbowSymmetry",
        "alternation",
        "rhythm",
        "quality"
    ];

    availableKeys.forEach(key => {
        const value = source[key];
        if (typeof value === "number" && Number.isFinite(value)) {
            metrics[key] = value;
        }
    });

    if (
        !Number.isFinite(metrics.symmetry) &&
        Number.isFinite(metrics.elbowSymmetry)
    ) {
        metrics.symmetry = metrics.elbowSymmetry;
    }

    return metrics;
}

function handleCompletedRep(result) {
    if (!result?.repCompleted || !result.record) {
        return;
    }

    const metrics = getCompletedRepMetrics(result.record);
    repOnFrame = true;
    if (battleModeActive) reportBattleMetrics();
    movementMetricRecords.push(metrics);

    if (currentMovementPose && movementVisualReps.length < 3 && $("capture-skeleton").checked) {
        movementVisualReps.push({
            rep: result.record.rep,
            trail: [...pendingMovementPoses],
            representativePose: currentMovementPose
        });
    }

    pendingMovementPoses = [];
}

function updateRepCounter(repetitions) {
    if (!repElement || repElement.textContent === String(repetitions)) {
        return;
    }

    repElement.textContent = String(repetitions);
    repElement.classList.remove("rep-updated");
    if (!document.documentElement.classList.contains("reduce-motion") && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        repElement.animate([{transform:"scale(1)"},{transform:"scale(1.08)"},{transform:"scale(1)"}], {duration:260,easing:"ease-out"});
    }
}

const poseDiagnosticsEnabled =
    new URLSearchParams(window.location.search).get("debugPose") === "1";

let lastPoseDiagnosticTime = 0;

function logPosePipeline({
    exerciseId = activeExerciseId,
    phase,
    landmarksValid,
    processCalled,
    result,
    missing = [],
    invalid = []
}) {
    if (!poseDiagnosticsEnabled) {
        return;
    }

    const now = performance.now();

    if (
        !result?.repCompleted &&
        now - lastPoseDiagnosticTime < 1000
    ) {
        return;
    }

    lastPoseDiagnosticTime = now;

    const analyzer = exerciseAnalyzers[exerciseId];
    const state = result?.state ?? analyzer?.getState().state ?? "unavailable";
    const repetitions = result?.repetitions ??
        analyzer?.getState().repetitions ??
        null;

    console.debug("[MoveWise pose]", {
        exerciseId,
        phase,
        landmarksValid,
        missing,
        invalid,
        processCalled,
        state,
        repCompleted: result?.repCompleted ?? false,
        repetitions
    });
}

/* =========================================================
   CAMERA
========================================================= */

async function startSession({ deferTimer = false } = {}) {

    if (sessionActive || sessionStarting) {
        return;
    }

    sessionStarting = true;
    window.scrollTo({ top: 0, behavior: 'instant' });
    pipelineStartedAt = performance.now();
    startupLatencyMs = null;
    updateWorkoutControls();
    sessionTarget = { seconds: Number($("workout-duration").value), reps: Number($("workout-reps").value) };
    document.body.classList.add("workout-starting");
    const requestId = ++startupId;
    startButton.disabled = true;
    startButton.setAttribute("aria-busy", "true");
    if (startButtonLabel) startButtonLabel.textContent = "กำลังเตรียมกล้องและ AI…";
    document.body.classList.remove("workout-camera-error");
    setStatus("กำลังเตรียมกล้องและ AI…");

    try {

        await initializePoseDetector();
        if (requestId !== startupId) return false;
        await setPoseCount(
            localBattlePreparing || localBattleActive
                ? 2
                : 1
        );
        await initializeCamera(video);
        if (requestId !== startupId) { stopCamera(video); return false; }

        syncCanvasSize();
        lastVideoTime = -1;
        poseFrameGate.reset();

        sessionActive =
            true;

        document.body.classList.add("workout-running");

        running =
            true;

        startButton.disabled =
            true;

        if (startButtonLabel) {
            startButtonLabel.textContent = "กำลังวิเคราะห์";
        }

        lastTrackingAt = performance.now();
        if (!deferTimer && !battleModeActive) preparation.arm();
        if (localBattlePreparing) localPreparation.arm();
        preparationTimer = setInterval(() => {
            if (sessionPaused) return;
            if (performance.now() - lastTrackingAt > 750) {
                preparation.update(false, performance.now());
                onlinePreparation.arm();
                if (battleModeActive) battleUI.tracking(false);
                if (localBattlePreparing) cancelLocalBattleCountdown();
                clearUnavailableMetrics();
                getActiveExerciseAnalyzer().resetMovementState();
                localBattleAnalyzers.forEach(analyzer => analyzer.resetMovementState());
                if (localBattleActive) localBattleIdentityLost = true;
                currentMovementPose = null; pendingMovementPoses = [];
                setStatus("กล้องหยุดส่งภาพ · ตรวจสอบกล้อง");
            }
        }, 250);
        diagnosticTimer = setInterval(renderPerformance, 1000);

        setStatus(

            "กำลังตรวจจับร่างกาย",

            true

        );

        setCoach(

            "กำลังตรวจจับ",

            "ยืนให้เห็นร่างกายเต็มตัวหน้ากล้อง"

        );

        schedulePredict();
        return true;

    }

    catch (error) {
        if (requestId !== startupId) return false;
        stopCamera(video);
        const modelFailed = !getPoseDetectorStatus().ready;
        setStatus(modelFailed ? "เตรียม AI ไม่สำเร็จ" : "เปิดกล้องไม่ได้");
        setCoach(modelFailed ? "โหลดตัวตรวจจับไม่สำเร็จ" : "เปิดกล้องไม่สำเร็จ",
            modelFailed ? "ตรวจสอบอินเทอร์เน็ตแล้วกดเริ่มเพื่อลองใหม่ คุณยังดูประวัติและเลือกท่าได้ตามปกติ" : error.message);
        document.body.classList.add("workout-camera-error");
        startButton.disabled = false;
        if (startButtonLabel) startButtonLabel.textContent = "ลองอีกครั้ง";
        return false;
    }

    finally {
        if (requestId === startupId) {
            sessionStarting = false;
            document.body.classList.remove("workout-starting");
            startButton.removeAttribute("aria-busy");
            updateWorkoutControls();
        }
    }

}

function updateWorkoutControls() {
    const solo = !battleModeActive && !localBattlePreparing && !localBattleActive;
    $("pause-workout").hidden = !solo || !sessionActive || !workoutStarted;
    $("restart-workout").hidden = !solo || !sessionActive;
    $("cancel-workout").hidden = !sessionActive && !sessionStarting;
    $("workout-targets").hidden = sessionActive || sessionStarting || !solo;
    $("pause-workout").textContent = sessionPaused ? "ฝึกต่อ" : "พักชั่วคราว";
    $("pause-workout").setAttribute("aria-pressed", String(sessionPaused));
    if (solo) finishButton.disabled = !sessionActive || !workoutStarted;
    $("exercise-guide").hidden = sessionActive;
}

function beginWorkout() {
    if (workoutStarted) return;
    workoutStarted = true;
    getActiveExerciseAnalyzer().resetMovementState();
    setText($("workout-preparation"), '');
    startTimer();
    startBattleMetricsReporting();
    updateWorkoutControls();
}

function clearUnavailableMetrics() {
    resetLiveUI();
    setText(formScoreElement, '--');
    if (scoreBar.style.width !== '0%') scoreBar.style.width = '0%';
}

function recordPipeline() {
    poseFrameGate.record(inferenceStartedAt, inferenceEndedAt, performance.now(), repOnFrame, lastInferenceMs);
    if (!battleModeActive && !localBattlePreparing && !localBattleActive && workoutStarted &&
        reachedTarget({ duration: getSessionDuration(), repetitions: getActiveExerciseAnalyzer().getState().repetitions }, sessionTarget)) finishButton.click();
}

function renderPerformance() {
    if (!$("pipeline-diagnostics").open) return;
    const values = poseFrameGate.snapshot();
    const number = value => Number.isFinite(value) ? value.toFixed(1) : '--';
    setText($("pipeline-values"), `${getPoseDetectorStatus().execution || 'main-thread'} · FPS ${number(values.fps)} · inference ${number(values.inferenceMs)} ms · frame processing → UI ${number(values.pipelineMs)} ms · startup ${number(startupLatencyMs)} ms · rep → UI ${number(values.repLatencyMs)} ms · main heap ${number(values.heapMB)} MB · long tasks ${values.longTasks ?? '--'} / max ${number(values.maxLongTaskMs)} ms · errors ${values.errors}`);
}

function localBattleDuration() { return Number($("battle-duration").value) || LOCAL_BATTLE_DURATION_SECONDS; }

$("cancel-workout").addEventListener('click', async () => {
    if (localBattlePreparing || localBattleActive) { await leaveLocalBattle(); return; }
    if (battleModeActive) { await battleUI.cancel(); return; }
    stopSession();
    prepareExercise();
    showScreen(exerciseScreen);
});
$("capture-skeleton").addEventListener('change', () => {
    if (!$("capture-skeleton").checked) { pendingMovementPoses = []; currentMovementPose = null; movementVisualReps = []; }
});
function deleteStoredSkeletons() {
    let failed = false;
    getSessions().filter(session => session.movementVisual).forEach(session => {
        failed = !saveSession({ ...session, movementVisual: null }) || failed;
    });
    if (currentResultSession) currentResultSession.movementVisual = null;
    renderMovementResult(currentResultSession);
    const message = failed ? 'ลบไม่สำเร็จทั้งหมด โปรดลองอีกครั้ง' : 'ลบโครงร่างที่บันทึกไว้แล้ว';
    setText($("delete-skeleton-status"), message);
    setText($("profile-delete-skeleton-status"), message);
}
$("delete-skeletons").addEventListener('click', deleteStoredSkeletons);
$("profile-delete-skeletons").addEventListener('click', deleteStoredSkeletons);

$("retry-save-session").addEventListener('click', () => {
    if (!currentResultSession) return;
    sessionSaved = saveSession(currentResultSession);
    $("session-save-warning").hidden = sessionSaved;
    $("retry-save-session").hidden = sessionSaved;
    if (sessionSaved) renderResultDailyGoal();
});

$("pause-workout").addEventListener("click", () => {
    if (!sessionActive || battleModeActive || localBattleActive) return;
    sessionPaused = !sessionPaused;
    startupId++;
    running = !sessionPaused;
    if (sessionPaused) {
        cancelAnimationFrame(predictFrame);
        sessionClock.pause();
        getActiveExerciseAnalyzer().resetMovementState();
        pendingMovementPoses = [];
        clearCanvas();
        setStatus("พักชั่วคราว • กล้องยังเปิดอยู่");
    } else {
        sessionClock.resume();
        lastVideoTime = -1;
        poseFrameGate.reset();
        setStatus("กำลังตรวจจับร่างกาย", true);
        schedulePredict();
    }
    updateWorkoutControls();
});
let resumeAfterRestartDialog = false;
$("restart-workout").addEventListener("click", () => {
    resumeAfterRestartDialog = sessionActive && !sessionPaused;
    if (resumeAfterRestartDialog) $("pause-workout").click();
    $("restart-dialog").showModal();
});
$("restart-dialog").addEventListener("close", () => {
    if (resumeAfterRestartDialog && sessionActive && sessionPaused) $("pause-workout").click();
    resumeAfterRestartDialog = false;
});
$("confirm-restart").addEventListener("click", () => {
    $("restart-dialog").close();
    prepareExercise();
    renderExerciseGuide($("exercise-guide"), activeExerciseId);
    void startSession();
});
document.addEventListener("visibilitychange", () => {
    if (document.hidden && sessionActive && !sessionPaused && !battleModeActive && !localBattleActive && !localBattlePreparing) $("pause-workout").click();
});
window.addEventListener("pagehide", () => { stopSession(); if (battleModeActive) void battleUI.cancel(); });

function stopSession() {
    clearInterval(localBattleCountdownTimer); localBattleCountdownTimer = null;
    clearInterval(localBattleTimer); localBattleTimer = null;
    poseFrameGate.stop();
    clearInterval(preparationTimer);
    clearInterval(diagnosticTimer);
    preparationTimer = diagnosticTimer = null;
    preparation.cancel();
    localPreparation.cancel();
    onlinePreparation.cancel();
    cancelAnimationFrame(predictFrame);
    startupId++;
    sessionStarting = false;
    document.body.classList.remove("workout-starting");
    startButton?.removeAttribute("aria-busy");
    sessionPaused = false;

    running =
        false;

    sessionActive =
        false;

    document.body.classList.remove("workout-running");

    stopTimer();
    clearInterval(battleMetricsTimer);
    battleMetricsTimer = null;

    stopCamera(video);

    clearCanvas();
    updateWorkoutControls();

    if (startButton) {

        startButton.disabled =
            false;

        if (startButtonLabel) {
            startButtonLabel.textContent = "เริ่มออกกำลังกาย";
        }

    }

}

function startBattleMetricsReporting() {
    clearInterval(battleMetricsTimer);
    battleMetricsTimer = null;
    if (!battleModeActive || localBattleActive) return;

    battleMetricsTimer = setInterval(reportBattleMetrics, 1000);
}

function reportBattleMetrics() {
    if (!battleModeActive || !workoutStarted) return;
    const state = getActiveExerciseAnalyzer().getState();
    const quality = state.qualityScores.length
            ? Math.round(state.qualityScores.reduce(
                (sum, value) => sum + value,
                0
            ) / state.qualityScores.length)
            : null;
    const accuracy = state.attempts > 0
            ? Math.round(state.validReps / state.attempts * 100)
            : null;
    battleUI.reportMetrics({
            repetitions: state.repetitions,
            quality,
            accuracy
    })?.catch(error => {
            console.error("Battle metrics upload failed:", error);
    });
}

/* =========================================================
   FULL BODY
========================================================= */

function checkFullBody(
    landmarks
) {
    if (activeExerciseId === "six-seven") {
        return validateSixSevenLandmarks(landmarks).valid;
    }

    return validateLandmarks(
        landmarks,
        REQUIRED_LANDMARKS[activeExerciseId]
            || REQUIRED_LANDMARKS["jumping-jack"],
        CONFIG.fullBodyVisibility
    ).valid;

}

function getBodyConfidence(
    landmarks
) {

    let total =
        0;

    let count =
        0;

    for (
        const index
        of (
            activeExerciseId === "six-seven"
                ? SIX_SEVEN_REQUIRED_LANDMARKS
                : REQUIRED_LANDMARKS[activeExerciseId]
                || REQUIRED_LANDMARKS["jumping-jack"]
        )
    ) {

        const point =
            landmarks[index];

        if (!point) {
            continue;
        }

        if (
            point.visibility !== undefined
        ) {

            total +=
                point.visibility;

            count++;

        }

    }

    if (!count) {
        return 0;
    }

    return Math.round(

        (
            total /
            count
        ) * 100

    );

}

/* =========================================================
   ANGLE ENGINE
========================================================= */

function analyzeMovementMetrics(landmarks, movement) {
    return analyzeJumpingJackMetrics(landmarks, movement);
}

function updateMovementMetrics(
    metrics,
    movement
) {

    currentMovementMetrics =
        metrics;

    updateLiveMetricValues(metrics);

    if (

        movement.isOpen
        ||
        movement.handsUp
        ||
        movement.feetOpen

    ) {

        const rom =

            Math.round(

                (
                    metrics.armROM +
                    metrics.legROM
                ) / 2

            );

        sessionROMValues.add(
            rom
        );

        sessionSymmetryValues.add(
            metrics.symmetry
        );

    }

}

/* =========================================================
   REAL-TIME UI
========================================================= */

function updateMovementIntelligenceUI(
    metrics
) {
    if (!poseDiagnosticsEnabled) return;

    if (!metrics) {
        return;
    }

    if (activeExerciseId === "six-seven") {
        const quality = Math.round(metrics.quality || 0);

        if (liveROM) {
            liveROM.textContent = `${quality}%`;
        }
        if (liveROMBar) {
            liveROMBar.style.width = `${quality}%`;
        }
        if (liveArmROM) {
            liveArmROM.textContent = `${metrics.alternation}%`;
        }
        if (liveLegROM) {
            liveLegROM.textContent = `${metrics.rhythm}%`;
        }
        if (liveSymmetry) {
            liveSymmetry.textContent = `${metrics.symmetry}%`;
        }
        if (liveSymmetryBar) {
            liveSymmetryBar.style.width = `${metrics.symmetry}%`;
        }
        if (liveLeftAngle) {
            liveLeftAngle.textContent =
                `${Math.round((metrics.leftLevel || 0) * 100)}%`;
        }
        if (liveRightAngle) {
            liveRightAngle.textContent =
                `${Math.round((metrics.rightLevel || 0) * 100)}%`;
        }
        if (liveQuality) {
            liveQuality.textContent = quality;
        }
        if (liveQualityLabel) {
            liveQualityLabel.textContent = quality >= 75
                ? "Good alternation"
                : "กำลังวิเคราะห์";
        }
        return;
    }

    const rom = Math.round(

        (
            metrics.armROM +
            metrics.legROM
        ) / 2

    );

    if (liveROM) {

        liveROM.textContent =
            `${rom}%`;

    }

    if (liveROMBar) {

        liveROMBar.style.width =
            `${rom}%`;

    }

    if (liveArmROM) {

        liveArmROM.textContent =
            `${metrics.armROM}%`;

    }

    if (liveLegROM) {

        liveLegROM.textContent =
            `${metrics.legROM}%`;

    }

    if (liveSymmetry) {

        liveSymmetry.textContent =
            `${metrics.symmetry}%`;

    }

    if (liveSymmetryBar) {

        liveSymmetryBar.style.width =
            `${metrics.symmetry}%`;

    }

    if (liveLeftAngle) {

        liveLeftAngle.textContent =
            `${metrics.leftArmAngle}°`;

    }

    if (liveRightAngle) {

        liveRightAngle.textContent =
            `${metrics.rightArmAngle}°`;

    }

    if (liveQuality) {

        liveQuality.textContent =
            metrics.quality;

    }

    if (liveQualityLabel) {

        if (
            metrics.quality >= 90
        ) {

            liveQualityLabel.textContent =
                "Excellent";

        }

        else if (
            metrics.quality >= 75
        ) {

            liveQualityLabel.textContent =
                "Good";

        }

        else if (
            metrics.quality >= 60
        ) {

            liveQualityLabel.textContent =
                "Needs Improvement";

        }

        else {

            liveQualityLabel.textContent =
                "กำลังวิเคราะห์";

        }

    }

}

function resetLiveUI() {

    if (liveROM) {
        setText(liveROM, "--%");
    }

    if (liveROMBar) {
        liveROMBar.style.width = "0%";
    }

    if (liveArmROM) {
        setText(liveArmROM, "--%");
    }

    if (liveLegROM) {
        setText(liveLegROM, "--%");
    }

    if (liveSymmetry) {
        setText(liveSymmetry, "--%");
    }

    if (liveSymmetryBar) {
        liveSymmetryBar.style.width = "0%";
    }

    if (liveLeftAngle) {
        setText(liveLeftAngle, "--°");
    }

    if (liveRightAngle) {
        setText(liveRightAngle, "--°");
    }

    if (liveQuality) {
        setText(liveQuality, "--");
    }

    if (liveQualityLabel) {
        setText(liveQualityLabel, "รอการวิเคราะห์");
    }

    [liveMetricOne, liveMetricTwo, liveMetricThree].forEach(element => {
        if (element) {
            setText(element, "--");
        }
    });

}

/* =========================================================
   JUMPING JACK
========================================================= */

function analyzeJumpingJack(
    landmarks
) {
    return jumpingJackAnalyzer.analyze(
        landmarks
    );
}

function resetMovementStateIfLandmarksMissing(
    analyzer,
    movement
) {
    if (movement?.hasRequiredLandmarks === false) {
        analyzer.resetMovementState();
    }
}

function processJumpingJack(
    data
) {
    resetMovementStateIfLandmarksMissing(
        jumpingJackAnalyzer,
        data
    );

    const result =
        jumpingJackAnalyzer.process(
            data,
            currentMovementMetrics
        );

    logPosePipeline({
        phase: "processed",
        landmarksValid: data?.hasRequiredLandmarks === true,
        processCalled: true,
        result
    });

    updateScore(result.score);

    setCoach(
        result.feedback.type,
        result.feedback.message
    );

    if (
        result.repCompleted &&
        repElement
    ) {
        handleCompletedRep(result);
        updateRepCounter(result.repetitions);

        console.log(
            "MoveWise AI Rep:",
            result.record
        );
    }

    updateMovementState();
}

function processSquat(
    movement
) {
    resetMovementStateIfLandmarksMissing(
        squatAnalyzer,
        movement
    );

    const metrics = {
        leftArmAngle: Math.round(movement.leftKneeAngle),
        rightArmAngle: Math.round(movement.rightKneeAngle),
        leftLegAngle: Math.round(movement.leftKneeAngle),
        rightLegAngle: Math.round(movement.rightKneeAngle),
        armROM: Math.round(movement.depth),
        legROM: Math.round(movement.depth),
        symmetry: Math.round(movement.symmetry),
        quality: Math.round(movement.quality),
        leftKneeAngle: Math.round(movement.leftKneeAngle),
        rightKneeAngle: Math.round(movement.rightKneeAngle),
        kneeAngle: Math.round(movement.kneeAngle),
        depth: Math.round(movement.depth)
    };

    currentMovementMetrics = metrics;
    updateLiveMetricValues(metrics);
    sessionROMValues.add(metrics.legROM);
    sessionSymmetryValues.add(metrics.symmetry);
    updateMovementIntelligenceUI(metrics);

    const result = squatAnalyzer.process(
        movement,
        metrics
    );

    logPosePipeline({
        phase: "processed",
        landmarksValid: movement?.hasRequiredLandmarks === true,
        processCalled: true,
        result
    });

    updateScore(result.score);
    setCoach(
        result.feedback.type,
        result.feedback.message
    );

    if (
        result.repCompleted &&
        repElement
    ) {
        handleCompletedRep(result);
        updateRepCounter(result.repetitions);

        console.log(
            "MoveWise AI Rep:",
            result.record
        );
    }

    updateMovementState();
}

function processPushUp(
    movement
) {
    resetMovementStateIfLandmarksMissing(
        pushUpAnalyzer,
        movement
    );

    const metrics = {
        leftArmAngle: Math.round(movement.leftElbowAngle),
        rightArmAngle: Math.round(movement.rightElbowAngle),
        leftLegAngle: Math.round(movement.leftAlignment),
        rightLegAngle: Math.round(movement.rightAlignment),
        armROM: Math.round(movement.depth),
        legROM: Math.round(movement.alignment),
        symmetry: Math.round(movement.elbowSymmetry),
        quality: Math.round(movement.quality),
        depth: Math.round(movement.depth),
        alignment: Math.round(movement.alignment),
        elbowSymmetry: Math.round(movement.elbowSymmetry),
        elbowAngle: Math.round(movement.elbowAngle),
        consistency: Number.isFinite(movement.consistency) ? Math.round(movement.consistency) : null
    };

    currentMovementMetrics = metrics;
    updateLiveMetricValues(metrics);
    sessionROMValues.add(
        Math.round((metrics.armROM + metrics.legROM) / 2)
    );
    sessionSymmetryValues.add(metrics.symmetry);
    updateMovementIntelligenceUI(metrics);

    const result = pushUpAnalyzer.process(
        movement,
        metrics
    );

    logPosePipeline({
        phase: "processed",
        landmarksValid: movement?.hasRequiredLandmarks === true,
        processCalled: true,
        result
    });

    updateScore(result.score);
    setCoach(
        result.feedback.type,
        result.feedback.message
    );

    if (
        result.repCompleted &&
        repElement
    ) {
        handleCompletedRep(result);
        updateRepCounter(result.repetitions);

        console.log(
            "MoveWise AI Rep:",
            result.record
        );
    }

    updateMovementState();
}

function processLunge(
    movement
) {
    resetMovementStateIfLandmarksMissing(
        lungeAnalyzer,
        movement
    );

    const metrics = {
        leftArmAngle: Math.round(movement.leftKneeAngle),
        rightArmAngle: Math.round(movement.rightKneeAngle),
        leftLegAngle: Math.round(movement.leftKneeAngle),
        rightLegAngle: Math.round(movement.rightKneeAngle),
        armROM: Math.round(movement.depth),
        legROM: Math.round(movement.alignment),
        symmetry: Math.round(movement.symmetry),
        quality: Math.round(movement.movementQuality),
        kneeAngle: Math.round(movement.kneeAngle),
        depth: Math.round(movement.depth),
        alignment: Math.round(movement.alignment),
        stability: Math.round(movement.stability),
        activeLeg: movement.activeLeg,
        consistency: Number.isFinite(movement.consistency) ? Math.round(movement.consistency) : null
    };

    currentMovementMetrics = metrics;
    updateLiveMetricValues(metrics);
    sessionROMValues.add(
        Math.round((metrics.armROM + metrics.legROM) / 2)
    );
    sessionSymmetryValues.add(metrics.symmetry);
    updateMovementIntelligenceUI(metrics);

    const result = lungeAnalyzer.process(
        movement,
        metrics
    );

    logPosePipeline({
        phase: "processed",
        landmarksValid: movement?.hasRequiredLandmarks === true,
        processCalled: true,
        result
    });

    updateScore(result.score);
    setCoach(
        result.feedback.type,
        result.feedback.message
    );

    if (
        result.repCompleted &&
        repElement
    ) {
        handleCompletedRep(result);
        updateRepCounter(result.repetitions);

        console.log(
            "MoveWise AI Rep:",
            result.record
        );
    }

    updateMovementState();
}

function processBicepCurl(
    movement
) {
    resetMovementStateIfLandmarksMissing(
        bicepCurlAnalyzer,
        movement
    );

    const metrics = {
        leftArmAngle: Math.round(movement.leftElbowAngle),
        rightArmAngle: Math.round(movement.rightElbowAngle),
        leftLegAngle: Math.round(movement.leftElbowAngle),
        rightLegAngle: Math.round(movement.rightElbowAngle),
        armROM: Math.round(movement.rom),
        legROM: Math.round(movement.stability),
        symmetry: Math.round(movement.symmetry),
        quality: Math.round(movement.movementQuality),
        elbowAngle: Math.round(movement.elbowAngle),
        rom: Math.round(movement.rom),
        stability: Math.round(movement.stability),
        activeArm: movement.activeArm,
        consistency: Number.isFinite(movement.consistency) ? Math.round(movement.consistency) : null,
        speed: movement.speed
    };

    currentMovementMetrics = metrics;
    updateLiveMetricValues(metrics);
    sessionROMValues.add(
        Math.round((metrics.armROM + metrics.legROM) / 2)
    );
    sessionSymmetryValues.add(metrics.symmetry);
    updateMovementIntelligenceUI(metrics);

    const result = bicepCurlAnalyzer.process(
        movement,
        metrics
    );

    logPosePipeline({
        phase: "processed",
        landmarksValid: movement?.hasRequiredLandmarks === true,
        processCalled: true,
        result
    });

    updateScore(result.score);
    setCoach(
        result.feedback.type,
        result.feedback.message
    );

    if (
        result.repCompleted &&
        repElement
    ) {
        handleCompletedRep(result);
        updateRepCounter(result.repetitions);

        console.log(
            "MoveWise AI Rep:",
            result.record
        );
    }

    updateMovementState();
}

function processSixSeven(
    movement
) {
    resetMovementStateIfLandmarksMissing(
        sixSevenAnalyzer,
        movement
    );

    const result = sixSevenAnalyzer.process(movement);
    currentMovementMetrics = result.metrics;
    updateLiveMetricValues(result.metrics);

    if (movement?.hasRequiredLandmarks) {
        sessionSymmetryValues.add(result.metrics.symmetry);
        updateMovementIntelligenceUI(result.metrics);
    }

    logPosePipeline({
        phase: "processed",
        landmarksValid: movement?.hasRequiredLandmarks === true,
        processCalled: true,
        result
    });

    updateScore(result.score);
    setCoach(
        result.feedback.type,
        result.feedback.message
    );

    if (result.repCompleted && repElement) {
        handleCompletedRep(result);
        updateRepCounter(result.repetitions);

        console.log(
            "MoveWise AI Rep:",
            result.record
        );
    }

    updateMovementState();
}

/* =========================================================
   SKELETON
========================================================= */

function drawSkeleton(
    landmarks,
    {
        clearBefore = true,
        color = "#ffffff",
        label = ""
    } = {}
) {
    if (!$("skeleton-toggle").checked) return;

    if (
        !landmarks ||
        !landmarks.length
    ) {

        clearCanvas();

        return;

    }

    syncCanvasSize();

    if (clearBefore) {
        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );
    }

    const connections = [

        [11,12],

        [11,13],
        [13,15],

        [12,14],
        [14,16],

        [11,23],
        [12,24],

        [23,24],

        [23,25],
        [25,27],

        [24,26],
        [26,28]

    ];

    ctx.save();

    ctx.lineWidth =
        Math.max(

            4,

            Math.min(
                canvas.width,
                canvas.height
            ) * .006

        );

    ctx.lineCap =
        "round";

    ctx.lineJoin =
        "round";

    ctx.strokeStyle = color;

    ctx.shadowColor =
        "rgba(0,0,0,.7)";

    ctx.shadowBlur =
        5;

    for (
        const [start,end]
        of connections
    ) {

        const a =
            landmarks[start];

        const b =
            landmarks[end];

        if (!a || !b) {
            continue;
        }

        if (

            a.visibility !== undefined
            &&
            a.visibility <
            CONFIG.minVisibility

        ) {

            continue;

        }

        if (

            b.visibility !== undefined
            &&
            b.visibility <
            CONFIG.minVisibility

        ) {

            continue;

        }

        const ax =
            a.x *
            canvas.width;

        const ay =
            a.y *
            canvas.height;

        const bx =
            b.x *
            canvas.width;

        const by =
            b.y *
            canvas.height;

        if (

            !Number.isFinite(ax) ||
            !Number.isFinite(ay) ||
            !Number.isFinite(bx) ||
            !Number.isFinite(by)

        ) {

            continue;

        }

        ctx.beginPath();

        ctx.moveTo(
            ax,
            ay
        );

        ctx.lineTo(
            bx,
            by
        );

        ctx.stroke();

    }

    ctx.restore();

    /* Points */

    ctx.save();

    for (
        const point
        of landmarks
    ) {

        if (!point) {
            continue;
        }

        if (

            point.visibility !== undefined
            &&
            point.visibility <
            CONFIG.minVisibility

        ) {

            continue;

        }

        const x =
            point.x *
            canvas.width;

        const y =
            point.y *
            canvas.height;

        if (

            !Number.isFinite(x) ||
            !Number.isFinite(y)

        ) {

            continue;

        }

        ctx.beginPath();

        ctx.arc(

            x,
            y,
            6,
            0,
            Math.PI * 2

        );

        ctx.fillStyle = color;

        ctx.shadowColor =
            "rgba(0,0,0,.7)";

        ctx.shadowBlur =
            4;

        ctx.fill();

    }

    if (label) {
        const head = landmarks[0];
        if (head && Number.isFinite(head.x) && Number.isFinite(head.y)) {
            ctx.save();
            ctx.fillStyle = color;
            ctx.font = "700 16px sans-serif";
            ctx.textAlign = "center";
            ctx.shadowColor = "rgba(0,0,0,.8)";
            ctx.shadowBlur = 4;
            ctx.fillText(
                label,
                head.x * canvas.width,
                Math.max(20, head.y * canvas.height - 12)
            );
            ctx.restore();
        }
    }

    ctx.restore();

}

/* =========================================================
   AI LOOP
========================================================= */

async function predict() {
    predictFrame = null;
    const frameGeneration = startupId;
    if (running && !poseFrameGate.shouldRun(performance.now(), video.currentTime)) { schedulePredict(); return; }

    if (!running) {
        return;
    }

    if (!getPoseDetectorStatus().ready) {

        schedulePredict();

        return;

    }

    if (

        video.currentTime !==
        lastVideoTime

    ) {

        syncCanvasSize();

        lastVideoTime =
            video.currentTime;

        let results;
        inferenceStartedAt = performance.now();
        lastInferenceMs = null;
        repOnFrame = false;

        try {

            results =
                await detectPose(

                    video,

                    performance.now()

                );
            if (!running || frameGeneration !== startupId) return;
            if (results === null) { schedulePredict(); return; }
            lastInferenceMs = results?.inferenceMs ?? null;
            inferenceEndedAt = performance.now();
            lastTrackingAt = inferenceEndedAt;
            startupLatencyMs ??= inferenceEndedAt - pipelineStartedAt;

        }

        catch (error) {
            if (!running || frameGeneration !== startupId) return;
            poseFrameGate.error();
            preparation.update(false, performance.now());
            if (battleModeActive) battleUI.tracking(false);
            clearUnavailableMetrics();
            setStatus("วิเคราะห์ภาพไม่สำเร็จ · ลองเริ่มใหม่");

            console.error(
                "Pose error:",
                error
            );

            schedulePredict();

            return;

        }

        if (localBattlePreparing || localBattleActive) {
            processLocalBattleFrame(results?.landmarks || []);
            recordPipeline();
            schedulePredict();
            return;
        }

        /* PERSON FOUND */

        if (

            results &&
            results.landmarks &&
            results.landmarks.length

        ) {

            const landmarks =
                results.landmarks[0];

            /*
               สำคัญ:
               Skeleton ต้องวาดก่อน Full Body Check
            */

            drawSkeleton(
                landmarks
            );

            const confidence =
                getBodyConfidence(
                    landmarks
                );

            if (confidenceElement) {

                setText(confidenceElement, `${confidence}%`);

            }

            const fullBody =
                checkFullBody(
                    landmarks
                );
            if (battleModeActive && !workoutStarted) {
                if (!fullBody) onlinePreparation.arm();
                const ready = onlinePreparation.update(fullBody, performance.now());
                battleUI.tracking(fullBody && ready.phase === 'active');
            }
            if (!battleModeActive && !workoutStarted) {
                const state = preparation.update(fullBody, performance.now());
                setText($("workout-preparation"), state.phase === 'countdown' ? `เริ่มใน ${state.remaining} วินาที` : 'ขยับเข้ากล้อง แล้วอยู่ให้มั่นคง 2 วินาที');
                if (state.phase === 'active') beginWorkout();
            }

            /*
               ถ้ายังเห็นตัวไม่ครบ
               Skeleton ยังแสดง
            */

            if (!fullBody) {
                clearUnavailableMetrics();
                const validation = activeExerciseId === "six-seven"
                    ? validateSixSevenLandmarks(landmarks)
                    : validateLandmarks(
                        landmarks,
                        REQUIRED_LANDMARKS[activeExerciseId]
                            || REQUIRED_LANDMARKS["jumping-jack"],
                        CONFIG.fullBodyVisibility
                    );

                logPosePipeline({
                    phase: "validation-blocked",
                    landmarksValid: validation.valid,
                    processCalled: false,
                    missing: validation.missing,
                    invalid: validation.invalid
                });

                currentMovementPose = null;
                pendingMovementPoses = [];

                setStatus(
                    activeExerciseId === "six-seven"
                        ? "ต้องเห็นแขนและมือ"
                        : "ต้องเห็นร่างกายเต็มตัว"
                );

                if (poseStatus) {

                    setText(poseStatus, "ตรวจจับไม่ครบ");

                }

                setCoach(
                    activeExerciseId === "six-seven"
                        ? "จัดตำแหน่งกล้อง"
                        : "จัดตำแหน่งร่างกาย",
                    activeExerciseId === "six-seven"
                        ? "ขยับกล้องให้เห็นไหล่ ข้อศอก และมือทั้งสองข้างชัดเจน"
                        : "ถอยออกจากกล้อง ให้เห็นตั้งแต่ศีรษะถึงเท้า"
                );


                getActiveExerciseAnalyzer()
                    .resetMovementState();

                updateMovementState();

                recordPipeline();
                schedulePredict();

                return;

            }

            if (!workoutStarted) { recordPipeline(); schedulePredict(); return; }

            captureMovementPose(landmarks);

            /*
               Full Body
            */

            setStatus(

                "AI กำลังติดตาม",

                true

            );

            if (poseStatus) {

                setText(poseStatus, "ตรวจจับครบ");

            }

            if (activeExerciseId === "squat") {
                processSquat(
                    squatAnalyzer.analyze(landmarks)
                );
            }
            else if (activeExerciseId === "push-up") {
                processPushUp(
                    pushUpAnalyzer.analyze(landmarks)
                );
            }
            else if (activeExerciseId === "lunge") {
                processLunge(
                    lungeAnalyzer.analyze(landmarks)
                );
            }
            else if (activeExerciseId === "bicep-curl") {
                processBicepCurl(
                    bicepCurlAnalyzer.analyze(landmarks)
                );
            }
            else if (activeExerciseId === "six-seven") {
                processSixSeven(
                    sixSevenAnalyzer.analyze(landmarks)
                );
            }
            else {
                const movement =
                    analyzeJumpingJack(
                        landmarks
                    );

                const metrics = analyzeMovementMetrics(landmarks, movement);
                if (!metrics) { clearUnavailableMetrics(); jumpingJackAnalyzer.resetMovementState(); recordPipeline(); schedulePredict(); return; }

                updateMovementMetrics(
                    metrics,
                    movement
                );

                updateMovementIntelligenceUI(
                    metrics
                );

                processJumpingJack(
                    movement
                );
            }

        }

        /* NO PERSON */

        else {
            if (!workoutStarted) preparation.update(false, performance.now());
            if (battleModeActive && !workoutStarted) { onlinePreparation.arm(); battleUI.tracking(false); }
            setText($("workout-preparation"), workoutStarted ? '' : 'ขยับเข้ากล้อง แล้วอยู่ให้มั่นคง 2 วินาที');
            clearUnavailableMetrics();
            logPosePipeline({
                phase: "no-pose",
                landmarksValid: false,
                processCalled: false
            });

            currentMovementPose = null;
            pendingMovementPoses = [];

            setStatus(
                "ยังไม่พบผู้ใช้งาน"
            );

            if (poseStatus) {

                setText(poseStatus, "ไม่พบ");

            }

            if (confidenceElement) {

                setText(confidenceElement, "--");

            }

            setCoach(

                "พร้อมใช้งาน",

                "ยืนอยู่หน้ากล้องเพื่อเริ่มการวิเคราะห์"

            );


            resetLiveUI();

            getActiveExerciseAnalyzer()
                .resetMovementState();

            updateMovementState();

            clearCanvas();

        }

    }

    recordPipeline();
    schedulePredict();

}

/* =========================================================
   SESSION ANALYSIS
========================================================= */

function calculateConsistency() {

    const {
        repStartTimes
    } = getActiveExerciseAnalyzer().getState();

    if (
        repStartTimes.length < 2
    ) {

        return null;

    }

    const average =
        repStartTimes.reduce(

            (sum,value) =>
                sum + value,

            0

        )
        /
        repStartTimes.length;

    const deviation =
        repStartTimes.reduce(

            (sum,value) =>

                sum +
                Math.abs(
                    value -
                    average
                ),

            0

        )
        /
        repStartTimes.length;

    return Math.max(

        0,

        Math.min(

            100,

            Math.round(

                100 -
                (
                    deviation /
                    Math.max(
                        average,
                        .1
                    )
                ) * 100

            )

        )

    );

}

function calculateAverageRepTime() {

    const {
        repStartTimes
    } = getActiveExerciseAnalyzer().getState();

    if (
        !repStartTimes.length
    ) {

        return 0;

    }

    return (

        repStartTimes.reduce(

            (sum,value) =>
                sum + value,

            0

        )

        /

        repStartTimes.length

    );

}

function averageMetric(
    values
) {
    if (typeof values.value === "function") return values.value();
    if (!values.length) {
        return null;
    }

    return Math.round(
        values.reduce(
            (sum, value) => sum + value,
            0
        ) / values.length
    );
}

function updateHomeProgress() {
    const allSessions =
        getSessions();
    const sessions =
        getCompletedWorkouts(allSessions);

    const totalRepetitions = sessions.reduce(
        (total, session) =>
            total +
            (Number.isFinite(session.repetitions) ? session.repetitions : 0),
        0
    );
    const qualityValues = sessions
        .map(session => session.quality)
        .filter(Number.isFinite);
    const railWorkoutCount = $("rail-workout-count");
    const railRepetitionCount = $("rail-repetition-count");
    const railQualityAverage = $("rail-quality-average");
    if (railWorkoutCount) {
        railWorkoutCount.textContent = String(sessions.length);
    }
    if (railRepetitionCount) {
        railRepetitionCount.textContent = totalRepetitions.toLocaleString("th-TH");
    }
    if (railQualityAverage) {
        railQualityAverage.textContent = qualityValues.length
            ? `${Math.round(
                qualityValues.reduce((sum, quality) => sum + quality, 0) /
                    qualityValues.length
            )}%`
            : "--";
    }
    renderDesktopCalendar(sessions);

    renderTodayActivity(sessions);
    renderRecentWorkouts(sessions);
    renderHomeNextWorkout(sessions);
    renderDailyGoal(homeDailyGoal, sessions, "วันนี้");
    renderWeeklyProgress(homeWeeklyProgress, sessions);
    renderPersonalBests(
        homePersonalBests,
        getPersonalBests(sessions),
        "สถิติของคุณ"
    );
}

function renderDesktopCalendar(sessions) {
    const monthElement = $("desktop-calendar-month");
    const weekElement = $("desktop-calendar-week");
    if (!monthElement || !weekElement) {
        return;
    }

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const locale = "th-TH";
    monthElement.textContent = today.toLocaleDateString(locale, {
        month: "long",
        year: "numeric"
    });
    const workoutDays = new Set(
        sessions.map(session => {
            const date = new Date(session.completedAt);
            return Number.isNaN(date.getTime())
                ? ""
                : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        })
    );
    weekElement.replaceChildren();

    for (let index = 0; index < 7; index++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        const day = document.createElement("span");
        day.className = "calendar-day";
        if (date.toDateString() === today.toDateString()) {
            day.classList.add("is-today");
        }
        if (workoutDays.has(key)) {
            day.classList.add("has-workout");
        }

        const label = document.createElement("small");
        label.textContent = date.toLocaleDateString(locale, {
            weekday: "short"
        });
        const number = document.createElement("strong");
        number.textContent = String(date.getDate());
        day.append(label, number);
        weekElement.appendChild(day);
    }
}

function renderHomeNextWorkout(sessions) {
    if (!homeNextWorkout) {
        return;
    }

    homeNextWorkout.textContent = "";
    homeNextWorkout.closest("section").hidden = !sessions.length;
    if (!sessions.length) return;
    const section = document.createElement("div");
    section.className = "home-next-workout-content";
    const eyebrow = document.createElement("span");
    eyebrow.className = "dashboard-eyebrow";
    eyebrow.textContent = "ครั้งต่อไปแนะนำ";
    const title = document.createElement("h3");
    const description = document.createElement("p");
    const action = document.createElement("button");
    action.className = "text-button";
    action.type = "button";

    if (!sessions.length) {
        title.textContent = "เริ่มต้นจากการฝึกครั้งแรก";
        description.textContent =
            "เมื่อมี workout ที่บันทึกแล้ว MoveWise จะแนะนำการฝึกครั้งต่อไปจากข้อมูลจริงของคุณ";
        action.textContent = "เลือกท่าฝึก →";
        action.addEventListener("click", openAnalyzePage);
    } else {
        const orderedSessions = sortSessionsByDate(sessions).reverse();
        const latestSession = orderedSessions[orderedSessions.length - 1];
        const recommendation = generateRecommendation(
            latestSession,
            orderedSessions.slice(0, -1)
        );
        const exerciseName =
            getExerciseDisplayName(latestSession.exerciseId);

        title.textContent = exerciseName;
        description.textContent = recommendation.summary;
        action.textContent = `ฝึก ${exerciseName} →`;
        action.addEventListener("click", () => {
            const exerciseButton = homeQuickExercises.querySelector(`[data-exercise="${latestSession.exerciseId}"]`);
            if (exerciseButton) {
                exerciseButton.click();
            } else {
                openAnalyzePage();
            }
        });
    }

    section.append(eyebrow, title, description, action);
    homeNextWorkout.appendChild(section);
}

function getCompletedWorkouts(sessions) {
    if (!Array.isArray(sessions)) {
        return [];
    }

    return sessions.filter(session =>
        session &&
        typeof session === "object" &&
        typeof session.completedAt === "string" &&
        Number.isFinite(Date.parse(session.completedAt))
    );
}

function createInsightHeading(eyebrow, title) {
    const heading = document.createElement("div");
    heading.className = "insight-heading";

    const label = document.createElement("span");
    label.className = "dashboard-eyebrow";
    label.textContent = eyebrow;

    const headingText = document.createElement("h3");
    headingText.textContent = title;
    heading.append(label, headingText);
    return heading;
}

function createInsightStat(labelText, valueText, detailText = "") {
    const stat = document.createElement("div");
    stat.className = "insight-stat";

    const label = document.createElement("span");
    label.textContent = labelText;

    const value = document.createElement("strong");
    value.textContent = valueText;
    stat.append(label, value);

    if (detailText) {
        const detail = document.createElement("small");
        detail.textContent = detailText;
        stat.appendChild(detail);
    }

    return stat;
}

function renderDailyGoal(container, sessions, title) {
    if (!container) {
        return null;
    }

    const progress = getDailyGoalProgress(
        sessions,
        getDailyGoal()
    );
    const section = document.createElement("section");
    section.className = "daily-goal-insight";
    const heading = document.createElement("div");
    heading.className = "daily-goal-heading";

    const eyebrow = document.createElement("span");
    eyebrow.className = "dashboard-eyebrow";
    eyebrow.textContent = "TODAY'S GOAL";

    const headingText = document.createElement("h3");
    headingText.textContent = title;
    heading.append(eyebrow, headingText);

    const value = document.createElement("p");
    value.className = "daily-goal-count";
    value.textContent =
        `${progress.repetitions.toLocaleString("th-TH")} / ` +
        `${progress.goal.toLocaleString("th-TH")} ครั้ง`;

    const meter = document.createElement("div");
    meter.className = "daily-goal-meter";
    meter.setAttribute("role", "progressbar");
    meter.setAttribute("aria-label", "ความคืบหน้าเป้าหมายวันนี้");
    meter.setAttribute("aria-valuemin", "0");
    meter.setAttribute("aria-valuemax", String(progress.goal));
    meter.setAttribute(
        "aria-valuenow",
        String(Math.min(progress.repetitions, progress.goal))
    );
    const fill = document.createElement("span");
    fill.style.width = `${progress.percentage}%`;
    meter.appendChild(fill);

    const status = document.createElement("p");
    status.className = progress.isComplete
        ? "daily-goal-status is-complete"
        : "daily-goal-status";
    status.setAttribute("role", "status");
    status.textContent = progress.isComplete
        ? "Daily Goal Complete · วันนี้คุณทำเป้าหมายสำเร็จแล้ว"
        : `อีก ${progress.remaining.toLocaleString("th-TH")} ครั้ง ` +
            "เพื่อบรรลุเป้าหมายวันนี้";

    const percentage = document.createElement("span");
    percentage.className = "daily-goal-percentage";
    percentage.textContent = `${progress.percentage}%`;

    const progressRow = document.createElement("div");
    progressRow.className = "daily-goal-progress-row";
    progressRow.append(meter, percentage);

    section.append(heading, value, progressRow, status);
    container.replaceChildren(section);
    return progress;
}

function renderDailyGoalSettings() {
    const goal = getDailyGoal();

    if (dailyGoalValue) {
        dailyGoalValue.textContent = String(goal);
    }

    const decrease = $("daily-goal-decrease");
    const increase = $("daily-goal-increase");
    if (decrease) {
        decrease.disabled = goal <= 1;
    }
    if (increase) {
        increase.disabled = goal >= MAX_DAILY_GOAL;
    }
}

function renderResultDailyGoal() {
    const sessions = getCompletedWorkouts(getSessions());
    if (
        currentResultSession &&
        typeof currentResultSession.completedAt === "string" &&
        Number.isFinite(Date.parse(currentResultSession.completedAt)) &&
        !sessions.some(session =>
            session.id === currentResultSession.id
        )
    ) {
        sessions.push(currentResultSession);
    }
    renderDailyGoal(resultDailyGoal, sessions, "เป้าหมายวันนี้");
}

function changeDailyGoal(amount) {
    const current = getDailyGoal();
    const next = Math.max(
        1,
        Math.min(MAX_DAILY_GOAL, current + amount)
    );

    if (next === current) {
        return;
    }

    if (!setDailyGoal(next)) {
        if (dailyGoalSaveStatus) {
            dailyGoalSaveStatus.textContent =
                "บันทึกเป้าหมายไม่ได้ กรุณาตรวจสอบการตั้งค่า storage ของเบราว์เซอร์";
        }
        return;
    }

    renderDailyGoalSettings();
    updateHomeProgress();
    if (profileScreen?.classList.contains("active")) {
        renderProfilePage();
    }
    if (resultScreen?.classList.contains("active")) {
        renderResultDailyGoal();
    }
    if (dailyGoalSaveStatus) {
        dailyGoalSaveStatus.textContent = "บันทึกเป้าหมายแล้ว";
    }
}

function getWeeklyChange(current, previous, suffix = "") {
    if (
        typeof current !== "number" ||
        typeof previous !== "number"
    ) {
        return "";
    }

    const difference = current - previous;
    if (difference === 0) {
        return `→ 0${suffix} จากสัปดาห์ก่อน`;
    }

    const direction = difference > 0 ? "↑" : "↓";
    const amount = difference > 0
        ? `+${difference}`
        : String(difference);
    return `${direction} ${amount}${suffix} จากสัปดาห์ก่อน`;
}

function renderWeeklyProgress(container, sessions) {
    if (!container) {
        return;
    }

    const progress = getWeeklyProgress(sessions);
    const section = document.createElement("section");
    section.className = "progress-insight weekly-progress";
    section.appendChild(
        createInsightHeading("สรุปรายสัปดาห์", "สัปดาห์นี้")
    );

    const stats = document.createElement("div");
    stats.className = "insight-stat-grid";
    const previous = progress.previousWeek;
    stats.append(
        createInsightStat(
            "การฝึก",
            String(progress.workoutCount),
            previous
                ? getWeeklyChange(
                    progress.workoutCount,
                    previous.workoutCount
                )
                : ""
        ),
        createInsightStat(
            "จำนวนครั้ง",
            progress.totalRepetitions.toLocaleString("th-TH"),
            previous
                ? getWeeklyChange(
                    progress.totalRepetitions,
                    previous.totalRepetitions
                )
                : ""
        ),
        createInsightStat(
            "คุณภาพ",
            progress.averageQuality === null
                ? "--"
                : `${progress.averageQuality}%`,
            previous
                ? getWeeklyChange(
                    progress.averageQuality,
                    previous.averageQuality,
                    "%"
                )
                : ""
        ),
        createInsightStat("วันที่ฝึก", String(progress.activeDays))
    );
    section.appendChild(stats);

    const activity = document.createElement("ol");
    activity.className = "weekly-activity";
    const weekdayNames = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

    progress.dailyActivity.forEach(day => {
        const [year, month, date] = day.date.split("-").map(Number);
        const weekday = weekdayNames[
            new Date(year, month - 1, date).getDay()
        ];
        const item = document.createElement("li");
        item.className = day.workoutCount
            ? "weekly-day is-active"
            : "weekly-day";
        item.title =
            `${day.date}: ${day.workoutCount} เซสชัน, ` +
            `${day.repetitions} ครั้ง`;
        item.setAttribute(
            "aria-label",
            `${weekday}: ฝึก ${day.workoutCount} เซสชัน, ` +
            `${day.repetitions} ครั้ง`
        );

        const label = document.createElement("span");
        label.textContent = weekday;
        const marker = document.createElement("i");
        marker.setAttribute("aria-hidden", "true");
        item.append(label, marker);
        activity.appendChild(item);
    });
    section.appendChild(activity);

    if (!previous) {
        const firstWeek = document.createElement("p");
        firstWeek.className = "insight-note";
        firstWeek.textContent = "เริ่มต้นสัปดาห์แรกของคุณ";
        section.appendChild(firstWeek);
    }

    container.replaceChildren(section);
}

function renderPersonalBests(container, personalBests, title) {
    if (!container) {
        return;
    }

    const section = document.createElement("section");
    section.className = "progress-insight personal-best-section";
    section.appendChild(
        createInsightHeading("PERSONAL BEST", title)
    );

    const entries = Object.entries(personalBests)
        .sort(([leftId, left], [rightId, right]) => {
            const leftScore =
                left.bestRepetitions ?? left.bestQuality ?? left.bestSymmetry ?? -1;
            const rightScore =
                right.bestRepetitions ?? right.bestQuality ?? right.bestSymmetry ?? -1;
            return rightScore - leftScore ||
                leftId.localeCompare(rightId);
        })
        .slice(0, 3);

    if (!entries.length) {
        const empty = document.createElement("p");
        empty.className = "insight-note";
        empty.textContent = "จบ workout เพื่อบันทึกสถิติส่วนตัวของคุณ";
        section.appendChild(empty);
    }
    else {
        const list = document.createElement("div");
        list.className = "personal-best-list";

        entries.forEach(([exerciseId, best]) => {
            const item = document.createElement("article");
            item.className = "personal-best-item";

            const exercise = document.createElement("strong");
            exercise.textContent = getExerciseDisplayName(exerciseId);
            item.appendChild(exercise);

            const metrics = document.createElement("div");
            metrics.className = "personal-best-metrics";

            if (typeof best.bestRepetitions === "number") {
                metrics.appendChild(
                    createInsightStat(
                        "จำนวนครั้งสูงสุด",
                        `${best.bestRepetitions.toLocaleString("th-TH")} ครั้ง`
                    )
                );
            }
            if (typeof best.bestQuality === "number") {
                metrics.appendChild(
                    createInsightStat(
                        "คุณภาพสูงสุด",
                        `${best.bestQuality}%`
                    )
                );
            }
            if (typeof best.bestSymmetry === "number") {
                metrics.appendChild(
                    createInsightStat(
                        "สมดุลสูงสุด",
                        `${best.bestSymmetry}%`
                    )
                );
            }

            item.appendChild(metrics);
            list.appendChild(item);
        });

        section.appendChild(list);
    }

    container.replaceChildren(section);
}

function renderStreak(container, sessions) {
    if (!container) {
        return;
    }

    const section = document.createElement("section");
    section.className = "progress-insight streak-section";
    section.appendChild(
        createInsightHeading("ความสม่ำเสมอ", "ฝึกต่อเนื่อง")
    );

    const stats = document.createElement("div");
    stats.className = "insight-stat-grid streak-stat-grid";
    stats.append(
        createInsightStat(
            "ต่อเนื่องปัจจุบัน",
            `${getCurrentStreak(sessions)} วัน`
        ),
        createInsightStat(
            "สถิติต่อเนื่อง",
            `${getLongestStreak(sessions)} วัน`
        )
    );
    section.appendChild(stats);
    container.replaceChildren(section);
}

const EXERCISE_PROGRESS_OPTIONS = [
    { id: "jumping-jack", name: "Jumping Jack", secondary: "symmetry", label: "Symmetry" },
    { id: "squat", name: "Squat", secondary: "depth", label: "Depth" },
    { id: "push-up", name: "Push-up", secondary: "alignment", label: "Alignment" },
    { id: "lunge", name: "Lunge", secondary: "stability", label: "Stability" },
    { id: "bicep-curl", name: "Bicep Curl", secondary: "rom", label: "ROM" }
];

function createExerciseProgressChart(data, label, unit) {
    const points = data
        .map((item, index) => ({
            ...item,
            index
        }))
        .filter(point =>
            typeof point.value === "number" &&
            Number.isFinite(point.value)
        );

    if (points.length < 2) {
        return null;
    }

    const namespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(namespace, "svg");
    svg.setAttribute("viewBox", "0 0 320 160");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${label} trend from ${points.length} workouts`);
    svg.classList.add("exercise-trend-chart");

    const values = points.map(point => point.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || Math.max(Math.abs(maxValue) * 0.1, 1);
    const chartLeft = 42;
    const chartRight = 308;
    const chartTop = 22;
    const chartBottom = 118;

    const addSvgElement = (name, attributes, text) => {
        const element = document.createElementNS(namespace, name);
        Object.entries(attributes).forEach(([attribute, value]) =>
            element.setAttribute(attribute, String(value))
        );
        if (text) {
            element.textContent = text;
        }
        svg.appendChild(element);
        return element;
    };

    [chartTop, chartBottom].forEach(y => {
        addSvgElement("line", {
            x1: chartLeft,
            x2: chartRight,
            y1: y,
            y2: y,
            class: "exercise-chart-gridline"
        });
    });

    addSvgElement("text", {
        x: chartLeft - 8,
        y: chartTop + 4,
        "text-anchor": "end",
        class: "exercise-chart-label"
    }, String(Number(maxValue.toFixed(1))));
    addSvgElement("text", {
        x: chartLeft - 8,
        y: chartBottom + 4,
        "text-anchor": "end",
        class: "exercise-chart-label"
    }, String(Number(minValue.toFixed(1))));

    const coordinates = points.map((point, index) => {
        const x = points.length === 1
            ? (chartLeft + chartRight) / 2
            : chartLeft +
                (chartRight - chartLeft) * index / (points.length - 1);
        const y = chartBottom -
            (point.value - minValue) / range *
            (chartBottom - chartTop);
        return { ...point, x, y };
    });

    addSvgElement("polyline", {
        points: coordinates.map(point =>
            `${point.x},${point.y}`
        ).join(" "),
        class: "exercise-chart-line"
    });

    coordinates.forEach((point, index) => {
        const circle = addSvgElement("circle", {
            cx: point.x,
            cy: point.y,
            r: 4,
            class: "exercise-chart-point"
        });
        const title = document.createElementNS(namespace, "title");
        title.textContent =
            `${new Date(point.date).toLocaleDateString()} · ` +
            `${Number(point.value.toFixed(1))}${unit}`;
        circle.appendChild(title);

        addSvgElement("text", {
            x: point.x,
            y: 145,
            "text-anchor": "middle",
            class: "exercise-chart-label"
        }, String(index + 1));
    });

    return svg;
}

function createExerciseMetricSection(data, key, label, unit) {
    label = ({Quality:"คุณภาพการเคลื่อนไหว",Depth:"ช่วงการย่อตัว",Alignment:"แนวลำตัว",Stability:"ความมั่นคง",Symmetry:"สมดุลซ้าย–ขวา",ROM:"ช่วงการเคลื่อนไหว",Speed:"ความเร็ว"})[label] || label;
    const section = document.createElement("section");
    section.className = "exercise-progress-metric";

    const title = document.createElement("h4");
    title.textContent = label;
    section.appendChild(title);

    const values = data
        .map(item => ({
            date: item.date,
            value: key === "quality"
                ? item.quality
                : item.metrics[key]
        }))
        .filter(item =>
            typeof item.value === "number" &&
            Number.isFinite(item.value)
        );

    if (!values.length) {
        const empty = document.createElement("p");
        empty.className = "exercise-progress-empty";
        empty.textContent = "ยังไม่มีข้อมูลตัวชี้วัดนี้";
        section.appendChild(empty);
        return section;
    }

    const latest = values[values.length - 1];
    const current = document.createElement("p");
    current.className = "exercise-progress-current";
    current.textContent =
        `ล่าสุด ${Number(latest.value.toFixed(1))}${unit}`;
    section.appendChild(current);

    const chart = createExerciseProgressChart(values, label, unit);
    if (chart) {
        section.appendChild(chart);
    }
    else {
        const single = document.createElement("p");
        single.className = "exercise-progress-single";
        single.textContent = "มีข้อมูลจาก 1 workout · ยังไม่แสดงแนวโน้ม";
        section.appendChild(single);
    }

    return section;
}

function getExercisesWithProgress(sessions) {
    return EXERCISE_PROGRESS_OPTIONS.filter(exercise =>
        getExerciseProgress(sessions, exercise.id).length > 0
    );
}

function createExerciseSelector(exercises, selectedId, onChange) {
    const label = document.createElement("label");
    label.className = "exercise-progress-selector";
    label.textContent = "เลือกท่า";

    const select = document.createElement("select");
    select.setAttribute("aria-label", "เลือกท่าออกกำลังกาย");
    exercises.forEach(exercise => {
        const option = document.createElement("option");
        option.value = exercise.id;
        option.textContent = exercise.name;
        option.selected = exercise.id === selectedId;
        select.appendChild(option);
    });
    select.addEventListener("change", () => onChange(select.value));
    label.appendChild(select);
    return label;
}

function renderExerciseProgress(
    container,
    sessions,
    selectedId,
    onSelection,
    summaryOnly = false
) {
    if (!container) {
        return selectedId;
    }

    const exercises = getExercisesWithProgress(sessions);
    const section = document.createElement("section");
    section.className = "progress-insight exercise-progress";
    section.appendChild(
        createInsightHeading("พัฒนาการรายท่า", "ความคืบหน้าของท่า")
    );

    if (!exercises.length) {
        const empty = document.createElement("p");
        empty.className = "exercise-progress-empty";
        empty.textContent = "ยังไม่มีข้อมูลการฝึกท่านี้";
        const start = document.createElement("button");
        start.type = "button";
        start.className = "secondary-button";
        start.textContent = "เริ่มการฝึก";
        start.addEventListener("click", openAnalyzePage);
        section.append(empty, start);
        container.replaceChildren(section);
        return "";
    }

    const activeExercise = exercises.some(exercise =>
        exercise.id === selectedId
    )
        ? selectedId
        : exercises[0].id;
    const exercise = exercises.find(item => item.id === activeExercise);
    const data = getExerciseProgress(sessions, activeExercise);

    section.appendChild(
        createExerciseSelector(
            exercises,
            activeExercise,
            onSelection
        )
    );

    if (summaryOnly) {
        const quality = data
            .map(item => item.quality)
            .filter(value =>
                typeof value === "number" &&
                Number.isFinite(value)
            );
        const summary = document.createElement("p");
        summary.className = "exercise-progress-summary";
        if (quality.length) {
            summary.textContent =
                `${exercise.name} · คุณภาพสูงสุด ` +
                `${Math.max(...quality)}% · ล่าสุด ` +
                `${quality[quality.length - 1]}%`;
        }
        else {
            summary.textContent =
                `${exercise.name} · ยังไม่มีข้อมูล Quality`;
        }
        section.appendChild(summary);
    }
    else {
        section.append(
            createExerciseMetricSection(data, "quality", "Quality", "%"),
            createExerciseMetricSection(
                data,
                exercise.secondary,
                exercise.label,
                exercise.secondary === "kneeAngle" ||
                    exercise.secondary === "elbowAngle"
                    ? "°"
                    : "%"
            )
        );
    }

    container.replaceChildren(section);
    return activeExercise;
}

function renderQuickStart() {
    if (!homeQuickExercises) {
        return;
    }

    const descriptions = {
        "jumping-jack": "เริ่มฝึก",
        squat: "Lower body strength",
        "push-up": "Upper body strength",
        lunge: "Lower body & balance",
        "bicep-curl": "Arm strength",
        "six-seven": "สลับระดับข้อมือซ้าย–ขวา"
    };

    homeQuickExercises.textContent = "";

    getAvailableWorkoutExercises().forEach(exercise => {
        const card = document.createElement("button");
        card.type = "button";
        card.id = `home-${exercise.id}`;
        card.className = "quick-exercise-card active-exercise";
        card.dataset.exercise = exercise.id;

        const image = document.createElement("img");
        image.className = "quick-card-image";
        image.alt = `${exercise.name} Exercise`;
        image.loading = "lazy";
        image.decoding = "async";
        setImageWithFallback(image, mediaAssets.exercises[exercise.id]);

        const body = document.createElement("div");
        body.className = "quick-card-body";

        const category = document.createElement("span");
        category.textContent = exercise.category.toUpperCase();

        const name = document.createElement("h4");
        name.textContent = exercise.name;

        const description = document.createElement("p");
        description.textContent = descriptions[exercise.id] || "Workout";

        const action = document.createElement("strong");
        action.textContent = "→";

        body.append(category, name, description);
        card.append(image, body, action);
        homeQuickExercises.appendChild(card);
    });
}

function formatActivityDuration(seconds) {
    if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
        return "--";
    }

    return formatTime(Math.max(0, Math.round(seconds)));
}

function getExerciseDisplayName(exerciseId) {
    const names = {
        "jumping-jack": "Jumping Jack",
        squat: "Squat",
        "push-up": "Push-up",
        lunge: "Lunge",
        "bicep-curl": "Bicep Curl",
        "six-seven": "Six Seven (67) Challenge"
    };

    return names[exerciseId] || exerciseId || "Workout";
}

function getActivityDateKey(date) {
    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
        return null;
    }

    return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

function getActivityDateLabel(date) {
    const value = new Date(date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (getActivityDateKey(value) === getActivityDateKey(today)) {
        return "วันนี้";
    }

    if (getActivityDateKey(value) === getActivityDateKey(yesterday)) {
        return "เมื่อวาน";
    }

    return value.toLocaleDateString("th-TH", {
        month: "short",
        day: "numeric"
    });
}

function sortSessionsByDate(sessions) {
    return [...sessions].sort(
        (left, right) => Date.parse(
            right.completedAt || right.startedAt
        ) - Date.parse(
            left.completedAt || left.startedAt
        )
    );
}

function renderTodayActivity(sessions) {
    const todayKey = getActivityDateKey(new Date());
    const todaySessions = sortSessionsByDate(sessions).filter(session =>
        getActivityDateKey(
            session.completedAt
        ) === todayKey
    );

    if (!todaySessions.length) {
        homeTodayActivitySection.hidden = true;
        return;
    }

    const totalReps = todaySessions.reduce(
        (total, session) => total + (
            Number.isFinite(session.repetitions)
                ? session.repetitions
                : 0
        ),
        0
    );
    const qualityValues = todaySessions
        .map(session => session.quality)
        .filter(Number.isFinite);
    const duration = todaySessions.reduce(
        (total, session) => total + (
            Number.isFinite(session.duration)
                ? session.duration
                : 0
        ),
        0
    );

    homeTodayActivitySection.hidden = false;
    homeTodayWorkouts.textContent = todaySessions.length;
    homeTodayReps.textContent = totalReps;
    homeTodayQuality.textContent = qualityValues.length
        ? `${Math.round(qualityValues.reduce((sum, value) => sum + value, 0) / qualityValues.length)}%`
        : "--";
    homeTodayDuration.textContent = formatActivityDuration(duration);
}

function renderRecentWorkouts(sessions) {
    const recentSessions = sortSessionsByDate(sessions).slice(0, 3);

    homeRecentActivity.hidden = recentSessions.length === 0;
    if (!recentSessions.length) {
        homeRecentWorkouts.textContent = "";
        return;
    }

    homeRecentWorkouts.textContent = "";

    recentSessions.forEach(session => {
        const card = document.createElement("article");
        card.className = "activity-feed-card";
        const artwork = createExerciseArtwork(session.exerciseId);
        const date = document.createElement("div");
        date.className = "activity-feed-date";
        date.textContent = getActivityDateLabel(
            session.completedAt || session.startedAt
        );

        const main = document.createElement("div");
        main.className = "activity-feed-main";

        const exercise = document.createElement("strong");
        exercise.textContent = getExerciseDisplayName(session.exerciseId);

        const details = document.createElement("span");
        details.textContent =
            `${Number.isFinite(session.repetitions)
                ? `${session.repetitions} ครั้ง`
                : "จำนวนครั้ง --"} · ` +
            (Number.isFinite(session.quality)
                ? `คุณภาพ ${session.quality}%`
                : "คุณภาพ --");

        const duration = document.createElement("time");
        duration.textContent = formatActivityDuration(session.duration);
        main.append(exercise, details);
        if (artwork) {
            card.append(artwork);
        }
        card.append(date, main, duration);
        homeRecentWorkouts.appendChild(card);
    });
}

function createExerciseArtwork(exerciseId) {
    const exerciseAssets = {
        "jumping-jack": "jumping-jack.svg",
        squat: "squat.svg",
        "push-up": "push-up.svg",
        lunge: "lunge.svg",
        "bicep-curl": "bicep-curl.svg"
    };
    const asset = exerciseAssets[exerciseId];

    if (!asset) {
        return null;
    }

    const image = document.createElement("img");
    image.className = "history-exercise-image";
    image.src = `./src/assets/exercises/${asset}`;
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    return image;
}

function renderProgressPage() {
    const sessions = sortSessionsByDate(
        getCompletedWorkouts(getSessions())
    );
    const list = $("progress-recent-sessions");

    renderWeeklyProgress(activityWeeklyProgress, sessions);
    renderMonthlyActivity($("activity-monthly-progress"), sessions);
    renderStreak(activityStreak, sessions);
    renderPersonalBests(
        activityPersonalBests,
        getPersonalBests(sessions),
        "สถิติส่วนตัว"
    );
    activitySelectedExercise = renderExerciseProgress(
        activityExerciseProgress,
        sessions,
        activitySelectedExercise,
        exerciseId => {
            activitySelectedExercise = exerciseId;
            renderProgressPage();
        }
    );

    if (list) {
        list.replaceChildren();

        const filtered = filterHistory(sessions, {
            exerciseId: $("history-exercise").value,
            days: Number($("history-period").value)
        });
        $("history-count").textContent = `${filtered.length} เซสชัน`;
        $("history-no-results").hidden = filtered.length > 0 || sessions.length === 0;
        filtered.forEach(session => {
            const card = document.createElement("article");
            card.className = "history-card";
            const artwork = createExerciseArtwork(session.exerciseId);

            const text = document.createElement("div");
            text.className = "history-card-main";

            const exercise = document.createElement("strong");
            exercise.textContent = getExerciseDisplayName(session.exerciseId);

            const date = document.createElement("time");
            const timestamp = session.completedAt || session.startedAt;
            date.dateTime = timestamp;
            date.textContent = new Date(timestamp).toLocaleString("th-TH", {
                dateStyle: "medium",
                timeStyle: "short"
            });

            const stats = document.createElement("p");
            stats.textContent =
                `${session.repetitions} ครั้ง · ` +
                (typeof session.quality === "number"
                    ? `คุณภาพ ${session.quality}%`
                    : "คุณภาพ --");
            text.append(exercise, date, stats);
            if (artwork) {
                card.appendChild(artwork);
            }
            card.appendChild(text);

            {
                const link = document.createElement("button");
                link.className = "history-report-link";
                link.type = "button";
                link.textContent = "ดูรายละเอียด →";
                link.addEventListener("click", () =>
                    openMovementReport(session.id)
                );
                card.appendChild(link);
            }

            list.appendChild(card);
        });
    }

    if (progressEmptyState) {
        progressEmptyState.hidden = sessions.length > 0;
    }
}

function openMovementReport(sessionId) {
    const session = getSessionById(sessionId);

    if (!session) return;

    if (reportTitle) {
        reportTitle.textContent = getExerciseDisplayName(session.exerciseId);
    }
    if (reportDate) {
        reportDate.textContent = new Date(
            session.completedAt || session.startedAt
        ).toLocaleString("th-TH", {
            dateStyle: "long",
            timeStyle: "short"
        });
    }
    if (reportReps) {
        reportReps.textContent = String(session.repetitions);
    }
    if (reportQuality) {
        reportQuality.textContent =
            typeof session.quality === "number"
                ? `${session.quality}%`
                : "--";
    }

    renderMovementVisual(
        reportPoseContainer,
        session.movementVisual,
        session.exerciseId
    );
    renderMovementMetrics(
        reportMetricContainer,
        session.exerciseId,
        session.movementMetrics
    );
    $("report-duration").textContent = formatTime(Math.floor(session.duration));
    $("report-no-visual").hidden = isValidMovementVisual(session.movementVisual, session.exerciseId, session.repetitions);
    showScreen(movementReportScreen);
}

function renderProfilePage() {
    const sessions = sortSessionsByDate(
        getCompletedWorkouts(getSessions())
    );
    const qualities = sessions
        .map(session => session.quality)
        .filter(value =>
            typeof value === "number" &&
            Number.isFinite(value) &&
            value >= 0 &&
            value <= 100
        );
    const repetitions = sessions.reduce(
        (total, session) =>
            total +
            (
                typeof session.repetitions === "number" &&
                Number.isFinite(session.repetitions) &&
                session.repetitions >= 0
                    ? session.repetitions
                    : 0
            ),
        0
    );
    const averageQuality = averageMetric(qualities);
    const latestMeasuredSession = sessions.find(item => Number.isFinite(item.quality));
    const qualityHistory = sessions
        .filter(session =>
            session.exerciseId === latestMeasuredSession?.exerciseId &&
            getMeasurementVersion(session) === getMeasurementVersion(latestMeasuredSession) &&
            typeof session.quality === "number" &&
            Number.isFinite(session.quality) &&
            session.quality >= 0 &&
            session.quality <= 100
        )
        .map(session => session.quality);
    const latestQuality = qualityHistory[0];
    const previousQuality = qualityHistory[1];
    renderDailyGoalSettings();
    profileSelectedExercise = renderExerciseProgress(
        profileExerciseProgress,
        sessions,
        profileSelectedExercise,
        exerciseId => {
            profileSelectedExercise = exerciseId;
            renderProfilePage();
        },
        true
    );

    if (profileWorkouts) {
        profileWorkouts.textContent = String(sessions.length);
    }
    if (profileReps) {
        profileReps.textContent = repetitions.toLocaleString("th-TH");
    }
    if (profileQuality) {
        profileQuality.textContent =
            averageQuality === null
                ? "--"
                : `${averageQuality}%`;
    }
    if (profileCurrentStreak) {
        profileCurrentStreak.textContent =
            `${getCurrentStreak(sessions)} วัน`;
    }
    if (profileLongestStreak) {
        profileLongestStreak.textContent =
            `${getLongestStreak(sessions)} วัน`;
    }
    if (profilePersonalBests) {
        renderPersonalBests(
            profilePersonalBests,
            getPersonalBests(sessions),
            "สถิติส่วนตัว"
        );
    }
    if (profileProgress) {
        profileProgress.replaceChildren();
        if (typeof latestQuality === "number") {
            const title = document.createElement("strong");
            title.textContent = "คุณภาพการเคลื่อนไหว";
            const detail = document.createElement("span");
            detail.textContent =
                qualityHistory.length >= 3 && typeof previousQuality === "number"
                    ? `ครั้งล่าสุด ${latestQuality}% · ` +
                        `เปลี่ยนแปลง ${latestQuality >= previousQuality ? "+" : ""}` +
                        `${latestQuality - previousQuality}% จากครั้งก่อน`
                    : `ครั้งล่าสุด ${latestQuality}%`;
            const bar = document.createElement("div");
            bar.className = "profile-progress-track";
            const fill = document.createElement("div");
            fill.style.width = `${latestQuality}%`;
            bar.appendChild(fill);
            profileProgress.append(title, detail, bar);
        }
        else {
            const empty = document.createElement("p");
            empty.textContent =
                "จบการฝึกสักครั้ง เพื่อดูพัฒนาการของคุณที่นี่";
            profileProgress.appendChild(empty);
        }
    }
}

function renderMovementMetrics(container, exerciseId, metrics) {
    if (!container) {
        return;
    }

    const metricLabels = {
        armROM: "การเคลื่อนไหวแขน",
        legROM: "การเคลื่อนไหวขา",
        symmetry: "สมดุลซ้าย–ขวา",
        kneeAngle: "มุมเข่า",
        depth: "ความลึก",
        elbowAngle: "มุมข้อศอก",
        alignment: "แนวลำตัว",
        stability: "ความมั่นคง",
        rom: "ช่วงการเคลื่อนไหว",
        speed: "ความเร็ว",
        quality: "คุณภาพการเคลื่อนไหว"
    };

    container.replaceChildren();

    getMovementMetricDefinitions(exerciseId).forEach(definition => {
        const value = metrics?.[definition.key];

        if (typeof value !== "number" || !Number.isFinite(value)) {
            return;
        }

        const item = document.createElement("div");
        item.className = "movement-metric";

        const label = document.createElement("span");
        label.textContent = metricLabels[definition.key] || definition.label;

        const result = document.createElement("strong");
        result.textContent = `${Number(value.toFixed(1))}${definition.unit}`;

        item.append(label, result);
        container.appendChild(item);
    });

    container.hidden = container.childElementCount === 0;
}

function renderMovementResult(session) {
    const report = $("result-movement-report");
    if (!report) return;
    const hasVisual = renderMovementVisual(movementPoseContainer, session?.movementVisual, session?.exerciseId);
    renderMovementMetrics(movementMetricContainer, session?.exerciseId, session?.movementMetrics);
    report.hidden = !hasVisual && movementMetricContainer.hidden;
}

/* =========================================================
   RESULT
========================================================= */

function generateResult(
    duration
) {
    const resultRenderStarted = performance.now();

    if (remoteAICoach) {
        remoteAICoach.hidden = true;
    }
    if (remoteAIUnavailable) {
        remoteAIUnavailable.hidden = true;
    }

    const exerciseState =
        getActiveExerciseAnalyzer().getState();

    const quality =

        exerciseState.qualityScores.length

            ?

            Math.round(

                exerciseState.qualityScores.reduce(

                    (sum,value) =>
                        sum + value,

                    0

                )
                /
                exerciseState.qualityScores.length

            )

            :

            null;

    const accuracy =

        exerciseState.attempts > 0

            ?

            Math.round(

                (
                    exerciseState.validReps /
                    exerciseState.attempts
                ) * 100

            )

            :

            null;

    const movementMetrics =
        summarizeMovementMetrics(
            activeExerciseId,
            movementMetricRecords
        );

    const movementVisual =
        createMovementVisual(
            activeExerciseId,
            movementVisualReps,
            exerciseState.repetitions
        );

    if (
        !sessionSaved &&
        sessionStartTime &&
        workoutStarted
    ) {
        const session = createSession({
            exerciseId: activeExerciseId,
            startedAt: new Date(
                sessionStartTime
            ).toISOString(),
            completedAt: new Date().toISOString(),
            duration,
            repetitions: exerciseState.repetitions,
            quality,
            accuracy,
            rom: averageMetric(sessionROMValues),
            symmetry: averageMetric(sessionSymmetryValues),
            movementMetrics,
            movementVisual,
            repRecords: exerciseState.repRecords
        });

        currentResultSession = session;
        sessionSaved = saveSession(session);
        $("retry-save-session").hidden = sessionSaved;

        if (!sessionSaved) {
            const warning = $("session-save-warning");
            if (warning) {
                warning.hidden = false;
            }
        }
    }

    renderMovementResult(currentResultSession);
    setText($("snapshot-explanation"), currentResultSession?.movementVisual ? "โครงร่างจาก 3 รอบแรกที่นับสำเร็จ เพื่อทบทวนเส้นทางข้อต่อระหว่างรอบ ไม่ใช่ภาพวินิจฉัยท่าผิด" : "ไม่ได้เก็บภาพหรือโครงร่างสำหรับเซสชันนี้");
    renderResultDailyGoal();
    const issues = summarizeIssues(activeExerciseId, getSessions());
    setText($("result-issues"), issues.length ? issues.map(issue => `${issue.label}: ${issue.sessions}/${issue.measuredSessions} เซสชัน${issue.recurring ? ' · พบซ้ำ' : ''}`).join(' • ') : 'ยังไม่พบรูปแบบปัญหาที่มีข้อมูลรองรับ');

    const consistency =
        calculateConsistency();

    const averageRepTime =
        calculateAverageRepTime();

    if (resultReps) {

        resultReps.textContent =
            exerciseState.repetitions;

    }

    if (resultQuality) {

        resultQuality.textContent =
            exerciseState.qualityScores.length ? `${quality}%` : "--";

    }

    if (resultQualityBar) {

        resultQualityBar.style.width =
            `${quality ?? 0}%`;

    }

    if (resultAccuracy) {

        resultAccuracy.textContent =
            exerciseState.attempts > 0 ? `${accuracy}%` : "--";

    }

    if (resultAccuracyBar) {

        resultAccuracyBar.style.width =
            `${accuracy ?? 0}%`;

    }

    if (resultTime) {

        resultTime.textContent =
            formatTime(
                duration
            );

    }

    generateAIRecommendation(

        quality,

        accuracy,

        consistency,

        averageRepTime

    );

    const coachRequestId = ++resultCoachRequestId;
    if (exerciseState.repetitions > 0) {
        requestRemoteAICoaching({
            exercise: exerciseNameElement?.textContent.trim()
                || activeExerciseId,
            repetitions: exerciseState.repetitions,
            quality,
            accuracy,
            metrics: createCoachingSession({
                exerciseId: activeExerciseId,
                movementMetrics
            }).movementMetrics,
            feedback: [
                aiInsight?.textContent,
                aiRecommendation?.textContent
            ].filter(Boolean)
        }, coachRequestId);
    }

    console.log(
        "========== MOVEWISE AI =========="
    );

    console.log(
        "Reps:",
        exerciseState.repetitions
    );

    console.log(
        "Accuracy:",
        accuracy
    );

    console.log(
        "Quality:",
        quality
    );

    console.log(
        "Consistency:",
        consistency
    );

    console.log(
        "Average Rep:",
        averageRepTime
    );

    console.log(
        "Rep Records:",
        exerciseState.repRecords
    );

    console.log(
        "Movement Metrics:",
        exerciseState.repMovementMetrics
    );

    if (new URLSearchParams(location.search).has("debugPerformance")) resultScreen.dataset.renderMs = String(Math.round(performance.now() - resultRenderStarted));

}

async function requestRemoteAICoaching(
    payload,
    requestId
) {
    const result = await getOptionalAICoaching(
        payload,
        null
    );

    if (
        requestId !== resultCoachRequestId ||
        !resultScreen?.classList.contains("active")
    ) {
        return;
    }

    if (!result.available) {
        if (remoteAIUnavailable) {
            remoteAIUnavailable.hidden = false;
        }
        return;
    }

    if (
        !result.coaching ||
        !remoteAICoach ||
        !remoteAISummary ||
        !remoteAIStrengths ||
        !remoteAIImprovement ||
        !remoteAINextTip
    ) {
        return;
    }

    remoteAISummary.textContent = result.coaching.summary;
    remoteAIStrengths.textContent =
        result.coaching.strengths.join(" · ");
    remoteAIImprovement.textContent =
        result.coaching.improvement.join(" · ");
    remoteAINextTip.textContent =
        result.coaching.next_tip;
    remoteAICoach.hidden = false;
}

/* =========================================================
   AI RECOMMENDATION
========================================================= */

function generateAIRecommendation(

    quality,

    accuracy,

    consistency,

    averageRepTime

) {

    aiInsightStrength.hidden = true;
    aiInsightImprovement.hidden = true;

    const exerciseState =
        getActiveExerciseAnalyzer().getState();

    if (!exerciseState.repetitions) {
        aiInsightStrength.hidden = true;
        aiInsightImprovement.hidden = true;
        aiInsightTitle.textContent =
            "ยังมีข้อมูลไม่เพียงพอ";
        aiInsight.textContent =
            "ยังมีข้อมูลไม่เพียงพอสำหรับวิเคราะห์พัฒนาการ";
        aiRecommendation.textContent =
            "เริ่มจากทำท่าช้า ๆ และยืนให้เห็นร่างกายเต็มตัว";
        return;
    }

    const currentSession = createCoachingSession({
        measurementVersion: 2,
        exerciseId: activeExerciseId,
        repetitions: exerciseState.repetitions,
        quality, accuracy, consistency,
        movementMetrics: summarizeMovementMetrics(activeExerciseId, movementMetricRecords)
    });
    const history = getSessions().filter(session =>
        session.exerciseId === activeExerciseId && session.id !== currentResultSession?.id && session.repRecords?.length > 0 && session.repRecords.every(record => record.measurementVersion === 2)
    );
    const recommendation =
        generateRecommendation(
            currentSession,
            history
        );

    aiInsightTitle.textContent =
        recommendation.focusAreas[0]?.title || "สรุปการเคลื่อนไหว";
    aiInsight.textContent =
        recommendation.summary;
    const strength = recommendation.strengths[0];
    const improvement = recommendation.focusAreas[0]?.message;
    if (strength) {
        aiInsightStrength.textContent =
            `จุดแข็ง: ${strength}`;
        aiInsightStrength.hidden = false;
    }
    if (improvement) {
        aiInsightImprovement.textContent =
            `ควรพัฒนา: ${improvement}`;
        aiInsightImprovement.hidden = improvement === recommendation.summary;
    }
    aiRecommendation.textContent =
        recommendation.recommendations.length
            ? recommendation.recommendations[0].message
            : "ฝึกต่อโดยเน้น Range of Motion และความสม่ำเสมอของการเคลื่อนไหว";

}

/* =========================================================
   BUTTONS
========================================================= */

startButton?.addEventListener(

    "click",

    async () => {

        await startSession();

    }

);

finishButton?.addEventListener(

    "click",

    () => {

        if (battleModeActive && !localBattleActive) {
            return;
        }

        if (localBattlePreparing || localBattleActive) {
            return;
        }

        if (!sessionActive) {
            return;
        }

        const duration =
            getSessionDuration();

        stopSession();

        generateResult(
            duration
        );

        showScreen(
            resultScreen
        );

    }

);

/* =========================================================
   INITIALIZE
========================================================= */

showScreen(
    homeScreen
);

resetLiveUI();

renderQuickStart();

updateHomeProgress();

ensureLocalBattleUI();

const battleUI = createBattleUI({
    screen: $("battle-screen"),
    showScreen,
    async onPrepare(state) {
        activeExerciseId = state.exerciseId;
        updateExerciseLabels();
        battleModeActive = true;
        if (finishButton) finishButton.disabled = true;
        const backButton = $("back-home");
        if (backButton) backButton.disabled = true;
        const success = await enterWorkout();
        onlinePreparation.arm();
        return success;
    },
    onStart() {
        if (sessionActive && battleModeActive) beginWorkout();
    },
    onCancel() {
        battleModeActive = false;
        $("back-home").disabled = false;
        stopSession();
        showScreen($("battle-screen"));
    },
    onResult(state) {
        if (sessionActive) {
            const duration = getSessionDuration();
            stopSession();
            generateResult(duration);
        }
        battleModeActive = false;
        if (finishButton) finishButton.disabled = false;
        const backButton = $("back-home");
        if (backButton) backButton.disabled = false;
        showScreen($("battle-screen"));
    }
});

const advanced = document.createElement('details');
advanced.className = 'advanced-metrics';
const advancedSummary = document.createElement('summary');
advancedSummary.textContent = 'รายละเอียดการเคลื่อนไหว';
advanced.append(advancedSummary);
const metricsPanel = document.querySelector('.live-metrics');
metricsPanel.before(advanced);
advanced.append(metricsPanel);
const cameraOptions = document.createElement('details');
cameraOptions.className = 'workout-options';
const cameraOptionsSummary = document.createElement('summary');
cameraOptionsSummary.textContent = 'โครงร่างและความเป็นส่วนตัว';
cameraOptions.append(cameraOptionsSummary);
document.querySelectorAll('.workout-controls .skeleton-control').forEach(label => cameraOptions.append(label));
advanced.before($("exercise-guide"), $("workout-preparation"), $("workout-targets"), cameraOptions, document.querySelector('.workout-controls'));
initializePreferences();
updateWorkoutControls();

/* =========================================================
   HOME DASHBOARD NAVIGATION
========================================================= */

function openJumpingJack() {

    activeExerciseId =
        "jumping-jack";

    updateExerciseLabels();

    enterWorkout();

}

function openSquat() {
    activeExerciseId = "squat";
    updateExerciseLabels();
    enterWorkout();
}

function openLunge() {
    activeExerciseId = "lunge";
    updateExerciseLabels();
    enterWorkout();
}

function openBicepCurl() {
    activeExerciseId = "bicep-curl";
    updateExerciseLabels();
    enterWorkout();
}

function openSixSeven() {
    activeExerciseId = "six-seven";
    updateExerciseLabels();
    enterWorkout();
}

function updateExerciseLabels() {
    const names = {
        "jumping-jack": "Jumping Jack",
        squat: "Squat",
        "push-up": "Push-up",
        lunge: "Lunge",
        "bicep-curl": "Bicep Curl",
        "six-seven": "Six Seven (67) Challenge"
    };
    const name = names[activeExerciseId]
        || names["jumping-jack"];

    if (repExerciseLabel) {
        repExerciseLabel.textContent = name;
    }

    if (exerciseNameElement) {
        exerciseNameElement.textContent = name;
    }

    if (resultExerciseName) {
        resultExerciseName.textContent =
            name.toUpperCase();
    }

    if (cameraHintElement) {
        cameraHintElement.textContent = activeExerciseId === "six-seven"
            ? "จัดกล้องให้เห็นศีรษะถึงเอว และมือทั้งสองข้างตลอดท่า"
            : cameraHintElement.dataset.defaultText ||
                "ยืนให้เห็นศีรษะถึงเท้า";
    }

    if (liveLeftAngleLabel) {
        liveLeftAngleLabel.textContent = activeExerciseId === "six-seven"
            ? "ระดับข้อมือซ้าย"
            : activeExerciseId === "squat"
            || activeExerciseId === "lunge"
            ? "เข่าซ้าย"
            : activeExerciseId === "push-up"
                || activeExerciseId === "bicep-curl"
                ? "ข้อศอกซ้าย"
                : "แขนซ้าย";
    }

    if (liveRightAngleLabel) {
        liveRightAngleLabel.textContent = activeExerciseId === "six-seven"
            ? "ระดับข้อมือขวา"
            : activeExerciseId === "squat"
            || activeExerciseId === "lunge"
            ? "เข่าขวา"
            : activeExerciseId === "push-up"
                || activeExerciseId === "bicep-curl"
                ? "ข้อศอกขวา"
                : "แขนขวา";
    }

    const rangeTitle = $("live-rom-title");
    const firstMetricLabel = $("live-arm-rom-label");
    const secondMetricLabel = $("live-leg-rom-label");
    const symmetryTitle = $("live-symmetry-title");
    if (activeExerciseId === "six-seven") {
        if (!sixSevenLabelSnapshot) {
            sixSevenLabelSnapshot = [
                rangeTitle,
                firstMetricLabel,
                secondMetricLabel,
                symmetryTitle
            ].map(element => element?.textContent ?? "");
        }

        if (rangeTitle) rangeTitle.textContent = "Challenge Quality";
        if (firstMetricLabel) firstMetricLabel.textContent = "การสลับระดับ";
        if (secondMetricLabel) secondMetricLabel.textContent = "จังหวะ";
        if (symmetryTitle) symmetryTitle.textContent = "Level Symmetry";
    }
    else if (sixSevenLabelSnapshot) {
        [
            rangeTitle,
            firstMetricLabel,
            secondMetricLabel,
            symmetryTitle
        ].forEach((element, index) => {
            if (element) {
                element.textContent = sixSevenLabelSnapshot[index];
            }
        });
        sixSevenLabelSnapshot = null;
    }

    updateLiveMetricLabels();
}

function updateLiveMetricLabels() {
    const metricLabels = {
        "jumping-jack": ["การเคลื่อนไหวแขน", "การเคลื่อนไหวขา", "สมดุลซ้าย–ขวา"],
        squat: ["ความลึก", "มุมเข่า", "สมดุลซ้าย–ขวา"],
        "push-up": ["ความลึก", "แนวลำตัว", "มุมข้อศอก"],
        lunge: ["ความลึก", "มุมเข่า", "การทรงตัว"],
        "bicep-curl": ["การเคลื่อนไหว", "ความมั่นคง", "ความเร็ว"],
        "six-seven": ["การสลับระดับ", "จังหวะ", "สมดุลระดับมือ"]
    };
    const labels = metricLabels[activeExerciseId]
        || metricLabels["jumping-jack"];

    if (liveMetricsExercise) {
        liveMetricsExercise.textContent = getExerciseDisplayName(
            activeExerciseId
        );
    }

    if (liveMetricOneLabel) {
        liveMetricOneLabel.textContent = labels[0];
    }

    if (liveMetricTwoLabel) {
        liveMetricTwoLabel.textContent = labels[1];
    }

    if (liveMetricThreeLabel) {
        liveMetricThreeLabel.textContent = labels[2];
    }
}

function updateLiveMetricValues(metrics) {
    const now = performance.now();
    if (now - lastMetricsUIAt < 100) return;
    lastMetricsUIAt = now;
    if (!metrics) {
        return;
    }

    const values = {
        "jumping-jack": [metrics.armROM, metrics.legROM, metrics.symmetry],
        squat: [metrics.depth, metrics.kneeAngle, metrics.symmetry],
        "push-up": [metrics.depth, metrics.alignment, metrics.elbowAngle],
        lunge: [metrics.depth, metrics.kneeAngle, metrics.alignment],
        "bicep-curl": [metrics.rom, metrics.stability, metrics.speed],
        "six-seven": [
            metrics.alternation,
            metrics.rhythm,
            metrics.symmetry
        ]
    }[activeExerciseId] || [];

    const elements = [liveMetricOne, liveMetricTwo, liveMetricThree];

    elements.forEach((element, index) => {
        if (!element) {
            return;
        }

        const value = values[index];
        setText(element, formatLiveMetricValue(value, activeExerciseId, index));
    });
}

function renderExerciseLibrary() {
    if (!exerciseLibrary) {
        return;
    }

    const movementMetricLabels = {
        armROM: "การเคลื่อนไหวแขน",
        legROM: "การเคลื่อนไหวขา",
        kneeAngle: "มุมเข่า",
        elbowAngle: "มุมข้อศอก",
        depth: "ความลึก",
        alignment: "แนวลำตัว",
        stability: "ความมั่นคง",
        rom: "ช่วงการเคลื่อนไหว",
        speed: "ความเร็ว",
        alternation: "การสลับระดับ",
        rhythm: "จังหวะ",
        symmetry: "สมดุลซ้าย–ขวา"
    };

    const descriptions = {
        "jumping-jack": "คาร์ดิโอทั่วร่างกาย",
        squat: "เสริมความแข็งแรงช่วงล่าง",
        "push-up": "เสริมความแข็งแรงช่วงบน",
        lunge: "ช่วงล่างและการทรงตัว",
        "bicep-curl": "เสริมความแข็งแรงแขน",
        "six-seven": "ชาเลนจ์ประสานแขน สลับระดับข้อมือซ้าย–ขวา"
    };

    exerciseLibrary.textContent = "";

    getAvailableWorkoutExercises().forEach(exercise => {
        const card = document.createElement("article");
        card.className = "library-card";
        card.dataset.exerciseId = exercise.id;
        card.dataset.category = exercise.category;
        card.dataset.body = ["jumping-jack", "lunge"].includes(exercise.id)
            ? "full-body"
            : "";
        card.dataset.name = exercise.name.toLowerCase();

        const image = document.createElement("img");
        image.className = "library-image";
        image.alt = `${exercise.name} Exercise`;
        image.loading = "lazy";
        image.decoding = "async";
        setImageWithFallback(image, mediaAssets.exercises[exercise.id]);

        const content = document.createElement("div");
        content.className = "library-content";

        const top = document.createElement("div");
        top.className = "library-top";

        const category = document.createElement("span");
        category.className = "library-category";
        category.textContent = exercise.category.toUpperCase();

        const status = document.createElement("span");
        status.className = exercise.available
            ? "available-badge"
            : "coming-badge";
        status.textContent = exercise.available
            ? "พร้อมฝึก"
            : "COMING SOON";
        top.append(category, status);

        const title = document.createElement("h3");
        title.textContent = exercise.name;

        const description = document.createElement("p");
        description.textContent = descriptions[exercise.id] || "Exercise";

        const metricDefinitions = getMovementMetricDefinitions(exercise.id)
            .filter(definition => definition.key !== "quality")
            .slice(0, 4);
        const metricList = document.createElement("ul");
        metricList.className = "library-metrics";
        metricList.setAttribute("aria-label", "สิ่งที่ MoveWise ตรวจ");
        metricDefinitions.forEach(definition => {
            const item = document.createElement("li");
            item.textContent =
                movementMetricLabels[definition.key] || definition.label;
            metricList.appendChild(item);
        });

        content.append(top, title, description);
        if (metricDefinitions.length) {
            const metricHeading = document.createElement("span");
            metricHeading.className = "library-metrics-heading";
            metricHeading.textContent = "MoveWise ตรวจดู";
            content.append(metricHeading, metricList);
        }

        const action = document.createElement("button");
        action.className = exercise.available
            ? "library-start"
            : "library-start disabled";
        action.type = "button";
        action.dataset.exercise = exercise.id;
        action.disabled = !exercise.available;
        action.textContent = exercise.available ? "เริ่ม →" : "เตรียมระบบ";

        const guide = document.createElement("details");
        guide.className = "library-guide";
        const summary = document.createElement("summary");
        summary.textContent = "วิธีฝึกและตำแหน่งกล้อง";
        const guideContent = document.createElement("div");
        renderExerciseGuide(guideContent, exercise.id);
        guide.append(summary, guideContent);
        content.append(guide);
        card.append(image, content, action);
        exerciseLibrary.appendChild(card);
    });

}

function setImageWithFallback(image, asset) {
    if (!asset) {
        image.hidden = true;
        return;
    }

    let fallbackApplied = false;
    image.addEventListener("error", () => {
        if (fallbackApplied || !asset.fallback) {
            image.hidden = true;
            return;
        }

        fallbackApplied = true;
        image.src = asset.fallback;
    });
    image.src = asset.image || asset.fallback;
}

function formatLiveMetricValue(value, exerciseId, index) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return "--";
    }

    const angleMetric =
        (exerciseId === "squat" && index === 1) ||
        (exerciseId === "push-up" && index === 2) ||
        (exerciseId === "lunge" && index === 1);

    if (exerciseId === "bicep-curl" && index === 2) {
        return value.toFixed(2);
    }

    return `${Math.round(value)}${angleMetric ? "°" : "%"}`;
}

$("recommended-start")?.addEventListener(
    "click",
    openJumpingJack
);

$("home-profile-button")?.addEventListener(
    "click",
    openProfilePage
);

$("workspace-profile-button")?.addEventListener(
    "click",
    openProfilePage
);

$("rail-profile-button")?.addEventListener(
    "click",
    openProfilePage
);

$("home-battle-button")?.addEventListener(
    "click",
    () => {
        showScreen($("battle-screen"));
        setActiveNavigation("battle");
    }
);

$("desktop-coach-start")?.addEventListener(
    "click",
    openJumpingJack
);

// One navigation handler avoids repeated page rendering per click.
document.addEventListener("click", event => {
    const button = event.target.closest("button[data-nav]");
    if (!button) return;
    const routes = { home: () => showScreen(homeScreen), analyze: openAnalyzePage,
        progress: openProgressPage, profile: openProfilePage, battle: () => battleUI.open() };
    routes[button.dataset.nav]?.();
});
document.querySelector(".sidebar-brand")?.addEventListener("click", event => { event.preventDefault(); showScreen(homeScreen); });
document.querySelector(".skip-link")?.addEventListener("click", event => { event.preventDefault(); document.querySelector(".screen.active")?.focus(); });

const analyzeScreen =
    $("analyze-screen");

function openAnalyzePage() {

    showScreen(
        analyzeScreen
    );

    setActiveNavigation(
        "analyze"
    );

}

$("activity-start-exercise")?.addEventListener(
    "click",
    openAnalyzePage
);

if (homeHeroImage) {
    homeHeroImage.loading = "eager";
    homeHeroImage.fetchPriority = "high";
    homeHeroImage.decoding = "async";
    setImageWithFallback(homeHeroImage, mediaAssets.hero);
}

renderExerciseLibrary();
updateExerciseLabels();

$("history-exercise").replaceChildren(new Option("ทุกท่า", ""), ...getAvailableWorkoutExercises().map(exercise => new Option(exercise.name, exercise.id)));
$("history-exercise").addEventListener("change", renderProgressPage);
$("history-period").addEventListener("change", renderProgressPage);

function openProgressPage() {
    showScreen(progressScreen);
    renderProgressPage();
    setActiveNavigation("progress");
}

function openProfilePage() {
    showScreen(profileScreen);
    renderProfilePage();
    setActiveNavigation("profile");
}

$("daily-goal-decrease")?.addEventListener(
    "click",
    () => changeDailyGoal(-5)
);

$("daily-goal-increase")?.addEventListener(
    "click",
    () => changeDailyGoal(5)
);

$("session-report-back")?.addEventListener("click", openProgressPage);

function setActiveNavigation(
    navName
) {

    document
        .querySelectorAll(
            ".bottom-nav-item, .sidebar-nav-item"
        )
        .forEach(
            item => {

                item.classList.toggle(

                    "active",

                    item.dataset.nav ===
                    navName

                );

            }
        );

}

/* ---------------------------------------------------------
   OPEN JUMPING JACK
--------------------------------------------------------- */

document
    .querySelectorAll(
        '[data-exercise="jumping-jack"]'
    )
    .forEach(
        button => {

            button.addEventListener(

                "click",

                () => {

                    activeExerciseId =
                        "jumping-jack";

                    updateExerciseLabels();

                    setActiveNavigation(
                        "analyze"
                    );

                    enterWorkout();

                }

            );

        }
    );

document
    .querySelectorAll(
        '[data-exercise="squat"]'
    )
    .forEach(
        button => {
            button.addEventListener(
                "click",
                () => {
                    setActiveNavigation("analyze");
                    openSquat();
                }
            );
        }
    );

document
    .querySelectorAll(
        '[data-exercise="push-up"]'
    )
    .forEach(
        button => {
            button.addEventListener(
                "click",
                () => {
                    activeExerciseId = "push-up";
                    updateExerciseLabels();
                    setActiveNavigation("analyze");
                    enterWorkout();
                }
            );
        }
    );

document
    .querySelectorAll(
        '[data-exercise="lunge"]'
    )
    .forEach(
        button => {
            button.addEventListener(
                "click",
                () => {
                    setActiveNavigation("analyze");
                    openLunge();
                }
            );
        }
    );

document
    .querySelectorAll(
        '[data-exercise="bicep-curl"]'
    )
    .forEach(
        button => {
            button.addEventListener(
                "click",
                () => {
                    setActiveNavigation("analyze");
                    openBicepCurl();
                }
            );
        }
    );

document
    .querySelectorAll(
        '[data-exercise="six-seven"]'
    )
    .forEach(
        button => {
            button.addEventListener(
                "click",
                () => {
                    setActiveNavigation("analyze");
                    openSixSeven();
                }
            );
        }
    );

/* ---------------------------------------------------------
   BACK HOME
--------------------------------------------------------- */

$("analyze-back-home")?.addEventListener(

    "click",

    () => {

        showScreen(
            homeScreen
        );

        setActiveNavigation(
            "home"
        );

    }

);

/* ---------------------------------------------------------
   FILTER
--------------------------------------------------------- */

const exerciseFilters =
    document.querySelectorAll(
        ".exercise-filter"
    );

let selectedCategory = "all";
const exerciseSearch = $("exercise-search-input");
const workspaceSearch = $("workspace-search-input");
function filterExercises(category = selectedCategory) {
    selectedCategory = category;
    let visible = 0;
    exerciseLibrary.querySelectorAll(".library-card").forEach(card => {
        const exercise = getExerciseById(card.dataset.exerciseId);
        const matches = exercise && matchesExercise(exercise, exerciseSearch.value, selectedCategory);
        card.hidden = !matches;
        if (matches) visible++;
    });
    exerciseFilters.forEach(button => {
        const active = button.dataset.filter === category;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
    updateNoResult(visible);
}
exerciseFilters.forEach(button => button.addEventListener("click", () => filterExercises(button.dataset.filter)));
exerciseSearch?.addEventListener("input", () => filterExercises());
workspaceSearch?.addEventListener("focus", () => {
    if (!analyzeScreen.classList.contains("active")) {
        openAnalyzePage();
        workspaceSearch.focus({ preventScroll: true });
    }
});
workspaceSearch?.addEventListener("input", () => {
    exerciseSearch.value = workspaceSearch.value;
    filterExercises();
});
document.addEventListener("keydown", event => {
    if (event.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        openAnalyzePage();
        exerciseSearch.focus();
    }
});

function updateNoResult(
    count
) {

    const element =
        $("no-exercise-result");

    if (!element) {
        return;
    }

    element.style.display =

        count === 0
            ? "block"
            : "none";

}

/* ---------------------------------------------------------
   HOME → ANALYZE
--------------------------------------------------------- */

$("view-all-exercises")?.addEventListener(

    "click",

    openAnalyzePage

);

// Sidebar shortcuts use the same registry and workout preparation as the library.
document.querySelectorAll(".sidebar-exercises .sidebar-nav-item").forEach(button => {
    const exercise = getAvailableWorkoutExercises().find(item => button.textContent.trim() === item.name);
    if (exercise) button.addEventListener("click", () => {
        activeExerciseId = exercise.id;
        updateExerciseLabels();
        enterWorkout();
    });
});

document.body.dataset.initialized = "true";
