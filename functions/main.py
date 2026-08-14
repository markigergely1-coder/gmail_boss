from firebase_admin import initialize_app
from firebase_functions import https_fn

initialize_app()

@https_fn.on_request()
def hello_world(req: https_fn.Request) -> https_fn.Response:
    return https_fn.Response("Hello world!")
