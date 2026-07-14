# Signal402

**The verifiable data layer for prediction markets.**

Signal402 pulls prediction markets from multiple sources into one comparable view, strips the bookmaker margin to show true implied probabilities, and attaches an on-chain proof receipt to World Cup markets so the data can prove itself instead of asking for trust.

It is a research and intelligence tool, not a betting platform. It displays public market data and explains it. It never recommends a bet, never takes a position, and never moves funds.

Live: `https://signal402-screener.vercel.app`

## What it does

- **Aggregated board.** Markets from Polymarket (real money), Manifold (play money), and the TxLINE World Cup feed on Solana, in one sortable, searchable view with categories (Sports, Politics, Crypto, Economy, and more).
- **Demargined probabilities.** World Cup markets show the vig-removed implied probability from TxLINE's consensus odds.
- **Verifiable resolution.** Every TxLINE market carries a Merkle proof receipt tracing the fixture to its on-chain commitment on Solana.
- **An intelligence layer on every market:**
  - Payoff math: what each side pays, break-even, and edge versus consensus.
  - A trust score that tells you how much to believe the number.
  - Resolution transparency: who resolves each market and whether it is independently verifiable.
  - Cross-source divergence and a liquidity-weighted consensus in the Compare view.
  - Money on each side: current stake per side (Manifold) and top-holder lean (Polymarket).
  - Calibration: whether markets priced at X% actually resolved Yes about X% of the time, live from Manifold's resolved history.
- **A grounded event copilot.** Ask about any market or the event behind it. It grounds real facts with web search and analyzes the event, and it never tips a wager.
- **Live World Cup ticker and per-market visuals**, driven by real data.

## Tech

Next.js (App Router) and React, Tailwind, deployed on Vercel. Data from the TxLINE (TxOdds) feed on Solana, the Polymarket Gamma and Data APIs, and the Manifold API. The copilot uses the Anthropic API with web search. All animations are hand-built SVG and CSS; no video or third-party media.

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

### Environment variables

Create `.env.local` (gitignored):

```
TXLINE_API_ORIGIN=   # TxLINE API base URL
TXLINE_API_TOKEN=    # TxLINE long-lived API token (World Cup free tier)
ANTHROPIC_API_KEY=   # powers the event copilot
# FOOTBALL_DATA_KEY= # optional; enables a structured sports-data layer for the copilot
```

The app never holds a wallet key. It stores only the long-lived TxLINE API token and fetches a short-lived guest JWT on demand.

## Honest boundaries

Signal402 shows real data and labels its limits rather than faking anything:

- Polymarket per-side money is a **top-holder** view (top 20 per side from the public Data API), not the full pot. Full totals would need an on-chain indexer.
- Calibration is **Manifold only** for now, since it uses that platform's resolved-price history.
- Participant counts are **wallets or accounts**, never verified people.
- Real-money volume (Polymarket) and play-money volume (Manifold) are kept separate and never summed.
- The copilot analyzes and informs. It does not give betting advice.

## License / status

Built for the TxLINE World Cup hackathon (Prediction Market Viewer track). Research tool only; not financial advice, and not a venue for placing bets.
