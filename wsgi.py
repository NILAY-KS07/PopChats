from gevent import monkey
monkey.patch_all()

from gevent.pywsgi import WSGIServer

from app import create_app

flask_app = create_app()

with flask_app.app_context():
    from app.models.schema import init_db
    init_db()

app = flask_app

if __name__ == "__main__":
    http_server = WSGIServer(
        ("0.0.0.0", 5000),
        app
    )

    print("Server running on port 5000")

    http_server.serve_forever()