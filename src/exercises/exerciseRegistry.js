import {
    createJumpingJackAnalyzer
} from "./jumpingJack.js";

import {
    createSquatAnalyzer
} from "./squat.js";

import {
    createPushUpAnalyzer
} from "./pushUp.js";

import {
    createLungeAnalyzer
} from "./lunge.js";

import {
    createBicepCurlAnalyzer
} from "./bicepCurl.js";

import {
    createSixSevenAnalyzer
} from "./sixSeven.js";


const exercises = [
    {
        id: "jumping-jack",
        name: "Jumping Jack",
        nameThai: "กระโดดตบ",
        category: "cardio",
        analyzer: createJumpingJackAnalyzer,
        available: true
    },
    {
        id: "squat",
        name: "Squat",
        nameThai: "สควอต",
        category: "strength",
        analyzer: createSquatAnalyzer,
        available: true
    },
    {
        id: "push-up",
        name: "Push-up",
        nameThai: "วิดพื้น",
        category: "strength",
        analyzer: createPushUpAnalyzer,
        available: true
    },
    {
        id: "lunge",
        name: "Lunge",
        nameThai: "ลันจ์",
        category: "strength",
        analyzer: createLungeAnalyzer,
        available: true
    },
    {
        id: "bicep-curl",
        name: "Bicep Curl",
        nameThai: "ไบเซปเคิร์ล",
        category: "strength",
        analyzer: createBicepCurlAnalyzer,
        available: true
    },
    {
        id: "six-seven",
        name: "Six Seven (67) Challenge",
        nameThai: "ชาเลนจ์ Six Seven",
        category: "cardio",
        analyzer: createSixSevenAnalyzer,
        available: true,
        battleAvailable: false
    },
    {
        id: "shoulder-raise",
        name: "Shoulder Raise",
        nameThai: "ยกไหล่",
        category: "mobility",
        analyzer: null,
        available: false
    }
];


export function getExercises() {
    return exercises.map(exercise => ({
        ...exercise
    }));
}


export function getExerciseById(
    id
) {
    return exercises.find(
        exercise => exercise.id === id
    ) || null;
}


export function getAvailableExercises() {
    return exercises
        .filter(exercise =>
            exercise.available &&
            exercise.battleAvailable !== false
        )
        .map(exercise => ({
            ...exercise
        }));
}


export function getAvailableWorkoutExercises() {
    return exercises
        .filter(exercise => exercise.available)
        .map(exercise => ({
            ...exercise
        }));
}


export function isExerciseAvailable(
    id
) {
    const exercise = getExerciseById(id);
    return Boolean(
        exercise &&
        exercise.available
    );
}


export function createExerciseAnalyzer(
    id
) {
    const exercise = getExerciseById(id);

    if (!exercise) {
        throw new Error(
            `Unknown exercise: ${id}`
        );
    }

    if (
        !exercise.available ||
        !exercise.analyzer
    ) {
        throw new Error(
            `Exercise is not available: ${id}`
        );
    }

    return exercise.analyzer();
}
