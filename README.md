# btc-cent-forecast-01

A make.fun btc-cent-forecast-01 entry: a deadbanded 1h-momentum BTC forecaster (v2). Reads 4,320 one-minute BTC closes per case and forecasts the price 240 minutes ahead. Node 22, standard library only, fully deterministic.

## Run

`node main.ts` — reads cases from `$MAKEFUN_INPUT_DIR` (default `/input`), writes one forecast per case to `$MAKEFUN_OUTPUT_DIR` (default `/output`).
