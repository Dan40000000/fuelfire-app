/* Shared, catalog-aware exercise search for the workout guides. */
(function (root) {
    'use strict';

    const cached = new WeakMap();

    function normalize(value) {
        return String(value || '')
            .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().replace(/&/g, ' and ').replace(/[’']/g, '')
            // Expand equipment abbreviations before punctuation and whitespace
            // are removed. The lookahead deliberately allows joined queries
            // such as "dbbench" and "kbswing" while keeping words like
            // "adbench" untouched.
            .replace(/\b(?:d\s*\.?\s*b\.?|dbs?)(?=[a-z0-9]|\s|$)/g, 'dumbbell ')
            .replace(/\b(?:b\s*\.?\s*b\.?|bbs?)(?=[a-z0-9]|\s|$)/g, 'barbell ')
            .replace(/\b(?:k\s*\.?\s*b\.?|kbs?)(?=[a-z0-9]|\s|$)/g, 'kettlebell ')
            .replace(/\btbar(?=row\b|\s|$)/g, 't bar ')
            .replace(/[^a-z0-9]+/g, ' ').trim()
            // A joined equipment prefix is common in quick searches.
            .replace(/\b(dumbbell|barbell|kettlebell)(?=[a-z])/g, '$1 ')
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
            // Keep singularisation limited to exercise terms. A broad
            // trailing-s rule corrupts ordinary words such as "classes".
            .replace(/\bpresses\b/g, 'press')
            .replace(/\brows\b/g, 'row')
            .replace(/\bcurls\b/g, 'curl')
            .replace(/\bdips\b/g, 'dip')
            .replace(/\braises\b/g, 'raise')
            .replace(/\blunges\b/g, 'lunge')
            .replace(/\bsquats\b/g, 'squat')
            .replace(/\bdeadlifts\b/g, 'deadlift')
            .replace(/\bthrusts\b/g, 'thrust')
            .replace(/\bbridges\b/g, 'bridge')
            .replace(/\bpullups\b/g, 'pullup')
            .replace(/\bpushups\b/g, 'pushup')
            .replace(/\bpulldowns\b/g, 'pulldown')
            .replace(/\bcrunches\b/g, 'crunch')
            .replace(/\bcrushers\b/g, 'crusher')
            .replace(/\btwists\b/g, 'twist')
            .replace(/\bwalks\b/g, 'walk')
            .replace(/\bcarries\b/g, 'carry')
            .replace(/\bextensions\b/g, 'extension')
            .replace(/\bface pulls\b/g, 'face pull')
            .replace(/\bshrugs\b/g, 'shrug')
            .replace(/\bjumps\b/g, 'jump')
            .replace(/\bplanks\b/g, 'plank')
            .replace(/\bbugs\b/g, 'bug')
            .replace(/\bburpees\b/g, 'burpee')
            .replace(/\bcrossovers\b/g, 'crossover')
            .replace(/\bclimbers\b/g, 'climber')
            .replace(/\bjacks\b/g, 'jack')
            .replace(/\bget ups\b/g, 'get up')
            .replace(/\s+/g, ' ').trim();
    }

    // These are common names for the movements that actually exist in one or
    // more of the app's catalogs. Keeping the table explicit prevents a query
    // for a specific variation from silently matching an unrelated movement.
    const aliasRules = [
        { match: /^barbell bench press$/, aliases: [
            'flat barbell press', 'barbell chest press', 'flat bench press'
        ] },
        { match: /^incline barbell press$/, aliases: [
            'incline bench press', 'incline barbell bench'
        ] },
        { match: /^(?:dumbbell )?fly(?: on floor)?$/, aliases: [
            'chest fly', 'pec fly'
        ] },
        { match: /^incline dumbbell fly$/, aliases: [
            'incline chest fly', 'incline pec fly'
        ] },
        { match: /^(?:low|mid|high) cable fly$/, aliases: [
            'chest fly', 'pec fly'
        ] },
        { match: /^(?:cable crossover|chest cable fly)$/, aliases: [
            'chest fly', 'pec fly'
        ] },
        { match: /^pec deck machine$/, aliases: [
            'pec fly', 'chest fly', 'machine fly'
        ] },
        { match: /^dip$/, aliases: [
            'chest dip', 'parallel bar dip'
        ] },
        { match: /^(?:floor press|dumbbell floor press)(?: feet up)?$/, aliases: [
            'floor press'
        ] },
        { match: /^(?:svend press|dumbbell squeeze press|hex press)$/, aliases: [
            'squeeze press'
        ] },

        // Back and pulling movements.
        { match: /^pullup(?: if bar available)?$/, aliases: [
            'neutral grip pull up', 'parallel grip pull up'
        ] },
        { match: /^lat pulldown$/, aliases: [
            'cable lat pulldown', 'cable pull down'
        ] },
        { match: /^(?:single arm dumbbell row(?: .*)?|dumbbell row)$/, aliases: [
            'one arm row', 'dumbbell one arm row'
        ] },
        { match: /^(?:cable row|seated cable row|seated row)$/, aliases: [
            'low row', 'low cable row'
        ] },
        { match: /^shrug$/, aliases: [
            'dumbbell shrug'
        ] },
        { match: /^(?:farmer walk|farmers walk)(?: on)? toe?s?$/, aliases: [
            'farmer carry', 'farmers carry'
        ] },
        { match: /^(?:farmer walk|farmers walk)$/, aliases: [
            'farmer carry', 'farmers carry'
        ] },
        { match: /^bent over reverse fly$/, aliases: [
            'rear delt fly', 'rear deltoid fly'
        ] },
        { match: /^face pull(?: high)?$/, aliases: [
            'rope face pull', 'rope face pull high'
        ] },
        { match: /^rope face pull high$/, aliases: [
            'rope face pull'
        ] },

        // Shoulder variations.
        { match: /^(?:overhead press|military press)$/, aliases: [
            'seated overhead press', 'barbell shoulder press'
        ] },
        { match: /^(?:alternating dumbbell press|single arm dumbbell press)$/, aliases: [
            'single arm overhead press', 'single arm shoulder press'
        ] },
        { match: /^(?:lateral raise|cable lateral raise|incline lateral raise)$/, aliases: [
            'lateral shoulder raise'
        ] },

        // Lower-body names and abbreviations.
        { match: /^(?:back squat|barbell back squat)$/, aliases: [
            'high bar squat', 'low bar squat', 'high bar back squat',
            'low bar back squat'
        ] },
        { match: /^romanian deadlift$/, aliases: [
            'dumbbell rdl', 'dumbbell romanian deadlift'
        ] },
        { match: /^single leg deadlift$/, aliases: [
            'single leg rdl', 'single leg romanian deadlift'
        ] },
        { match: /^bulgarian split squat$/, aliases: [
            'bss'
        ] },
        { match: /^(?:walking lunge|lunge)$/, aliases: [
            'forward lunge'
        ] },
        { match: /^goblet squat$/, aliases: [
            'kettlebell squat', 'kettlebell goblet squat'
        ] },
        { match: /^glute ham raise$/, aliases: [
            'ghr'
        ] },

        // Core and cardio names.
        { match: /^turkish get up$/, aliases: [
            'tgu'
        ] },
        { match: /^running jogging$/, aliases: [
            'treadmill', 'treadmill running', 'treadmill jogging'
        ] },
        { match: /^(?:stair climbing|stair climber)$/, aliases: [
            'stairmaster', 'stair master', 'stepmill', 'stair climber',
            'stair stepper', 'stair machine'
        ] },
        { match: /^elliptical training$/, aliases: [
            'cross trainer', 'elliptical trainer'
        ] },
        { match: /^dance fitness$/, aliases: [
            'dance workout', 'dance cardio'
        ] },
        { match: /^pogo jump$/, aliases: [
            'ankle hops', 'ankle bounce'
        ] },
        { match: /^calf raise on leg press$/, aliases: [
            'calf press', 'leg press calf raise'
        ] }
    ];

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

        for (const rule of aliasRules) {
            if (rule.match.test(name)) rule.aliases.forEach(add);
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
