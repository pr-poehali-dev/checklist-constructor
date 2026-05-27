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
        f"SELECT u.id, u.role FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON s.user_id = u.id "
        f"WHERE s.token = %s AND s.expires_at > NOW()",
        (token,)
    )
    row = cur.fetchone()
    return {"id": row[0], "role": row[1]} if row else None

def handler(event: dict, context) -> dict:
    """
    GET  /  — список пользователей (с job_title)
    GET  /?job_titles=1 — уникальные должности
    POST /  — создать пользователя
    PUT  /  — обновить job_title пользователя
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

    # GET ?job_titles=1 — справочник должностей
    if method == "GET" and qs.get("job_titles"):
        cur.execute(
            f"SELECT DISTINCT job_title FROM {SCHEMA}.users "
            f"WHERE job_title IS NOT NULL AND job_title != '' ORDER BY job_title"
        )
        titles = [r[0] for r in cur.fetchall()]
        conn.close()
        return {"statusCode": 200, "headers": cors(), "body": json.dumps({"job_titles": titles})}

    # GET — список пользователей
    if method == "GET":
        cur.execute(
            f"SELECT id, name, email, role, department, avatar, job_title, created_at "
            f"FROM {SCHEMA}.users ORDER BY name"
        )
        users = [{
            "id": r[0], "name": r[1], "email": r[2], "role": r[3],
            "department": r[4], "avatar": r[5], "job_title": r[6] or "",
            "created_at": str(r[7])[:10] if r[7] else ""
        } for r in cur.fetchall()]
        conn.close()
        return {"statusCode": 200, "headers": cors(), "body": json.dumps({"users": users})}

    # PUT — обновить job_title
    if method == "PUT":
        if user["role"] != "creator":
            conn.close()
            return {"statusCode": 403, "headers": cors(), "body": json.dumps({"error": "forbidden"})}

        body = json.loads(event.get("body") or "{}")
        target_user_id = body.get("user_id")
        job_title = body.get("job_title", "").strip()

        if not target_user_id:
            conn.close()
            return {"statusCode": 400, "headers": cors(), "body": json.dumps({"error": "user_id required"})}

        cur.execute(
            f"UPDATE {SCHEMA}.users SET job_title = %s WHERE id = %s",
            (job_title or None, target_user_id)
        )

        # Автоматически назначить чек-листы по новой должности
        if job_title:
            cur.execute(
                f"SELECT checklist_id FROM {SCHEMA}.role_assignments WHERE job_title = %s",
                (job_title,)
            )
            checklist_ids = [r[0] for r in cur.fetchall()]

            for cl_id in checklist_ids:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.assignments (checklist_id, user_id) "
                    f"VALUES (%s, %s) ON CONFLICT DO NOTHING RETURNING id",
                    (cl_id, target_user_id)
                )
                arow = cur.fetchone()
                if arow:
                    a_id = arow[0]
                    cur.execute(
                        f"SELECT id FROM {SCHEMA}.checklist_items WHERE checklist_id = %s",
                        (cl_id,)
                    )
                    for irow in cur.fetchall():
                        cur.execute(
                            f"INSERT INTO {SCHEMA}.assignment_progress (assignment_id, item_id, done) "
                            f"VALUES (%s, %s, FALSE) ON CONFLICT DO NOTHING",
                            (a_id, irow[0])
                        )

        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": cors(), "body": json.dumps({"ok": True})}

    # POST — создать пользователя (упрощённо, без хеширования)
    if method == "POST":
        if user["role"] != "creator":
            conn.close()
            return {"statusCode": 403, "headers": cors(), "body": json.dumps({"error": "forbidden"})}

        body = json.loads(event.get("body") or "{}")
        name = body.get("name", "").strip()
        email = body.get("email", "").strip().lower()
        password = body.get("password", "password123")
        department = body.get("department", "")
        job_title = body.get("job_title", "")
        avatar = "".join([w[0].upper() for w in name.split()[:2]]) if name else "??"

        if not name or not email:
            conn.close()
            return {"statusCode": 400, "headers": cors(), "body": json.dumps({"error": "name и email обязательны"})}

        cur.execute(
            f"INSERT INTO {SCHEMA}.users (name, email, password_hash, role, department, avatar, job_title) "
            f"VALUES (%s, %s, %s, 'executor', %s, %s, %s) RETURNING id",
            (name, email, password, department, avatar, job_title or None)
        )
        new_id = cur.fetchone()[0]

        # Автоматически назначить чек-листы по должности
        if job_title:
            cur.execute(
                f"SELECT checklist_id FROM {SCHEMA}.role_assignments WHERE job_title = %s",
                (job_title,)
            )
            for row in cur.fetchall():
                cl_id = row[0]
                cur.execute(
                    f"INSERT INTO {SCHEMA}.assignments (checklist_id, user_id) VALUES (%s, %s) RETURNING id",
                    (cl_id, new_id)
                )
                arow = cur.fetchone()
                if arow:
                    a_id = arow[0]
                    cur.execute(f"SELECT id FROM {SCHEMA}.checklist_items WHERE checklist_id = %s", (cl_id,))
                    for irow in cur.fetchall():
                        cur.execute(
                            f"INSERT INTO {SCHEMA}.assignment_progress (assignment_id, item_id, done) VALUES (%s, %s, FALSE)",
                            (a_id, irow[0])
                        )

        conn.commit()
        conn.close()
        return {"statusCode": 201, "headers": cors(), "body": json.dumps({"id": new_id})}

    conn.close()
    return {"statusCode": 405, "headers": cors(), "body": json.dumps({"error": "method not allowed"})}
