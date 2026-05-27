import json
import os
import secrets
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p51895419_checklist_constructo")

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
    }

def handler(event: dict, context) -> dict:
    """Авторизация: POST = login, GET = me (проверка токена)"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers(), "body": ""}

    method = event.get("httpMethod", "GET")
    headers = event.get("headers", {}) or {}
    token = headers.get("X-Auth-Token") or headers.get("x-auth-token")

    # GET — проверить токен (/me)
    if method == "GET":
        if not token:
            return {"statusCode": 401, "headers": cors_headers(), "body": json.dumps({"error": "unauthorized"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT u.id, u.name, u.email, u.role, u.department, u.avatar FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON s.user_id = u.id WHERE s.token = %s AND s.expires_at > NOW()",
            (token,)
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return {"statusCode": 401, "headers": cors_headers(), "body": json.dumps({"error": "unauthorized"})}
        user = {"id": row[0], "name": row[1], "email": row[2], "role": row[3], "department": row[4], "avatar": row[5]}
        return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"user": user})}

    # POST — login (если передан action=logout — выход)
    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        action = body.get("action", "login")

        if action == "logout":
            if token:
                conn = get_conn()
                cur = conn.cursor()
                cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE token = %s", (token,))
                conn.commit()
                conn.close()
            return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"ok": True})}

        # login
        email = body.get("email", "").strip().lower()
        password = body.get("password", "")
        if not email or not password:
            return {"statusCode": 400, "headers": cors_headers(), "body": json.dumps({"error": "email и пароль обязательны"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, name, email, role, department, avatar, password_hash FROM {SCHEMA}.users WHERE LOWER(email) = %s",
            (email,)
        )
        row = cur.fetchone()
        if not row or row[6] != password:
            conn.close()
            return {"statusCode": 401, "headers": cors_headers(), "body": json.dumps({"error": "Неверный email или пароль"})}
        token_val = secrets.token_hex(32)
        cur.execute(
            f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)",
            (row[0], token_val)
        )
        conn.commit()
        conn.close()
        user = {"id": row[0], "name": row[1], "email": row[2], "role": row[3], "department": row[4], "avatar": row[5]}
        return {"statusCode": 200, "headers": cors_headers(), "body": json.dumps({"token": token_val, "user": user})}

    return {"statusCode": 405, "headers": cors_headers(), "body": json.dumps({"error": "method not allowed"})}
