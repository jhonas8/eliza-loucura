from typing import Callable, Tuple, TypeVar, Dict, Any
from fastapi import FastAPI
from starlette.middleware import _MiddlewareClass

T = TypeVar('T', bound=_MiddlewareClass)

Middleware = Callable[[FastAPI], Tuple[type[T], Dict[str, Any]]]
