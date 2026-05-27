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
    GET  /          — список чек-листов
    GET  /?id=N     — детали одного чек-листа
    POST /          — создать чек-лист
    PUT  /          — обновить расписание или назначения по должности (action в body)
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

    # ── GET ?id=N — детали одного чек-листа ──────────────────────────────────
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

        # Пункты с расширенными полями
        cur.execute(
            f"SELECT id, text, position, item_type, options, min_value, max_value, unit, is_required "
            f"FROM {SCHEMA}.checklist_items WHERE checklist_id = %s ORDER BY position",
            (checklist_id,)
        )
        items = []
        for r in cur.fetchall():
            items.append({
                "id": r[0], "text": r[1], "position": r[2],
                "item_type": r[3] or "boolean",
                "options": r[4] if r[4] else [],
                "min_value": float(r[5]) if r[5] is not None else None,
                "max_value": float(r[6]) if r[6] is not None else None,
                "unit": r[7],
                "is_required": r[8] or False
            })
        checklist["items"] = items

        # Назначения
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

        # Расписания
        cur.execute(
            f"SELECT id, schedule_type, frequency, days_of_week, day_of_month, "
            f"time_of_day, execution_date, is_active "
            f"FROM {SCHEMA}.schedules WHERE checklist_id = %s ORDER BY created_at DESC",
            (checklist_id,)
        )
        schedules = []
        for s in cur.fetchall():
            schedules.append({
                "id": s[0], "schedule_type": s[1], "frequency": s[2],
                "days_of_week": s[3] or [], "day_of_month": s[4],
                "time_of_day": str(s[5])[:5] if s[5] else None,
                "execution_date": str(s[6])[:16] if s[6] else None,
                "is_active": s[7]
            })
        checklist["schedules"] = schedules

        # Назначения по должности
        cur.execute(
            f"SELECT id, job_title FROM {SCHEMA}.role_assignments WHERE checklist_id = %s",
            (checklist_id,)
        )
        checklist["role_assignments"] = [{"id": r[0], "job_title": r[1]} for r in cur.fetchall()]

        conn.close()
        return {"statusCode": 200, "headers": cors(), "body": json.dumps({"checklist": checklist})}

    # ── GET — список ──────────────────────────────────────────────────────────
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

    # ── POST — создать ────────────────────────────────────────────────────────
    if method == "POST":
        if user["role"] != "creator":
            conn.close()
            return {"statusCode": 403, "headers": cors(), "body": json.dumps({"error": "forbidden"})}

        body = json.loads(event.get("body") or "{}")
        title = body.get("title", "").strip()
        description = body.get("description", "").strip()
        category = body.get("category", "Прочее")
        items_data = body.get("items", [])
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
        for i, item_data in enumerate(items_data):
            if isinstance(item_data, str):
                text = item_data.strip()
                item_type = "boolean"
                options = None
                min_val = None
                max_val = None
                unit = None
                is_required = False
            else:
                text = str(item_data.get("text", "")).strip()
                item_type = item_data.get("item_type", "boolean")
                options = json.dumps(item_data.get("options", [])) if item_data.get("options") else None
                min_val = item_data.get("min_value")
                max_val = item_data.get("max_value")
                unit = item_data.get("unit")
                is_required = bool(item_data.get("is_required", False))

            if not text:
                continue

            cur.execute(
                f"INSERT INTO {SCHEMA}.checklist_items "
                f"(checklist_id, text, position, item_type, options, min_value, max_value, unit, is_required) "
                f"VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (cl_id, text, i, item_type, options, min_val, max_val, unit, is_required)
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

    # ── PUT — расписание / назначение по должности ────────────────────────────
    if method == "PUT":
        if user["role"] != "creator":
            conn.close()
            return {"statusCode": 403, "headers": cors(), "body": json.dumps({"error": "forbidden"})}

        body = json.loads(event.get("body") or "{}")
        action = body.get("action")
        checklist_id = body.get("checklist_id")

        if not checklist_id:
            conn.close()
            return {"statusCode": 400, "headers": cors(), "body": json.dumps({"error": "checklist_id required"})}

        # Добавить расписание
        if action == "add_schedule":
            s = body.get("schedule", {})
            cur.execute(
                f"INSERT INTO {SCHEMA}.schedules "
                f"(checklist_id, schedule_type, frequency, days_of_week, day_of_month, time_of_day, execution_date) "
                f"VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (
                    checklist_id,
                    s.get("schedule_type", "one_time"),
                    s.get("frequency"),
                    s.get("days_of_week") or None,
                    s.get("day_of_month"),
                    s.get("time_of_day"),
                    s.get("execution_date"),
                )
            )
            schedule_id = cur.fetchone()[0]
            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": cors(), "body": json.dumps({"id": schedule_id})}

        # Удалить расписание
        if action == "remove_schedule":
            schedule_id = body.get("schedule_id")
            cur.execute(
                f"UPDATE {SCHEMA}.schedules SET is_active = FALSE WHERE id = %s AND checklist_id = %s",
                (schedule_id, checklist_id)
            )
            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": cors(), "body": json.dumps({"ok": True})}

        # Добавить назначение по должности
        if action == "add_role":
            job_title = body.get("job_title", "").strip()
            if not job_title:
                conn.close()
                return {"statusCode": 400, "headers": cors(), "body": json.dumps({"error": "job_title required"})}

            cur.execute(
                f"INSERT INTO {SCHEMA}.role_assignments (checklist_id, job_title) "
                f"VALUES (%s, %s) ON CONFLICT DO NOTHING RETURNING id",
                (checklist_id, job_title)
            )
            row = cur.fetchone()
            role_id = row[0] if row else None

            # Автоматически назначить всем пользователям с такой должностью
            cur.execute(
                f"SELECT id FROM {SCHEMA}.users WHERE job_title = %s AND role = 'executor'",
                (job_title,)
            )
            users_to_assign = [r[0] for r in cur.fetchall()]

            # Получаем item_ids чек-листа
            cur.execute(f"SELECT id FROM {SCHEMA}.checklist_items WHERE checklist_id = %s", (checklist_id,))
            item_ids = [r[0] for r in cur.fetchall()]

            for uid in users_to_assign:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.assignments (checklist_id, user_id) "
                    f"VALUES (%s, %s) ON CONFLICT DO NOTHING RETURNING id",
                    (checklist_id, uid)
                )
                arow = cur.fetchone()
                if arow:
                    a_id = arow[0]
                    for iid in item_ids:
                        cur.execute(
                            f"INSERT INTO {SCHEMA}.assignment_progress (assignment_id, item_id, done) "
                            f"VALUES (%s, %s, FALSE) ON CONFLICT DO NOTHING",
                            (a_id, iid)
                        )

            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": cors(), "body": json.dumps({"id": role_id, "assigned": len(users_to_assign)})}

        # Удалить назначение по должности
        if action == "remove_role":
            role_id = body.get("role_assignment_id")
            cur.execute(
                f"SELECT job_title FROM {SCHEMA}.role_assignments WHERE id = %s",
                (role_id,)
            )
            conn.close()
            return {"statusCode": 200, "headers": cors(), "body": json.dumps({"ok": True})}

        conn.close()
        return {"statusCode": 400, "headers": cors(), "body": json.dumps({"error": "unknown action"})}

    conn.close()
    return {"statusCode": 405, "headers": cors(), "body": json.dumps({"error": "method not allowed"})}
