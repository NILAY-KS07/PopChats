from flask import Flask
from flask import session
from flask import jsonify

from werkzeug.middleware.proxy_fix import ProxyFix

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

from app.extensions import socketio, cors
from app.config import origins, IS_PRODUCTION

from app.routes.auth import auth_bp
from app.routes.authPublic import authPub_bp
from app.routes.health import health_bp
from app.routes.rooms import rooms_bp

import os


def create_app():
    flask_app = Flask(__name__)

    flask_app.wsgi_app = ProxyFix(
    flask_app.wsgi_app,
    x_for=1,
    x_proto=1
    )

    secret = os.environ.get("SECRET_KEY")

    if IS_PRODUCTION and not secret:
        raise RuntimeError("SECRET_KEY missing in production")

    flask_app.config['SECRET_KEY'] = secret or "dev_secret_key"
    flask_app.config['SESSION_PERMANENT'] = False
    flask_app.config['SESSION_USE_SIGNER'] = True
    flask_app.config['DEBUG'] = False

    flask_app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=IS_PRODUCTION
    )

    limiter.init_app(flask_app)

    flask_app.instance_path = os.path.join(os.path.dirname(__file__), 'instance')
    os.makedirs(flask_app.instance_path, exist_ok=True)

    cors.init_app(flask_app, resources={r"/api/*": {"origins": origins}}, supports_credentials=True)
    socketio.init_app(
    flask_app,
    cors_allowed_origins=origins,
    ping_timeout=30,
    ping_interval=20,
    max_http_buffer_size=2_000_000,
    manage_session=False
    )


    flask_app.register_blueprint(auth_bp)
    flask_app.register_blueprint(health_bp)
    flask_app.register_blueprint(rooms_bp)
    flask_app.register_blueprint(authPub_bp)        

    import app.sockets.events 

    from flask_limiter.errors import RateLimitExceeded

    @flask_app.errorhandler(RateLimitExceeded)
    def ratelimit_handler(e):
        return jsonify({
            "error": "Too many requests. Slow down."
        }), 429
      
    return flask_app