const mediaUrl = (path) =>
    new URL(`../../public/media/${path}`, import.meta.url).href;

const exerciseFallback = (exerciseId) =>
    new URL(`./exercises/${exerciseId}.svg`, import.meta.url).href;

export const mediaAssets = {
    hero: {
        image: mediaUrl("hero/movewise-runner.jpg"),
        fallback: null
    },
    exercises: {
        "jumping-jack": {
            image: mediaUrl("exercises/jumping-jack.webp"),
            fallback: exerciseFallback("jumping-jack"),
            video: null
        },
        squat: {
            image: mediaUrl("exercises/squat.webp"),
            fallback: exerciseFallback("squat"),
            video: null
        },
        "push-up": {
            image: mediaUrl("exercises/push-up.webp"),
            fallback: exerciseFallback("push-up"),
            video: null
        },
        lunge: {
            image: mediaUrl("exercises/lunge.webp"),
            fallback: exerciseFallback("lunge"),
            video: null
        },
        "bicep-curl": {
            image: mediaUrl("exercises/bicep-curl.webp"),
            fallback: exerciseFallback("bicep-curl"),
            video: null
        }
    }
};
