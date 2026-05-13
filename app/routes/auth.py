from flask import session
from app import limiter
from flask import Blueprint, request, jsonify
from app.models.db import get_db
from app.utils.filter import is_clean
import sqlite3
import requests
import os

auth_bp = Blueprint('auth', __name__)

TURNSTILE_SECRET_KEY = os.environ.get("TURNSTILE_SECRET_KEY")

def verify_turnstile(token):

    response = requests.post(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        data={
            "secret": TURNSTILE_SECRET_KEY,
            "response": token
        }
    )

    result = response.json()

    return result.get("success", False)


@auth_bp.route('/api/login-user', methods=['POST'])
@limiter.limit("5 per minute")
def login_user():
    data = request.get_json()
    turnstile_token = data.get("turnstileToken")
    if not data or 'username' not in data:
        return jsonify({"error": "Invalid request"}), 400

    username = data.get('username').strip()

    suspicious = False

    user_agent = request.headers.get("User-Agent", "").lower()

    if "headless" in user_agent:
        suspicious = True

    if suspicious:

        if not turnstile_token:
            return jsonify({
                "error": "Captcha required"
            }), 403

        if not verify_turnstile(turnstile_token):
            return jsonify({
                "error": "Captcha failed"
            }), 403

    if not username or len(username) < 3 or len(username) > 50:
        return jsonify({"error": "Username must be of optimal length."}), 400

    if not is_clean(username):
        return jsonify({"error": "Invalid username."}), 400

    if session.get('username') == username:
        return jsonify({"success": True}), 200

    try:
        with get_db() as conn:
            conn.execute(
                'INSERT INTO users (username) VALUES (?)',
                (username,)
            )
            conn.commit()

    except sqlite3.IntegrityError:
        return jsonify({
            'error': 'Username already active'
        }), 409

    session['username'] = username
    return jsonify({"success": True}), 200

@auth_bp.route('/api/me')
def me():
    username = session.get('username')

    if not username:
        return jsonify({
            'authenticated': False
        }), 401

    return jsonify({
        'authenticated': True,
        'username': username
    })