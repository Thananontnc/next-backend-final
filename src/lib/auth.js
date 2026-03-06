import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || "mydefaulyjwtsecret";

export function verifyAuth(req) {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/token=([^;]+)/);
    if (!match) return null;

    const token = match[1];
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

export function authError(res, message, status = 401) {
    return NextResponse.json({ message }, { status });
}
