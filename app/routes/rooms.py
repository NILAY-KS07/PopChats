from flask import Blueprint, jsonify
from app.sockets.events import room_to_users
from app.models.db import get_db

rooms_bp = Blueprint("rooms", __name__)


@rooms_bp.route("/api/rooms", methods=["GET"])
def get_rooms():

    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT name, description
            FROM rooms
            """
        ).fetchall()

    result = []

    for row in rows:

        room_name = row["name"]

        result.append({
            "name": room_name,
            "description": row["description"] or "No description",
            "count": len(room_to_users.get(room_name, set()))
        })

    return jsonify(result)



