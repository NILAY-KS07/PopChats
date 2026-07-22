<p align="center">
  <img src="static/favicon.png" width="90">
</p>

<h1 align="center">PopChats</h1>

<p align="center">
Privacy-first • No Accounts Required
</p>

<p align="center">
A real-time anonymous chat platform powered by Flask, Socket.IO and vanilla JavaScript.
</p>

<p align="center">
<a href="https://popchats.vercel.app/">🌐 WA Link</a> •
<a href="https://github.com/NILAY-KS07/PopChats">📦 Repository</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11-blue?logo=python" />
  <img src="https://img.shields.io/badge/Flask-black?logo=flask" />
  <img src="https://img.shields.io/badge/Socket.IO-Realtime-black?logo=socketdotio" />
  <img src="https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite" />
  <img src="https://img.shields.io/badge/Backend-Render-46E3B7?logo=render" />
  <img src="https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel" />
</p>

---

## 📖 Overview

PopChats is a real-time anonymous chat platform that enables instant conversations without requiring accounts, emails, or personal information. Users can join public rooms or create temporary custom rooms while enjoying fast, WebSocket-powered messaging in a privacy-first environment.

The project follows a decoupled architecture with the frontend hosted on **Vercel** and the backend running on **Render**, providing a responsive experience while keeping deployment simple.

> **Note**: *PopChats intentionally avoids storing chat history. On the free Render deployment, the ephemeral filesystem also means locally stored SQLite data is not guaranteed to persist across deployments or instance restarts, reinforcing the platform's temporary nature.*

---

## ✨ Features

- 💬 Real-time messaging using Flask-SocketIO
- 👥 Public and custom temporary chat rooms
- 🔒 Anonymous, account-free experience
- ⚡ Automatic reconnection with polling fallback
- 🚫 Profanity filtering with evasion detection
- 🛡️ Rate limiting and Cloudflare Turnstile protection
- 📱 Responsive UI for desktop and mobile
- 🧹 Automatic cleanup of inactive custom rooms
- 🌙 Modern dark theme interface

---

## 🎯 Why PopChats?

Most chat platforms require user accounts, profiles, and persistent identities. PopChats takes a different approach by focusing on temporary, anonymous conversations where users can connect instantly without registration or leaving behind permanent data.

The project was built to explore real-time communication, WebSockets, session-based authentication, and scalable deployment using a modern Flask stack.

---

## 🏗 Architecture

```text
Browser
    │
    ▼
Vercel (Frontend)
    │
 REST API + Socket.IO
    │
    ▼
Render (Flask Backend)
    │
    ▼
SQLite (Temporary Metadata)
```

---

## 🛠 Tech Stack

| Category   | Technology                                      |
| ---------- | ----------------------------------------------- |
| Backend    | Flask                                           |
| Real-Time  | Flask-SocketIO                                  |
| Async      | Gunicorn + gevent                               |
| Frontend   | HTML5, CSS3, JavaScript                         |
| Database   | SQLite (WAL Mode)                               |
| Security   | Flask-Limiter, Cloudflare Turnstile, Flask-CORS |
| Deployment | Vercel + Render                                 |


---

## 📂 Project Structure

```text
PopChats/
├── app/
│   ├── routes/
│   ├── sockets/
│   ├── models/
│   └── utils/
├── static/
├── index.html
├── login.html
├── chat.html
├── wsgi.py
├── requirements.txt
└── vercel.json
```

---

## 🚀 Getting Started

```bash
git clone https://github.com/NILAY-KS07/PopChats.git

cd PopChats

python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt

python wsgi.py
```

The backend starts on **localhost:5000**. Serve the frontend using any static server such as VS Code Live Server.

---

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| SECRET_KEY | Flask session secret |
| TURNSTILE_SECRET_KEY | Cloudflare Turnstile secret |
| ENV | Set to `production` in production |

---

## 🌍 Deployment

- **Frontend:** Vercel
- **Backend:** Render
- **Communication:** API and Socket.IO requests are proxied from Vercel to the Render backend using URL rewrites.
---

## 🚧 Future Improvements

- Private invite-only rooms
- Image and file sharing
- Better moderation tools
- Progressive Web App improvements

---

## 🤝 Contributing

Contributions, bug reports and feature suggestions are always welcome. Feel free to fork the repository, open an issue or submit a pull request.

---

## 📄 License

This project was created by **Nilay Kumar Shrivastava** as a portfolio and learning project. It's built as a **Proof of Concept (PoC)**. All rights are reserved.
