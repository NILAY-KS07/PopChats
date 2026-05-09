from flask import session
from app import limiter
from flask import Blueprint, request, jsonify
from app.models.db import get_db
from app.utils.filter import is_clean
import sqlite3

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/login-user', methods=['POST'])
@limiter.limit("5 per minute")
def login_user():
    data = request.get_json()
    if not data or 'username' not in data:
        return jsonify({"error": "Invalid request"}), 400

    username = data.get('username').strip()

    if not username or len(username) < 3 or len(username) > 50:
        return jsonify({"error": "Username must be of optimal length."}), 400

    if not is_clean(username):
        return jsonify({"error": "Invalid username."}), 400

    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT 1 FROM users WHERE username = ?", (username,))
        if cursor.fetchone():
            return jsonify({"error": "Username is active."}), 400

        try:
            cursor.execute("INSERT INTO users (username) VALUES (?)", (username,))
            conn.commit()
        except sqlite3.IntegrityError:
            return jsonify({"error": "Username taken."}), 400

    session['username'] = username
    return jsonify({"success": True}), 200

@auth_bp.route('/api/me')
def get_me():

    username = session.get('username')

    if not username:
        return jsonify({"error": "Unauthorized"}), 401

    return jsonify({
        "username": username
    })