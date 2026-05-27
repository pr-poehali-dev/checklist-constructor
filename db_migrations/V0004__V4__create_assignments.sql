CREATE TABLE t_p51895419_checklist_constructo.assignments (
    id SERIAL PRIMARY KEY,
    checklist_id INTEGER NOT NULL REFERENCES t_p51895419_checklist_constructo.checklists(id),
    user_id INTEGER NOT NULL REFERENCES t_p51895419_checklist_constructo.users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
    progress INTEGER NOT NULL DEFAULT 0,
    assigned_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    UNIQUE(checklist_id, user_id)
);