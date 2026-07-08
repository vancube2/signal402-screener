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
