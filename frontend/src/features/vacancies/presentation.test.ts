import assert from "node:assert/strict"
import test from "node:test"

import {
  formatFullPublicationDate,
  kyivToday,
  presentMatch,
} from "./presentation.ts"
import type { VacancyMatch } from "./types.ts"

const match = (score: number, precise = true): VacancyMatch => ({
  score,
  precise,
  reason: "",
  evidence: { items: [], evidence_coverage: 0 },
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

test("formats a YYYY-MM-DD calendar date as its own local day regardless of the viewer's time zone", () => {
  const formatted = formatFullPublicationDate("2026-08-22")

  assert.match(formatted, /22 серпня 2026/)
  assert.doesNotMatch(formatted, /21 серпня 2026/)
})

test("kyivToday returns the Kyiv calendar date, not the viewer's local date", () => {
  // 2026-09-24T20:30Z is 2026-09-24 23:30 in Kyiv (UTC+3) but already
  // 2026-09-25 00:30 in a browser east of Kyiv, such as Tbilisi (UTC+4).
  const instant = new Date("2026-09-24T20:30:00Z")

  assert.equal(kyivToday(instant), "2026-09-24")
})
