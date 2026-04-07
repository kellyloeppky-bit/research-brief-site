import os
from flask import Flask
from flask_session import Session
from config import Config
from routes.public import public_bp
from routes.members import members_bp
from routes.admin import admin_bp

os.environ['AUTHLIB_INSECURE_TRANSPORT'] = '1'

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    Session(app)

    app.register_blueprint(public_bp)
    app.register_blueprint(members_bp, url_prefix="/members")
    app.register_blueprint(admin_bp, url_prefix="/admin")

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG", "False") == "True")