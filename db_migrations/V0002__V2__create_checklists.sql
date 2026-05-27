CREATE TABLE t_p51895419_checklist_constructo.checklists (
    id SERIAL PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'Прочее',
    created_by INTEGER NOT NULL REFERENCES t_p51895419_checklist_constructo.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);