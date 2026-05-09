from gevent import monkey
monkey.patch_all()

from app import create_app

flask_app = create_app()

with flask_app.app_context():
    from app.models.schema import init_db
    init_db()

app = flask_app
