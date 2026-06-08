import os
from jose import jwt, JWTError

JWT_SECRET  = os.getenv("JWT_SECRET", "change_me_in_production")
JWT_ALGORITHM = "HS256"

def decode_jwt(token: str) -> dict:
    """
    Decode and verify a JWT token.
    Raises ValueError on any failure — caller closes the WebSocket.
    """
    try:
        claims = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return claims
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}")