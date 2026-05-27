CREATE TABLE t_p51895419_checklist_constructo.schedules (
    id SERIAL PRIMARY KEY,
    checklist_id INTEGER NOT NULL REFERENCES t_p51895419_checklist_constructo.checklists(id),
    schedule_type VARCHAR(20) NOT NULL DEFAULT 'one_time' CHECK (schedule_type IN ('recurring', 'one_time')),
    frequency VARCHAR(20) CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    days_of_week INTEGER[],
    day_of_month INTEGER,
    time_of_day TIME,
    execution_date TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);