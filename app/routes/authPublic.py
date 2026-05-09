from flask import Blueprint, request, jsonify
from app import limiter

from app.models.db import get_db
from app.utils.filter import is_clean
from app.sockets.events import DEFAULT_ROOMS, rooms

authPub_bp = Blueprint('authPub', __name__)


@authPub_bp.route('/api/check-roomname', methods=['POST', 'OPTIONS'])
@limiter.limit("3 per minute")

def check_roomname():
    # CORS preflight (browser sends OPTIONS before POST)
    if request.method == 'OPTIONS':
        return ('', 200)

    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({"error": "Invalid request"}), 400

    roomname = data.get('name').strip()
    roomdesc = data.get('description', '').strip()

    if not roomname or len(roomname) < 3 or len(roomname) > 50:
        return jsonify({"error": "Room name must be of optimal length."}), 400

    if not is_clean(roomname) or (roomdesc and not is_clean(roomdesc)):
        return jsonify({"error": "Invalid Name/Description."}), 400
    
    if len(roomdesc) > 200:
        return jsonify({"error": "Description is too long."}), 400
    
    if roomname in DEFAULT_ROOMS:
        return jsonify({"error": "Room name is taken/Reserved."}), 400

    # Check DB for existing room name
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM rooms WHERE name = ?", (roomname,))
        if cursor.fetchone():
            return jsonify({"error": "Room name is taken."}), 400

    rooms[roomname] = {
    "users": set(),
    "description": roomdesc
    }

    return jsonify({"success": True}), 200