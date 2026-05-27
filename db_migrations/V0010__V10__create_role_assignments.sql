CREATE TABLE t_p51895419_checklist_constructo.role_assignments (
    id SERIAL PRIMARY KEY,
    checklist_id INTEGER NOT NULL REFERENCES t_p51895419_checklist_constructo.checklists(id),
    job_title VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(checklist_id, job_title)
);