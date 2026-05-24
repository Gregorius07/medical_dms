DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;


CREATE TABLE position (
    id_position     SERIAL PRIMARY KEY,
    position_name   VARCHAR(100) NOT NULL
);

CREATE TABLE department (
    id_department   SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL
);

CREATE TABLE "user" (
    id_user         SERIAL PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    username        VARCHAR(100) UNIQUE NOT NULL,
    password        VARCHAR(255) NOT NULL,
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
    id_position     INT REFERENCES position(id_position),
    id_department   INT REFERENCES department(id_department)
);

CREATE TYPE resource_type AS ENUM ('FOLDER', 'DOCUMENT');

CREATE TABLE folder (
    id_folder       SERIAL PRIMARY KEY,
    folder_name     VARCHAR(150) NOT NULL,
    metadata_schema JSONB,
    created_by      VARCHAR(150) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL,
    parent_folder   INT REFERENCES folder(id_folder)
);

CREATE TYPE approval_status AS ENUM ('DRAFT','PENDING','APPROVED', 'REJECTED');

CREATE TABLE document (
    id_document     SERIAL PRIMARY KEY,
    file_name       VARCHAR(200) NOT NULL,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    id_folder       INT REFERENCES folder(id_folder)
);

CREATE TABLE document_version (
    id_version          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_number      INT NOT NULL,
    file_name           VARCHAR(200) NOT NULL,
    file_size           INT,
    custom_metadata     JSONB,
    file_path           VARCHAR(255),
    approval_status     approval_status NOT NULL,
    created_by          VARCHAR(150) NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    id_document         INT NOT NULL REFERENCES document(id_document),
    id_folder           INT REFERENCES folder(id_folder),
    created_at          TIMESTAMPTZ NOT NULL
);

CREATE TABLE permission (
    id_permission       SERIAL PRIMARY KEY,
    preview             BOOLEAN NOT NULL DEFAULT FALSE,
    download            BOOLEAN NOT NULL DEFAULT FALSE,
    upload              BOOLEAN NOT NULL DEFAULT FALSE,
    edit_metadata       BOOLEAN NOT NULL DEFAULT FALSE,
    resource_type       resource_type NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL,
    created_by          VARCHAR(150) NOT NULL,
    id_user             BIGINT REFERENCES "user"(id_user),
    id_folder           INT REFERENCES folder(id_folder),
    id_document         INT REFERENCES document(id_document)
);

CREATE TYPE audit_action AS ENUM ('PREVIEW','UPLOAD','DOWNLOAD', 'UPDATE', 'DELETE', 'ROLLBACK','EDIT', 'REQUEST_APPROVAL','APPROVE','REJECT');

CREATE TABLE audit_log (
    id_log              SERIAL PRIMARY KEY,
    action              audit_action NOT NULL,
    resource_type       resource_type NOT NULL,
    details             TEXT,
    timestamp           TIMESTAMPTZ NOT NULL,
    id_user             BIGINT REFERENCES "user"(id_user),
    id_folder           INT REFERENCES folder(id_folder),
    id_document         INT REFERENCES document(id_document)
);

CREATE TYPE approval_state AS ENUM ('PENDING','APPROVED','REJECTED');

CREATE TABLE approval_request (
    id_approval     SERIAL PRIMARY KEY,
    status          approval_state NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL,
    id_target_folder INT REFERENCES folder(id_folder),
    id_requester    BIGINT REFERENCES "user"(id_user),
    id_approver     BIGINT REFERENCES "user"(id_user),
    id_document     INT REFERENCES document(id_document)
);

INSERT INTO position (position_name) VALUES
('Medical Records Officer'),
('Radiology Administrator'),
('Laboratory Administrator'),
('Hospital Administrator'),
('Nursing Documentation Staff');

INSERT INTO department (department_name) VALUES
('Medical Records'),
('Radiology'),
('Laboratory'),
('Administration'),
('Nursing');

INSERT INTO "user" (id_user, full_name, username, password, is_admin, id_position, id_department)
VALUES
(1006, 'Gregorius Denmas', 'bagus', 'bagus123', TRUE, 5, 5);
