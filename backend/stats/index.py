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
    """Статистика для создателя: обзор, по пользователям, по чек-листам"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    headers = event.get("headers", {}) or {}
    token = headers.get("X-Auth-Token") or headers.get("x-auth-token")

    conn = get_conn()
    user = get_user(token, conn)
    if not user or user["role"] != "creator":
        conn.close()
        return {"statusCode": 403, "headers": cors(), "body": json.dumps({"error": "forbidden"})}

    cur = conn.cursor()

    # Общая статистика
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.checklists WHERE created_by = %s", (user["id"],))
    total_checklists = cur.fetchone()[0]

    cur.execute(
        f"""SELECT COUNT(*), COUNT(CASE WHEN a.status='completed' THEN 1 END),
            COUNT(CASE WHEN a.status='in_progress' THEN 1 END),
            COUNT(CASE WHEN a.status='assigned' THEN 1 END),
            COALESCE(AVG(a.progress), 0)
            FROM {SCHEMA}.assignments a
            JOIN {SCHEMA}.checklists c ON a.checklist_id = c.id
            WHERE c.created_by = %s""",
        (user["id"],)
    )
    row = cur.fetchone()
    total_assignments = row[0]
    completed = row[1]
    in_progress = row[2]
    assigned = row[3]
    avg_progress = round(float(row[4]))

    # Статистика по чек-листам
    cur.execute(
        f"""SELECT c.id, c.title, c.category,
            COUNT(a.id) as assignments,
            COUNT(CASE WHEN a.status='completed' THEN 1 END) as completed,
            COALESCE(AVG(a.progress), 0) as avg_progress
            FROM {SCHEMA}.checklists c
            LEFT JOIN {SCHEMA}.assignments a ON a.checklist_id = c.id
            WHERE c.created_by = %s
            GROUP BY c.id ORDER BY c.created_at DESC""",
        (user["id"],)
    )
    checklists_stats = [
        {"id": r[0], "title": r[1], "category": r[2], "assignments": r[3], "completed": r[4], "avg_progress": round(float(r[5]))}
        for r in cur.fetchall()
    ]

    # Статистика по пользователям
    cur.execute(
        f"""SELECT u.id, u.name, u.avatar, u.department,
            COUNT(a.id) as total,
            COUNT(CASE WHEN a.status='completed' THEN 1 END) as completed,
            COALESCE(AVG(a.progress), 0) as avg_progress
            FROM {SCHEMA}.users u
            LEFT JOIN {SCHEMA}.assignments a ON a.user_id = u.id
            LEFT JOIN {SCHEMA}.checklists c ON a.checklist_id = c.id AND c.created_by = %s
            WHERE u.role = 'executor'
            GROUP BY u.id ORDER BY u.name""",
        (user["id"],)
    )
    users_stats = [
        {"id": r[0], "name": r[1], "avatar": r[2], "department": r[3], "total": r[4], "completed": r[5], "avg_progress": round(float(r[6]))}
        for r in cur.fetchall()
    ]

    conn.close()
    return {
        "statusCode": 200,
        "headers": cors(),
        "body": json.dumps({
            "total_checklists": total_checklists,
            "total_assignments": total_assignments,
            "completed": completed,
            "in_progress": in_progress,
            "assigned": assigned,
            "avg_progress": avg_progress,
            "checklists_stats": checklists_stats,
            "users_stats": users_stats,
        })
    }
