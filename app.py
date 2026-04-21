from gevent import monkey
monkey.patch_all()
import sqlite3
import os
import time
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from filter import is_clean

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'default_secret_key')

origins = ["https://pop-chats.vercel.app"]

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
        <a href="https://pop-chats.vercel.app/" style="color: #3b82f6; text-decoration: none; border: 1px solid #3b82f6; padding: 10px 20px; border-radius: 5px;">Go to PopChats</a>
    </div>
    </body>
    """, 200

@app.route('/ping')
def ping():
    return jsonify({"status": "awake"}), 200

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

@socketio.on('connect')
def handle_connect():
    username = request.args.get('username')

    if not username or username in ["null", "undefined", "None"] or not is_clean(username):
        return False 

    active_sockets[request.sid] = username
    unique_count = len(set(active_sockets.values()))
    emit('update_count', {'count': unique_count}, broadcast=True)
    emit('user_joined', {'username': username}, broadcast=True)
    
@socketio.on('disconnect')
def handle_disconnect():
    username = active_sockets.pop(request.sid, None)
    
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

    if not username:
        emit('error_message', {'error': 'Authentication failed. Please re-login.'})
        return 

    last_time = last_message_times.get(username, 0)
    if current_time - last_time < 2:
        emit('error_message', {'error': 'Slow down! 2s cooldown active.'})
        return

    if message_content and len(message_content) <= 500:
        if not is_clean(message_content):
            emit('error_message', {'error': 'Kindly avoid using such words to maintain a respectful environment.'})
            return

        last_message_times[username] = current_time

        emit('receive_message', {
            'username': username,
            'message': message_content
        }, broadcast=True)
    
    elif len(message_content) > 500:
        emit('error_message', {'error': 'Message too long (Max 500 chars).'})

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host='0.0.0.0', port=port)
