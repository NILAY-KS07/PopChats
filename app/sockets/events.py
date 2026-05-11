from flask import session
from flask_socketio import emit, join_room
from flask import request
import time
from app.extensions import socketio
from app.utils.filter import is_clean
from app.models.db import get_db
from collections import defaultdict



# ===== STORAGE =====
sid_to_user = {}
sid_to_room = {}
user_to_sids = defaultdict(set)
room_to_users = defaultdict(set)

last_message_times = {}

DEFAULT_ROOMS = {"public", "tech", "gaming", "sports"} # more to be added soon

# ===== CONNECT =====
@socketio.on('connect')
def handle_connect(auth):
    auth = auth or {}

    username = (auth.get('username') or '').strip()

    session_username = session.get('username')

    if not username or username != session_username:
        return False

    sid = request.sid

    sid_to_user[sid] = username
    user_to_sids[username].add(sid)

@socketio.on('join_room')
def handle_join_room(data):
    sid = request.sid

    room = (data.get('room') or '').strip()

    username = sid_to_user.get(sid)

    if not username:
        emit('error_message', {
            'error': 'Authentication required'
        })
        return

    if not room:
        emit('error_message', {
            'error': 'Invalid room'
        })
        return

    old_room = sid_to_room.get(sid)

    # leave previous room tracking
    if old_room and old_room != room:
        room_to_users[old_room].discard(username)

        emit('update_count', {
            'count': len(room_to_users[old_room])
        }, to=old_room)

    join_room(room)

    sid_to_room[sid] = room
    room_to_users[room].add(username)

    emit('user_joined', {
        'username': username
    }, to=room)

    emit(
        "update_count",
        {"count": len(room_to_users.get(room, set()))},
        to=room
    )

MAX_MESSAGE_LENGTH = 1000
MESSAGE_COOLDOWN = 2

@socketio.on('send_message')
def handle_send_message(data):
    sid = request.sid

    username = sid_to_user.get(sid)
    room = sid_to_room.get(sid)

    if not username or not room:
        emit('error_message', {
            'error': 'Authentication expired'
        })
        return

    message = (data.get('message') or '').strip()

    if not message:
        return

    if len(message) > MAX_MESSAGE_LENGTH:
        emit('error_message', {
            'error': 'Message too long'
        })
        return

    if not is_clean(message):
        emit('error_message', {
            'error': 'Message blocked'
        })
        return

    now = time.time()

    last = last_message_times.get(sid, 0)

    if now - last < MESSAGE_COOLDOWN:
        emit('error_message', {
            'error': 'Slow down'
        })
        return

    last_message_times[sid] = now

    emit('receive_message', {
        'username': username,
        'message': message
    }, to=room)

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    username = sid_to_user.pop(sid, None)
    room = sid_to_room.pop(sid, None)
    last_message_times.pop(sid, None)
    if not username:
        return

    user_sids = user_to_sids.get(username)
    if user_sids:
        user_sids.discard(sid)
        if not user_sids:
            user_to_sids.pop(username, None)
            try:
                with get_db() as conn:
                    conn.execute(
                        'DELETE FROM users WHERE username = ?',
                        (username,)
                    )
                    conn.commit()
            except Exception as e:
                print('DB cleanup error:', e)

    if room:
        users = room_to_users.get(room)
        if users:
            users.discard(username)
            count = len(users)
            if count <= 0:
                room_to_users.pop(room, None)
                if room not in DEFAULT_ROOMS:
                    try:
                        with get_db() as conn:
                            conn.execute(
                                'DELETE FROM rooms WHERE name = ?',
                                (room,)
                            )
                            conn.commit()
                    except Exception as e:
                        print("Room cleanup error:", e)
            else:
                emit(
                    "update_count",
                    {"count": count},
                    to=room
                )

