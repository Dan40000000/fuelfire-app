#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

// A static app still needs a real build gate. Parse every shipped source,
// including inline scripts that a JavaScript-only lint command would miss.
const root = path.resolve('public');
const errors = [];
let scripts = 0;
function parse(source, filename, module = false) {
    try {
        if (module) {
            const result = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: source, encoding: 'utf8' });
            if (result.status !== 0) throw new Error(result.stderr || 'Module could not be parsed.');
        } else {
            new vm.Script(source, { filename });
        }
        scripts++;
    } catch (error) {
        errors.push(`${filename}: ${error.message}`);
    }
}
function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory()) { visit(filename); continue; }
        if (!/\.(?:html|m?js)$/.test(entry.name)) continue;
        const source = fs.readFileSync(filename, 'utf8');
        const label = path.relative(process.cwd(), filename);
        if (/\.m?js$/.test(entry.name)) {
            parse(source, label, entry.name.endsWith('.mjs') || /^\s*(?:import\s|export\s)/m.test(source));
            continue;
        }
        let index = 0;
        for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
            index++;
            const attributes = match[1];
            const src = attributes.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
            if (src) {
                if (/^(?:[a-z]+:|\/\/)/i.test(src)) continue;
                const localPath = src.split(/[?#]/)[0];
                const target = path.resolve(localPath.startsWith('/') ? root : directory, localPath.replace(/^\//, ''));
                if (!target.startsWith(`${root}${path.sep}`) || !fs.existsSync(target)) errors.push(`${label}: missing local script ${src}`);
                continue;
            }
            const type = attributes.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
            if (type && !['module', 'text/javascript', 'application/javascript'].includes(type)) continue;
            parse(match[2], `${label} inline script ${index}`, type === 'module');
        }
    }
}
visit(root);
if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
} else {
    console.log(`Validated ${scripts} shipped JavaScript and inline scripts; local script references resolve.`);
}
