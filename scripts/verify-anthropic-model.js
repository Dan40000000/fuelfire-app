#!/usr/bin/env node

/**
 * Ensures that Anthropic model identifiers only live inside api/_lib/anthropic.js.
 * This prevents regressions where individual endpoints hard-code outdated models.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, 'api');
const ALLOWED_FILE = path.join(API_DIR, '_lib', 'anthropic.js');
const MODEL_REGEX = /claude-[0-9a-zA-Z\-.]+/g;

function collectFiles(dir) {
    const entries = fs.readdirSync(dir);
    const files = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            files.push(...collectFiles(fullPath));
        } else if (stats.isFile() && fullPath.endsWith('.js')) {
            files.push(fullPath);
        }
    }

    return files;
}

function main() {
    const files = collectFiles(API_DIR);
    const violations = [];

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const matches = content.match(MODEL_REGEX);

        if (!matches) continue;

        if (file === ALLOWED_FILE) {
            continue;
        }

        violations.push({ file, matches: Array.from(new Set(matches)) });
    }

    if (violations.length) {
        console.error('❌ Anthropic model identifier(s) found outside api/_lib/anthropic.js:');
        for (const violation of violations) {
            console.error(` - ${path.relative(ROOT, violation.file)} -> ${violation.matches.join(', ')}`);
        }
        console.error('Update the code to rely on api/_lib/anthropic.js instead of hard-coding models.');
        process.exit(1);
    }

    console.log('✅ Anthropic model identifiers are centralized in api/_lib/anthropic.js.');
}

main();
