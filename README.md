# PopChats: High-Concurrency Real-Time Chat

PopChats is a real-time messaging platform built using the **Flask** ecosystem. It leverages asynchronous workers to handle multiple concurrent users, featuring a custom content moderation engine and a mobile-first responsive architecture.

**[Live Demo on Render](https://popchats.onrender.com)**

---

##  Technical Deep Dive

### 1. Real-Time Engine (WebSockets)
* Uses **Flask-SocketIO** to establish bi-directional communication between the server and the client.
* Implements the **gevent** async library to manage long-lived connections without blocking the main thread.
* Features automatic reconnection logic on the frontend to ensure a seamless user experience during network shifts.

### 2. Security & Content Integrity
* **Message Sanitization:** A custom-built filtration system cross-references every message against a `banned.txt` dictionary using Python's string manipulation logic.
* **Environment Protection:** Utilizes `os.environ` to decouple configuration from code, keeping the `SECRET_KEY` and database credentials secure.
* **Anti-Spam Mechanism:** Implements a 2000ms "cooling period" for message broadcasts to prevent bot-flooding and server strain.

### 3. Responsive UI/UX
* **Bespoke UI/UX:** Built purely with vanilla CSS, featuring deep responsiveness, custom animations, and dynamic message alignment without the overhead of external libraries.
* **Smart Presence:** A live "Online Count" tracker that updates dynamically as users join or leave the session.
* **Visual Context:** Message bubbles are dynamically aligned (Left vs. Right) based on session data to differentiate between the local user and other participants.

---

##  Tech Stack

* **Language:** Python 3.11.10
* **Framework:** Flask
* **Real-Time:** Flask-SocketIO & Gevent
* **Production Server:** Gunicorn
* **Styling:** CSS3 (Media Queries & Flexbox)
* **Hosting:** Render

---

##  DevOps: Solving the Production "SIGKILL" Issue

Deploying a real-time app on a cloud platform like Render presents unique challenges. During the initial launch, the app encountered **Worker Timeouts (Signal 9/SIGKILL)**.

**The Problem:**
Gunicorn’s default sync workers are designed for short HTTP requests. WebSockets keep a connection open indefinitely. Gunicorn assumed the workers were "stuck" and killed them every 30 seconds.

**The Solution:**
I refactored the deployment strategy by:
1.  Implementing the **Gevent** worker class for asynchronous request handling.
2.  Configuring a custom `Procfile` with a `--timeout 1000` flag to accommodate the persistent nature of Socket.io connections.
3.  Optimizing the client-side `io()` configuration to prefer `polling` before upgrading to `websocket` for better stability across mobile networks.

--- 

## Local Setup
- Clone & Enter:

```Bash
git clone https://github.com/NILAY-KS07/PopChats.git
cd PopChats
```

- Environment Setup:

```Bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

- Execution:

```Bash
python app.py
```
---
## Important:
This project is an MVP (Minimum Viable Product) designed to demonstrate real-time architecture and cloud deployment.
- **Privacy by Design:** To preserve true anonymity, the system implements zero data tracing or IP logging. Sessions are ephemeral and transient.
- **Anti-Abuse Measures:** Includes a 390+ word profanity filter and a 2000ms cooldown to mitigate spam and maintain a baseline of service integrity.
- **Limitations:** While it utilizes industry-standard async workers (gevent), it is built for demonstration purposes rather than high-stakes production. The developer is not responsible for user-generated content.

---

Developed by Nilay — Focused on Scalable Web Solutions.
