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

This uses stored fixture predictions only. It makes zero AI calls, does not load local provider credentials, and writes `latest.json`, `latest.md`, and `latest.html` under `output/accuracy`. A passing fixture score is not evidence of live photo, speech, or nutrition accuracy. The report identifies its evidence type and selected/scored case counts.

Missing predictions, empty selections, duplicate case IDs, invalid ground truth, and incomplete selected runs cannot produce a passing release gate.

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

Live execution requires explicit `--allow-live=true`. The call cap counts submitted cases, not individual provider requests: retries and multi-stage analysis can make multiple upstream calls within a case. The spend estimate is not a billing guarantee; use the server-side provider budget/quota and provider-account spending controls as well. To evaluate a separately prepared accuracy dataset:

```bash
node tests/accuracy/run-food-accuracy.mjs \
  --mode=live \
  --allow-live=true \
  --dataset=/path/to/well-fit-food-accuracy-export.json \
  --max-live-calls=5 \
  --max-estimated-cost-usd=0.25 \
  --gate=false
```

## Physical iPhone verification

The supported automated entry point is the CLI above. There is no hidden Accuracy Lab shortcut in the current account screen. An ordinary account backup is not an accuracy dataset and must not be sent to a model for evaluation.

Voice workflow:

1. Select a challenge phrase and record the intended phrase separately from the recognized text.
2. Run it three times on the same physical iPhone.
3. Record the app's recognized text and available alternatives without silently correcting the prediction.
4. Analyze the unmodified transcript through the production voice parser.
5. Prepare a dataset case with the original prediction and independently verified food names, count, calories, and macros.

Photo workflow:

1. Photograph the meal, package, or Nutrition Facts panel.
2. Record brand, label visibility, amount pictured, and a scale reference when available.
3. Test the app's photo flow and retain the original prediction separately from corrections.
4. Correct the ground truth from a label, official source, measured recipe, or documented estimate.
5. Use local JPEG, PNG, or WebP files inside the dataset directory, at most 8 MiB per image. Parent-directory escapes and nonimage files are rejected by the runner. Do not include people, receipts, addresses, or other identifying background information.

Run evaluation against a dedicated synthetic/test profile, not a person's production meal history or learned-food memory. Sharing a dataset or submitting it live is an explicit action. Do not claim camera/microphone permission, background recovery, or native bridge verification from a CLI-only result.

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

Datasets are JSON-only and version checked. Review every case and image before live submission. Keep ground truth, capture conditions, provider/model version, latency, and original prediction separate. Compare cold-memory and learned-memory runs rather than combining them into a single apparent accuracy percentage. A run that exhausts its case/spend cap is incomplete and cannot pass a release gate.
