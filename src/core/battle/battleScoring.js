const SCORE_WEIGHTS = Object.freeze({
    repetitions: 0.5,
    quality: 0.3,
    accuracy: 0.2
});


export function calculateBattleScore(player, opponent) {
    const repetitions = validRepetitions(player?.repetitions);
    const opponentRepetitions = validRepetitions(
        opponent?.repetitions
    );
    const maxRepetitions = Math.max(
        repetitions,
        opponentRepetitions
    );
    const repScore = maxRepetitions === 0
        ? 0
        : repetitions / maxRepetitions * 100;

    const components = [{
        key: "repetitions",
        value: repScore,
        weight: SCORE_WEIGHTS.repetitions
    }];
    ["quality", "accuracy"].forEach(key => {
        if (
            validPercentage(player?.[key]) &&
            validPercentage(opponent?.[key])
        ) {
            components.push({
                key,
                value: player[key],
                weight: SCORE_WEIGHTS[key]
            });
        }
    });

    const totalWeight = components.reduce(
        (sum, item) => sum + item.weight,
        0
    );
    const score = totalWeight > 0
        ? Math.round(components.reduce(
            (sum, item) => sum + item.value * item.weight,
            0
        ) / totalWeight)
        : 0;

    return {
        score: Math.min(100, Math.max(0, score)),
        breakdown: Object.fromEntries(
            components.map(item => [
                item.key,
                Math.round(item.value)
            ])
        )
    };
}


export function calculateBattleOutcome(player, opponent) {
    const playerScore = calculateBattleScore(player, opponent).score;
    const opponentScore = calculateBattleScore(opponent, player).score;
    const result = playerScore === opponentScore
        ? "draw"
        : playerScore > opponentScore
            ? "win"
            : "loss";

    return {
        playerScore,
        opponentScore,
        result
    };
}


function validRepetitions(value) {
    return Number.isSafeInteger(value) && value >= 0
        ? value
        : 0;
}


function validPercentage(value) {
    return Number.isFinite(value) && value >= 0 && value <= 100;
}
