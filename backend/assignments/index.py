import json
import os
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p51895419_checklist_constructo")

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
    }

def get_user(token, conn):
    if not token:
        return None
    cur = conn.cursor()
    cur.execute(
        f"SELECT u.id, u.name, u.email, u.role "
        f"FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON s.user_id = u.id "
        f"WHERE s.token = %s AND s.expires_at > NOW()",
        (token,)
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "name": row[1], "email": row[2], "role": row[3]}

def handler(event: dict, context) -> dict:
    """
    GET  /          — мои задания (executor)
    POST /          — toggle item или complete (action в body)
    """
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    headers = event.get("headers", {}) or {}
    token = headers.get("X-Auth-Token") or headers.get("x-auth-token")

    conn = get_conn()
    user = get_user(token, conn)
    if not user:
        conn.close()
        return {"statusCode": 401, "headers": cors(), "body": json.dumps({"error": "unauthorized"})}

    cur = conn.cursor()

    # GET — мои задания
    if method == "GET":
        cur.execute(
            f"SELECT a.id, a.checklist_id, a.status, a.progress, a.assigned_at, a.completed_at, "
            f"c.title, c.description, c.category "
            f"FROM {SCHEMA}.assignments a "
            f"JOIN {SCHEMA}.checklists c ON a.checklist_id = c.id "
            f"WHERE a.user_id = %s ORDER BY a.assigned_at DESC",
            (user["id"],)
        )
        rows = cur.fetchall()
        result = []
        for r in rows:
            cur2 = conn.cursor()
            cur2.execute(
                f"SELECT ci.id, ci.text, COALESCE(ap.done, FALSE) "
                f"FROM {SCHEMA}.checklist_items ci "
                f"LEFT JOIN {SCHEMA}.assignment_progress ap ON ap.item_id = ci.id AND ap.assignment_id = %s "
                f"WHERE ci.checklist_id = %s ORDER BY ci.position",
                (r[0], r[1])
            )
            items = [{"id": ir[0], "text": ir[1], "done": ir[2]} for ir in cur2.fetchall()]
            result.append({
                "assignment_id": r[0], "checklist_id": r[1], "status": r[2], "progress": r[3],
                "assigned_at": str(r[4])[:10],
                "completed_at": str(r[5])[:10] if r[5] else None,
                "title": r[6], "description": r[7], "category": r[8], "items": items
            })
        conn.close()
        return {"statusCode": 200, "headers": cors(), "body": json.dumps({"assignments": result})}

    # POST — toggle или complete
    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        action = body.get("action")
        assignment_id = body.get("assignment_id")

        if not assignment_id:
            conn.close()
            return {"statusCode": 400, "headers": cors(), "body": json.dumps({"error": "assignment_id required"})}

        # Проверяем владение
        cur.execute(
            f"SELECT id, checklist_id FROM {SCHEMA}.assignments WHERE id = %s AND user_id = %s",
            (assignment_id, user["id"])
        )
        assignment = cur.fetchone()
        if not assignment:
            conn.close()
            return {"statusCode": 403, "headers": cors(), "body": json.dumps({"error": "forbidden"})}

        # Завершить чек-лист
        if action == "complete":
            cur.execute(
                f"UPDATE {SCHEMA}.assignments SET status = 'completed', progress = 100, completed_at = NOW() "
                f"WHERE id = %s",
                (assignment_id,)
            )
            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": cors(), "body": json.dumps({"ok": True})}

        # Отметить/снять пункт
        if action == "toggle":
            item_id = body.get("item_id")
            done = body.get("done", False)
            if not item_id:
                conn.close()
                return {"statusCode": 400, "headers": cors(), "body": json.dumps({"error": "item_id required"})}

            cur.execute(
                f"INSERT INTO {SCHEMA}.assignment_progress (assignment_id, item_id, done) VALUES (%s, %s, %s) "
                f"ON CONFLICT (assignment_id, item_id) DO UPDATE SET done = %s",
                (assignment_id, item_id, done, done)
            )

            # Пересчитываем прогресс
            cur.execute(
                f"SELECT COUNT(*) FROM {SCHEMA}.checklist_items WHERE checklist_id = %s",
                (assignment[1],)
            )
            total = cur.fetchone()[0]
            cur.execute(
                f"SELECT COUNT(*) FROM {SCHEMA}.assignment_progress WHERE assignment_id = %s AND done = TRUE",
                (assignment_id,)
            )
            done_count = cur.fetchone()[0]
            progress = round(done_count / total * 100) if total > 0 else 0

            new_status = "assigned"
            if done_count > 0:
                new_status = "in_progress"

            cur.execute(
                f"UPDATE {SCHEMA}.assignments SET progress = %s, status = %s WHERE id = %s",
                (progress, new_status, assignment_id)
            )
            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": cors(), "body": json.dumps({"progress": progress, "status": new_status})}

        conn.close()
        return {"statusCode": 400, "headers": cors(), "body": json.dumps({"error": "unknown action"})}

    conn.close()
    return {"statusCode": 405, "headers": cors(), "body": json.dumps({"error": "method not allowed"})}
