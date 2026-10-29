import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { captureRequestRawBody } from '../../api/_lib/request-security.js';

describe('webhook runtime stream compatibility', () => {
    it('reads the exact body from a Vercel-restored consumed request without global helper changes', async () => {
        const raw = '{\n  "amount": 1.00, "name": "café"\n}';
        const request = new PassThrough();
        request.end(Buffer.from(raw));
        for await (const _chunk of request) { /* Runtime serialization consumes the original. */ }
        expect(request.destroyed).toBe(true);

        // Match Vercel's restoreBody implementation: the original object keeps
        // its consumed state, while read/data/end delegate to a new stream.
        const restored = new PassThrough();
        const on = restored.on.bind(restored);
        const originalOn = request.on.bind(request);
        request.read = restored.read.bind(restored);
        request.on = request.addListener = (name, callback) =>
            name === 'data' || name === 'end' ? on(name, callback) : originalOn(name, callback);
        Object.defineProperty(request, 'body', { get() { throw new Error('Do not read parsed helpers'); } });
        restored.end(Buffer.from(raw));

        expect(await captureRequestRawBody(request)).toMatchObject({ ok: true, rawBody: raw });
    });

    it('bounds an ordinary Node request before retaining an oversized body', async () => {
        const request = new PassThrough();
        const captured = captureRequestRawBody(request, { maxBytes: 4 });
        request.end(Buffer.from('12345'));
        expect(await captured).toMatchObject({ ok: false, reason: 'body_too_large', bytes: 5 });
    });

    it('fails closed for an already-consumed request without a restored body', async () => {
        const request = new PassThrough();
        request.end('consumed');
        for await (const _chunk of request) { /* no restored runtime stream */ }
        expect(await captureRequestRawBody(request)).toMatchObject({ ok: false, reason: 'raw_body_unavailable' });
    });
});
