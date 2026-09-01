import {
    initializePoseDetector,
    detectPose,
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
    createExerciseAnalyzer
} from "./src/exercises/exerciseRegistry.js";

import {
    createSession
} from "./src/core/session.js";

import {
    saveSession
} from "./src/core/storage.js";

import {
    getSessions
} from "./src/core/storage.js";

import {
    generateRecommendation
} from "./src/ai/recommendation/recommendation.js";

import {
    getProgressSummary
} from "./src/core/progress.js";


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
    $("progress-screen");


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

const finishButton =
    $("finish-exercise");


const repElement =
    $("rep");

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

const homeSessions =
    $("home-sessions");

const homeTotalReps =
    $("home-total-reps");

const homeAverageQuality =
    $("home-average-quality");

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
    $("progress-empty-state");

const progressAIInsight =
    $("progress-ai-insight");


/* =========================================================
   AI
========================================================= */

let running = false;

let sessionActive = false;

let lastVideoTime = -1;


/* =========================================================
   TIMER
========================================================= */

let timerInterval = null;

let sessionStartTime = null;

let sessionSaved = false;


/* =========================================================
   REP
========================================================= */

/* =========================================================
   SESSION DATA
========================================================= */

let sessionROMValues = [];

let sessionSymmetryValues = [];


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

const REQUIRED_LANDMARKS = [

    11,
    12,

    15,
    16,

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

let activeExerciseId =
    "jumping-jack";


function getActiveExerciseAnalyzer() {
    return activeExerciseId === "squat"
        ? squatAnalyzer
        : jumpingJackAnalyzer;
}


/* =========================================================
   SCREEN
========================================================= */

function showScreen(screen) {

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

}


/* =========================================================
   NAVIGATION
========================================================= */

$("jumping-jack-card")?.addEventListener(

    "click",

    () => {

        showScreen(
            exerciseScreen
        );

        prepareExercise();

    }

);


$("back-home")?.addEventListener(

    "click",

    () => {

        stopSession();

        showScreen(
            homeScreen
        );

    }

);


$("home-button")?.addEventListener(

    "click",

    () => {

        stopSession();

        showScreen(
            homeScreen
        );

    }

);


$("again-button")?.addEventListener(

    "click",

    () => {

        showScreen(
            exerciseScreen
        );

        prepareExercise();

    }

);


/* =========================================================
   UI
========================================================= */

function setStatus(
    text,
    tracking = false
) {

    if (!status) {
        return;
    }


    status.innerHTML =

        tracking

            ? `<span class="live-dot"></span>${text}`

            : text;

}


function setCoach(
    title,
    message
) {

    if (formElement) {

        formElement.textContent =
            title;

    }


    if (feedbackElement) {

        feedbackElement.textContent =
            message;

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

        formScoreElement.textContent =
            `${score}%`;

    }


    if (scoreBar) {

        scoreBar.style.width =
            `${score}%`;

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
            "กำลังยืนขึ้น"

    };


    if (movementStateElement) {

        movementStateElement.textContent =
            labels[
                getActiveExerciseAnalyzer()
                    .getState().state
            ];

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

    sessionStartTime =
        Date.now();


    timerInterval =
        setInterval(

            () => {

                if (!sessionStartTime) {
                    return;
                }


                const elapsed =
                    Math.floor(

                        (
                            Date.now() -
                            sessionStartTime
                        ) / 1000

                    );


                if (timerElement) {

                    timerElement.textContent =
                        formatTime(
                            elapsed
                        );

                }

            },

            1000

        );

}


function stopTimer() {

    if (timerInterval) {

        clearInterval(
            timerInterval
        );

        timerInterval =
            null;

    }

}


function getSessionDuration() {

    if (!sessionStartTime) {
        return 0;
    }


    return Math.floor(

        (
            Date.now() -
            sessionStartTime
        ) / 1000

    );

}


/* =========================================================
   AI INITIALIZATION
========================================================= */

async function initializeAI() {

    try {

        setStatus(
            "กำลังโหลด AI..."
        );


        setCoach(

            "กำลังเตรียมระบบ",

            "กำลังโหลด AI สำหรับวิเคราะห์การเคลื่อนไหว"

        );


        await initializePoseDetector();


        console.log(
            "MoveWise AI initialized"
        );


        setStatus(
            "AI พร้อมทำงาน"
        );


        setCoach(

            "พร้อมใช้งาน",

            "เลือก Jumping Jack เพื่อเริ่มการฝึก"

        );

    }

    catch (error) {

        console.error(
            error
        );


        setStatus(
            "โหลด AI ไม่สำเร็จ"
        );


        setCoach(

            "ไม่สามารถโหลด AI ได้",

            "ตรวจสอบ model และ Console"

        );

    }

}


/* =========================================================
   RESET
========================================================= */

function resetSessionData() {

    jumpingJackAnalyzer.reset();

    squatAnalyzer.reset();

    sessionSaved =
        false;

    sessionROMValues =
        [];

    sessionSymmetryValues =
        [];


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


    resetSessionData();


    if (poseStatus) {

        poseStatus.textContent =
            "--";

    }


    if (confidenceElement) {

        confidenceElement.textContent =
            "--";

    }


    setStatus(
        "AI พร้อมทำงาน"
    );


    setCoach(

        "พร้อมเริ่ม",

        "กดปุ่มเพื่อเริ่มการวิเคราะห์ด้วย AI"

    );


    if (startButton) {

        startButton.disabled =
            false;

        startButton.textContent =
            "▶ เริ่มการวิเคราะห์ด้วย AI";

    }


    clearCanvas();

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


/* =========================================================
   CAMERA
========================================================= */

async function startSession() {

    if (sessionActive) {
        return;
    }


    try {

        await initializeCamera(video);


        syncCanvasSize();


        sessionActive =
            true;


        running =
            true;


        startButton.disabled =
            true;


        startButton.textContent =
            "AI กำลังวิเคราะห์";


        startTimer();


        setStatus(

            "กำลังตรวจจับร่างกาย",

            true

        );


        setCoach(

            "กำลังตรวจจับ",

            "ยืนให้เห็นร่างกายเต็มตัวหน้ากล้อง"

        );


        requestAnimationFrame(
            predict
        );

    }

    catch (error) {

        console.error(
            "Camera error:",
            error
        );


        setStatus(
            "เปิดกล้องไม่ได้"
        );


        setCoach(

            "เปิดกล้องไม่สำเร็จ",

            error.message

        );


        startButton.disabled =
            false;

    }

}


function stopSession() {

    running =
        false;

    sessionActive =
        false;


    stopTimer();


    stopCamera(video);


    clearCanvas();


    if (startButton) {

        startButton.disabled =
            false;

        startButton.textContent =
            "▶ เริ่มการวิเคราะห์ด้วย AI";

    }

}


/* =========================================================
   FULL BODY
========================================================= */

function checkFullBody(
    landmarks
) {

    for (
        const index
        of REQUIRED_LANDMARKS
    ) {

        const point =
            landmarks[index];


        if (!point) {

            return false;

        }


        if (

            point.visibility !== undefined

            &&

            point.visibility <
            CONFIG.fullBodyVisibility

        ) {

            return false;

        }

    }


    return true;

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
        of REQUIRED_LANDMARKS
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

function calculateAngle(
    a,
    b,
    c
) {

    if (
        !a ||
        !b ||
        !c
    ) {

        return 0;

    }


    const radians =

        Math.atan2(
            c.y - b.y,
            c.x - b.x
        )

        -

        Math.atan2(
            a.y - b.y,
            a.x - b.x
        );


    let angle =

        Math.abs(
            radians *
            180 /
            Math.PI
        );


    if (
        angle > 180
    ) {

        angle =
            360 -
            angle;

    }


    return angle;

}


/* =========================================================
   ARM
========================================================= */

function calculateArmAngles(
    landmarks
) {

    return {

        left:
            calculateAngle(

                landmarks[11],
                landmarks[13],
                landmarks[15]

            ),

        right:
            calculateAngle(

                landmarks[12],
                landmarks[14],
                landmarks[16]

            )

    };

}


/* =========================================================
   LEG
========================================================= */

function calculateLegAngles(
    landmarks
) {

    return {

        left:
            calculateAngle(

                landmarks[23],
                landmarks[25],
                landmarks[27]

            ),

        right:
            calculateAngle(

                landmarks[24],
                landmarks[26],
                landmarks[28]

            )

    };

}


/* =========================================================
   SYMMETRY
========================================================= */

function calculateSymmetry(
    left,
    right
) {

    const max =
        Math.max(

            Math.abs(left),
            Math.abs(right),
            1

        );


    const difference =
        Math.abs(
            left -
            right
        );


    return Math.max(

        0,

        Math.min(

            100,

            100 -
            (
                difference /
                max
            ) * 100

        )

    );

}


/* =========================================================
   ARM ROM
========================================================= */

function calculateArmROM(
    left,
    right
) {

    const average =
        (
            left +
            right
        ) / 2;


    const score =

        (

            (
                average -
                CONFIG.armClosedTarget
            )

            /

            (
                CONFIG.armOpenTarget -
                CONFIG.armClosedTarget
            )

        ) * 100;


    return Math.max(

        0,

        Math.min(
            100,
            score
        )

    );

}


/* =========================================================
   LEG ROM
========================================================= */

function calculateLegROM(
    footWidth,
    shoulderWidth
) {

    if (
        shoulderWidth <= 0
    ) {

        return 0;

    }


    const ratio =
        footWidth /
        shoulderWidth;


    const score =

        (

            (
                ratio -
                CONFIG.legClosedTarget
            )

            /

            (
                CONFIG.legOpenTarget -
                CONFIG.legClosedTarget
            )

        ) * 100;


    return Math.max(

        0,

        Math.min(
            100,
            score
        )

    );

}


/* =========================================================
   MOVEMENT ANALYSIS
========================================================= */

function analyzeMovementMetrics(
    landmarks,
    movement
) {

    const arms =
        calculateArmAngles(
            landmarks
        );


    const legs =
        calculateLegAngles(
            landmarks
        );


    const armROM =
        calculateArmROM(

            arms.left,
            arms.right

        );


    const legROM =
        calculateLegROM(

            movement.footWidth,
            movement.shoulderWidth

        );


    const armSymmetry =
        calculateSymmetry(

            arms.left,
            arms.right

        );


    const legSymmetry =
        calculateSymmetry(

            legs.left,
            legs.right

        );


    const symmetry =

        (
            armSymmetry +
            legSymmetry
        ) / 2;


    const quality =

        (
            armROM +
            legROM +
            symmetry
        ) / 3;


    return {

        leftArmAngle:
            Math.round(
                arms.left
            ),

        rightArmAngle:
            Math.round(
                arms.right
            ),

        leftLegAngle:
            Math.round(
                legs.left
            ),

        rightLegAngle:
            Math.round(
                legs.right
            ),

        armROM:
            Math.round(
                armROM
            ),

        legROM:
            Math.round(
                legROM
            ),

        symmetry:
            Math.round(
                symmetry
            ),

        quality:
            Math.round(
                quality
            )

    };

}


function updateMovementMetrics(
    metrics,
    movement
) {

    currentMovementMetrics =
        metrics;


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


        sessionROMValues.push(
            rom
        );


        sessionSymmetryValues.push(
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

    if (!metrics) {
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
        liveROM.textContent = "--%";
    }

    if (liveROMBar) {
        liveROMBar.style.width = "0%";
    }

    if (liveArmROM) {
        liveArmROM.textContent = "--%";
    }

    if (liveLegROM) {
        liveLegROM.textContent = "--%";
    }

    if (liveSymmetry) {
        liveSymmetry.textContent = "--%";
    }

    if (liveSymmetryBar) {
        liveSymmetryBar.style.width = "0%";
    }

    if (liveLeftAngle) {
        liveLeftAngle.textContent = "--°";
    }

    if (liveRightAngle) {
        liveRightAngle.textContent = "--°";
    }

    if (liveQuality) {
        liveQuality.textContent = "--";
    }

    if (liveQualityLabel) {
        liveQualityLabel.textContent =
            "รอการวิเคราะห์";
    }

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


function processJumpingJack(
    data
) {
    const result =
        jumpingJackAnalyzer.process(
            data,
            currentMovementMetrics
        );

    updateScore(result.score);

    setCoach(
        result.feedback.title,
        result.feedback.message
    );

    if (
        result.repCompleted &&
        repElement
    ) {
        repElement.textContent =
            result.repetitions;

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
        kneeAngle: Math.round(movement.kneeAngle)
    };

    currentMovementMetrics = metrics;
    sessionROMValues.push(metrics.legROM);
    sessionSymmetryValues.push(metrics.symmetry);
    updateMovementIntelligenceUI(metrics);

    const result = squatAnalyzer.process(
        movement,
        metrics
    );

    updateScore(result.score);
    setCoach(
        result.feedback.type,
        result.feedback.message
    );

    if (
        result.repCompleted &&
        repElement
    ) {
        repElement.textContent =
            result.repetitions;

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
    landmarks
) {

    if (
        !landmarks ||
        !landmarks.length
    ) {

        clearCanvas();

        return;

    }


    syncCanvasSize();


    ctx.clearRect(

        0,
        0,
        canvas.width,
        canvas.height

    );


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


    ctx.strokeStyle =
        "#ffffff";


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


        ctx.fillStyle =
            "#ffffff";


        ctx.shadowColor =
            "rgba(0,0,0,.7)";


        ctx.shadowBlur =
            4;


        ctx.fill();

    }


    ctx.restore();

}


/* =========================================================
   AI LOOP
========================================================= */

function predict() {

    if (!running) {
        return;
    }


    if (!getPoseDetectorStatus().ready) {

        requestAnimationFrame(
            predict
        );

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


        try {

            results =
                detectPose(

                    video,

                    performance.now()

                );

        }

        catch (error) {

            console.error(
                "Pose error:",
                error
            );


            requestAnimationFrame(
                predict
            );

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

                confidenceElement.textContent =
                    `${confidence}%`;

            }


            const fullBody =
                checkFullBody(
                    landmarks
                );


            /*
               ถ้ายังเห็นตัวไม่ครบ
               Skeleton ยังแสดง
            */

            if (!fullBody) {

                setStatus(
                    "ต้องเห็นร่างกายเต็มตัว"
                );


                if (poseStatus) {

                    poseStatus.textContent =
                        "ตรวจจับไม่ครบ";

                }


                setCoach(

                    "จัดตำแหน่งร่างกาย",

                    "ถอยออกจากกล้อง ให้เห็นตั้งแต่ศีรษะถึงเท้า"

                );


                updateScore(
                    0
                );


                getActiveExerciseAnalyzer()
                    .resetMovementState();


                updateMovementState();


                requestAnimationFrame(
                    predict
                );


                return;

            }


            /*
               Full Body
            */

            setStatus(

                "AI กำลังติดตาม",

                true

            );


            if (poseStatus) {

                poseStatus.textContent =
                    "ตรวจจับครบ ✓";

            }


            if (activeExerciseId === "squat") {
                processSquat(
                    squatAnalyzer.analyze(landmarks)
                );
            }
            else {
                const movement =
                    analyzeJumpingJack(
                        landmarks
                    );

                const metrics =
                    analyzeMovementMetrics(
                        landmarks,
                        movement
                    );

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

            setStatus(
                "ยังไม่พบผู้ใช้งาน"
            );


            if (poseStatus) {

                poseStatus.textContent =
                    "ไม่พบ";

            }


            if (confidenceElement) {

                confidenceElement.textContent =
                    "--";

            }


            setCoach(

                "พร้อมใช้งาน",

                "ยืนอยู่หน้ากล้องเพื่อเริ่มการวิเคราะห์"

            );


            updateScore(
                0
            );


            resetLiveUI();


            getActiveExerciseAnalyzer()
                .resetMovementState();


            updateMovementState();


            clearCanvas();

        }

    }


    requestAnimationFrame(
        predict
    );

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

        return 100;

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
    const summary =
        getProgressSummary();

    if (homeSessions) {
        homeSessions.textContent =
            summary.totalSessions;
    }

    if (homeTotalReps) {
        homeTotalReps.textContent =
            summary.totalRepetitions;
    }

    if (homeAverageQuality) {
        homeAverageQuality.textContent =
            summary.averageQuality === null
                ? "--"
                : `${summary.averageQuality}%`;
    }
}


function renderProgressPage() {
    const summary =
        getProgressSummary();
    const sessions =
        getSessions();
    const currentSession =
        sessions.length
            ? sessions[sessions.length - 1]
            : null;
    const recommendation =
        generateRecommendation(
            currentSession,
            sessions.slice(0, -1)
        );

    if (progressTotalSessions) {
        progressTotalSessions.textContent =
            summary.totalSessions;
    }

    if (progressTotalReps) {
        progressTotalReps.textContent =
            summary.totalRepetitions;
    }

    if (progressAverageQuality) {
        progressAverageQuality.textContent =
            summary.averageQuality === null
                ? "--"
                : `${summary.averageQuality}%`;
    }

    if (progressAverageAccuracy) {
        progressAverageAccuracy.textContent =
            summary.averageAccuracy === null
                ? "--"
                : `${summary.averageAccuracy}%`;
    }

    if (progressBestQuality) {
        progressBestQuality.textContent =
            summary.bestQuality === null
                ? "--"
                : `${summary.bestQuality}%`;
    }

    if (progressAverageDuration) {
        progressAverageDuration.textContent =
            summary.averageDuration === null
                ? "--"
                : formatTime(summary.averageDuration);
    }

    if (progressRecentSessions) {
        progressRecentSessions.textContent = "";

        summary.recentSessions.forEach(session => {
            const item = document.createElement("li");
            item.textContent =
                `${session.exerciseId} · ${session.repetitions} reps · ${session.quality === null ? "--" : `${session.quality}%`}`;
            progressRecentSessions.appendChild(item);
        });
    }

    if (progressQualityTrend) {
        progressQualityTrend.textContent =
            summary.qualityTrend.length
                ? summary.qualityTrend
                    .map(item => `${item.quality}%`)
                    .join(" → ")
                : "--";
    }

    if (progressAIInsight) {
        progressAIInsight.textContent =
            recommendation.trend.status === "available"
                ? recommendation.summary
                : "ฝึกเพิ่มอีกเล็กน้อยเพื่อให้ระบบวิเคราะห์พัฒนาการของคุณได้แม่นยำขึ้น";
    }

    if (progressEmptyState) {
        progressEmptyState.style.display =
            summary.totalSessions === 0
                ? "block"
                : "none";
    }
}


/* =========================================================
   RESULT
========================================================= */

function generateResult(
    duration
) {

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

            0;


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

            0;


    if (
        !sessionSaved &&
        sessionStartTime &&
        exerciseState.repetitions > 0
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
            repRecords: exerciseState.repRecords
        });

        sessionSaved = saveSession(session);

        if (sessionSaved) {
            updateHomeProgress();
        }
    }


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
            `${quality}%`;

    }


    if (resultQualityBar) {

        resultQualityBar.style.width =
            `${quality}%`;

    }


    if (resultAccuracy) {

        resultAccuracy.textContent =
            `${accuracy}%`;

    }


    if (resultAccuracyBar) {

        resultAccuracyBar.style.width =
            `${accuracy}%`;

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

    const exerciseState =
        getActiveExerciseAnalyzer().getState();

    if (!exerciseState.repetitions) {
        aiInsightTitle.textContent =
            "ยังมีข้อมูลไม่เพียงพอ";
        aiInsight.textContent =
            "ยังมีข้อมูลไม่เพียงพอสำหรับวิเคราะห์พัฒนาการ";
        aiRecommendation.textContent =
            "เริ่มจากทำท่าช้า ๆ และยืนให้เห็นร่างกายเต็มตัว";
        return;
    }

    const currentSession = {
        id: "current-result",
        exerciseId: activeExerciseId,
        quality,
        accuracy,
        symmetry: currentMovementMetrics.symmetry,
        armROM: currentMovementMetrics.armROM,
        legROM: currentMovementMetrics.legROM,
        consistency
    };
    const history =
        getSessions().slice(0, -1);
    const recommendation =
        generateRecommendation(
            currentSession,
            history
        );

    aiInsightTitle.textContent =
        recommendation.priority || "AI Movement Insight";
    aiInsight.textContent =
        recommendation.summary;
    aiRecommendation.textContent =
        recommendation.recommendations.length
            ? recommendation.recommendations[0].message
            : "ฝึกต่อโดยเน้น Range of Motion และความสม่ำเสมอของการเคลื่อนไหว";

    return;

    if (!exerciseState.repetitions) {

        aiInsightTitle.textContent =
            "ยังมีข้อมูลไม่เพียงพอ";


        aiInsight.textContent =
            "ลองทำ Jumping Jack อย่างน้อย 1 ครั้ง เพื่อให้ AI วิเคราะห์การเคลื่อนไหว";


        aiRecommendation.textContent =
            "เริ่มจากทำท่าช้า ๆ และยืนให้เห็นร่างกายเต็มตัว";

        return;

    }


    if (
        currentMovementMetrics.symmetry < 85
    ) {

        aiInsightTitle.textContent =
            "การเคลื่อนไหวซ้าย–ขวายังไม่สมมาตร";


        aiInsight.textContent =
            `AI พบ Body Symmetry ${currentMovementMetrics.symmetry}%`;


        aiRecommendation.textContent =
            "พยายามให้แขนและขาทั้งสองข้างเคลื่อนไหวพร้อมกันและอยู่ในช่วงใกล้เคียงกัน";

        return;

    }


    if (
        currentMovementMetrics.armROM < 80
    ) {

        aiInsightTitle.textContent =
            "ช่วงการเคลื่อนไหวของแขนยังไม่เต็ม";


        aiInsight.textContent =
            `Arm ROM ล่าสุด ${currentMovementMetrics.armROM}%`;


        aiRecommendation.textContent =
            "ลองกางแขนให้สูงและเต็มช่วงมากขึ้น โดยไม่ต้องเร่งความเร็ว";

        return;

    }


    if (
        currentMovementMetrics.legROM < 80
    ) {

        aiInsightTitle.textContent =
            "ช่วงการกางขายังไม่เต็ม";


        aiInsight.textContent =
            `Leg ROM ล่าสุด ${currentMovementMetrics.legROM}%`;


        aiRecommendation.textContent =
            "ลองกางขาออกให้กว้างขึ้นเล็กน้อย แล้วกลับสู่ท่าเริ่มต้นอย่างควบคุม";

        return;

    }


    if (
        consistency < 85
    ) {

        aiInsightTitle.textContent =
            "ท่าดี แต่จังหวะยังไม่สม่ำเสมอ";


        aiInsight.textContent =
            `Movement Quality ${quality}% · Consistency ${consistency}%`;


        aiRecommendation.textContent =
            "ลดความเร็วลงเล็กน้อย และรักษาจังหวะการกาง–หุบให้ใกล้เคียงกันทุก Rep";

        return;

    }


    if (
        quality >= 90 &&
        accuracy >= 90
    ) {

        aiInsightTitle.textContent =
            "การเคลื่อนไหวของคุณอยู่ในระดับดีมาก";


        aiInsight.textContent =
            `ทำได้ ${exerciseState.repetitions} Reps · Quality ${quality}% · Accuracy ${accuracy}%`;


        aiRecommendation.textContent =
            "สามารถเพิ่มจำนวนครั้งหรือเพิ่มอีก 1 เซ็ตได้ โดยพยายามรักษา ROM และ Symmetry ให้ใกล้เคียงเดิม";

        return;

    }


    aiInsightTitle.textContent =
        "การเคลื่อนไหวอยู่ในระดับดี";


    aiInsight.textContent =
        `ทำได้ ${exerciseState.repetitions} Reps · Quality ${quality}% · Accuracy ${accuracy}%`;


    aiRecommendation.textContent =
        "ฝึกต่อโดยเน้น Range of Motion และความสม่ำเสมอของการเคลื่อนไหว";

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

updateHomeProgress();


initializeAI();

/* =========================================================
   HOME DASHBOARD NAVIGATION
========================================================= */

function openJumpingJack() {

    activeExerciseId =
        "jumping-jack";

    updateExerciseLabels();

    showScreen(exerciseScreen);

    prepareExercise();

}


function openSquat() {
    activeExerciseId = "squat";
    updateExerciseLabels();
    showScreen(exerciseScreen);
    prepareExercise();
}


function updateExerciseLabels() {
    const name = activeExerciseId === "squat"
        ? "Squat"
        : "Jumping Jack";

    if (exerciseNameElement) {
        exerciseNameElement.textContent = name;
    }

    if (resultExerciseName) {
        resultExerciseName.textContent =
            name.toUpperCase();
    }

    if (liveLeftAngleLabel) {
        liveLeftAngleLabel.textContent =
            activeExerciseId === "squat"
                ? "เข่าซ้าย"
                : "แขนซ้าย";
    }

    if (liveRightAngleLabel) {
        liveRightAngleLabel.textContent =
            activeExerciseId === "squat"
                ? "เข่าขวา"
                : "แขนขวา";
    }
}


$("home-jumping-jack")?.addEventListener(
    "click",
    openJumpingJack
);


$("recommended-start")?.addEventListener(
    "click",
    openJumpingJack
);


$("view-all-exercises")?.addEventListener(

    "click",

    () => {

        showScreen(exerciseScreen);

        prepareExercise();

    }

);


$("home-profile-button")?.addEventListener(

    "click",

    () => {

        alert(
            "Profile จะเปิดใช้งานในขั้นตอนถัดไป"
        );

    }

);


document
    .querySelectorAll(".bottom-nav-item")
    .forEach(button => {

        button.addEventListener(

            "click",

            () => {

                document
                    .querySelectorAll(
                        ".bottom-nav-item"
                    )
                    .forEach(item => {

                        item.classList.remove(
                            "active"
                        );

                    });


                button.classList.add(
                    "active"
                );


                const nav =
                    button.dataset.nav;


                if (
                    nav === "home"
                ) {

                    showScreen(
                        homeScreen
                    );

                }


if (nav === "analyze") {

    openAnalyzePage();

}


                if (
                    nav === "progress"
                ) {

                    openProgressPage();

                }


                if (
                    nav === "profile"
                ) {

                    alert(
                        "Profile จะเปิดใช้งานในขั้นตอนถัดไป"
                    );

                }

            }

        );

    });

    /* =========================================================
   ANALYZE / EXERCISE LIBRARY
========================================================= */

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


function openProgressPage() {
    showScreen(progressScreen);
    renderProgressPage();
    setActiveNavigation("progress");
}


function setActiveNavigation(
    navName
) {

    document
        .querySelectorAll(
            ".bottom-nav-item"
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

                    showScreen(
                        exerciseScreen
                    );


                    setActiveNavigation(
                        "analyze"
                    );


                    prepareExercise();

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


const libraryCards =
    document.querySelectorAll(
        ".library-card"
    );


exerciseFilters.forEach(

    filter => {

        filter.addEventListener(

            "click",

            () => {

                exerciseFilters
                    .forEach(
                        item => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                filter.classList.add(
                    "active"
                );


                const category =
                    filter.dataset.filter;


                filterExercises(
                    category
                );

            }

        );

    }

);


function filterExercises(
    category
) {

    let visible =
        0;


    libraryCards.forEach(

        card => {

            const matches =

                category === "all"

                ||

                card.dataset.category ===
                category;


            card.style.display =
                matches
                    ? "flex"
                    : "none";


            if (matches) {

                visible++;

            }

        }

    );


    updateNoResult(
        visible
    );

}


/* ---------------------------------------------------------
   SEARCH
--------------------------------------------------------- */

const exerciseSearch =
    $("exercise-search-input");


exerciseSearch?.addEventListener(

    "input",

    () => {

        const keyword =
            exerciseSearch.value
                .trim()
                .toLowerCase();


        let visible =
            0;


        libraryCards.forEach(

            card => {

                const name =
                    card.dataset.name ||
                    "";


                const matches =
                    name.includes(
                        keyword
                    );


                card.style.display =
                    matches
                        ? "flex"
                        : "none";


                if (matches) {

                    visible++;

                }

            }

        );


        updateNoResult(
            visible
        );

    }

);


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
   NAVIGATION FROM ANALYZE
--------------------------------------------------------- */

document
    .querySelectorAll(
        '#analyze-screen .bottom-nav-item'
    )
    .forEach(

        button => {

            button.addEventListener(

                "click",

                () => {

                    const nav =
                        button.dataset.nav;


                    setActiveNavigation(
                        nav
                    );


                    if (
                        nav === "home"
                    ) {

                        showScreen(
                            homeScreen
                        );

                    }


                    else if (
                        nav === "analyze"
                    ) {

                        openAnalyzePage();

                    }


                    else if (
                        nav === "progress"
                    ) {

                        openProgressPage();

                    }


                    else if (
                        nav === "profile"
                    ) {

                        alert(
                            "Profile — Phase ถัดไป"
                        );

                    }

                }

            );

        }

    );


/* ---------------------------------------------------------
   HOME → ANALYZE
--------------------------------------------------------- */

$("view-all-exercises")?.addEventListener(

    "click",

    openAnalyzePage

);


$("home-squat")?.addEventListener(
    "click",
    openSquat
);