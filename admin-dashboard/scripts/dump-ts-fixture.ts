/**
 * DEV-ONLY fixture dumper (never shipped, never imported by the app).
 *
 * Imports the real `mplads-mock.ts` module and JSON-dumps its exported
 * collections to `backend/tests/fixtures/ts-demo-dataset.json`, which
 * `backend/tests/test_seed_parity.py` compares against the Python port.
 *
 * Run from `admin-dashboard/` (so tsconfig paths resolve):
 *   npx -y tsx scripts/dump-ts-fixture.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

import * as mock from "../src/lib/mplads-mock";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, "../../backend/tests/fixtures/ts-demo-dataset.json");

const dataset = {
  works: mock.works,
  anomalies: mock.anomalies,
  evidences: mock.evidences,
  activities: mock.activities,
  geoRollup: mock.geoRollup,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(dataset, null, 2) + "\n");
console.log(`fixture written: ${outPath}`);
console.log(
  `works=${dataset.works.length} anomalies=${dataset.anomalies.length} ` +
    `evidences=${dataset.evidences.length} activities=${dataset.activities.length}`,
);
