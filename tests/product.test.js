import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchesExercise, filterHistory } from '../src/core/catalog.js';
import { createSessionClock } from '../src/core/sessionClock.js';
import { getExercises } from '../src/exercises/exerciseRegistry.js';

test('search combines Thai/English query and category without exposing unavailable analyzers', () => {
    const exercises = getExercises().filter(exercise => exercise.available);
    const find = (query, category) => exercises.filter(exercise => matchesExercise(exercise, query, category)).map(e => e.id);
    assert.deepEqual(find(' SQUAT ', 'strength'), ['squat']);
    assert.deepEqual(find('สควอต', 'strength'), ['squat']);
    assert.deepEqual(find('squat', 'cardio'), []);
    assert.deepEqual(find('', 'full-body'), ['jumping-jack', 'lunge']);
    assert.deepEqual(find('shoulder', 'all'), []);
});

test('history filters use local calendar days, exclude incomplete/future sessions and preserve input', () => {
    const now = new Date(2026, 10, 4, 15);
    const sessions = [
        {id:'old',exerciseId:'squat',completedAt:new Date(2026,9,28,23).toISOString()},
        {id:'start',exerciseId:'squat',completedAt:new Date(2026,9,29,0).toISOString()},
        {id:'today',exerciseId:'lunge',completedAt:new Date(2026,10,4,10).toISOString()},
        {id:'future',exerciseId:'squat',completedAt:new Date(2026,10,5).toISOString()},
        {id:'incomplete',exerciseId:'squat',completedAt:null}
    ];
    const original = structuredClone(sessions);
    assert.deepEqual(filterHistory(sessions,{days:7},now).map(s=>s.id),['today','start']);
    assert.deepEqual(filterHistory(sessions,{days:7,exerciseId:'squat'},now).map(s=>s.id),['start']);
    assert.deepEqual(filterHistory(sessions,{},now).map(s=>s.id),['today','start','old']);
    assert.deepEqual(sessions,original);
});

test('session clock excludes repeated pauses and resets on restart', () => {
    let time = 0;
    const clock = createSessionClock(() => time);
    assert.equal(clock.seconds(),0);
    clock.start(); time=2200; clock.pause(); clock.pause(); time=10200;
    assert.equal(clock.seconds(),2);
    clock.resume(); clock.resume(); time=13200;
    assert.equal(clock.seconds(),5);
    clock.pause(); time=23200; clock.resume(); time=25200;
    assert.equal(clock.seconds(),7);
    clock.reset(); assert.equal(clock.seconds(),0);
    clock.start(); time=27200; assert.equal(clock.seconds(),2);
});

test('coaching uses only measured fields for the selected exercise', async () => {
    const { createCoachingSession } = await import('../src/ai/coachingSession.js');
    const { generateRecommendation } = await import('../src/ai/recommendation/recommendation.js');
    const squat = createCoachingSession({exerciseId:'squat',repetitions:3,quality:75,accuracy:90,
        movementMetrics:{kneeAngle:110,depth:75,symmetry:95,armROM:0,legROM:0,alignment:NaN}});
    assert.deepEqual(squat.movementMetrics,{kneeAngle:110,depth:75,symmetry:95});
    assert.equal('armROM' in squat,false);
    assert.equal(generateRecommendation(squat).focusAreas.some(area=>area.type==='arm-rom'),false);
    const jack = createCoachingSession({exerciseId:'jumping-jack',movementMetrics:{armROM:70,legROM:80}});
    assert.equal(jack.armROM,70);
    assert.equal('quality' in jack.movementMetrics,false);
});
