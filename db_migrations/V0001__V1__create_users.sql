CREATE TABLE t_p51895419_checklist_constructo.users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'executor' CHECK (role IN ('creator', 'executor')),
    department VARCHAR(100),
    avatar VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW()
);