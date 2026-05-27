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
    GET  /  — мои задания с расширенными пунктами (executor)
    POST /  — action: toggle | submit (сохранить полный ответ)
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

    # ── GET — мои задания ─────────────────────────────────────────────────────
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
            # Пункты с типами
            cur2 = conn.cursor()
            cur2.execute(
                f"SELECT ci.id, ci.text, ci.item_type, ci.options, ci.min_value, ci.max_value, "
                f"ci.unit, ci.is_required, COALESCE(ap.done, FALSE) "
                f"FROM {SCHEMA}.checklist_items ci "
                f"LEFT JOIN {SCHEMA}.assignment_progress ap ON ap.item_id = ci.id AND ap.assignment_id = %s "
                f"WHERE ci.checklist_id = %s ORDER BY ci.position",
                (r[0], r[1])
            )
            items = []
            for ir in cur2.fetchall():
                items.append({
                    "id": ir[0], "text": ir[1],
                    "item_type": ir[2] or "boolean",
                    "options": ir[3] if ir[3] else [],
                    "min_value": float(ir[4]) if ir[4] is not None else None,
                    "max_value": float(ir[5]) if ir[5] is not None else None,
                    "unit": ir[6],
                    "is_required": ir[7] or False,
                    "done": ir[8]
                })

            # Submission (последний ответ)
            cur3 = conn.cursor()
            cur3.execute(
                f"SELECT responses FROM {SCHEMA}.submissions WHERE assignment_id = %s ORDER BY submitted_at DESC LIMIT 1",
                (r[0],)
            )
            sub_row = cur3.fetchone()
            responses = sub_row[0] if sub_row else []

            result.append({
                "assignment_id": r[0], "checklist_id": r[1], "status": r[2], "progress": r[3],
                "assigned_at": str(r[4])[:10],
                "completed_at": str(r[5])[:10] if r[5] else None,
                "title": r[6], "description": r[7], "category": r[8],
                "items": items,
                "responses": responses
            })
        conn.close()
        return {"statusCode": 200, "headers": cors(), "body": json.dumps({"assignments": result})}

    # ── POST — действия ───────────────────────────────────────────────────────
    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        action = body.get("action")
        assignment_id = body.get("assignment_id")

        if not assignment_id:
            conn.close()
            return {"statusCode": 400, "headers": cors(), "body": json.dumps({"error": "assignment_id required"})}

        # Проверяем владение
        cur.execute(
            f"SELECT id, checklist_id, status FROM {SCHEMA}.assignments WHERE id = %s AND user_id = %s",
            (assignment_id, user["id"])
        )
        assignment = cur.fetchone()
        if not assignment:
            conn.close()
            return {"statusCode": 403, "headers": cors(), "body": json.dumps({"error": "forbidden"})}

        checklist_id = assignment[1]
        current_status = assignment[2]

        # toggle — отметить/снять boolean-пункт
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

            cur.execute(
                f"SELECT COUNT(*) FROM {SCHEMA}.checklist_items WHERE checklist_id = %s",
                (checklist_id,)
            )
            total = cur.fetchone()[0]
            cur.execute(
                f"SELECT COUNT(*) FROM {SCHEMA}.assignment_progress WHERE assignment_id = %s AND done = TRUE",
                (assignment_id,)
            )
            done_count = cur.fetchone()[0]
            progress = round(done_count / total * 100) if total > 0 else 0
            new_status = "assigned" if done_count == 0 else "in_progress"

            cur.execute(
                f"UPDATE {SCHEMA}.assignments SET progress = %s, status = %s WHERE id = %s",
                (progress, new_status, assignment_id)
            )
            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": cors(), "body": json.dumps({"progress": progress, "status": new_status})}

        # submit — сохранить полные ответы и завершить
        if action == "submit":
            responses = body.get("responses", [])

            # Валидация обязательных и числовых полей
            cur.execute(
                f"SELECT id, text, item_type, min_value, max_value, is_required "
                f"FROM {SCHEMA}.checklist_items WHERE checklist_id = %s ORDER BY position",
                (checklist_id,)
            )
            items = cur.fetchall()
            resp_map = {r.get("item_id"): r for r in responses if isinstance(r, dict)}

            errors = []
            for it in items:
                iid, itext, itype, imin, imax, ireq = it
                resp = resp_map.get(iid, {})
                value = resp.get("value")

                if ireq and (value is None or value == "" or value == []):
                    errors.append(f'Поле "{itext}" обязательно для заполнения')
                    continue

                if itype == "numeric" and value is not None and value != "":
                    try:
                        num = float(value)
                        if imin is not None and num < float(imin):
                            errors.append(f'"{itext}": значение {num} меньше минимального ({float(imin)})')
                        if imax is not None and num > float(imax):
                            errors.append(f'"{itext}": значение {num} больше максимального ({float(imax)})')
                    except (ValueError, TypeError):
                        errors.append(f'"{itext}": требуется числовое значение')

            if errors:
                conn.close()
                return {"statusCode": 422, "headers": cors(), "body": json.dumps({"errors": errors})}

            # Сохраняем submission
            cur.execute(
                f"INSERT INTO {SCHEMA}.submissions (assignment_id, responses) VALUES (%s, %s)",
                (assignment_id, json.dumps(responses))
            )

            # Обновляем прогресс через assignment_progress для boolean-пунктов
            for resp in responses:
                if isinstance(resp, dict):
                    iid = resp.get("item_id")
                    itype = resp.get("item_type", "boolean")
                    value = resp.get("value")
                    is_done = False
                    if itype == "boolean":
                        is_done = bool(value)
                    elif value is not None and value != "" and value != []:
                        is_done = True

                    cur.execute(
                        f"INSERT INTO {SCHEMA}.assignment_progress (assignment_id, item_id, done) "
                        f"VALUES (%s, %s, %s) ON CONFLICT (assignment_id, item_id) DO UPDATE SET done = %s",
                        (assignment_id, iid, is_done, is_done)
                    )

            cur.execute(
                f"UPDATE {SCHEMA}.assignments SET status = 'completed', progress = 100, completed_at = NOW() "
                f"WHERE id = %s",
                (assignment_id,)
            )
            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": cors(), "body": json.dumps({"ok": True})}

        conn.close()
        return {"statusCode": 400, "headers": cors(), "body": json.dumps({"error": "unknown action"})}

    conn.close()
    return {"statusCode": 405, "headers": cors(), "body": json.dumps({"error": "method not allowed"})}
