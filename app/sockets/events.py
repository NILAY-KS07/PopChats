from flask import session
from flask_socketio import emit, join_room
from flask import request
import time
from app.extensions import socketio
from app.utils.filter import is_clean
from app.models.db import get_db



# ===== STORAGE =====
user_rooms = {}     # sid -> room
rooms = {}          # room -> set(username)
active_sockets = {} # sid -> username
last_message_times = {}

DEFAULT_ROOMS = {"public", "tech", "gaming", "sports"} # more to be added soon

# ===== CONNECT =====
@socketio.on('connect')
def handle_connect(auth=None):
    """Socket.IO connect handler.

    Our client sends username via `auth: { username }`.
    Depending on Flask-SocketIO/engine versions, Flask may expose different fields.
    """
    username = session.get('username')

    if not username:
        return False

    active_sockets[request.sid] = username


# ===== JOIN ROOM =====
@socketio.on('join_room')
def handle_join_room(data):
    username = active_sockets.get(request.sid)
    room = (data or {}).get('room', 'public')

    if not username:
        emit('error_message', {'error': 'Not authenticated (username missing)'} )
        return


    if room not in rooms:
        rooms[room] = {
            "users": set(),
            "description": "No description"
        }


    # limit only custom rooms (default rooms are unlimited)
    if room not in DEFAULT_ROOMS and len(rooms[room]["users"]) >= 20:
        emit('error_message', {'error': 'Room full (20 max)'} )
        return


    join_room(room)

    rooms[room]["users"].add(username)
    user_rooms[request.sid] = room

    emit('update_count', {'count': len(rooms[room]["users"])}, to=room)
    emit('user_joined', {'username': username}, to=room)


# ===== SEND MESSAGE =====
@socketio.on('send_message')
def handle_message(data):
    username = active_sockets.get(request.sid)
    server_room = user_rooms.get(request.sid)

    if not username or not server_room:
        emit('error_message', {'error': 'Not joined to a room yet'} )
        return

    data = data or {}
    client_room = data.get('room')
    message = str(data.get('message', '')).strip()

    # Hard validation: prevent sending to the wrong room during reconnect races.
    if client_room and client_room != server_room:
        emit('error_message', {'error': 'Room mismatch. Please rejoin.'})
        return

    if not message:
        return

    if not is_clean(message):
        emit('error_message', {'error': 'Kindly avoid using such words.'})
        return

    # cooldown
    now = time.time()
    if now - last_message_times.get(username, 0) < 2:
        emit('error_message', {'error': 'Slow down'})
        return

    last_message_times[username] = now

    emit('receive_message', {
        'username': username,
        'message': message
    }, to=server_room)


# ===== DISCONNECT =====
@socketio.on('disconnect')
def handle_disconnect():
    username = active_sockets.pop(request.sid, None)
    room = user_rooms.pop(request.sid, None)

    # Always attempt to unlock username in DB on disconnect.
    # DB `users` table is used purely for temporary presence/auth.
    if username:
        try:
            with get_db() as conn:
                conn.execute("DELETE FROM users WHERE username = ?", (username,))
                conn.commit()
        except Exception:
            # Avoid crashing socket disconnect flow.
            pass

    if not username or not room:
        return

    if room in rooms and username in rooms[room]["users"]:
        rooms[room]["users"].remove(username)

        emit('update_count', {'count': len(rooms[room]["users"])}, to=room)

        # delete empty custom rooms
        if room not in DEFAULT_ROOMS and len(rooms[room]["users"]) == 0:
            del rooms[room]

