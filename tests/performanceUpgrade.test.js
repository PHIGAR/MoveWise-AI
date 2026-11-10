import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPreparation, reachedTarget } from '../src/core/preparation.js';
import { createPosePerformance } from '../src/core/posePerformance.js';
import { createMetricAverage } from '../src/core/metricAverage.js';
import { createSquatAnalyzer } from '../src/exercises/squat.js';
import { createSessionClock } from '../src/core/sessionClock.js';
import { createSession } from '../src/core/session.js';
import { saveSession, getSessions } from '../src/core/storage.js';
import { createBattleService } from '../src/core/battle/battleService.js';
import { assignLocalBattlePoses } from '../src/core/battle/localBattle.js';
import { summarizeIssues } from '../src/ai/issuePatterns.js';
import { analyzeJumpingJackMetrics } from '../src/ai/analysis/jumpingJackMetrics.js';
import { createExerciseAnalyzer } from '../src/exercises/exerciseRegistry.js';
import { createSixSevenAnalyzer } from '../src/exercises/sixSeven.js';
import { generateRecommendation } from '../src/ai/recommendation/recommendation.js';

function advance(gate, start, end, valid = true) {
    let value;
    for (let at = start; at <= end; at += 100) value = gate.update(valid, at);
    return value;
}

test('Start explicitly arms preparation; two stable seconds precede a five second countdown', () => {
    const gate = createPreparation();
    assert.equal(gate.update(true, 0).phase, 'idle');
    gate.arm();
    assert.equal(advance(gate, 0, 1900).phase, 'preparing');
    assert.deepEqual(gate.update(true, 2000), { phase: 'countdown', remaining: 5 });
    assert.equal(advance(gate, 2100, 6900).phase, 'countdown');
    assert.equal(gate.update(true, 7000).phase, 'active');
});

test('missing landmarks cancel countdown and require a new complete stability window', () => {
    const gate = createPreparation(); gate.arm();
    advance(gate, 0, 3000);
    assert.equal(gate.update(false, 3100).phase, 'preparing');
    assert.equal(advance(gate, 3200, 5100).phase, 'preparing');
    assert.equal(gate.update(true, 5200).remaining, 5);
});

test('frozen camera, navigation cancellation and late frames cannot start a workout', () => {
    const gate = createPreparation(); gate.arm(); advance(gate, 0, 3000);
    assert.equal(gate.update(true, 10000).phase, 'preparing');
    gate.cancel(); assert.equal(gate.update(true, 10100).phase, 'idle');
    gate.arm(); assert.equal(gate.update(true, 10200).phase, 'preparing');
});

test('duration and rep targets complete independently, with zero meaning unlimited', () => {
    assert.equal(reachedTarget({ duration: 600, repetitions: 100 }, { seconds: 0, reps: 0 }), false);
    assert.equal(reachedTarget({ duration: 30, repetitions: 1 }, { seconds: 30, reps: 5 }), true);
    assert.equal(reachedTarget({ duration: 1, repetitions: 5 }, { seconds: 30, reps: 5 }), true);
});

test('adaptive pacing rejects duplicate video frames and backs off for slow inference', () => {
    const perf = createPosePerformance(); perf.reset(0);
    assert.equal(perf.shouldRun(0, 1), true);
    perf.record(0, 50, 52);
    assert.equal(perf.shouldRun(100, 1), false);
    assert.equal(perf.shouldRun(50, 2), false);
    assert.equal(perf.shouldRun(100, 2), true);
    assert.ok(perf.snapshot().intervalMs > 50);
});

test('off-thread inference retains the device FPS budget without blocking controls', () => {
    const main = createPosePerformance(), worker = createPosePerformance();
    main.record(0, 60, 63); worker.record(0, 64, 66, false, 60);
    assert.ok(worker.snapshot().intervalMs < main.snapshot().intervalMs);
    assert.ok(worker.snapshot().intervalMs >= 50);
    assert.equal(worker.snapshot().inferenceMs, 60);
});

test('performance history is bounded and missing timings remain unavailable', () => {
    const perf = createPosePerformance(); perf.reset(0);
    assert.equal(perf.snapshot().fps, null);
    assert.equal(perf.snapshot().repLatencyMs, null);
    for (let i = 0; i < 10000; i++) perf.record(i * 50, i * 50 + 10, i * 50 + 12, i === 9999);
    assert.equal(perf.snapshot().frames, 300);
    assert.equal(perf.snapshot().fps, 20);
    assert.equal(perf.snapshot().repLatencyMs, 12);
});

test('long-task diagnostics release their observer on reset and stop', () => {
    const previous = globalThis.PerformanceObserver; let disconnected = 0, callback;
    globalThis.PerformanceObserver = class {
        static supportedEntryTypes = ['longtask'];
        constructor(fn) { callback = fn; }
        observe() {}
        disconnect() { disconnected++; }
    };
    try {
        const perf = createPosePerformance(); perf.reset(0);
        callback({ getEntries: () => [{ duration: 80 }, { duration: 55 }] });
        assert.equal(perf.snapshot().longTasks, 2); assert.equal(perf.snapshot().maxLongTaskMs, 80);
        perf.reset(100); assert.equal(disconnected, 1); perf.stop(); assert.equal(disconnected, 2);
    } finally { globalThis.PerformanceObserver = previous; }
});

test('online disconnect during countdown returns to readiness instead of declaring a winner', t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 10000 });
    const service = createBattleService();
    try {
        const [first, second] = roomWithPlayers(service);
        const response = { destroyed: false, writableEnded: false, write() {}, end() {} };
        const unsubscribe = service.subscribe(first.roomCode, first.playerId, first.token, response);
        ready(service, first); ready(service, second); unsubscribe();
        assert.equal(state(service, second).status, 'ready');
        assert.equal(state(service, second).winnerId, null);
    } finally { service.close(); }
});

test('leaving an active match forfeits even if the departing player had the higher score', t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 10000 });
    const service = createBattleService({ countdownSeconds: .02 });
    try {
        const [first, second] = roomWithPlayers(service);
        ready(service, first); ready(service, second); t.mock.timers.tick(20);
        service.submitMetrics(first.roomCode, first.playerId, first.token, { repetitions: 10, quality: 100, accuracy: 100 });
        const result = service.leave(first.roomCode, first.playerId, first.token);
        assert.equal(result.status, 'result'); assert.equal(result.winnerId, second.playerId);
    } finally { service.close(); }
});

test('streaming metric average retains exact aggregates without per-frame storage', () => {
    const average = createMetricAverage();
    assert.equal(average.value(), null);
    for (let i = 0; i < 100000; i++) average.add(60);
    average.add(NaN); average.add(undefined);
    assert.equal(average.count, 100000); assert.equal(average.value(), 60);
});

test('tempo consistency stays unavailable until at least two rep durations exist', () => {
    for (const exercise of ['push-up', 'lunge', 'bicep-curl']) {
        assert.equal(createExerciseAnalyzer(exercise).analyze(squatPose(180)).consistency, null);
    }
});

test('Six Seven measures the first transition time instead of awarding a default perfect rhythm', () => {
    const analyzer = createSixSevenAnalyzer();
    const movement = endpoint => ({ hasRequiredLandmarks: true, endpoint, leftLevel: endpoint === 'LEFT_HIGH' ? .3 : 0, rightLevel: endpoint === 'RIGHT_HIGH' ? .3 : 0, symmetry: 100 });
    assert.equal(analyzer.getState().rhythm, null);
    analyzer.process(movement('LEFT_HIGH'), {}, 1000); analyzer.process(movement('LEFT_HIGH'), {}, 1100);
    analyzer.process(movement('RIGHT_HIGH'), {}, 4000);
    const result = analyzer.process(movement('RIGHT_HIGH'), {}, 4100);
    assert.equal(result.repetitions, 1); assert.equal(result.record.rhythm, 0);
});

function squatPose(angle) {
    const radians = angle * Math.PI / 180;
    const pose = Array.from({ length: 33 }, () => ({ x: .5, y: .2, visibility: 1 }));
    for (const [hip, knee, ankle, x] of [[23,25,27,.3],[24,26,28,.6]]) {
        pose[hip] = { x, y: .3, visibility: 1 }; pose[knee] = { x, y: .5, visibility: 1 };
        pose[ankle] = { x: x + Math.sin(radians) * .2, y: .5 - Math.cos(radians) * .2, visibility: 1 };
    }
    return pose;
}

test('jumping jack arm range measures shoulder elevation, and unavailable joints are not zero scores', () => {
    const pose = squatPose(180);
    pose[11] = { x: .3, y: .1 }; pose[12] = { x: .6, y: .1 };
    pose[15] = { x: .3, y: .25 }; pose[16] = { x: .6, y: .25 };
    const movement = { shoulderWidth: .3, footWidth: .3 };
    assert.equal(analyzeJumpingJackMetrics(pose, movement).armROM, 0);
    pose[15].y = -.05; pose[16].y = -.05;
    assert.equal(analyzeJumpingJackMetrics(pose, movement).armROM, 100);
    pose[25] = null;
    assert.equal(analyzeJumpingJackMetrics(pose, movement), null);
});
function rep(analyzer, start = 1000) {
    return [180,135,90,135,180].map((angle, index) => {
        const movement = analyzer.analyze(squatPose(angle));
        return analyzer.process(movement, movement, start + index * 300);
    }).at(-1);
}

test('Solo camera-result fixtures count one full rep and preserve deepest-frame metrics', () => {
    const analyzer = createSquatAnalyzer();
    const result = rep(analyzer);
    assert.equal(result.repetitions, 1);
    assert.equal(result.record.depth, 100);
    assert.equal(result.record.kneeAngle, 90);
    assert.equal(result.record.quality, 100);
});

test('a tracking break resets partial motion and cannot create a phantom rep', () => {
    const analyzer = createSquatAnalyzer();
    for (const [i, angle] of [180,135,90].entries()) {
        const movement = analyzer.analyze(squatPose(angle)); analyzer.process(movement, movement, i * 300 + 1000);
    }
    const broken = squatPose(180); broken[25].visibility = 0;
    assert.equal(analyzer.analyze(broken).hasRequiredLandmarks, false);
    analyzer.resetMovementState();
    const movement = analyzer.analyze(squatPose(180));
    assert.equal(analyzer.process(movement, movement, 3000).repetitions, 0);
    assert.equal(rep(analyzer, 4000).repetitions, 1);
});

test('pause/resume excludes paused time and completed sessions save once using their id', () => {
    let now = 0; const clock = createSessionClock(() => now); clock.start();
    now = 2000; clock.pause(); now = 12000; assert.equal(clock.seconds(), 2);
    clock.resume(); now = 15000; assert.equal(clock.seconds(), 5);
    const values = new Map(); const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
    const session = createSession({ exerciseId: 'squat', duration: clock.seconds(), repetitions: 1, completedAt: new Date().toISOString(), quality: 100 });
    assert.equal(saveSession(session, storage), true); assert.equal(saveSession(session, storage), true);
    assert.equal(getSessions(storage).length, 1); assert.equal(getSessions(storage)[0].duration, 5);
});

test('completed zero-rep sessions keep unknown measurements null', () => {
    const values = new Map(); const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
    const session = createSession({ exerciseId: 'squat', duration: 5, completedAt: new Date().toISOString() });
    assert.equal(saveSession(session, storage), true);
    assert.equal(getSessions(storage)[0].quality, null); assert.equal(getSessions(storage)[0].accuracy, null);
});

test('local assignment rejects duplicates, ambiguous single poses and implausible jumps', () => {
    const pose = x => squatPose(180).map(point => ({ ...point, x }));
    assert.deepEqual(assignLocalBattlePoses([pose(.4), pose(.42)]).players, [null, null]);
    assert.deepEqual(assignLocalBattlePoses([pose(.5)], [.25,.75]).players, [null, null]);
    assert.deepEqual(assignLocalBattlePoses([pose(.01), pose(.99)], [.3,.7]).players, [null, null]);
});

function roomWithPlayers(service, durationSeconds = 60) {
    const first = service.createRoom({ durationSeconds }); const second = service.joinRoom(first.roomCode);
    for (const player of [first, second]) service.selectExercise(player.roomCode, player.playerId, player.token, 'squat');
    return [first, second];
}
function ready(service, player, value = true) { return service.setReady(player.roomCode, player.playerId, player.token, value); }
function state(service, player) { return service.getSnapshot(player.roomCode, player.playerId, player.token); }

test('online countdown cancellation, re-readiness and synchronized automatic finish use server time', t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 10000 });
    const service = createBattleService();
    try {
        const [first, second] = roomWithPlayers(service, 30);
        ready(service, first); assert.equal(ready(service, second).status, 'countdown');
        assert.equal(ready(service, first, false).status, 'ready');
        t.mock.timers.tick(5000); assert.equal(state(service, first).status, 'ready');
        ready(service, first); ready(service, second);
        const startsAt = state(service, first).countdownStartsAt;
        for (let i = 0; i < 12; i++) { t.mock.timers.tick(400); ready(service, first); ready(service, second); }
        t.mock.timers.tick(200);
        assert.equal(state(service, first).status, 'active');
        assert.equal(state(service, first).startedAt, startsAt);
        assert.equal(state(service, second).startedAt, startsAt);
        t.mock.timers.tick(30000); assert.equal(state(service, first).status, 'result');
    } finally { service.close(); }
});

test('stale online tracking leases cancel the countdown without awarding a match', t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 10000 });
    const service = createBattleService();
    try {
        const [first, second] = roomWithPlayers(service);
        ready(service, first); ready(service, second); t.mock.timers.tick(2000);
        assert.equal(state(service, first).status, 'ready');
        t.mock.timers.tick(4000); assert.equal(state(service, first).startedAt, null);
    } finally { service.close(); }
});

test('battle duration rejects malformed and excessive values', () => {
    const service = createBattleService();
    try { for (const value of [-1, 0, 1801, '60', NaN]) assert.throws(() => service.createRoom({ durationSeconds: value })); }
    finally { service.close(); }
});

test('mistake patterns use completed same-exercise measurements and require repetition for recurring labels', () => {
    const session = { id: 'a', exerciseId: 'squat', completedAt: '2026-11-10T00:00:00Z', repetitions: 1, repRecords: [{ measurementVersion: 2 }], movementMetrics: { depth: 60 } };
    assert.equal(summarizeIssues('squat', [session])[0].recurring, false);
    const issues = summarizeIssues('squat', [session, { ...session, id: 'b' }, { ...session, exerciseId: 'lunge' }, { ...session, completedAt: null }]);
    assert.equal(issues[0].sessions, 2); assert.equal(issues[0].recurring, true);
    assert.deepEqual(summarizeIssues('squat', [{ ...session, movementMetrics: null }]), []);
});

test('coaching trends require comparable exercises and measurement versions', () => {
    const current = { exerciseId: 'squat', quality: 90, measurementVersion: 2 };
    assert.equal(generateRecommendation(current, [{ ...current, quality: 60, exerciseId: 'lunge' }, { ...current, quality: 70 }]).trend.status, 'insufficient-data');
    assert.equal(generateRecommendation(current, [{ ...current, quality: 60, measurementVersion: 1 }, { ...current, quality: 70 }]).trend.status, 'insufficient-data');
    assert.equal(generateRecommendation(current, [{ ...current, quality: 60 }, { ...current, quality: 70 }]).trend.direction, 'up');
});
