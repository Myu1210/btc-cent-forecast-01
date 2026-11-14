// btc-cent-forecast-01 — deadbanded 1h-momentum forecaster (v2).
//
// Reads each case in $MAKEFUN_INPUT_DIR (else /input): 4,320 one-minute BTC
// closes for the 72 h up to a checkpoint. Writes one forecast per case to
// $MAKEFUN_OUTPUT_DIR (else /output): the price expected 240 minutes later.
//
// Model v2 (practice 18,886.97 cents vs v1 32,713.69, persistence 47,054.66):
//   forecast = last * exp(drift), drift = 0.75 * 4 * log-return(1h),
//   clamped to +/-0.8% — BUT only when the last hour's move is material:
//   if |log-return(1h)| < 0.15%, forecast = last (persistence).
//
// Why this beats v1's drift-aware median:
//   - The 4h return was dropped: over 4 h the slow trend mostly reverses
//     (on practice it pulled p03 the wrong way and p04 the wrong way),
//     while the last hour's move carries the signal. A horizon scan over
//     15m/30m/1h/2h/4h/8h found 1h the best extrapolator.
//   - The deadband is a noise filter: a sub-0.15% hourly move is mostly
//     noise, and extrapolating it x4 hurt (v1's two losing cases, p00/p04,
//     both had |1h return| ~0.1%). The 0.15% threshold sits near the
//     median |1h return| (0.17%) of the practice histories, and the
//     practice score is flat across 0.11%-0.20%, so it is not knife-edge
//     tuned. Small moves -> persistence; material moves -> extrapolate.
//   - 0.75 damping and the +/-0.8% clamp are kept from v1: a 4h-ahead move
//     rarely carries the full scaled 1h trend.
// Absolute error is a proper scoring rule for the median, so the forecast
// is the honest middle estimate, not shaded up or down.
//
// Node 22 stdlib only, no dependencies, fully deterministic.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? "/input";
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// Drift model parameters (v2).
const DRIFT_SCALE = 0.75;
const CLAMP = 0.008; // +/-0.8%
const DEADBAND = 0.0015; // 0.15%: ignore smaller 1h moves (noise)

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

function forecast(prices: number[]): number {
  const n = prices.length;
  const last = prices[n - 1];
  if (!Number.isFinite(last) || last <= 0) return last;
  if (n < 61) return last; // not enough history: persistence
  const r1h = Math.log(last / prices[n - 61]);
  if (Math.abs(r1h) < DEADBAND) return last; // move too small to trust: persistence
  const drift = clamp(DRIFT_SCALE * 4 * r1h, -CLAMP, CLAMP);
  const price = last * Math.exp(drift);
  return Number.isFinite(price) && price > 0 && price < 1e7 ? price : last;
}

function main(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const files = readdirSync(INPUT_DIR)
    .filter((f) => f.endsWith(".in"))
    .sort();
  for (const file of files) {
    const data = JSON.parse(readFileSync(join(INPUT_DIR, file), "utf8"));
    const prices: number[] = data.markets[0].prices;
    const price = forecast(prices);
    const out = { forecasts: [{ case: data.case, price }] };
    writeFileSync(join(OUTPUT_DIR, file.replace(/\.in$/, ".out")), JSON.stringify(out));
  }
}

main();
