import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import searchModule from '../../public/exercise-search.js';

const { normalize, search } = searchModule;
const databaseSource = fs.readFileSync(new URL('../../public/workout-database.js', import.meta.url), 'utf8');
const context = {};
vm.runInNewContext(`${databaseSource}\nglobalThis.allExercises = Object.values(EXERCISE_DATABASE).flatMap(group => Object.values(group).flatMap(type => Object.values(type).flat()));`, context);
const catalog = context.allExercises;
const uniqueCatalog = [...new Map(catalog.map(exercise => [exercise.name, exercise])).values()];

const pageCatalogFiles = {
    chest: '../../public/workout-chest.html',
    back: '../../public/workout-back-data.js',
    shoulders: '../../public/workout-shoulders.html',
    arms: '../../public/workout-arms.html',
    legs: '../../public/workout-legs.html',
    core: '../../public/workout-core.html',
    calves: '../../public/workout-calves.html',
    cardio: '../../public/workout-cardio.html',
};

// The guides intentionally have their own catalogs. Keep their aliases under
// test so a name added to the database cannot hide a page-specific regression.
const pageCatalogs = Object.fromEntries(Object.entries(pageCatalogFiles).map(([key, file]) => {
    const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
    const exercises = [...source.matchAll(/^\s*name:\s*"([^"]+)"/gm)]
        .map(match => ({ name: match[1] }));
    return [key, exercises];
}));

function names(query, exercises = catalog) {
    return search(exercises, query).map(exercise => exercise.name);
}

describe('exercise search', () => {
    it('finds every workout database entry by its own name', () => {
        expect(catalog).toHaveLength(1028);
        for (const exercise of catalog) {
            expect(search(catalog, exercise.name)).toContain(exercise);
        }
    });

    it('finds every distinct catalog name with spaces removed or words reversed', () => {
        expect(uniqueCatalog).toHaveLength(686);
        for (const exercise of uniqueCatalog) {
            const words = normalize(exercise.name).split(' ');
            expect(search(catalog, words.join(''))).toContain(exercise);
            expect(search(catalog, words.reverse().join(' '))).toContain(exercise);
        }
    });

    it('finds names after one missing letter in a long word', () => {
        for (const exercise of uniqueCatalog) {
            const words = normalize(exercise.name).split(' ');
            const index = words.findIndex(word => word.length >= 6);
            if (index < 0) continue;
            words[index] = words[index].slice(0, -1);
            expect(search(catalog, words.join(' '))).toContain(exercise);
        }
    });

    it.each([
        ['press up', 'Push-ups'],
        ['pullup', 'Pull-ups'],
        ['db bench', 'Dumbbell Bench Press'],
        ['romanian dl', 'Romanian Deadlifts'],
        ['rdl', 'Romanian Deadlifts'],
        ['rfess', 'Bulgarian Split Squats'],
        ['hamstring curl', 'Leg Curls'],
        ['side raise', 'Lateral Raises'],
        ['heel raise', 'Calf Raises'],
        ['lying triceps extension', 'Skull Crushers'],
        ['anti rotation press', 'Pallof Press'],
        ['rower', 'Rowing Machine'],
        ['cross trainer', 'Elliptical'],
        ['skipping rope', 'Jump Rope'],
        ['box step up', 'Step-ups'],
        ['farmer carry', 'Farmers Walks'],
        ['air bike', 'Assault Bike'],
        ['barbell bicep curl', 'Barbell Curls'],
        ['dumbbell ohp', 'Dumbbell Shoulder Press'],
    ])('finds %s as %s', (query, expected) => {
        expect(names(query)).toContain(expected);
    });

    it('covers common names across all eight guide catalogs', () => {
        expect(Object.fromEntries(Object.entries(pageCatalogs).map(([key, exercises]) => [key, exercises.length])))
            .toEqual({ chest: 18, back: 26, shoulders: 28, arms: 10, legs: 28, core: 10, calves: 10, cardio: 10 });

        const cases = [
            ['chest', 'flat barbell press', 'Barbell Bench Press'],
            ['chest', 'barbell chest press', 'Barbell Bench Press'],
            ['chest', 'incline bench press', 'Incline Barbell Press'],
            ['chest', 'incline barbell bench', 'Incline Barbell Press'],
            ['chest', 'pec fly', 'Dumbbell Flyes'],
            ['chest', 'chest fly', 'Dumbbell Flyes'],
            ['chest', 'chest dip', 'Dips'],
            ['chest', 'parallel bar dip', 'Dips'],
            ['chest', 'squeeze press', 'Svend Press'],
            ['back', 'neutral grip pull up', 'Pull-ups'],
            ['back', 'cable lat pulldown', 'Lat Pulldowns'],
            ['back', 'one arm row', 'Single-Arm Dumbbell Rows'],
            ['back', 'dumbbell one arm row', 'Single-Arm Dumbbell Rows'],
            ['back', 'low row', 'Cable Rows'],
            ['back', 'dumbbell shrug', 'Shrugs'],
            ['back', 'rear delt fly', 'Bent Over Reverse Flyes'],
            ['back', 'rope face pull', 'Rope Face Pulls (High)'],
            ['back', 'tbarrow', 'T-Bar Rows'],
            ['shoulders', 'seated overhead press', 'Overhead Press'],
            ['shoulders', 'single arm overhead press', 'Alternating Dumbbell Press'],
            ['shoulders', 'barbell shoulder press', 'Overhead Press'],
            ['shoulders', 'lateral shoulder raise', 'Lateral Raises'],
            ['arms', 'barbell bicep curl', 'Barbell Bicep Curls'],
            ['legs', 'high bar squat', 'Barbell Back Squat'],
            ['legs', 'low bar squat', 'Barbell Back Squat'],
            ['legs', 'dumbbell rdl', 'Romanian Deadlift'],
            ['legs', 'single leg rdl', 'Single-Leg Deadlift'],
            ['legs', 'bss', 'Bulgarian Split Squat'],
            ['legs', 'forward lunge', 'Walking Lunges'],
            ['legs', 'kettlebell squat', 'Goblet Squat'],
            ['core', 'tgu', 'Turkish Get-Up'],
            ['cardio', 'treadmill', 'Running/Jogging'],
            ['cardio', 'stairmaster', 'Stair Climbing'],
            ['cardio', 'stair master', 'Stair Climbing'],
            ['cardio', 'stepmill', 'Stair Climbing'],
            ['cardio', 'cross trainer', 'Elliptical Training'],
            ['cardio', 'dance workout', 'Dance Fitness'],
            ['calves', 'ankle hops', 'Pogo Jumps'],
        ];

        for (const [catalogName, query, expected] of cases) {
            expect(names(query, pageCatalogs[catalogName]), `${catalogName}: ${query}`).toContain(expected);
        }
    });

    it('recognizes database-only movement names without crossing variants', () => {
        const cases = [
            ['floor press', 'Floor Press'],
            ['squeeze press', 'Dumbbell Squeeze Press'],
            ['dumbbell shrug', 'Dumbbell Shrugs'],
            ['farmer carry', 'Farmers Walks'],
            ['reverse lunge', 'Reverse Lunges'],
            ['ghr', 'Glute Ham Raises'],
            ['calf press', 'Calf Raises on Leg Press'],
            ['tgu', 'Turkish Get-ups'],
            ['ab wheel', 'Ab Wheel Rollouts'],
            ['rollout', 'Ab Wheel Rollouts'],
            ['stairmaster', 'Stair Climber'],
        ];

        for (const [query, expected] of cases) {
            expect(names(query), query).toContain(expected);
        }
        expect(names('stiff leg deadlift')).toContain('Stiff Leg Deadlifts');
        expect(names('stiff leg deadlift')).not.toContain('Deadlifts');
    });

    it('expands joined equipment abbreviations without corrupting words', () => {
        expect(normalize('dbbench')).toBe('dumbbell bench');
        expect(normalize('dbrow')).toBe('dumbbell row');
        expect(normalize('kbswing')).toBe('kettlebell swing');
        expect(normalize('tbarrow')).toBe('t bar row');
        expect(normalize('D.B. bench')).toBe('dumbbell bench');
        expect(normalize('classes')).toBe('classes');
        expect(normalize('calves')).toBe('calves');
        expect(names('dbbench', pageCatalogs.chest)).toContain('Dumbbell Bench Press');
    });

    it('handles word order, missing spaces, extra spaces, punctuation, and spelling', () => {
        expect(names('  bench   DB ')).toContain('Dumbbell Bench Press');
        expect(names('D.B. bench')[0]).toBe('Dumbbell Bench Press');
        expect(names('D.B. bench')).not.toContain('Bench Dips');
        expect(names('barbellbenchpress')).toContain('Barbell Bench Press');
        expect(names('lat pull down')).toContain('Lat Pulldowns');
        expect(names('dumbel bench')).toContain('Dumbbell Bench Press');
        expect(names('squatt')).toContain('Back Squats');
        expect(names('pulldwon')).toContain('Lat Pulldowns');
    });

    it('keeps distinct movements separate for specific queries', () => {
        expect(names('rdl')).not.toContain('Deadlifts');
        expect(names('conventional deadlift')).not.toContain('Romanian Deadlifts');
        expect(names('chinup')).not.toContain('Pull-ups');
        expect(names('pullup')).not.toContain('Chin-ups');
        expect(names('pullup')).not.toContain('Australian Pull-ups');
        expect(names('inverted row')).toContain('Australian Pull-ups');
        expect(names('glute bridge')).not.toContain('Hip Thrusts');
        expect(names('hip thrust')).not.toContain('Glute Bridges');
        expect(names('rower')).not.toContain('Barbell Rows');
        expect(names('rower')).not.toContain('Power Shrugs');
        expect(names('deadlift')[0]).toBe('Deadlifts');
        expect(names('deadlift')).toContain('Romanian Deadlifts');
        expect(names('stiff leg deadlift')).toContain('Stiff Leg Deadlifts');
        expect(names('stiff leg deadlift')).not.toContain('Deadlifts');
        expect(names('single arm half kneeling shoulder press')).not.toContain('Single Arm Dumbbell Press');
        expect(names('captains chair leg raise')).not.toContain('Hanging Leg Raises');
    });

    it('finds names from the separate guide catalog by their equipment aliases', () => {
        const guide = [{ name: 'Rowing', equipment: 'Rowing Machine' },
            { name: 'Cycling', equipment: 'Bicycle or Stationary Bike' }];
        expect(names('rower', guide)).toContain('Rowing');
        expect(names('spin bike', guide)).toContain('Cycling');
    });

    it('accepts a plain string catalog without throwing', () => {
        expect(search(['Push-ups'], 'press up')).toEqual(['Push-ups']);
    });

    it('preserves original references and catalog order for a blank query', () => {
        const two = [catalog[1], catalog[0]];
        expect(search(two, '  ')).toEqual(two);
        expect(search(two, '  ')[0]).toBe(two[0]);
    });
});
