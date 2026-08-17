import {
    PoseLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";


/* =========================================================
   MOVEWISE AI
   Full Demo + Session Intelligence

   HOME
      ↓
   JUMPING JACK
      ↓
   CAMERA + POSE
      ↓
   REP COUNTER
      ↓
   SESSION RESULT
      ↓
   AI INSIGHT
      ↓
   AI RECOMMENDATION
========================================================= */


/* =========================================================
   1. SCREEN
========================================================= */

const homeScreen =
    document.getElementById("home-screen");

const exerciseScreen =
    document.getElementById("exercise-screen");

const resultScreen =
    document.getElementById("result-screen");


function showScreen(screen) {

    document
        .querySelectorAll(".screen")
        .forEach(item => {

            item.classList.remove("active");

        });

    screen.classList.add("active");
}


/* =========================================================
   2. NAVIGATION
========================================================= */

const jumpingJackCard =
    document.getElementById("jumping-jack-card");

const backHomeButton =
    document.getElementById("back-home");

const homeButton =
    document.getElementById("home-button");

const againButton =
    document.getElementById("again-button");


jumpingJackCard.addEventListener(
    "click",
    () => {

        showScreen(exerciseScreen);

        prepareExercise();

    }
);


backHomeButton.addEventListener(
    "click",
    () => {

        stopSession();

        showScreen(homeScreen);

    }
);


homeButton.addEventListener(
    "click",
    () => {

        stopSession();

        showScreen(homeScreen);

    }
);


againButton.addEventListener(
    "click",
    () => {

        showScreen(exerciseScreen);

        prepareExercise();

    }
);


/* =========================================================
   3. DOM
========================================================= */

const video =
    document.getElementById("webcam");

const canvas =
    document.getElementById("output_canvas");

const ctx =
    canvas.getContext("2d");

const status =
    document.getElementById("status");

const startButton =
    document.getElementById("start");

const finishButton =
    document.getElementById("finish-exercise");

const repElement =
    document.getElementById("rep");

const formElement =
    document.getElementById("form");

const feedbackElement =
    document.getElementById("feedback");

const formScoreElement =
    document.getElementById("form-score");

const scoreBar =
    document.getElementById("score-bar");

const poseStatus =
    document.getElementById("pose-status");

const confidenceElement =
    document.getElementById("confidence");

const movementStateElement =
    document.getElementById("squat-state");

const timerElement =
    document.getElementById("timer");


/* =========================================================
   4. RESULT DOM
========================================================= */

const resultReps =
    document.getElementById("result-reps");

const resultQuality =
    document.getElementById("result-quality");

const resultQualityBar =
    document.getElementById("result-quality-bar");

const resultAccuracy =
    document.getElementById("result-accuracy");

const resultAccuracyBar =
    document.getElementById("result-accuracy-bar");

const resultTime =
    document.getElementById("result-time");

const aiInsightTitle =
    document.getElementById("ai-insight-title");

const aiInsight =
    document.getElementById("ai-insight");

const aiRecommendation =
    document.getElementById("ai-recommendation");


/* =========================================================
   5. AI
========================================================= */

let poseLandmarker = null;

let running = false;

let lastVideoTime = -1;


/* =========================================================
   6. SESSION
========================================================= */

let sessionActive = false;

let sessionStartTime = null;

let timerInterval = null;


/* =========================================================
   7. JUMPING JACK
========================================================= */

let jumpingState = "CLOSED";

let reps = 0;

let attempts = 0;

let validReps = 0;


/* =========================================================
   8. SESSION INTELLIGENCE
========================================================= */

let qualityScores = [];

let repRecords = [];

let repStartTimes = [];

let currentRepStartTime = null;

let consistencyScore = 0;

let averageRepTime = 0;


/* ป้องกันการนับซ้ำ */

let lastRepTime = 0;

const REP_COOLDOWN = 700;


/* =========================================================
   9. DETECTION SETTINGS
========================================================= */

const MIN_VISIBILITY = 0.45;

const HAND_UP_OFFSET = 0.03;

const FOOT_OPEN_RATIO = 1.35;

const FOOT_CLOSED_RATIO = 1.10;


/* =========================================================
   10. LANDMARKS
========================================================= */

const REQUIRED_LANDMARKS = [

    11, // Left Shoulder
    12, // Right Shoulder

    15, // Left Wrist
    16, // Right Wrist

    23, // Left Hip
    24, // Right Hip

    27, // Left Ankle
    28  // Right Ankle

];


/* =========================================================
   11. UI
========================================================= */

function setStatus(
    text,
    tracking = false
) {

    if (!status) return;


    if (tracking) {

        status.innerHTML =
            `<span class="live-dot"></span>${text}`;

    } else {

        status.textContent =
            text;

    }
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


function updateScore(score) {

    score = Math.max(
        0,
        Math.min(
            100,
            Math.round(score)
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
            "กำลังหุบ"

    };


    if (movementStateElement) {

        movementStateElement.textContent =
            labels[jumpingState] ||
            "ท่าเริ่มต้น";

    }
}


/* =========================================================
   12. TIMER
========================================================= */

function formatTime(seconds) {

    const minutes =
        Math.floor(seconds / 60);

    const remaining =
        seconds % 60;


    return (

        String(minutes)
            .padStart(2, "0")

        +

        ":" +

        String(remaining)
            .padStart(2, "0")

    );
}


function startTimer() {

    sessionStartTime =
        Date.now();


    timerInterval =
        setInterval(() => {

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


            timerElement.textContent =
                formatTime(elapsed);

        }, 1000);
}


function stopTimer() {

    if (timerInterval) {

        clearInterval(
            timerInterval
        );

        timerInterval = null;

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
   13. INITIALIZE AI
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


        console.log(
            "MoveWise AI: Initializing..."
        );


        const vision =
            await FilesetResolver.forVisionTasks(

                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"

            );


        poseLandmarker =
            await PoseLandmarker.createFromOptions(

                vision,

                {

                    baseOptions: {

                        modelAssetPath:
                            "./models/pose_landmarker_lite.task"

                    },


                    runningMode:
                        "VIDEO",


                    numPoses:
                        1,


                    minPoseDetectionConfidence:
                        0.5,


                    minPosePresenceConfidence:
                        0.5,


                    minTrackingConfidence:
                        0.5

                }

            );


        console.log(
            "MoveWise AI: Initialized successfully"
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
            "AI initialization error:",
            error
        );


        setStatus(
            "โหลด AI ไม่สำเร็จ"
        );


        setCoach(
            "ไม่สามารถโหลด AI ได้",
            "ตรวจสอบไฟล์ Model และ Console"
        );

    }
}


/* =========================================================
   14. PREPARE EXERCISE
========================================================= */

function prepareExercise() {

    stopSession();


    /* Session */

    sessionActive = false;

    sessionStartTime = null;


    /* Exercise */

    reps = 0;

    attempts = 0;

    validReps = 0;


    /* Intelligence */

    qualityScores = [];

    repRecords = [];

    repStartTimes = [];

    currentRepStartTime = null;

    consistencyScore = 0;

    averageRepTime = 0;


    /* State */

    jumpingState =
        "CLOSED";

    lastRepTime =
        0;

    lastVideoTime =
        -1;


    /* UI */

    repElement.textContent =
        "0";

    timerElement.textContent =
        "00:00";


    updateScore(0);

    updateMovementState();


    setStatus(
        "AI พร้อมทำงาน"
    );


    setCoach(
        "พร้อมเริ่ม",
        "กดปุ่มเพื่อเริ่มการวิเคราะห์ด้วย AI"
    );


    poseStatus.textContent =
        "--";

    confidenceElement.textContent =
        "--";


    startButton.disabled =
        false;


    startButton.textContent =
        "▶ เริ่มการวิเคราะห์ด้วย AI";


    clearCanvas();
}


/* =========================================================
   15. START SESSION
========================================================= */

async function startSession() {

    if (sessionActive) {

        return;

    }


    try {

        if (!navigator.mediaDevices) {

            throw new Error(
                "เบราว์เซอร์ไม่รองรับการใช้งานกล้อง"
            );

        }


        const stream =
            await navigator.mediaDevices.getUserMedia({

                video: {

                    width: {
                        ideal: 1280
                    },

                    height: {
                        ideal: 720
                    },

                    facingMode:
                        "user"

                },

                audio: false

            });


        video.srcObject =
            stream;


        await new Promise(
            resolve => {

                if (
                    video.readyState >= 1
                ) {

                    resolve();

                } else {

                    video.onloadedmetadata =
                        resolve;

                }

            }
        );


        await video.play();


        canvas.width =
            video.videoWidth ||
            1280;

        canvas.height =
            video.videoHeight ||
            720;


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


        predict();

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


/* =========================================================
   16. STOP SESSION
========================================================= */

function stopSession() {

    sessionActive =
        false;

    running =
        false;


    stopTimer();


    if (video.srcObject) {

        video.srcObject
            .getTracks()
            .forEach(track => {

                track.stop();

            });


        video.srcObject =
            null;

    }


    clearCanvas();


    startButton.disabled =
        false;


    startButton.textContent =
        "▶ เริ่มการวิเคราะห์ด้วย AI";

}


/* =========================================================
   17. FINISH
========================================================= */

finishButton.addEventListener(
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
   18. FULL BODY CHECK
========================================================= */

function checkFullBody(landmarks) {

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
            point.visibility !== undefined &&
            point.visibility <
                MIN_VISIBILITY
        ) {

            return false;

        }

    }


    return true;
}


/* =========================================================
   19. CONFIDENCE
========================================================= */

function getBodyConfidence(landmarks) {

    let total = 0;

    let count = 0;


    for (
        const index
        of REQUIRED_LANDMARKS
    ) {

        const point =
            landmarks[index];


        if (!point) continue;


        if (
            point.visibility !== undefined
        ) {

            total +=
                point.visibility;

            count++;

        }

    }


    if (count === 0) {

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
   20. JUMPING JACK ANALYSIS
========================================================= */

function analyzeJumpingJack(
    landmarks
) {

    const leftShoulder =
        landmarks[11];

    const rightShoulder =
        landmarks[12];

    const leftWrist =
        landmarks[15];

    const rightWrist =
        landmarks[16];

    const leftAnkle =
        landmarks[27];

    const rightAnkle =
        landmarks[28];


    const shoulderWidth =
        Math.abs(

            leftShoulder.x -
            rightShoulder.x

        );


    const footWidth =
        Math.abs(

            leftAnkle.x -
            rightAnkle.x

        );


    /* Arms */

    const leftHandUp =
        leftWrist.y <
        leftShoulder.y -
        HAND_UP_OFFSET;


    const rightHandUp =
        rightWrist.y <
        rightShoulder.y -
        HAND_UP_OFFSET;


    const handsUp =
        leftHandUp &&
        rightHandUp;


    const leftHandDown =
        leftWrist.y >
        leftShoulder.y;


    const rightHandDown =
        rightWrist.y >
        rightShoulder.y;


    const handsDown =
        leftHandDown &&
        rightHandDown;


    /* Legs */

    const feetOpen =
        footWidth >
        shoulderWidth *
        FOOT_OPEN_RATIO;


    const feetClosed =
        footWidth <
        shoulderWidth *
        FOOT_CLOSED_RATIO;


    return {

        leftHandUp,
        rightHandUp,

        handsUp,
        handsDown,

        feetOpen,
        feetClosed,

        isOpen:
            handsUp &&
            feetOpen,

        isClosed:
            handsDown &&
            feetClosed

    };
}


/* =========================================================
   21. MOVEMENT SCORE
========================================================= */

function calculateMovementScore(data) {

    let score = 0;


    if (data.handsUp) {

        score += 50;

    }
    else if (
        data.leftHandUp ||
        data.rightHandUp
    ) {

        score += 25;

    }


    if (data.feetOpen) {

        score += 50;

    }


    return score;
}


/* =========================================================
   22. JUMPING JACK STATE MACHINE
========================================================= */

function processJumpingJack(data) {


    /* =========================================
       CLOSED
    ========================================= */

    if (
        jumpingState ===
        "CLOSED"
    ) {

        updateScore(100);


        setCoach(
            "พร้อมเริ่ม",
            "กระโดดกางแขนและขา"
        );


        if (
            data.handsUp ||
            data.feetOpen
        ) {

            jumpingState =
                "OPENING";


            attempts++;


            currentRepStartTime =
                performance.now();


            setCoach(
                "กำลังกาง",
                "กางแขนและขาให้เต็มที่"
            );

        }

    }


    /* =========================================
       OPENING
    ========================================= */

    else if (
        jumpingState ===
        "OPENING"
    ) {

        const score =
            calculateMovementScore(data);


        updateScore(score);


        setCoach(
            "กำลังกาง",
            "ยกแขนขึ้นและกางขาออก"
        );


        if (data.isOpen) {

            jumpingState =
                "OPEN";


            updateScore(100);


            setCoach(
                "✓ ท่าถูกต้อง",
                "ดีมาก! กลับสู่ท่าเริ่มต้น"
            );

        }

    }


    /* =========================================
       OPEN
    ========================================= */

    else if (
        jumpingState ===
        "OPEN"
    ) {

        updateScore(100);


        setCoach(
            "✓ ท่าถูกต้อง",
            "หุบแขนและขากลับ"
        );


        if (
            data.handsDown ||
            data.feetClosed
        ) {

            jumpingState =
                "CLOSING";


            setCoach(
                "กำลังหุบ",
                "กลับสู่ท่าเริ่มต้น"
            );

        }

    }


    /* =========================================
       CLOSING
    ========================================= */

    else if (
        jumpingState ===
        "CLOSING"
    ) {

        if (data.isClosed) {

            completeRep();


            jumpingState =
                "CLOSED";


            updateScore(100);


            setCoach(
                "✓ ทำสำเร็จ 1 ครั้ง",
                "ยอดเยี่ยม! พร้อมทำครั้งต่อไป"
            );

        }
        else {

            setCoach(
                "กำลังหุบ",
                "นำมือและเท้ากลับสู่ตำแหน่งเริ่มต้น"
            );

        }

    }


    updateMovementState();
}


/* =========================================================
   23. COMPLETE REP
========================================================= */

function completeRep() {

    const now =
        performance.now();


    /* ป้องกันการนับซ้ำ */

    if (
        now -
        lastRepTime <
        REP_COOLDOWN
    ) {

        return;

    }


    lastRepTime =
        now;


    /* เวลา Rep */

    let repDuration = 0;


    if (
        currentRepStartTime !== null
    ) {

        repDuration =
            (
                now -
                currentRepStartTime
            ) / 1000;

    }


    /* คุณภาพของ Rep */

    const quality =
        calculateRepQuality();


    /* เพิ่มจำนวน */

    reps++;

    validReps++;


    /* บันทึกข้อมูล */

    const record = {

        rep:
            reps,

        quality:
            quality,

        duration:
            Number(
                repDuration.toFixed(2)
            )

    };


    repRecords.push(record);


    qualityScores.push(
        quality
    );


    repStartTimes.push(
        repDuration
    );


    /* UI */

    repElement.textContent =
        reps;


    currentRepStartTime =
        null;


    console.log(
        "MoveWise AI Rep:",
        record
    );
}


/* =========================================================
   24. REP QUALITY
========================================================= */

function calculateRepQuality() {

    /*
        ตอนนี้ Rep ที่ผ่าน
        OPEN → CLOSED
        ถือว่าผ่านคุณภาพ 100%

        Phase ถัดไปสามารถเพิ่ม:
        - มุมแขน
        - มุมขา
        - Symmetry
        - Range of Motion
    */

    return 100;
}


/* =========================================================
   25. CONSISTENCY
========================================================= */

function calculateConsistency() {

    if (
        repStartTimes.length < 2
    ) {

        return 100;

    }


    const average =
        repStartTimes.reduce(
            (sum, value) =>
                sum + value,
            0
        ) /
        repStartTimes.length;


    const deviations =
        repStartTimes.map(
            time =>
                Math.abs(
                    time -
                    average
                )
        );


    const averageDeviation =
        deviations.reduce(
            (sum, value) =>
                sum + value,
            0
        ) /
        deviations.length;


    let score =
        100 -
        (
            averageDeviation /
            Math.max(
                average,
                0.1
            )
        ) * 100;


    score =
        Math.round(score);


    return Math.max(
        0,
        Math.min(
            100,
            score
        )
    );
}


/* =========================================================
   26. AVERAGE REP TIME
========================================================= */

function calculateAverageRepTime() {

    if (
        repStartTimes.length === 0
    ) {

        return 0;

    }


    const total =
        repStartTimes.reduce(
            (sum, value) =>
                sum + value,
            0
        );


    return (
        total /
        repStartTimes.length
    );
}


/* =========================================================
   27. DRAW SKELETON
========================================================= */

function drawSkeleton(landmarks) {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    const connections = [

        [11, 12],

        [11, 13],
        [13, 15],

        [12, 14],
        [14, 16],

        [11, 23],
        [12, 24],

        [23, 24],

        [23, 25],
        [25, 27],

        [24, 26],
        [26, 28]

    ];


    ctx.lineWidth = 5;

    ctx.lineCap = "round";

    ctx.strokeStyle =
        "#ffffff";


    for (
        const [start, end]
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
            a.visibility !== undefined &&
            a.visibility < 0.35
        ) {
            continue;
        }


        if (
            b.visibility !== undefined &&
            b.visibility < 0.35
        ) {
            continue;
        }


        ctx.beginPath();


        ctx.moveTo(
            a.x * canvas.width,
            a.y * canvas.height
        );


        ctx.lineTo(
            b.x * canvas.width,
            b.y * canvas.height
        );


        ctx.stroke();

    }


    /* จุด Landmark */

    for (
        const point
        of landmarks
    ) {

        if (!point) continue;


        if (
            point.visibility !== undefined &&
            point.visibility < 0.4
        ) {
            continue;
        }


        ctx.beginPath();


        ctx.arc(
            point.x * canvas.width,
            point.y * canvas.height,
            5,
            0,
            Math.PI * 2
        );


        ctx.fillStyle =
            "#ffffff";


        ctx.fill();

    }
}


/* =========================================================
   28. CLEAR CANVAS
========================================================= */

function clearCanvas() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );
}


/* =========================================================
   29. AI LOOP
========================================================= */

function predict() {

    if (!running) {

        return;

    }


    if (!poseLandmarker) {

        requestAnimationFrame(
            predict
        );

        return;

    }


    if (
        video.currentTime !==
        lastVideoTime
    ) {

        lastVideoTime =
            video.currentTime;


        let results;


        try {

            results =
                poseLandmarker.detectForVideo(

                    video,

                    performance.now()

                );

        }

        catch (error) {

            console.error(
                "Pose detection error:",
                error
            );


            requestAnimationFrame(
                predict
            );

            return;

        }


        /* =====================================
           FOUND PERSON
        ===================================== */

        if (
            results &&
            results.landmarks &&
            results.landmarks.length > 0
        ) {

            const landmarks =
                results.landmarks[0];


            drawSkeleton(
                landmarks
            );


            const confidence =
                getBodyConfidence(
                    landmarks
                );


            confidenceElement.textContent =
                `${confidence}%`;


            const fullBody =
                checkFullBody(
                    landmarks
                );


            /* BODY NOT READY */

            if (!fullBody) {

                setStatus(
                    "ต้องเห็นร่างกายเต็มตัว"
                );


                poseStatus.textContent =
                    "ตรวจจับไม่ครบ";


                setCoach(
                    "จัดตำแหน่งร่างกาย",
                    "ถอยออกจากกล้อง เพื่อให้ AI เห็นตั้งแต่ศีรษะถึงเท้า"
                );


                updateScore(0);


                jumpingState =
                    "CLOSED";


                currentRepStartTime =
                    null;


                updateMovementState();


                requestAnimationFrame(
                    predict
                );


                return;

            }


            /* BODY READY */

            setStatus(
                "AI กำลังติดตาม",
                true
            );


            poseStatus.textContent =
                "ตรวจจับครบ ✓";


            const movement =
                analyzeJumpingJack(
                    landmarks
                );


            processJumpingJack(
                movement
            );

        }


        /* =====================================
           NO PERSON
        ===================================== */

        else {

            setStatus(
                "ยังไม่พบผู้ใช้งาน"
            );


            poseStatus.textContent =
                "ไม่พบ";


            confidenceElement.textContent =
                "--";


            movementStateElement.textContent =
                "รอการตรวจจับ";


            setCoach(
                "พร้อมใช้งาน",
                "ยืนอยู่หน้ากล้อง เพื่อเริ่มการวิเคราะห์"
            );


            updateScore(0);


            jumpingState =
                "CLOSED";


            currentRepStartTime =
                null;


            updateMovementState();


            clearCanvas();

        }

    }


    requestAnimationFrame(
        predict
    );
}


/* =========================================================
   30. GENERATE RESULT
========================================================= */

function generateResult(duration) {

    /* จำนวนครั้ง */

    resultReps.textContent =
        reps;


    /* Movement Quality */

    let quality = 0;


    if (
        qualityScores.length > 0
    ) {

        const total =
            qualityScores.reduce(
                (sum, score) =>
                    sum + score,
                0
            );


        quality =
            Math.round(
                total /
                qualityScores.length
            );

    }


    /* Accuracy */

    let accuracy = 0;


    if (attempts > 0) {

        accuracy =
            Math.round(

                (
                    validReps /
                    attempts
                ) * 100

            );

    }


    /* Consistency */

    consistencyScore =
        calculateConsistency();


    /* Average Rep Time */

    averageRepTime =
        calculateAverageRepTime();


    /* Limit */

    quality =
        Math.max(
            0,
            Math.min(
                100,
                quality
            )
        );


    accuracy =
        Math.max(
            0,
            Math.min(
                100,
                accuracy
            )
        );


    /* Result UI */

    resultQuality.textContent =
        `${quality}%`;


    resultQualityBar.style.width =
        `${quality}%`;


    resultAccuracy.textContent =
        `${accuracy}%`;


    resultAccuracyBar.style.width =
        `${accuracy}%`;


    resultTime.textContent =
        formatTime(
            duration
        );


    /* AI */

    generateAIInsight(

        quality,

        accuracy,

        duration,

        consistencyScore,

        averageRepTime

    );


    /* Console */

    console.log(
        "===== MOVEWISE SESSION ====="
    );


    console.log(
        "Reps:",
        reps
    );


    console.log(
        "Attempts:",
        attempts
    );


    console.log(
        "Valid Reps:",
        validReps
    );


    console.log(
        "Accuracy:",
        accuracy
    );


    console.log(
        "Movement Quality:",
        quality
    );


    console.log(
        "Consistency:",
        consistencyScore
    );


    console.log(
        "Average Rep Time:",
        averageRepTime
    );


    console.log(
        "Rep Records:",
        repRecords
    );
}


/* =========================================================
   31. AI INSIGHT
========================================================= */

function generateAIInsight(

    quality,

    accuracy,

    duration,

    consistency,

    averageRepTime

) {

    /* ไม่มีข้อมูล */

    if (reps === 0) {

        aiInsightTitle.textContent =
            "ยังมีข้อมูลไม่เพียงพอ";


        aiInsight.textContent =
            "ลองทำ Jumping Jack ให้ครบอย่างน้อย 1 ครั้ง เพื่อให้ AI สามารถวิเคราะห์รูปแบบการเคลื่อนไหวของคุณได้";


        aiRecommendation.textContent =
            "เริ่มจากการทำท่าอย่างช้า ๆ และให้ AI ตรวจจับร่างกายเต็มตัวก่อน";


        return;

    }


    /* ดีมาก */

    if (
        quality >= 90 &&
        accuracy >= 90 &&
        consistency >= 85
    ) {

        aiInsightTitle.textContent =
            "การเคลื่อนไหวของคุณอยู่ในระดับดีมาก";


        aiInsight.textContent =

            `AI ตรวจพบ ${reps} ครั้งที่ผ่านเกณฑ์ ` +

            `ด้วย Movement Quality ${quality}% ` +

            `และจังหวะการเคลื่อนไหวมีความสม่ำเสมอ ${consistency}%`;


        aiRecommendation.textContent =

            "คุณสามารถเพิ่มจำนวนครั้งหรือเพิ่มอีก 1 เซ็ตได้ " +

            "โดยพยายามรักษาจังหวะการเคลื่อนไหวให้สม่ำเสมอ";


        return;

    }


    /* คุณภาพดี แต่จังหวะไม่สม่ำเสมอ */

    if (
        quality >= 80 &&
        consistency < 85
    ) {

        aiInsightTitle.textContent =
            "คุณทำท่าได้ดี แต่จังหวะยังไม่สม่ำเสมอ";


        aiInsight.textContent =

            `Movement Quality อยู่ที่ ${quality}% ` +

            `แต่ความสม่ำเสมอของจังหวะอยู่ที่ ${consistency}%`;


        aiRecommendation.textContent =

            "ลองลดความเร็วลงเล็กน้อย และรักษาจังหวะการกาง–หุบให้ใกล้เคียงกันในแต่ละ Rep";


        return;

    }


    /* Accuracy ต่ำ */

    if (
        accuracy < 85
    ) {

        aiInsightTitle.textContent =
            "มีบาง Rep ที่ยังไม่ผ่านเกณฑ์";


        aiInsight.textContent =

            `จาก ${attempts} ครั้งที่เริ่มทำ ` +

            `มี ${validReps} ครั้งที่ผ่านเกณฑ์ ` +

            `คิดเป็น Accuracy ${accuracy}%`;


        aiRecommendation.textContent =

            "เน้นกางแขนและขาให้เต็มช่วงก่อนเพิ่มความเร็ว เพื่อให้แต่ละ Rep ผ่านเกณฑ์มากขึ้น";


        return;

    }


    /* General */

    aiInsightTitle.textContent =
        "การเคลื่อนไหวอยู่ในระดับดี";


    aiInsight.textContent =

        `คุณทำได้ ${reps} Reps ` +

        `ด้วย Movement Quality ${quality}% ` +

        `และ Accuracy ${accuracy}%`;


    aiRecommendation.textContent =

        "ฝึกต่อโดยเน้นความสม่ำเสมอของการเคลื่อนไหว และค่อย ๆ เพิ่มจำนวนครั้งเมื่อร่างกายพร้อม";

}


/* =========================================================
   32. BUTTON
========================================================= */

startButton.addEventListener(
    "click",
    async () => {

        await startSession();

    }
);


/* =========================================================
   33. INITIAL STATE
========================================================= */

showScreen(
    homeScreen
);


/* =========================================================
   34. START AI
========================================================= */

initializeAI();