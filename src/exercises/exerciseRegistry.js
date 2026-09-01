import {
    createJumpingJackAnalyzer
} from "./jumpingJack.js";

import {
    createSquatAnalyzer
} from "./squat.js";


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
        analyzer: null,
        available: false
    },
    {
        id: "lunge",
        name: "Lunge",
        nameThai: "ลันจ์",
        category: "strength",
        analyzer: null,
        available: false
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
