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
