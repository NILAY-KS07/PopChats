from flask import Blueprint, jsonify   
import os
from app.config import ENV

health_bp = Blueprint('health', __name__)

@health_bp.route("/api/health")
def health():
    return {
        "ENV": ENV,
        "has_secret": bool(os.environ.get("SECRET_KEY")),
        "uptime-hint": "running",
        "status": "running",
        "cloudlflare": bool(os.environ.get("TURNSTILE_SECRET_KEY")),
    }
    
@health_bp.route('/api/')
@health_bp.route('/api')
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

@health_bp.route('/api/ping')
def ping():
    return jsonify({"status": "awake"}), 200