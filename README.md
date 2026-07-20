# Signal402

**The verifiable intelligence layer for prediction markets.**

Signal402 pulls prediction markets from several sources into one comparable view, strips the bookmaker margin to show true implied probabilities, and attaches an on-chain proof receipt to World Cup markets so the data can prove itself instead of asking for trust.

It is a research and intelligence tool, not a betting platform. It displays public market data and explains it. It never recommends a bet, never takes a position, and never moves funds.

Live: `https://signal402-screener.vercel.app`

## What it does

Signal402 brings three kinds of prediction market into one board and adds a layer of intelligence on top of every market.

### One comparable board

Markets from Polymarket (real money), Manifold (play money), and the TxLINE World Cup feed on Solana, in a single sortable and searchable table with categories for Sports, Politics, Crypto, Economy, and more. Real money and play money volume are kept separate and never summed.

### Demargined probabilities

World Cup markets show the vig removed implied probability from TxLINE's consensus odds, so the number on screen is the market's honest read, not the bookmaker's padded price.

### Verifiable resolution

Every TxLINE market carries a Merkle proof receipt that traces the fixture to its on-chain commitment on Solana. The proof is revealed in clear stages, fetching the proof, reading the fixture leaf, walking the Merkle path, and anchoring to the on-chain root, ending in a verified seal. The data proves itself.

### Signal Score

Every market gets a Signal Score from 0 to 100 that measures observable activity, how far the odds have moved, how much volume and liquidity sit behind it, whether a match is live, and whether other sources disagree on the same question. It is a sortable column, so the most active markets rise to the top with one click. The score measures activity, not opportunity. It is never a prediction and never advice.

### Replay

A time slider on every market lets you scrub through its real history. Drag backward and forward to watch the probability, the price per share, and the change since the start move point by point, with a sparkline and a playhead marking where you are. Replay reconstructs history from real data: Polymarket price history, Manifold trade history, and TxLINE odds sampled over time. Where a market has no history yet, it says so plainly rather than drawing a fake line.

### Investigation Mode

Open an investigation on any market and Signal402 becomes an analyst. It gathers only real, observable facts, the probability change over the recent window, current volume and liquidity, whether an on-chain proof exists, and any gap against another source, then explains what changed and what it plausibly reflects. It answers why a market moved, what evidence exists, and how reliable that evidence is. It explains. It never recommends.

### Activity Radar

A dashboard panel that surfaces the most active markets on the board right now, ranked by Signal Score, each with the single factor driving it. It tells you where to look, not what to do.

### Compare

A cross-source view that groups the same question across platforms and surfaces the disagreement between them, for example Polymarket at 66 percent against Manifold at 61 percent, a five point gap. Cross-market disagreement is presented as an observable fact, not a call on which source is right.

### Deeper reads on every market

Payoff math for what each side pays and the break even, a trust score for how much to believe the number, resolution transparency for who settles the market and whether it is independently verifiable, the money on each side, and a calibration view that checks whether markets priced at a given probability actually resolved at that rate, drawn live from Manifold's resolved history.

## Business model

Signal402 is built to earn like an infrastructure and information product, not a sportsbook. There are no subscriptions and nothing that depends on users placing bets. The model follows the pattern of a data terminal:

- Listing and enhanced information fees for markets and sources that want richer presentation on the board. Ranking itself is never for sale.
- Source onboarding for new prediction market venues that want to appear in the comparable view.
- Pay per report, where a user or desk pays for a packaged intelligence report on a market or an event.
- A metered API for programmatic access to the aggregated and demargined data.
- Embeds and white label, so publishers and partners can place the board and the proof receipts inside their own products.

Revenue comes from access, presentation, and reporting, never from taking a side in a market.

## Tech

Next.js with the App Router and React, styled with Tailwind, deployed on Vercel. Data comes from the TxLINE feed on Solana, the Polymarket Gamma and Data APIs, and the Manifold API. A unified history route normalizes real time series from all three sources into one shape. The verifiable resolution UI reads Merkle proofs committed on Solana. All animations are hand built with SVG and CSS, with no video or third party media.

The app never holds a wallet key. It stores only the long lived TxLINE API token and fetches a short lived guest token on demand.

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

Copy `.env.local.example` to `.env.local` and fill in the required values. `.env.local` is gitignored and never committed. The file documents which keys the app needs; no secret ever belongs in the repository.

## Honest boundaries

Signal402 shows real data and labels its limits rather than faking anything:

- Polymarket per side money is a top holder view, the top twenty per side from the public Data API, not the full pot. Full totals would need an on-chain indexer.
- Calibration is Manifold only for now, since it uses that platform's resolved price history.
- On the TxLINE development network, odds move very little, so Replay and Investigation are real but nearly flat for World Cup markets there. They come alive on live, actively traded markets and on the main network. History is never fabricated to look more active than it is.
- Participant counts are wallets or accounts, never verified people.
- Real money volume and play money volume are kept separate and never summed.
- The analysis features explain and inform. They do not give betting advice.

## Roadmap

Planned work, in rough order of value:

- Market DNA, a compact fingerprint of a market's character, drawn from its observable traits.
- Saved watchlists, so a user can follow a set of markets across sources.
- Alerts on real changes, which will require background jobs and stored state.
- Exportable intelligence reports, tied to the pay per report model.
- More prediction market integrations, each a real data source added to the board.
- Wallet connection, kept read only with no custody, added later and treated as the most sensitive surface in the product.

## Status

Built for the TxLINE World Cup hackathon, Prediction Market Viewer track. Research and intelligence tool only. Not financial advice, and not a venue for placing bets.
