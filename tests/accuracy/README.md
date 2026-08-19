# Food Accuracy Program

This suite answers four separate questions instead of hiding them inside one final calorie number:

1. What did the iPhone hear or the camera see?
2. Did the app identify the right food, brand, count, size, and serving?
3. Did it select defensible nutrition data?
4. Did quantity math and final totals remain consistent through the API and UI?

## Offline release gate

```bash
npm run test:accuracy
```

This uses fixture predictions only. It makes zero AI calls and writes `latest.json`, `latest.md`, and `latest.html` under `output/accuracy`.

The gate fails on:

- a calorie error above 30%;
- food identity below the configured similarity threshold;
- a missing or extra food when an expected count is supplied;
- declared API totals that differ from independently recomputed food lines;
- a high-confidence catastrophic miss;
- excessive aggregate error, catastrophic rate, or latency;
- missing required speech tokens in challenge cases.

Visible package labels and dictated nutrition values are held to 1% relative error with a one-unit absolute allowance. Official branded values allow 10%. Generic visual estimates allow 15%, but they must not claim high confidence when badly wrong.

## Capped live runner

```bash
npm run test:accuracy:live
```

Defaults:

- at most 5 live calls;
- at most $0.25 conservative estimated spend;
- $0.03 assumed for voice and $0.05 for photo in the TestFlight Lab;
- the CLI uses $0.05 per call unless overridden.

The cost is a conservative guardrail, not provider billing data. The hard call count is authoritative. To test a TestFlight export:

```bash
node tests/accuracy/run-food-accuracy.mjs \
  --mode=live \
  --dataset=/path/to/well-fit-food-accuracy-export.json \
  --max-live-calls=5 \
  --max-estimated-cost-usd=0.25 \
  --gate=false
```

## TestFlight Accuracy Lab

The Lab is intentionally absent from normal navigation. From Account, tap `Well Fit Pro v1.1` seven times. A short-lived server authorization is required in addition to AI entitlement.

Voice workflow:

1. Select a challenge phrase or enter a custom intended phrase.
2. Run it three times on the same physical iPhone.
3. The native plugin requests a final top-five result, preserving the raw best transcript and alternatives.
4. Analyze the unmodified transcript through the production voice parser.
5. Verify the correct food names, count, calories, and macros, then save.

Photo workflow:

1. Photograph the meal, package, or Nutrition Facts panel.
2. Record brand, label visibility, amount pictured, and a scale reference when available.
3. The Lab sends the compressed image through the production vision endpoint.
4. Correct the ground truth from a label, official source, measured recipe, or documented estimate.
5. Save the original model response and verified truth as separate values.

Lab cases are stored in a dedicated IndexedDB database. They do not change meal logs or learned-food memory. Compressed photos remain on the device until deletion or explicit export. No audio is retained.

## Dataset growth target

Before treating percentage metrics as stable, collect at least 30 cases in each major cohort:

- visible Nutrition Facts labels;
- known branded packages;
- restaurant items;
- generic single foods;
- mixed meals;
- small, standard, and large portion variants;
- one to six items in one voice utterance;
- difficult brands and speech spellings;
- cold-memory and learned-memory runs;
- bright, dim, angled, and partially occluded photos.

Do not duplicate one image to inflate the count. Use different devices, lighting, distances, plates, voices, and accents where consent allows.

## Schema and privacy

`food-accuracy.schema.json` is the canonical interchange format. Exports include inputs, original predictions, verified truth, metrics, and provenance. They must never include AI access tokens, RevenueCat IDs, email, health records, or complete meal history.

Import is JSON-only, version checked, and local. Review imported cases before running them live. Live reruns remain subject to the session budget.
