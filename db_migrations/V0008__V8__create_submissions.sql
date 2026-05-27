CREATE TABLE t_p51895419_checklist_constructo.submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES t_p51895419_checklist_constructo.assignments(id),
    submitted_at TIMESTAMP DEFAULT NOW(),
    responses JSONB NOT NULL DEFAULT '[]'
);