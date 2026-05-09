from flask import Blueprint, jsonify
from app.sockets.events import rooms, DEFAULT_ROOMS

rooms_bp = Blueprint("rooms", __name__)


@rooms_bp.route("/api/rooms", methods=["GET"])
def get_rooms():
    result = []

    for room_name, room_data in rooms.items():

        if room_name not in DEFAULT_ROOMS:

            result.append({
                "name": room_name,
                "description": room_data.get("description", "No description"),
                "count": len(room_data.get("users", [])),
            })

    return jsonify(result)



