# Import all endpoint modules to make them available
from . import auth
from . import books  
from . import videos
from . import evaluators

__all__ = ["auth", "books", "videos", "evaluators"]