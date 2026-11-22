[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/kunkuro30/expected-value-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/kunkuro30/expected-value-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

# expected-value-radar

A token launch radar that ranks pre-token protocols by **expected value**: a fitted
launch price — what a protocol's token would be worth if it launched — times fitted
**odds** that a launch ever comes. Both models are fitted on the sealed snapshot's own
figures (DefiLlama protocols, 758 of them, fetched once by the house) and nothing else.

## The price

The peers are the snapshot's launch-type tokens that trade today: 94 protocols with a
market cap, minus the wrapper categories (Bridge, Canonical Bridge, Liquid Staking,
Liquid Restaking, Restaked BTC, CEX), whose market caps price an underlying asset
rather than a launch of their own. A protocol's launch price is

```
TVL x shrunk category median of (market cap / TVL) x exp(intercept + size slope x (log TVL - mean log TVL))
```

with the category medians shrunk toward the peer median (K = 4) and the slope fitted by
robust (Huber) regression on log residuals, so one wild peer cannot bend the board.

## The odds

Every protocol whose listing day the snapshot reports (645 of 758) is one draw from the
record: it records a token today, or it does not. A logistic fit on tokenless age, size
and seven-day growth gives each pre-token protocol the odds that a protocol with its
record is one that lists. The board ranks by price x odds and shows both factors on
every row.

## What was tested and dropped

The program re-grades every candidate term at run time, on two holdouts — leave-one-out
over the peer set and an older-to-newer time split — and the dashboard prints the whole
table. On this snapshot: a momentum / mean-reversion regime split of the pricing, an
age slope inside the price, a seven-day growth term and a doubled shrink each failed
to beat the shipped price on both holdouts, and each is out. The odds fit is graded on
its own time split (Brier score against the base rate, and AUC) and printed beside the
board. Rank ranges come from 150 bootstrap refits of the peer set.

## The board

Launch candidates only: protocols that record no token in the snapshot and pass the
same screen the house's watchlist rule draws — no wrapped, staked or bridged products
of a token that already trades, no versioned clones, no exchange products — unioned
with the whole 40-protocol watchlist. Every row carries a farm plan whose steps state
their cost and time, an all-in plan cost (steps plus a 5%/yr capital lockup), and a
verdict under one stated rule: FARM needs at least $1M of expected value, at least
10% fitted odds and at least 1,000x the plan's all-in cost; THIN is the same shape
at $250K, 4% and 100x; SKIP below that.

## Running it

```
node main.ts --input <snapshot.json|directory>   # writes board.json, data.js,
                                                 # dashboard/, screenshots/, dossier.json
```

Node 22, standard library only. The run is deterministic: no clock reads, no network,
and the refits use a fixed seed, so two runs write the same bytes.
