# 🎨 Fake Artist Goes to New York

A real-time multiplayer drawing deduction game built with Next.js 14, Socket.io, and Upstash Redis.

## How to play

1. **Everyone** gets a category and a secret subject — *except the Fake Artist*
2. **Each player** draws exactly one stroke per turn on a shared canvas
3. After N rounds, **everyone votes** for who they think is the fake
4. If caught, the fake artist can still **guess the subject** to steal the win

### Scoring

| Outcome | Who scores |
|---|---|
| Fake goes undetected | Fake: 3pts + 1pt per wrong vote |
| Fake caught, guesses correctly | Fake: 2pts |
| Fake caught, wrong guess | Each real artist: 2pts |

## Tech stack

- **Next.js 14** (App Router) — frontend + page routing
- **Socket.io** — real-time WebSocket communication (custom server)
- **Upstash Redis** — persistent room/stroke state across restarts
- **Tailwind CSS** — styling
- **TypeScript** — end-to-end type safety

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in your Upstash Redis credentials from [console.upstash.com](https://console.upstash.com).

### 3. Run in development

```bash
npm run dev
```

This starts the combined Next.js + Socket.io server on `http://localhost:3000`.

### 4. Build & start in production

```bash
npm run build
npm start
```

## Deployment

Deploy to **Railway** or **Render** — you need persistent WebSocket support.  
**Vercel does not support WebSocket servers.**

### Railway (recommended)

1. Push to GitHub
2. New project → Deploy from GitHub repo
3. Add environment variables in the Railway dashboard
4. Done — Railway auto-detects Node.js

## Project structure

```
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout with GameStoreProvider
│   ├── page.tsx            # Home page (create/join room)
│   └── room/[code]/
│       └── page.tsx        # Game room page
├── components/
│   ├── DrawingCanvas.tsx   # Canvas with pointer events + stroke sync
│   ├── BrushToolbar.tsx    # Color/size/opacity picker
│   ├── TurnTimer.tsx       # Countdown bar
│   ├── PlayerList.tsx      # Player list + voting UI
│   ├── ChatPanel.tsx       # Lobby/in-game chat
│   ├── GameEventBridge.tsx # Socket.io → game store bridge
│   └── views/              # One component per game state
│       ├── LobbyView.tsx
│       ├── CategoryAssignView.tsx
│       ├── DrawingView.tsx
│       ├── VotingView.tsx
│       ├── FakeGuessView.tsx
│       └── ScoresView.tsx
├── lib/
│   ├── redis.ts            # Upstash Redis helpers
│   ├── game-logic.ts       # Pure game logic (scoring, turn advance)
│   ├── game-store.tsx      # React context + useReducer state
│   ├── socket-client.ts    # Singleton Socket.io client
│   ├── use-socket.ts       # React hook for socket events
│   ├── room-codes.ts       # Readable room code generator
│   └── word-packs.ts       # Built-in category/subject packs
├── server/
│   └── index.ts            # Custom HTTP + Socket.io server
└── types/
    └── game.ts             # Shared TypeScript types
```

## Architecture notes

- **Canvas sync** — only stroke *events* are synced, not pixels. Each stroke is a JSON blob `{ points[], color, width, opacity }` with coordinates normalised to 0–1 range so they look identical on all screen sizes.
- **Turn enforcement** — the server validates that only the current player's socket can emit `stroke:data`. All other emissions are silently dropped.
- **Fake artist secrecy** — the subject is emitted per-socket via `role:assign`, never broadcast to the room. The fake receives `{ subject: null }`.
- **Reconnection** — on rejoin, stored strokes are replayed from Redis and the role is re-emitted privately.
- **Disconnect during turn** — a 3-second grace period, then the turn is auto-skipped.
