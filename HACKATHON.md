# Signal402 Technical Documentation

## Core idea

Signal402 is a prediction market screener. It pulls markets from multiple sources into one view so you can compare implied probabilities, volume, and movement in one place. It is a research and analysis tool, not a betting platform. It displays data and explains markets. It does not recommend bets, take positions, or move funds.

For this hackathon I added TxLINE as a data source for the 2026 World Cup. Each fixture from the TxLINE feed becomes a market in the screener, with its implied win probability drawn from TxLINE's demargined consensus odds and its match state drawn from the TxLINE scores feed. Every TxLINE market can also display its on-chain Merkle proof, a verifiable receipt that ties the displayed data back to the roots the TxLINE program commits on Solana.

This fits the Prediction Market Viewer track: a clean dashboard that tracks probabilities and market structure across World Cup prediction spaces, updating from the real-time feed, with an added verifiable-resolution layer.

## What TxLINE powers

TxLINE is the primary data source for the World Cup side of the app:

- The market list comes from the TxLINE fixtures snapshot.
- The implied win probability on each market comes from the TxLINE odds snapshot (the demargined 1X2 result percentage).
- The match state shown on each market (scheduled, live, finished) comes from the TxLINE scores snapshot.
- The verifiable-resolution receipt comes from the TxLINE fixture validation proof.

Polymarket and Manifold remain as secondary sources so the screener still works as a general tool, but the World Cup markets and their verification are entirely TxLINE.

## Architecture

The app is a Next.js application deployed on Vercel.

Access to TxLINE follows the free World Cup tier flow. I ran the on-chain subscription once from a devnet wallet: create the associated TxL token account, call the subscribe instruction (service level 1, duration in weeks), then get a guest JWT, sign the activation message, and activate the long-lived API token. That produced a stable API token.

In production the app never holds a wallet key. It stores only the long-lived API token as an environment variable and fetches a short-lived guest JWT on demand. Data calls send both the JWT (as a Bearer token) and the API token (as X-Api-Token). This keeps the server free of any signing key while still authenticating to the feed.

On the client side, TxLINE markets load separately from the main page render. The page paints immediately with the other sources, then the World Cup markets stream in from a server route that talks to TxLINE. This keeps the interface fast even when the upstream feed is slow, and it keeps TxLINE data isolated so a periodic refresh of the other sources never disturbs it. All outbound TxLINE fetches use a short timeout, so a slow or unavailable feed degrades gracefully instead of blocking the app.

The Merkle proof receipt is fetched on demand. When you expand a World Cup market and ask to verify, the app calls the TxLINE fixture validation endpoint and displays the fixture snapshot, the sub-tree root, and the main-tree proof path, with each node shown as a hash and its left or right position. This is the traceable record that lets a user follow the displayed data to the on-chain commitment without trusting the app itself.

## TxLINE endpoints used

- POST /auth/guest/start, get a guest JWT.
- POST /api/token/activate, activate the subscription and retrieve the long-lived API token (used once during setup).
- GET /api/fixtures/snapshot, the World Cup fixtures that become the market list.
- GET /api/odds/snapshot/{fixtureId}, latest odds per fixture; the demargined 1X2 percentage becomes the implied probability.
- GET /api/scores/snapshot/{fixtureId}, score events per fixture, used to derive the match-state label.
- GET /api/fixtures/validation, the Merkle proof for a fixture, shown as the verifiable-resolution receipt.

On-chain, the setup used the devnet subscribe instruction on the TxLINE program, with the associated token account created through the Token-2022 program.

## Technical highlights

- Full free-tier access proven end to end on devnet, from the on-chain subscription through to live data, with no wallet key on the server in production.
- Real demargined implied probabilities from TxLINE rendered directly into an existing multi-source screener, so World Cup markets sit alongside other prediction markets in one comparable view.
- A verifiable-resolution receipt built on the fixture validation proof, giving each market a traceable link to its on-chain commitment.
- Resilient data loading. TxLINE is decoupled from first paint, isolated in its own state, and time-boxed, so upstream slowness or brief outages never take the app down.

## Business model

Signal402 stays free for the people doing research. Nobody pays to browse markets, compare probabilities, or read a proof. Revenue comes from the projects, platforms, and builders who want to appear on it or pull data from it. This is the Dexscreener pattern: free for the crowd, fees for visibility and access. One rule sits above all of it, ranking and prominence are never for sale, so the data people see stays honest. That integrity is the product.

The revenue lines are fees, not subscriptions:

Listing and enhanced info fees. Any market that wants a richer presence pays a one-time fee to add or update its profile: description, links, logo, resolution details, and the verifiable proof receipt shown by default. The market still appears for free through the normal feed. The fee is for the upgraded, self-managed presence, processed on demand. This is a per-action fee, paid when a project wants it, not a recurring bill.

Source onboarding fees. New data sources that want to be integrated and displayed alongside the existing ones pay an onboarding fee to be wired in and maintained. A prediction platform or an odds provider that wants its markets visible to Signal402's audience pays for that integration and the ongoing normalisation into the shared schema. This turns Signal402 into a place sources compete to be seen, and each new source is a paid onboarding.

Pay per report. Deep, packaged outputs are paid one at a time. A verifiable-resolution report for a specific fixture, a movement report on how a market's implied probability shifted over a window, or an export of a market's full history with its proof, each is a single purchase. No plan required, you pay for the report you want when you want it.

Metered data API. The core data stays free at a basic rate. Builders who need higher throughput, more requests per second, or the proof-lookup endpoints at scale pay per usage. This is the same tiering Dexscreener uses on its API: free to start, metered fees for volume. It scales with how much value a builder pulls, not a flat seat price.

Embeds and white-label fees. Sports media sites, communities, and newsletters that want a live probability widget or the verification receipt embedded in their own pages pay a placement fee per site or per traffic tier. Larger partners who want the whole dashboard under their own brand pay a white-label fee. Again, these are fees for placement and licensing, not subscriptions on the end reader.

The logic is simple. The audience is the asset, so browsing is free and stays neutral. Money comes from the supply side, the markets and sources that want that audience's attention, and from packaged data and access sold by the unit. Because prominence can never be bought, the platform stays trustworthy, which is exactly what keeps the audience coming, which is what makes appearing on it worth paying for.

---

# TxLINE API Builder Feedback

Overall the API was a pleasure to build on. The auth model is well thought out, the data schema is clean and consistent, and the documentation was good enough that I could get from zero to live data in one sitting. Below is what worked well and where I hit friction, in the spirit of helping you tighten it.

## What I liked most

- The single normalised JSON schema is genuinely nice. Fixtures, odds, and scores all share the same identifiers, so joining them was trivial. Once I had a fixture id, everything else keyed off it cleanly.

- The demargined percentages in the odds payload are the standout feature for my use case. Getting the vig-removed implied probability directly, formatted to three decimals, meant I did not have to do any odds conversion or margin removal myself. For a prediction market viewer that is exactly the number I want.

- The free World Cup tier lowered the barrier a lot. Being able to prove the whole flow on devnet with faucet SOL, at zero token cost, made it realistic to attempt this in a hackathon window.

- The separation between a long-lived API token and a short-lived guest JWT is a good design. It let me keep the app stateless and wallet-free in production while still authenticating, which was important for deploying safely.

- The Merkle proof endpoints are a strong differentiator. Having a verifiable receipt for each record, with a clear sub-tree and main-tree structure, made the verifiable-resolution feature straightforward to build against real proof data.

## Where I hit friction

- The auth chain took some trial and error to get exactly right. The activation endpoint path in particular (the `/api` prefix on `token/activate`) was easy to get wrong, and the failure came back as a bare 404 with an empty body, so there was nothing in the response to point me at the fix. A clearer error body on activation failures would save time.

- The exact data endpoint paths were the slowest part to discover. The quickstart covers auth and subscription well, but I had to dig into the API reference page by page to find the precise fixtures, odds, and scores snapshot routes and their parameters. A single consolidated list of the data endpoints, with example responses, near the quickstart would have shortened this a lot.

- On devnet, live odds for future fixtures come and go. A fixture would show a full set of odds rows in one request and an empty array a moment later. I understand this reflects the 60-second sampling and the fact that these are upcoming matches, but it made testing unpredictable, and it means a viewer has to be built to treat missing odds as normal rather than an error. Some guidance in the docs on expected odds availability for scheduled versus live fixtures on devnet would help set expectations.

- I hit an intermittent connection timeout to the devnet host during development, where requests to `txline-dev.txodds.com` hung for the full timeout window before failing. It recovered on its own, but it pushed me to add short client-side timeouts and to isolate the feed so a slow response could not stall the rest of the app. If devnet availability can be made steadier, that would help demos that run live.

- One small schema note: `StartTime` and `Ts` are in milliseconds, which is correct and consistent, but the docs example values did not make the unit obvious, and I briefly treated them as seconds. A one-line note on units in the field descriptions would prevent that.

## Net

None of the friction was blocking. The design decisions are sound and the data is high quality. The two changes that would have saved me the most time are a clearer error body on activation and a single consolidated reference of the data endpoints with sample responses. The demargined percentages and the proof endpoints are the parts I would most want to keep building on.

---

# The intelligence layer (built on top)

Beyond the TxLINE data source and the verifiable receipt, Signal402 grew a full research layer. Every piece computes from real data, and where a number is partial or unavailable it is labelled honestly rather than invented.

## Per-market intelligence

- **Categories.** Markets are auto-tagged (Sports, Politics, Crypto, Economy, Weather, Culture, Science and Tech, Business, World) with word-boundary matching, and can carry more than one tag. Category chips and a category filter make the board navigable.
- **Payoff math.** For each market, what each side pays: risk-to-win on both Yes and No, the return if right, break-even (the price), and, where a demargined consensus exists, the edge in points versus that consensus. All arithmetic, framed as information, never advice.
- **Trust score.** A transparent 0-to-100 composite from source reliability, liquidity or volume, holder concentration, age, and spread, with a factor breakdown. Manifold starts lower for its play-money bias. It answers how much to believe the number, not what to do.
- **Resolution transparency.** Per source: who resolves it and how. Polymarket maps to the UMA optimistic oracle, Manifold to the creator (flagged as not independently verifiable), TxLINE to the on-chain Merkle receipt.

## Cross-source and participation

- **Divergence and consensus (Compare view).** The same event is matched across sources with an event-key matcher (subject plus tournament for sports, with complement handling), then shown side by side with the spread between sources and a liquidity-weighted blended estimate whose confidence band tightens when sources agree. Play money is down-weighted.
- **Money on each side.** Manifold shows current stake per side (mana) from the positions endpoint. Polymarket shows top-holder lean per side (shares) from the public Data API, which doubles as a smart-money-versus-crowd signal. TxLINE shows nothing to stake, because it is an odds feed.

## Calibration

A Calibration view and a Dashboard summary answer: did markets priced at X% actually resolve Yes about X% of the time? It is computed live from up to 1,000 recently resolved Manifold binary markets, bucketed by decile, with no store and no key, since the platform retains its own resolved-price history. Green rows are well-calibrated, red rows show over- or under-confidence.

## The event copilot

An "ask about this market or event" copilot, server-side so the key never reaches the browser. It applies a deep analytical frame to any event and adapts the angle to the type (sports form and head-to-head, election polling, crypto catalysts, economic indicators, and so on). It uses web search to ground real facts and refuses to invent scores, stats, or results. A hard rule holds throughout: it analyzes and explains, and it never tips a wager, never calls anything value or an edge, and hands the decision back to the user. A structured sports-data provider is wired as an optional, key-gated layer.

## Visuals

A live World Cup ticker driven by the TxLINE fixtures (teams, kickoff, live status, flags), per-market thumbnails (team flags for sports, deterministic category-tinted emblems otherwise), and an original hand-built SVG animation of a stylized striker scoring, in the brand palette. No footage, no real players, no external media, and it respects reduced-motion.

## Honest boundaries

- Polymarket per-side money is a top-holder view (top 20 per side), not the full pot; full totals need an on-chain indexer.
- Calibration is Manifold-only, from that platform's resolved-price history.
- Participant counts are wallets or accounts, not verified people.
- Real-money and play-money volumes are never summed together.
