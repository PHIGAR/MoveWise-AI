export function resetWorkout(analyzers, repCounter) {
    if (!Array.isArray(analyzers)) {
        throw new TypeError("Workout analyzers must be an array");
    }

    analyzers.forEach(analyzer => {
        if (!analyzer || typeof analyzer.reset !== "function") {
            throw new TypeError("Each workout analyzer must support reset()");
        }

        analyzer.reset();
    });

    if (repCounter) {
        repCounter.textContent = "0";
        repCounter.classList.remove("rep-updated");
    }
}
