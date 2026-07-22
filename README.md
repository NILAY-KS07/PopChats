<p align="center">
  <img src="static/favicon.png" width="90">
</p>

<h1 align="center">PopChats</h1>

<p align="center">
A real-time anonymous chat platform built with Flask, Socket.IO and vanilla JavaScript.
</p>

<p align="center">
<a href="https://popchats.vercel.app/">🌐 Live Demo</a> •
<a href="https://github.com/NILAY-KS07/PopChats">📦 Repository</a>
</p>

<p align="center">

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)
![Flask](https://img.shields.io/badge/Flask-black?logo=flask)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-black?logo=socketdotio)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite)
![Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)

</p>

---

## 📖 Overview

PopChats is a lightweight, privacy-focused anonymous chat platform that lets people join conversations instantly without creating an account. Users can enter public rooms or create temporary custom rooms while enjoying fast, real-time messaging powered by WebSockets.

The project follows a decoupled architecture with the frontend hosted on **Vercel** and the backend running on **Render**, providing a responsive experience while keeping deployment simple.

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
SQLite
```

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Backend | Flask, Flask-SocketIO, Gunicorn, gevent |
| Frontend | HTML5, CSS3, JavaScript |
| Database | SQLite (WAL Mode) |
| Security | Flask-Limiter, Cloudflare Turnstile, CORS |
| Deployment | Vercel + Render |

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
- **Communication:** REST APIs + Socket.IO through Vercel rewrites

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
