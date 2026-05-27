import json
import os
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p51895419_checklist_constructo")

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
    }

def get_user(token, conn):
    if not token:
        return None
    cur = conn.cursor()
    cur.execute(
        f"SELECT u.id, u.name, u.email, u.role, u.department, u.avatar "
        f"FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON s.user_id = u.id "
        f"WHERE s.token = %s AND s.expires_at > NOW()",
        (token,)
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "name": row[1], "email": row[2], "role": row[3], "department": row[4], "avatar": row[5]}

def handler(event: dict, context) -> dict:
    """
    GET  /  [?id=N]  — список чек-листов или детали одного
    POST /           — создать чек-лист (только creator)
    """
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    method = event.get("httpMethod", "GET")
    headers = event.get("headers", {}) or {}
    token = headers.get("X-Auth-Token") or headers.get("x-auth-token")
    qs = event.get("queryStringParameters") or {}

    conn = get_conn()
    user = get_user(token, conn)
    if not user:
        conn.close()
        return {"statusCode": 401, "headers": cors(), "body": json.dumps({"error": "unauthorized"})}

    cur = conn.cursor()

    # GET ?id=N — детали одного чек-листа
    if method == "GET" and qs.get("id"):
        checklist_id = int(qs["id"])
        cur.execute(
            f"SELECT id, title, description, category, created_at, created_by "
            f"FROM {SCHEMA}.checklists WHERE id = %s",
            (checklist_id,)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return {"statusCode": 404, "headers": cors(), "body": json.dumps({"error": "not found"})}
        checklist = {
            "id": row[0], "title": row[1], "description": row[2],
            "category": row[3], "created_at": str(row[4])[:10], "created_by": row[5]
        }
        cur.execute(
            f"SELECT id, text, position FROM {SCHEMA}.checklist_items "
            f"WHERE checklist_id = %s ORDER BY position",
            (checklist_id,)
        )
        items = [{"id": r[0], "text": r[1], "position": r[2]} for r in cur.fetchall()]
        checklist["items"] = items

        cur.execute(
            f"SELECT a.id, a.user_id, a.status, a.progress, a.assigned_at, a.completed_at, "
            f"u.name, u.avatar, u.department "
            f"FROM {SCHEMA}.assignments a JOIN {SCHEMA}.users u ON a.user_id = u.id "
            f"WHERE a.checklist_id = %s",
            (checklist_id,)
        )
        assignments = []
        for ar in cur.fetchall():
            cur2 = conn.cursor()
            cur2.execute(
                f"SELECT ap.item_id, ap.done FROM {SCHEMA}.assignment_progress ap WHERE ap.assignment_id = %s",
                (ar[0],)
            )
            progress_map = {r[0]: r[1] for r in cur2.fetchall()}
            item_progresses = [
                {"id": it["id"], "text": it["text"], "done": progress_map.get(it["id"], False)}
                for it in items
            ]
            assignments.append({
                "id": ar[0], "user_id": ar[1], "status": ar[2], "progress": ar[3],
                "assigned_at": str(ar[4])[:10],
                "completed_at": str(ar[5])[:10] if ar[5] else None,
                "user_name": ar[6], "user_avatar": ar[7], "user_department": ar[8],
                "items": item_progresses
            })
        checklist["assignments"] = assignments
        conn.close()
        return {"statusCode": 200, "headers": cors(), "body": json.dumps({"checklist": checklist})}

    # GET — список
    if method == "GET":
        if user["role"] == "creator":
            cur.execute(
                f"SELECT c.id, c.title, c.description, c.category, c.created_at, "
                f"COUNT(DISTINCT a.id), "
                f"COUNT(DISTINCT CASE WHEN a.status='completed' THEN a.id END), "
                f"COALESCE(AVG(a.progress), 0), "
                f"COUNT(DISTINCT ci.id) "
                f"FROM {SCHEMA}.checklists c "
                f"LEFT JOIN {SCHEMA}.assignments a ON a.checklist_id = c.id "
                f"LEFT JOIN {SCHEMA}.checklist_items ci ON ci.checklist_id = c.id "
                f"WHERE c.created_by = %s "
                f"GROUP BY c.id ORDER BY c.created_at DESC",
                (user["id"],)
            )
        else:
            cur.execute(
                f"SELECT c.id, c.title, c.description, c.category, c.created_at, "
                f"1, 0, a.progress, COUNT(DISTINCT ci.id) "
                f"FROM {SCHEMA}.checklists c "
                f"JOIN {SCHEMA}.assignments a ON a.checklist_id = c.id AND a.user_id = %s "
                f"LEFT JOIN {SCHEMA}.checklist_items ci ON ci.checklist_id = c.id "
                f"GROUP BY c.id, a.progress ORDER BY c.created_at DESC",
                (user["id"],)
            )
        rows = cur.fetchall()
        checklists = [{
            "id": r[0], "title": r[1], "description": r[2], "category": r[3],
            "created_at": str(r[4])[:10],
            "assignment_count": r[5], "completed_count": r[6],
            "avg_progress": round(float(r[7])), "items_count": r[8]
        } for r in rows]
        conn.close()
        return {"statusCode": 200, "headers": cors(), "body": json.dumps({"checklists": checklists})}

    # POST — создать
    if method == "POST":
        if user["role"] != "creator":
            conn.close()
            return {"statusCode": 403, "headers": cors(), "body": json.dumps({"error": "forbidden"})}
        body = json.loads(event.get("body") or "{}")
        title = body.get("title", "").strip()
        description = body.get("description", "").strip()
        category = body.get("category", "Прочее")
        items = body.get("items", [])
        assigned_user_ids = body.get("assigned_user_ids", [])

        if not title:
            conn.close()
            return {"statusCode": 400, "headers": cors(), "body": json.dumps({"error": "title обязателен"})}

        cur.execute(
            f"INSERT INTO {SCHEMA}.checklists (title, description, category, created_by) "
            f"VALUES (%s, %s, %s, %s) RETURNING id",
            (title, description, category, user["id"])
        )
        cl_id = cur.fetchone()[0]

        item_ids = []
        for i, item_text in enumerate(items):
            if str(item_text).strip():
                cur.execute(
                    f"INSERT INTO {SCHEMA}.checklist_items (checklist_id, text, position) "
                    f"VALUES (%s, %s, %s) RETURNING id",
                    (cl_id, str(item_text).strip(), i)
                )
                item_ids.append(cur.fetchone()[0])

        for uid in assigned_user_ids:
            cur.execute(
                f"INSERT INTO {SCHEMA}.assignments (checklist_id, user_id) "
                f"VALUES (%s, %s) ON CONFLICT DO NOTHING RETURNING id",
                (cl_id, uid)
            )
            row = cur.fetchone()
            if row:
                a_id = row[0]
                for iid in item_ids:
                    cur.execute(
                        f"INSERT INTO {SCHEMA}.assignment_progress (assignment_id, item_id, done) "
                        f"VALUES (%s, %s, FALSE) ON CONFLICT DO NOTHING",
                        (a_id, iid)
                    )

        conn.commit()
        conn.close()
        return {"statusCode": 201, "headers": cors(), "body": json.dumps({"id": cl_id})}

    conn.close()
    return {"statusCode": 405, "headers": cors(), "body": json.dumps({"error": "method not allowed"})}
