CREATE TABLE t_p51895419_checklist_constructo.checklist_items (
    id SERIAL PRIMARY KEY,
    checklist_id INTEGER NOT NULL REFERENCES t_p51895419_checklist_constructo.checklists(id),
    text TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
);