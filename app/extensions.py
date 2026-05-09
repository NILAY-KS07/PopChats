from flask_socketio import SocketIO
from flask_cors import CORS

socketio = SocketIO(async_mode='gevent')
cors = CORS()