import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "change_me_in_production";

export interface JwtClaims {
    sub: string;   // userId
    email: string;
    name: string;
    role: string;
    iat: number;
    exp: number;
}

export function signToken(payload: Omit<JwtClaims, "iat" | "exp">): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

export function verifyToken(token: string): JwtClaims {
    // Throws JsonWebTokenError or TokenExpiredError on failure
    return jwt.verify(token, JWT_SECRET) as JwtClaims;
}