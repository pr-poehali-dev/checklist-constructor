ALTER TABLE t_p51895419_checklist_constructo.checklist_items
  ADD COLUMN item_type VARCHAR(30) NOT NULL DEFAULT 'boolean',
  ADD COLUMN options JSONB,
  ADD COLUMN min_value NUMERIC,
  ADD COLUMN max_value NUMERIC,
  ADD COLUMN unit VARCHAR(30),
  ADD COLUMN is_required BOOLEAN NOT NULL DEFAULT FALSE;