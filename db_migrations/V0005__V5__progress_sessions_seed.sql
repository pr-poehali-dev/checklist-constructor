CREATE TABLE t_p51895419_checklist_constructo.assignment_progress (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES t_p51895419_checklist_constructo.assignments(id),
    item_id INTEGER NOT NULL REFERENCES t_p51895419_checklist_constructo.checklist_items(id),
    done BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(assignment_id, item_id)
);

CREATE TABLE t_p51895419_checklist_constructo.sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p51895419_checklist_constructo.users(id),
    token VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'
);

INSERT INTO t_p51895419_checklist_constructo.users (name, email, password_hash, role, department, avatar) VALUES
('Алексей Воронов', 'voronov@corp.ru', 'password123', 'creator', 'Управление', 'АВ'),
('Мария Козлова', 'kozlova@corp.ru', 'password123', 'executor', 'HR', 'МК'),
('Дмитрий Петров', 'petrov@corp.ru', 'password123', 'executor', 'Продажи', 'ДП'),
('Светлана Иванова', 'ivanova@corp.ru', 'password123', 'executor', 'Финансы', 'СИ'),
('Андрей Смирнов', 'smirnov@corp.ru', 'password123', 'executor', 'ИТ', 'АС');