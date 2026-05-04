from gevent import monkey
monkey.patch_all()
import sqlite3
import os
import time
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from filter import is_clean
import json

print("Server Started", flush=True)

ENV = os.environ.get("ENV", "development")

with open("config.json") as f:
    config = json.load(f)[ENV]

if ENV == "development":
    origins = "*"
else:
    origins = config["ALLOWED_ORIGINS"]

PORT = config["PORT"]

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY')

CORS(app, resources={r"/*": {"origins": origins}})

socketio = SocketIO(
    app, 
    cors_allowed_origins=origins, 
    async_mode='gevent'
)

DB_PATH = 'data.db'

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  
    return conn

def init_db():
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # We clear the users table on startup to fix a persistent database lockout bug.
        # If the server crashes or restarts, all active WebSocket connections are dropped,
        # but the users remain in the SQLite database. Clearing it ensures no one is permanently
        # locked out of their preferred username due to a stale database entry.
        conn.execute('DELETE FROM users')
        conn.commit()

# --- API ROUTES ---

@app.route('/')
def home():
    return """
    <body style="padding:0;margin:0;">
    <div style="font-family: 'Inter', sans-serif; text-align: center; margin-top: 0px; background: #0f1115; color: white; height: 100vh; padding-top: 50px;">
        <h1 style="color: #3b82f6;">PopChats API</h1>
        <p style="color: #94a3b8;">Status: <span style="color: #22c55e;">Active</span></p>
        <p>Please access the chat via the link below:</p>
        <a href="https://popchats.vercel.app/" style="color: #3b82f6; text-decoration: none; border: 1px solid #3b82f6; padding: 10px 20px; border-radius: 5px;">Go to PopChats</a>
    </div>
    </body>
    """, 200

@app.errorhandler(404)
def page_not_found(e):
    # If the user visits an undefined route, serve the custom 404 page.
    # We check if 404.html exists, otherwise return a default JSON error.
    if os.path.exists('404.html'):
        with open('404.html', 'r', encoding='utf-8') as f:
            return f.read(), 404
    return jsonify({"error": "Resource not found"}), 404

@app.route('/ping')
def ping():
    return jsonify({"status": "awake"}), 200

@app.route("/health")
def health():
    return {
        "ENV": ENV,
        "has_secret": bool(os.environ.get("SECRET_KEY"))
    }

@app.route('/login-user', methods=['POST'])
def login_user():
    data = request.get_json()
    if not data or 'username' not in data:
        return jsonify({"error": "Invalid request"}), 400

    username = data.get('username').strip()

    if not username or len(username) < 3 or len(username) > 50:
        return jsonify({"error": "Username must be of optimal length. Neither too long nor too short!"}), 400

    if not is_clean(username):
        return jsonify({"error": "Kindly avoid using such names to maintain a respectful environment."}), 400

    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT 1 FROM users WHERE username = ?", (username,))
        if cursor.fetchone():
            return jsonify({"error": "Username is currently active. Choose another!"}), 400
        try:
            cursor.execute("INSERT INTO users (username) VALUES (?)", (username,))
            conn.commit()
        except sqlite3.IntegrityError:
            return jsonify({"error": "Username is taken."}), 400

    return jsonify({"success": True}), 200

# --- SOCKET.IO EVENTS ---

active_sockets = {}
last_message_times = {}

# A helper function to extract the real IP address of the user. 
# Since this app is deployed behind a proxy (like Render or Heroku),
# request.remote_addr will just return the proxy's IP. We check 'X-Forwarded-For'
# to ensure we rate limit the actual user, not the server itself!
def get_client_ip():
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    if ip and ',' in ip:
        ip = ip.split(',')[0].strip()
    return ip

@socketio.on('connect')
def handle_connect():
    username = request.args.get('username')

    if not username or username in ["null", "undefined", "None"] or not is_clean(username):
        return False 
        
    # Security fix: Prevent Impersonation and Duplicate Sessions.
    # First, we ensure the username isn't already active in the current socket dictionary.
    if username in active_sockets.values():
        return False
        
    # Second, we verify that this username actually exists in the database.
    # This prevents malicious actors from bypassing the /login-user endpoint 
    # and directly connecting to the WebSocket with an arbitrary username.
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM users WHERE username = ?", (username,))
        if not cursor.fetchone():
            return False

    active_sockets[request.sid] = username
    unique_count = len(set(active_sockets.values()))
    emit('update_count', {'count': unique_count}, broadcast=True)
    emit('user_joined', {'username': username}, broadcast=True)
    
@socketio.on('disconnect')
def handle_disconnect():
    username = active_sockets.pop(request.sid, None)
    ip = get_client_ip()
    
    # We clear the user's IP from the cooldown dictionary when they leave.
    # This prevents a slow memory leak where the dictionary grows infinitely 
    # as thousands of unique IPs connect and disconnect over time.
    last_message_times.pop(ip, None)
    
    if username:
        if username not in active_sockets.values():
            with get_db() as conn:
                conn.execute("DELETE FROM users WHERE username = ?", (username,))
                conn.commit()
            unique_count = len(set(active_sockets.values()))
            emit('update_count', {'count': unique_count}, broadcast=True)

@socketio.on('send_message')
def handle_message(data):
    username = active_sockets.get(request.sid)
    message_content = data.get('message', '').strip()
    current_time = time.time()
    ip = get_client_ip()

    if not username:
        emit('error_message', {'error': 'Authentication failed. Please re-login.'})
        return 

    # We now tie the spam cooldown to the user's IP address instead of their username.
    # This patches a vulnerability where a user could bypass the 2-second rate limit
    # simply by opening multiple tabs with different usernames.
    last_time = last_message_times.get(ip, 0)
    if current_time - last_time < 2:
        emit('error_message', {'error': 'Slow down! 2s cooldown active.'})
        return

    if message_content and len(message_content) <= 500:
        if not is_clean(message_content):
            emit('error_message', {'error': 'Kindly avoid using such words to maintain a respectful environment.'})
            return

        last_message_times[ip] = current_time

        emit('receive_message', {
            'username': username,
            'message': message_content
        }, broadcast=True)
    
    elif len(message_content) > 500:
        emit('error_message', {'error': 'Message too long (Max 500 chars).'})

@socketio.on('typing')
def handle_typing(data):
    username = active_sockets.get(request.sid)
    if username:
        # Broadcast to all clients EXCEPT the sender
        emit('user_typing', {'username': username}, broadcast=True, include_self=False)

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get("PORT", PORT))
    socketio.run(app, host='0.0.0.0', port=port)
