import assert from "node:assert/strict"
import test from "node:test"

import { presentMatch } from "./presentation.ts"
import type { VacancyMatch } from "./types.ts"

const match = (score: number, precise = true): VacancyMatch => ({
  score,
  precise,
  reason: "",
  evidence: {},
  scored_at: "2026-08-21T12:00:00Z",
})

test("presents precise score bands and honest incomplete states", () => {
  assert.deepEqual(presentMatch(match(70)), {
    label: "70% відповідність",
    tone: "high",
    precise: true,
  })
  assert.equal(presentMatch(match(40)).tone, "medium")
  assert.equal(presentMatch(match(39)).tone, "low")
  assert.deepEqual(presentMatch(match(92, false)), {
    label: "Недостатньо даних",
    tone: "unknown",
    precise: false,
  })
  assert.deepEqual(presentMatch(null), {
    label: "Ще не оцінено",
    tone: "unknown",
    precise: false,
  })
})
