/* Shared, catalog-aware exercise search for the workout guides. */
(function (root) {
    'use strict';

    const cached = new WeakMap();

    function normalize(value) {
        return String(value || '')
            .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().replace(/&/g, ' and ').replace(/[’']/g, '')
            .replace(/\bd\s*\.?\s*b\.?(?=\s|$)/g, 'dumbbell')
            .replace(/\bb\s*\.?\s*b\.?(?=\s|$)/g, 'barbell')
            .replace(/\bk\s*\.?\s*b\.?(?=\s|$)/g, 'kettlebell')
            .replace(/[^a-z0-9]+/g, ' ').trim()
            .replace(/\b(?:db|dbs|dumb bells?)\b/g, 'dumbbell')
            .replace(/\b(?:bb|bbs)\b/g, 'barbell')
            .replace(/\b(?:kb|kbs|kettle bells?)\b/g, 'kettlebell')
            .replace(/\bpush ups?\b/g, 'pushup')
            .replace(/\bpress ups?\b/g, 'pressup')
            .replace(/\bpull ups?\b/g, 'pullup')
            .replace(/\bchin ups?\b/g, 'chinup')
            .replace(/\bsit ups?\b/g, 'situp')
            .replace(/\bpull downs?\b/g, 'pulldown')
            .replace(/\bdead lifts?\b/g, 'deadlift')
            .replace(/\bstep ups?\b/g, 'step up')
            .replace(/\bv ups?\b/g, 'vup')
            .replace(/\bvups?\b/g, 'vup')
            .replace(/\b(?:flyes|flies|flys)\b/g, 'fly')
            .replace(/\b(?:biceps|bicep)\b/g, 'bicep')
            .replace(/\b(?:triceps|tricep)\b/g, 'tricep')
            .replace(/\bpresses\b/g, 'press')
            .replace(/\b([a-z]{2,}[^s])s\b/g, '$1')
            .replace(/\s+/g, ' ').trim();
    }

    function aliasesFor(name) {
        const aliases = new Set();
        const add = value => { if (value) aliases.add(normalize(value)); };
        const replace = (pattern, replacement) => {
            if (pattern.test(name)) add(name.replace(pattern, replacement));
        };

        replace(/\bpushup\b/, 'pressup');
        replace(/\brdl\b/, 'romanian deadlift');
        replace(/\bromanian deadlift\b/, 'rdl');
        replace(/\bromanian deadlift\b/, 'romanian dl');
        replace(/\bstiff leg deadlift\b/, 'sldl');
        replace(/\bleg curl\b/, 'hamstring curl');
        replace(/\bleg extension\b/, 'quad extension');
        replace(/\bleg extension\b/, 'knee extension');
        replace(/\bcalf raise\b/, 'heel raise');
        replace(/\blateral raise\b/, 'side raise');
        replace(/\blateral raise\b/, 'side lateral raise');
        replace(/\brear delt fly\b/, 'reverse fly');
        replace(/\btricep pushdown\b/, 'tricep pressdown');
        replace(/\bface pull\b/, 'facepull');
        replace(/\bstep up\b/, 'box step up');
        replace(/\breverse lunge\b/, 'backward lunge');
        replace(/\bwalking lunge\b/, 'walking lunge');
        replace(/\bbird dog\b/, 'birddog');
        replace(/\bdead bug\b/, 'deadbug');
        replace(/\bside plank\b/, 'side bridge');
        replace(/\bbarbell row\b/, 'bent over row');
        replace(/\bfarmer walk\b/, 'farmer carry');
        replace(/\binverted row\b/, 'bodyweight row');
        replace(/\binverted row\b/, 'australian row');
        replace(/\binverted row\b/, 'australian pullup');
        replace(/\baustralian pullup\b/, 'inverted row');
        replace(/\baustralian pullup\b/, 'bodyweight row');
        replace(/\bbulgarian split squat\b/, 'rear foot elevated split squat');
        replace(/\bbulgarian split squat\b/, 'rfess');
        replace(/\boverhead press\b/, 'shoulder press');
        replace(/\bdumbbell shoulder press\b/, 'dumbbell overhead press');
        replace(/\bdumbbell shoulder press\b/, 'dumbbell ohp');
        replace(/\bmachine shoulder press\b/, 'machine overhead press');
        replace(/\bseated cable row\b/, 'seated row');
        replace(/\b(?:cable crossover|cable fly)\b/, 'chest cable fly');

        if (name === 'deadlift') {
            add('conventional deadlift');
            add('barbell deadlift');
        }
        if (name === 'barbell bench press') {
            add('bench');
            add('flat bench');
            add('flat bench press');
            add('barbell bench');
        }
        if (name === 'dumbbell bench press') add('dumbbell chest press');
        if (name === 'chest press machine') add('machine chest press');
        if (name === 'back squat' || name === 'barbell back squat') {
            add('barbell squat');
            add('barbell back squat');
        }
        if (name === 'goblet squat') add('dumbbell goblet squat');
        if (name === 'barbell curl') add('barbell bicep curl');
        if (name === 'dumbbell curl') add('dumbbell bicep curl');
        if (name === 'overhead press') {
            add('ohp');
            add('military press');
            add('strict press');
        }
        if (name === 'skull crusher') add('lying tricep extension');
        if (name === 'pallof press') add('anti rotation press');
        if (name === 'rowing machine') {
            add('rower');
            add('rowing erg');
            add('ergometer');
        }
        if (name === 'rowing') {
            add('rower');
            add('rowing machine');
            add('rowing erg');
        }
        if (name === 'stationary bike') {
            add('exercise bike');
            add('spin bike');
            add('indoor cycling');
        }
        if (name === 'cycling') {
            add('exercise bike');
            add('spin bike');
            add('stationary bike');
        }
        if (name === 'elliptical') {
            add('elliptical trainer');
            add('cross trainer');
        }
        if (name === 'stair climber') {
            add('stepmill');
            add('stair machine');
        }
        if (name === 'assault bike' || name === 'airdyne bike') add('air bike');
        if (name === 'jump rope') {
            add('skip rope');
            add('skipping rope');
        }
        if (name === 'running') {
            add('run');
            add('jog');
            add('jogging');
        }
        if (name === 'treadmill running') add('treadmill jogging');
        if (name === 'chinup') {
            add('underhand pullup');
            add('supinated pullup');
        }

        aliases.delete(name);
        return [...aliases];
    }

    function indexExercise(exercise) {
        if (!exercise || typeof exercise !== 'object') {
            const name = normalize(exercise);
            return { name, aliases: aliasesFor(name), metadata: [] };
        }
        let result = cached.get(exercise);
        if (result) return result;
        const name = normalize(exercise.name);
        const metadata = [exercise.description, exercise.equipment,
            ...(Array.isArray(exercise.primaryMuscles) ? exercise.primaryMuscles : [])]
            .filter(Boolean).map(normalize);
        result = { name, aliases: aliasesFor(name), metadata };
        cached.set(exercise, result);
        return result;
    }

    function distanceWithin(a, b, limit) {
        if (Math.abs(a.length - b.length) > limit) return false;
        const rows = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
        for (let i = 0; i <= a.length; i++) rows[i][0] = i;
        for (let j = 0; j <= b.length; j++) rows[0][j] = j;
        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                rows[i][j] = Math.min(
                    rows[i - 1][j] + 1,
                    rows[i][j - 1] + 1,
                    rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
                );
                if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                    rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
                }
            }
        }
        return rows[a.length][b.length] <= limit;
    }

    function phraseScore(phrase, query, tokens, isName) {
        if (phrase === query) return isName ? 100 : 95;
        const compactPhrase = phrase.replace(/ /g, '');
        const compactQuery = query.replace(/ /g, '');
        if (compactPhrase === compactQuery) return isName ? 92 : 89;
        if (phrase.includes(query)) return isName ? 86 : 82;
        if (compactQuery.length >= 6 && compactPhrase.includes(compactQuery)) return isName ? 80 : 78;
        const words = phrase.split(' ');
        if (tokens.every(token => words.includes(token))) return isName ? 76 : 72;
        if (tokens.every(token => words.some(word => word.startsWith(token)))) return isName ? 69 : 65;
        const fuzzy = tokens.every(token => words.some(word => {
            if (word === token) return true;
            if (token.length < 5 || word.length < 5) return false;
            const limit = token.length >= 8 || (tokens.length > 1 && token.length >= 6) ? 2 : 1;
            return distanceWithin(token, word, limit);
        }));
        return fuzzy ? (isName ? 58 : 54) : 0;
    }

    function search(exercises, query) {
        const normalizedQuery = normalize(query);
        if (!normalizedQuery) return exercises.slice();
        const tokens = normalizedQuery.split(' ');
        const hits = exercises.map((exercise, index) => {
            const entry = indexExercise(exercise);
            // Australian pull-ups are horizontal rows, not vertical pull-ups.
            if (normalizedQuery === 'pullup' &&
                /\b(?:australian pullup|inverted row)\b/.test(entry.name)) {
                return { exercise, index, score: 0 };
            }
            let score = phraseScore(entry.name, normalizedQuery, tokens, true);
            for (const alias of entry.aliases) {
                // A grip-qualified chin-up synonym must not turn a plain pull-up
                // search into a chin-up result.
                if ((alias === 'underhand pullup' || alias === 'supinated pullup') &&
                    !/\b(?:underhand|supinated)\b/.test(normalizedQuery)) continue;
                score = Math.max(score, phraseScore(alias, normalizedQuery, tokens, false));
            }
            if (!score && entry.metadata.some(field => field.includes(normalizedQuery))) score = 35;
            return { exercise, index, score };
        }).filter(hit => hit.score > 0);
        const hasStrongNameMatch = hits.some(hit => hit.score >= 65);
        return hits.filter(hit => !hasStrongNameMatch || (hit.score !== 58 && hit.score !== 54))
            .sort((a, b) => b.score - a.score || a.index - b.index)
            .map(hit => hit.exercise);
    }

    const api = { normalize, search };
    root.ExerciseSearch = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
