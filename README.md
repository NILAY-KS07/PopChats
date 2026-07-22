<div align="center">
  <img src="static/favicon.png" alt="PopChats Logo" width="80" height="80" style="border-radius: 16px;">
  <h1>PopChats</h1>
  <p><strong>Real-Time Anonymous Chat Platform</strong></p>
  <p>
    <a href="https://popchats.vercel.app/" target="_blank">🌐 Live Demo</a>
    ·
    <a href="https://github.com/NILAY-KS07/PopChats" target="_blank">📦 Repository</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Python-3.11.10-3776AB?style=flat&logo=python&logoColor=white" alt="Python 3.11.10">
    <img src="https://img.shields.io/badge/Flask-2.3-000000?style=flat&logo=flask&logoColor=white" alt="Flask">
    <img src="https://img.shields.io/badge/WebSockets-SocketIO-010101?style=flat&logo=socket.io&logoColor=white" alt="SocketIO">
    <img src="https://img.shields.io/badge/Async-gevent-00AA00?style=flat" alt="gevent">
    <img src="https://img.shields.io/badge/Frontend-Vercel-000000?style=flat&logo=vercel&logoColor=white" alt="Vercel">
    <img src="https://img.shields.io/badge/Backend-Render-46E3B7?style=flat&logo=render&logoColor=white" alt="Render">
  </p>
</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Backend Deep Dive](#-backend-deep-dive)
  - [Application Factory](#application-factory)
  - [WebSocket Events Engine](#websocket-events-engine)
  - [Authentication Flow](#authentication-flow)
  - [Room Management](#room-management)
  - [Content Moderation](#content-moderation)
  - [Database Layer](#database-layer)
- [Frontend Deep Dive](#-frontend-deep-dive)
  - [Pages](#pages)
  - [Client-Side JavaScript](#client-side-javascript)
  - [Styling & UX](#styling--ux)
- [Security](#-security)
- [Infrastructure & DevOps](#-infrastructure--devops)
  - [Decoupled Deployment Architecture](#decoupled-deployment-architecture)
  - [Solving the SIGKILL Production Issue](#solving-the-sigkill-production-issue)
- [Local Development](#-local-development)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [License](#-license)

---

## 🌟 Overview

PopChats is a **real-time, anonymous chat platform** designed for ephemeral, low-friction communication. Users can join public discussion rooms or create custom temporary rooms — all without creating an account, providing an email, or leaving a permanent trace.

The platform is built on a **decoupled architecture**: the frontend (static assets) is served via **Vercel** for global CDN performance, while the backend (Flask + WebSockets) runs on **Render** with asynchronous gevent workers for concurrent real-time connections.

> **Core Philosophy:** Connect without trace. No profiles. No followers. No data retention. Just conversations that exist in the moment.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────────────┐   │
│  │  index.html│  │ rooms.html│  │  chat.html         │   │
│  │  login.html│  │public-    │  │  + script.js       │   │
│  │  etc.      │  │rooms.html │  │  + style.css       │   │
│  └─────┬─────┘  └─────┬─────┘  └─────────┬─────────┘   │
│        │              │                  │             │
│        └──────────────┴──────────────────┘             │
│                        │                               │
│            ┌───────────┴───────────┐                   │
│            │    Vercel (CDN)       │                   │
│            │  Static Hosting +     │                   │
│            │  API/Socket Proxy     │                   │
│            └───────────┬───────────┘                   │
└────────────────────────┼───────────────────────────────┘
                         │
           ┌─────────────┴─────────────┐
           │    Render (Backend)       │
           │  ┌─────────────────────┐  │
           │  │  Gunicorn + gevent  │  │
           │  │  Flask Application  │  │
           │  │  Flask-SocketIO     │  │
           │  │  Flask-Limiter      │  │
           │  │  SQLite (WAL)       │  │
           │  └─────────────────────┘  │
           └───────────────────────────┘
```

**Request Flow:**
1. Static pages are served directly from Vercel's CDN edge network
2. API calls (`/api/*`) are proxied from Vercel → Render via URL rewrites
3. WebSocket connections (`/socket.io/*`) are also proxied to the Render backend
4. The Flask backend handles authentication, room management, real-time messaging, and content moderation

---

## 🛠 Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Language** | Python 3.11.10 | Core backend runtime |
| **Web Framework** | Flask | HTTP routing & session management |
| **Real-Time Engine** | Flask-SocketIO + Socket.IO (JS client 4.7.2) | Bi-directional WebSocket communication |
| **Async Workers** | gevent + gevent-websocket | Non-blocking concurrent connection handling |
| **Production Server** | Gunicorn | WSGI HTTP server with gevent worker class |
| **Database** | SQLite 3 (WAL mode) | Lightweight, zero-config persistence for usernames & rooms |
| **Rate Limiting** | Flask-Limiter (in-memory) | Request throttling & abuse prevention |
| **CAPTCHA** | Cloudflare Turnstile | Bot detection without user friction |
| **CORS** | Flask-CORS | Cross-origin request handling |
| **Frontend** | Vanilla HTML5 + CSS3 + JavaScript (ES6) | No frameworks — lightweight & fast |
| **Icons** | Lucide | SVG icon library |
| **Font** | Inter (Google Fonts) | Modern sans-serif typeface |
| **Static Hosting** | Vercel | Global CDN for frontend assets |
| **Backend Hosting** | Render | Cloud platform for Flask backend |
| **Analytics** | Google Analytics (G-8DSYEZVT2N) | Basic traffic insights |
| **SEO** | Structured data (JSON-LD), sitemap.xml, robots.txt | Search engine optimization |

---

## ✨ Features

### Core Messaging
- **Real-time messaging** — Sub-100ms latency via WebSocket transport with automatic polling fallback
- **6 default rooms** — Public, Tech, Gaming, Sports, Music, Movies (more coming)
- **Custom rooms** — Users can create their own public rooms with custom names and descriptions
- **Live user count** — Real-time online presence tracking per room
- **Auto-cleanup** — Empty custom rooms are automatically deleted from the database

### Privacy & Anonymity
- **No account required** — Just pick a username and join
- **No IP/email storage** — Sessions are ephemeral and transient
- **No public profiles** — No follower systems, no permanent identities
- **No message persistence** — Conversations exist only during active sessions

### Abuse Prevention
- **Profanity filter** — 390+ word blocklist with character-evasion detection (e.g., repeated letters, special character insertion)
- **Message cooldown** — 2-second throttle between messages per user
- **Rate limiting** — API-level throttling per endpoint (e.g., 5 login attempts/min, 3 room creations/min)
- **Cloudflare Turnstile** — Invisible CAPTCHA for suspicious clients
- **Headless browser detection** — User-Agent analysis for bot mitigation
- **Max message length** — 1000 character limit
- **Username validation** — Length, character, and starting character constraints

### User Experience
- **Mobile-first responsive design** — Optimized for all screen sizes with `dvh` units
- **Skeleton loading states** — Shimmer animations during login/connection
- **Toast notifications** — Join/leave and error notifications
- **Smart message alignment** — Auto left/right alignment (self vs. others) via session data
- **Smooth animations** — CSS transitions, pop-in modals, reveal animations
- **Chat alert bar** — Ephemeral notice about temporary chat nature

### Performance
- **Decoupled architecture** — Frontend on Vercel CDN, backend on Render — independent scaling
- **WebSocket with polling fallback** — Reliable across mobile networks
- **Automatic reconnection** — Infinite reconnection attempts with exponential backoff
- **SQLite WAL mode** — Concurrent read/write without locking
- **Gzip/security headers** — via Vercel configuration

---

## 📁 Project Structure

```
PopChats/
├── app/                          # Flask application package
│   ├── __init__.py               # App factory, extensions init, blueprint registration
│   ├── config.py                 # Environment-aware configuration loader
│   ├── extensions.py             # SocketIO & CORS singleton instances
│   ├── instance/                 # SQLite database storage (auto-created)
│   ├── models/
│   │   ├── db.py                 # Database connection context manager (WAL mode)
│   │   └── schema.py             # Table definitions (users, rooms)
│   ├── routes/
│   │   ├── __init__.py           # Routes package
│   │   ├── auth.py               # /api/login-user, /api/me (session auth)
│   │   ├── authPublic.py         # /api/check-roomname (room creation)
│   │   ├── health.py             # /api/health, /api/ping, /api/ API landing
│   │   └── rooms.py              # /api/rooms (list custom rooms + counts)
│   ├── sockets/
│   │   ├── __init__.py           # Sockets package
│   │   └── events.py             # WebSocket event handlers (connect, join, message, disconnect)
│   └── utils/
│       ├── banned.txt            # 390+ word profanity blocklist
│       └── filter.py             # Content moderation engine with evasion detection
├── static/                       # Frontend static assets
│   ├── console.js                # Developer console branding script
│   ├── favicon.png               # Application favicon (512x512 PWA)
│   ├── script.js                 # Main client-side application logic
│   └── style.css                 # Complete stylesheet (~900 lines)
├── index.html                    # Landing / marketing page
├── login.html                    # Username entry / authentication page
├── chat.html                     # Real-time chat interface
├── rooms.html                    # Room selection + create room modal
├── public-rooms.html             # Dynamic user-created rooms listing
├── 404.html                      # Custom 404 error page
├── privacy.html                  # Privacy policy page
├── terms.html                    # Terms of service page
├── rules.html                    # Community guidelines page
├── config.json                   # Environment-specific configuration (origins, port)
├── wsgi.py                       # Application entry point (gevent monkey-patched)
├── Procfile                      # Gunicorn startup command
├── requirements.txt              # Python dependencies
├── runtime.txt                   # Python version for Render
├── vercel.json                   # Vercel deployment configuration (rewrites, headers)
├── manifest.json                 # Progressive Web App manifest
├── robots.txt                    # Search engine crawling rules
├── sitemap.xml                   # SEO sitemap
├── .gitignore                    # Git ignore rules
└── .vercelignore                 # Vercel deployment ignore rules
```

---

## 🔧 Backend Deep Dive

### Application Factory

**File:** `app/__init__.py`

The application is constructed using Flask's **application factory pattern** via `create_app()`. This approach allows clean configuration, testing flexibility, and singleton management.

```python
def create_app():
    flask_app = Flask(__name__)
    # ... configuration, extensions, blueprints, error handlers
    return flask_app
```

**Initialization Order:**
1. Flask app instance created
2. `ProxyFix` middleware applied (trusts Render's proxy headers for HTTPS detection)
3. Secret key loaded from environment (or fallback for development)
4. Session configuration: HTTPOnly, SameSite=Lax, Secure in production
5. Flask-Limiter initialized with default limits (200/day, 50/hour)
6. SQLite instance directory created
7. Flask-CORS initialized (scoped to `/api/*`)
8. Flask-SocketIO initialized with custom ping settings, buffer limits
9. Blueprints registered: auth, health, rooms, authPublic
10. Socket event handlers imported (triggers registration on the SocketIO instance)
11. Rate limit exceeded error handler registered

### WebSocket Events Engine

**File:** `app/sockets/events.py`

The real-time engine manages five core events using **in-memory data structures** for performance:

| Data Structure | Type | Purpose |
|---------------|------|---------|
| `sid_to_user` | `dict` | Maps Socket.IO session IDs to usernames |
| `sid_to_room` | `dict` | Maps Socket.IO session IDs to current room |
| `user_to_sids` | `defaultdict[set]` | Maps usernames to all active session IDs (multi-tab support) |
| `room_to_users` | `defaultdict[set]` | Maps room names to active username sets |
| `last_message_times` | `dict` | Tracks per-session cooldown timestamps |

**Event Lifecycle:**

1. **`connect`** — Validates Flask session has a `username`. If not, rejects connection (`return False`). Registers the SID-to-username mapping.

2. **`join_room`** — Handles room transitions: leaves the previous room (removes user from old room's set, emits updated count), joins the new room, emits `user_joined` and `update_count` to all room occupants.

3. **`send_message`** — Validates authentication, room membership, message length (≤1000 chars), content (profanity filter), and cooldown (2 seconds). On success, broadcasts `receive_message` with username, message content, and sender SID to the room.

4. **`disconnect`** — Cleans up all tracking data. Removes the SID. If it was the user's last active tab, removes the username from the database. Updates room user count. If the room becomes empty and is **not** a default room, deletes it from the database.

> **Multi-Tab Support:** A user can have multiple browser tabs open. `user_to_sids` tracks all active sessions. The username is only removed from the database when all tabs are closed.

### Authentication Flow

**File:** `app/routes/auth.py`

The authentication system is session-based but **account-free** — no passwords, no emails, no verification.

```
User enters username
        │
        ▼
┌─────────────────────┐
│  Suspicious Check   │
│  • Headless UA?     │  ──── Yes ───▶ Cloudflare Turnstile
│  • navigator.web?   │                      │
│  • cookies disabled?│                      ▼
└─────────┬───────────┘             Pass/Fail validation
          │ No                               │
          ▼                                   │
    ┌─────────────┐                           │
    │ Validate    │◀──────────────────────────┘
    │ • Length    │
    │ • Filter    │
    │ • First char│
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │ Check DB    │
    │ (unique?)   │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │ Set session │
    │ username    │
    └─────────────┘
```

**Validation Rules:**
- Length: 3–50 characters
- First character: cannot be a digit or `@`, `#`, `$`, `%`, `&`, `*`
- Content: must pass the profanity filter
- Uniqueness: username cannot be currently active in the database

**CAPTCHA Integration (Cloudflare Turnstile):**
- Triggered only when the client is flagged as suspicious (headless browser detection)
- JWT-less verification — server sends token to Cloudflare's `/siteverify` endpoint
- Secret key configured via `TURNSTILE_SECRET_KEY` environment variable

### Room Management

**File:** `app/routes/authPublic.py`, `app/routes/rooms.py`

**Default Rooms** (defined in `events.py`):
```python
DEFAULT_ROOMS = {"public", "tech", "gaming", "sports", "music", "movies"}
```

**Custom Room Creation** (`POST /api/check-roomname`):
- Rate limited: 3 requests per minute
- Validates room name (3–50 chars) and description (≤200 chars)
- Profanity filter applied to both name and description
- Checks against default room names (reserved)
- Checks database for uniqueness
- Insert into `rooms` table on success

**Room Listing** (`GET /api/rooms`):
- Returns all custom rooms from the database
- Each entry includes: name, description, current user count (from in-memory `room_to_users`)

**Auto-Cleanup:**
- When the last user disconnects from a custom room, the room is automatically deleted from the database
- This keeps the platform self-maintaining and prevents stale room accumulation

### Content Moderation

**File:** `app/utils/filter.py`

The `is_clean()` function implements a multi-layered text analysis approach:

1. **Normalization:** Strips all non-alphanumeric characters, converts to lowercase
2. **Evasion Detection:** Squashes repeated characters → `hiiiiii` → `hi`
3. **Blocklist Comparison:** Checks against a 390+ word list loaded from `banned.txt`
4. **Minimum Length Filter:** Skips blocklist entries shorter than 3 characters (avoids false positives)

```python
def is_clean(text):
    clean_msg = re.sub(r'[^a-z0-9]', '', text.lower())
    squashed_msg = re.sub(r'(.)\1+', r'\1', clean_msg)

    for word in BANNED_WORDS_CACHE:
        if len(word) < 3:
            continue
        if word in clean_msg or word in squashed_msg:
            return False
    return True
```

The blocklist is cached in memory on module load for performance (`BANNED_WORDS_CACHE`), avoiding repeated file I/O.

### Database Layer

**File:** `app/models/db.py`, `app/models/schema.py`

**Connection Management:**
- Uses Python's `contextlib.contextmanager` for safe, scoped connections
- `get_db()` yields a connection and guarantees closure via `finally`
- Connections are configured with `check_same_thread=False` (required for gevent async)

**Performance Optimizations:**
- **WAL (Write-Ahead Logging):** Enables concurrent reads during writes
- **`synchronous=NORMAL`:** Balances crash safety with write performance
- **Foreign keys:** Enforced for data integrity

**Schema:**

```sql
-- Username tracking (active sessions)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Custom room storage
CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

The database is initialized at startup in `wsgi.py`:
```python
with flask_app.app_context():
    from app.models.schema import init_db
    init_db()
```

---

## 🎨 Frontend Deep Dive

### Pages

| Page | Route | Description |
|------|-------|-------------|
| **Landing** | `/` → `index.html` | Marketing page with hero, feature cards, info sections, and step-by-step guide |
| **Rooms** | `/rooms` → `rooms.html` | Default room selection grid + FAB button to create custom rooms |
| **Custom Rooms** | `/public-rooms` → `public-rooms.html` | Dynamic listing of user-created rooms fetched from API |
| **Login** | `/login` → `login.html` | Username input with CAPTCHA support and skeleton loading transition |
| **Chat** | `/chat` → `chat.html` | Real-time messaging interface with connection status and user count |
| **404** | `404.html` | Custom error page with gradient background |
| **Privacy** | `/privacy` → `privacy.html` | Privacy policy with sections on storage, cookies, security |
| **Terms** | `/terms` → `terms.html` | Terms of service with acceptable use, prohibited content |
| **Rules** | `/rules` → `rules.html` | Community guidelines for respectful behavior |

### Client-Side JavaScript

**File:** `static/script.js`

The script handles all client-side logic across all pages:

**Network Detection:**
```javascript
const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || 
                /^192\.168\./.test(hostname) || /^10\./.test(hostname) ||
                /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
```
Smart detection of local development environments to switch API/Socket URLs automatically.

**API Helper:**
```javascript
const API = (path, options = {}) => {
    return fetch(`${API_BASE}/api${path}`, {
        credentials: 'include',
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers }
    });
};
```
Consistent fetch wrapper with credentials inclusion for session cookie propagation.

**Socket Connection** (chat.html only):
- Verifies session via `GET /api/me` before connecting
- Connection strategy: polling first, upgrade to WebSocket
- Infinite reconnection with exponential backoff (1s → 5s)
- Credentials included for session-based auth

**Login Flow:**
- Handles form submission with skeleton loading after 5 seconds
- 4-stage loading messages ("Starting server...", "Connecting...", etc.)
- Error display with user-friendly messages

**Room Creation:**
- Modal with FAB button
- Disables form during submission to prevent double-sends
- Loading spinner during API call
- Error display directly in the modal

**Suspicious Client Detection:**
```javascript
function isSuspiciousUser() {
    if (navigator.webdriver) return true;       // Automated browser
    if (!navigator.cookieEnabled) return true;  // Cookies disabled
    return false;
}
```

### Styling & UX

**File:** `static/style.css` (~900 lines)

**Design System:**
- Dark theme with CSS custom properties: `--bg-dark: #0f1115`, `--accent: #3b82f6`
- Consistent spacing, border-radius (8px–20px), and transitions
- Blur effects (`backdrop-filter: blur(10px)`) for the navigation bar

**Responsive Breakpoints:**
- **768px:** Tablet/mobile — single column grids, adjusted padding, fixed bottom input
- **480px:** Small mobile — smaller fonts, compact UI elements

**Animations:**
- `pulse` — Loading indicator ring animation
- `shimmer` — Skeleton loading placeholder animation
- `slideInLeft / slideInRight / slideUp` — Reveal animations on landing page
- `popIn` — Modal content entrance animation
- Smooth scroll behavior with `scroll-padding-top` for anchor navigation

**Chat-Specific Styles:**
- Fixed bottom input area with `position: fixed` on mobile
- Dynamic message bubble alignment (left/right) based on sender
- User count badge with inline SVG icon
- Server status indicator with green/gray dots
- Ephemeral notification bar with auto-fade and hover-to-reveal

---

## 🔒 Security

PopChats implements a **defense-in-depth** approach to platform security:

| Layer | Mechanism | Implementation |
|-------|-----------|---------------|
| **Transport** | HTTPS enforced | Vercel CDN + Render with automatic SSL |
| **Session** | HTTPOnly cookies | `SESSION_COOKIE_HTTPONLY=True` |
| **Session** | SameSite protection | `SESSION_COOKIE_SAMESITE='Lax'` |
| **Session** | Secure flag in production | `SESSION_COOKIE_SECURE=IS_PRODUCTION` |
| **CORS** | Strict origin whitelist | Only Vercel frontend (or localhost in dev) |
| **Rate Limiting** | Per-endpoint throttling | Flask-Limiter (e.g., 5 login/min, 3 room creations/min) |
| **Bot Detection** | Cloudflare Turnstile | Invisible CAPTCHA for suspicious clients |
| **Bot Detection** | User-Agent analysis | Blocks headless browser User-Agents |
| **Content** | Profanity filter | 390+ word blocklist with evasion detection |
| **Content** | Message size limit | 1000 character maximum |
| **Abuse** | Message cooldown | 2-second throttle between messages |
| **Headers** | Security headers | X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy |
| **Database** | WAL mode | Safe concurrent access |
| **Proxy** | ProxyFix middleware | Trusts Render's proxy for correct HTTPS detection |

---

## 🚀 Infrastructure & DevOps

### Decoupled Deployment Architecture

PopChats uses a **split deployment model** for optimal performance:

```
┌──────────────────────────────────────────────────────────────┐
│                      Vercel (Frontend)                       │
│  • Static HTML/CSS/JS hosting                                │
│  • Global CDN with edge caching                              │
│  • URL rewrites: /api/* → https://popchats.onrender.com/api  │
│  • URL rewrites: /socket.io/* → Render backend               │
│  • Security headers on all responses                         │
│  • Clean URLs (no .html extensions)                          │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                     Render (Backend)                         │
│  • Flask application server                                  │
│  • Gunicorn + gevent for async WebSocket handling            │
│  • SQLite database (persistent disk)                         │
│  • WebSocket endpoint for real-time messaging                │
│  • REST API endpoints for auth, rooms                        │
└──────────────────────────────────────────────────────────────┘
```

**Vercel Configuration** (`vercel.json`):
```json
{
  "cleanUrls": true,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://popchats.onrender.com/api/$1" },
    { "source": "/socket.io/(.*)", "destination": "https://popchats.onrender.com/socket.io/$1" }
  ],
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
    ]}
  ]
}
```

### Solving the SIGKILL Production Issue

During initial deployment on Render, the application encountered **Worker Timeouts (Signal 9 / SIGKILL)**. Here's the problem and resolution:

**The Problem:**
Gunicorn's default synchronous workers are designed for short HTTP request-response cycles. WebSocket connections, however, remain open indefinitely. Gunicorn assumed these long-lived connections were "stuck" workers and terminated them every 30 seconds.

**The Solution (3-part fix):**

1. **Async Worker Class** — Switched to the gevent worker class in the Procfile:
   ```bash
   gunicorn -k gevent -w 1 --timeout 0 wsgi:app
   ```

2. **Monkey Patching** — Applied gevent monkey patching at the earliest import point in `wsgi.py`:
   ```python
   from gevent import monkey
   monkey.patch_all()
   ```

3. **Client-Side Transport Strategy** — Configured Socket.IO client to prefer WebSocket with polling fallback:
   ```javascript
   const socket = io(SOCKET_URL, {
       transports: ['polling', 'websocket'],
       upgrade: true,
       reconnection: true,
       reconnectionAttempts: Infinity,
       reconnectionDelay: 1000,
       reconnectionDelayMax: 5000,
       timeout: 20000,
       withCredentials: true
   });
   ```

---

## 💻 Local Development

### Prerequisites
- Python 3.11+
- A code editor (VS Code recommended)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/NILAY-KS07/PopChats.git
cd PopChats

# 2. Create and activate virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate

# macOS/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the development server
python wsgi.py
```

### Configuration

The application uses `config.json` for environment-specific settings:

```json
{
  "development": {
    "ALLOWED_ORIGINS": [
      "http://127.0.0.1:5500",
      "http://192.168.1.6:5500"
    ],
    "PORT": 5000
  },
  "production": {
    "ALLOWED_ORIGINS": ["https://popchats.vercel.app"],
    "PORT": 5000
  }
}
```

**Environment Variable** — Set `ENV=production` to run in production mode:
```bash
# Windows (Command Prompt)
set ENV=production

# Windows (PowerShell)
$env:ENV="production"

# macOS/Linux
export ENV=production
```

### Testing Locally

1. Start the backend: `python wsgi.py` (runs on `http://localhost:5000`)
2. Serve the frontend: Use VS Code Live Server extension or any static file server on port 5500
3. Open `http://127.0.0.1:5500` in your browser

> **Note:** The frontend auto-detects local development environments and routes API calls to `localhost:5000`.

---

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | Yes (production) | Flask session signing key |
| `TURNSTILE_SECRET_KEY` | No | Cloudflare Turnstile CAPTCHA secret |
| `ENV` | No | Set to `"production"` for production mode |

---

## 📡 API Reference

### Authentication

| Endpoint | Method | Description | Rate Limit |
|----------|--------|-------------|------------|
| `/api/login-user` | POST | Register/login with username | 5/minute |
| `/api/me` | GET | Check current session status | — |

**POST `/api/login-user`**
```json
{
  "username": "example_user",
  "turnstileToken": "0.xxxx... (optional)"
}
```

**Response (200):** `{ "success": true }`

### Rooms

| Endpoint | Method | Description | Rate Limit |
|----------|--------|-------------|------------|
| `/api/check-roomname` | POST | Create a custom room | 3/minute |
| `/api/rooms` | GET | List all custom rooms | — |

**POST `/api/check-roomname`**
```json
{
  "name": "my-room",
  "description": "A room for XYZ"
}
```

**GET `/api/rooms` Response**
```json
[
  {
    "name": "my-room",
    "description": "A room for XYZ",
    "count": 5
  }
]
```

### Health

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server health status |
| `/api/ping` | GET | Simple alive check |
| `/api/` | GET | API landing page |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `connect` | Client → Server | Authenticate and establish connection |
| `join_room` | Client → Server | Join a specific room |
| `send_message` | Client → Server | Send a message to current room |
| `disconnect` | Client → Server | Leave the platform |
| `receive_message` | Server → Client | New message broadcast |
| `user_joined` | Server → Client | User joined notification |
| `update_count` | Server → Client | Updated online user count |
| `error_message` | Server → Client | Error notification |

---

## 📄 License

PopChats is a Proof of Concept (PoC) project developed by **Nilay Kumar Shrivastava**.

**Important Disclaimers:**
- **Privacy by Design:** To preserve true anonymity, the system does not intentionally store user data or IP addresses at the application level. Sessions are ephemeral and transient.
- **Anti-Abuse Measures:** Includes a 390+ word profanity filter and a 2000ms message cooldown to maintain service integrity.
- **Limitations:** Built for demonstration purposes rather than high-stakes production. The developer is not responsible for user-generated content.

---

<div align="center">
  <p>
    Developed with ❤️ by
    <a href="https://github.com/NILAY-KS07" target="_blank">Nilay Kumar Shrivastava</a>
  </p>
  <p>
    <a href="https://popchats.vercel.app/" target="_blank">🌐 Live Demo</a>
    ·
    <a href="https://github.com/NILAY-KS07" target="_blank">🐙 GitHub</a>
  </p>
</div>

