from gevent import monkey
monkey.patch_all()

from app import create_app
from app.extensions import socketio
from app.models.schema import init_db
from app.config import PORT

print("Starting server...", flush=True)
print("Server Started", flush=True)

flask_app = create_app()

if __name__ == "__main__":
    with flask_app.app_context():
        init_db()
    socketio.run(flask_app, host="0.0.0.0", port=PORT, debug=False)