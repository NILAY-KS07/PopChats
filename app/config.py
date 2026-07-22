import os
import json

ENV = os.environ.get("ENV", "development")

with open("config.json") as f:
    config = json.load(f)[ENV]

IS_PRODUCTION = ENV == "production"

if ENV == "development":
    origins = [
        "http://127.0.0.1:5500",
        "http://192.168.1.6:5500"
    ]
else:
    origins = config["ALLOWED_ORIGINS"]

PORT = config["PORT"]