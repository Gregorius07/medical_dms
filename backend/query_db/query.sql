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
    id_user         BIGINT PRIMARY KEY,
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
    parent_folder   INT REFERENCES folder(id_folder)
);

CREATE TYPE approval_status AS ENUM ('DRAFT','UNDER REVIEW','APPROVED');

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
    file_format         VARCHAR(10) NOT NULL,
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

CREATE TYPE audit_action AS ENUM ('PREVIEW','UPLOAD','DOWNLOAD');

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
(1001, 'Andi Pratama', 'andi.pratama', 'hashed_password_1', TRUE, 4, 4),
(1002, 'Siti Rahmawati', 'siti.rahma', 'hashed_password_2', FALSE, 1, 1),
(1003, 'Budi Santoso', 'budi.s', 'hashed_password_3', FALSE, 2, 2),
(1004, 'Nina Lestari', 'nina.l', 'hashed_password_4', FALSE, 3, 3),
(1005, 'Maria Kristina', 'maria.k', 'hashed_password_5', FALSE, 5, 5),
(1006, 'Gregorius Denmas', 'bagus', 'bagus123', FALSE, 5, 5);

INSERT INTO folder (folder_name, metadata_schema, created_by, parent_folder) VALUES
('Patient Registrations', '{"fields": ["patient_name", "registration_date"]}', 'andi.pratama', NULL),
('Laboratory Results', '{"fields": ["test_type", "result_date"]}', 'siti.rahma', NULL),
('Radiology Reports', '{"fields": ["image_type", "scan_date"]}', 'budi.s', NULL),
('Inpatient Medical Records', '{"fields": ["ward", "admission_date"]}', 'maria.k', NULL),
('Pharmacy Documents', '{"fields": ["drug_name", "dispense_date"]}', 'andi.pratama', NULL);

INSERT INTO document (file_name, is_deleted, id_folder) VALUES
('patient_registration_001.pdf', FALSE, 1),
('lab_result_hemoglobin_2025.pdf', FALSE, 2),
('radiology_ctscan_7781.pdf', FALSE, 3),
('inpatient_record_22431.pdf', FALSE, 4),
('pharmacy_dispense_5501.pdf', FALSE, 5);


INSERT INTO document_version
(version_number, file_name, file_path, file_format, file_size, custom_metadata, approval_status, created_by, is_active, id_document, id_folder, created_at)
VALUES
(1, 'patient_registration_001_v1.pdf', 'uploads/patient_registration_001_v1.pdf', 'PDF', 245, '{"patient_name":"John Doe"}', 'APPROVED', 'andi.pratama', TRUE, 1, 1, NOW()),
(1, 'lab_result_hemoglobin_2025_v1.pdf', 'uploads/lab_result_hemoglobin_2025_v1.pdf', 'PDF', 300, '{"hemoglobin": "13.5"}', 'UNDER REVIEW', 'siti.rahma', TRUE, 2, 2, NOW()),
(1, 'radiology_ctscan_7781_v1.pdf', 'uploads/radiology_ctscan_7781_v1.pdf', 'PDF', 512, '{"scan_type": "CT-Scan"}', 'APPROVED', 'budi.s', TRUE, 3, 3, NOW()),
(1, 'inpatient_record_22431_v1.pdf', 'uploads/inpatient_record_22431_v1.pdf', 'PDF', 600, '{"ward": "ICU"}', 'DRAFT', 'maria.k', TRUE, 4, 4, NOW()),
(1, 'pharmacy_dispense_5501_v1.pdf', 'uploads/pharmacy_dispense_5501_v1.pdf', 'PDF', 150, '{"drug_name": "Amoxicillin"}', 'APPROVED', 'andi.pratama', TRUE, 5, 5, NOW());

INSERT INTO permission
(preview, download, upload, edit_metadata, resource_type, created_at, created_by, id_user, id_folder, id_document)
VALUES
(TRUE, TRUE, FALSE, FALSE, 'FOLDER', NOW(), 'andi.pratama', 1002, 1, NULL),
(TRUE, TRUE, TRUE, TRUE, 'DOCUMENT', NOW(), 'siti.rahma', 1003, NULL, 2),
(TRUE, FALSE, FALSE, FALSE, 'DOCUMENT', NOW(), 'budi.s', 1004, NULL, 3),
(TRUE, TRUE, TRUE, FALSE, 'FOLDER', NOW(), 'maria.k', 1005, 4, NULL),
(TRUE, TRUE, TRUE, TRUE, 'DOCUMENT', NOW(), 'andi.pratama', 1001, NULL, 1);
(TRUE, TRUE, TRUE, TRUE, 'DOCUMENT', NOW(), 'andi.pratama', 1771842238329, 10, NULL);

INSERT INTO audit_log
(action, resource_type, details, timestamp, id_user, id_folder, id_document)
VALUES
('PREVIEW', 'DOCUMENT', 'Previewed patient registration document', NOW(), 1002, NULL, 1),
('DOWNLOAD', 'DOCUMENT', 'Downloaded hemoglobin lab result', NOW(), 1003, NULL, 2),
('PREVIEW', 'DOCUMENT', 'Previewed CT scan radiology report', NOW(), 1004, NULL, 3),
('UPLOAD', 'FOLDER', 'Uploaded new inpatient admission file', NOW(), 1005, 4, NULL),
('DOWNLOAD', 'DOCUMENT', 'Downloaded pharmacy dispense record', NOW(), 1001, NULL, 5);

INSERT INTO approval_request
(status, notes, created_at, updated_at, id_requester, id_approver, id_document)
VALUES
('PENDING', 'Please review the updated patient registration', NOW(), NOW(), 1002, 1001, 1),
('APPROVED', 'Lab result verified', NOW(), NOW(), 1003, 1001, 2),
('PENDING', 'CT scan report requires validation', NOW(), NOW(), 1004, 1001, 3),
('REJECTED', 'Incomplete inpatient record details', NOW(), NOW(), 1005, 1001, 4),
('APPROVED', 'Pharmacy dispense record confirmed', NOW(), NOW(), 1001, 1003, 5);
