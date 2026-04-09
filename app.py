from gevent import monkey
monkey.patch_all()
import sqlite3
import os
from flask import Flask, render_template, request, redirect, url_for, session
from flask_socketio import SocketIO, emit
import time
from filter import is_clean

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'default_secret_key')
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='gevent')

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

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login():    
    return render_template('login.html')

@app.route('/login-user', methods=['POST'])
def login_user():
    username = request.form.get('username').strip()
    if not username:
        return render_template('login.html', error="Username is required")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()

        if not user:
            try:
                cursor.execute("INSERT INTO users (username) VALUES (?)", (username,))
                conn.commit()
                cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
                user = cursor.fetchone()
            except sqlite3.IntegrityError:
                return render_template('login.html', error="Username taken.")

        session['username'] = user['username']
        
    return redirect(url_for('chat'))

@app.route('/chat')
def chat():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('chat.html', username=session['username'])

#-----SocketIO Events-----#

connected_users = 0

@socketio.on('connect')
def handle_connect():
    global connected_users
    connected_users += 1
    username = session.get('username')
    emit('update_count', {'count': connected_users}, broadcast=True)
    if username:
        emit('user_joined', {'username': username}, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    global connected_users
    connected_users = max(0, connected_users - 1)
    emit('update_count', {'count': connected_users}, broadcast=True)

last_message_times = {}

@socketio.on('send_message')
def handle_message(data):
    username = session.get('username')
    message_content = data.get('message', '').strip()
    current_time = time.time()

    if not username:
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
    socketio.run(app, host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))