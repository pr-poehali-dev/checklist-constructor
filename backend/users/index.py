import json
import os
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p51895419_checklist_constructo")

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
    }

def get_user(token, conn):
    if not token:
        return None
    cur = conn.cursor()
    cur.execute(
        f"SELECT u.id, u.role FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON s.user_id = u.id WHERE s.token = %s AND s.expires_at > NOW()",
        (token,)
    )
    row = cur.fetchone()
    return {"id": row[0], "role": row[1]} if row else None

def handler(event: dict, context) -> dict:
    """Список пользователей-исполнителей для назначения"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    headers = event.get("headers", {}) or {}
    token = headers.get("X-Auth-Token") or headers.get("x-auth-token")

    conn = get_conn()
    user = get_user(token, conn)
    if not user:
        conn.close()
        return {"statusCode": 401, "headers": cors(), "body": json.dumps({"error": "unauthorized"})}

    cur = conn.cursor()
    cur.execute(
        f"SELECT id, name, email, role, department, avatar FROM {SCHEMA}.users ORDER BY name"
    )
    users = [
        {"id": r[0], "name": r[1], "email": r[2], "role": r[3], "department": r[4], "avatar": r[5]}
        for r in cur.fetchall()
    ]
    conn.close()
    return {"statusCode": 200, "headers": cors(), "body": json.dumps({"users": users})}
