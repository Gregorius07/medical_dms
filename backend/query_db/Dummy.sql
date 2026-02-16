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
(1005, 'Maria Kristina', 'maria.k', 'hashed_password_5', FALSE, 5, 5);

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
(version_number, file_name, file_format, file_size, custom_metadata, approval_status, created_by, is_active, id_document, id_folder)
VALUES
(1, 'patient_registration_001_v1.pdf', 'PDF', 245, '{"patient_name":"John Doe"}', 'APPROVED', 'andi.pratama', TRUE, 1, 1),
(1, 'lab_result_hemoglobin_2025_v1.pdf', 'PDF', 300, '{"hemoglobin": "13.5"}', 'UNDER REVIEW', 'siti.rahma', TRUE, 2, 2),
(1, 'radiology_ctscan_7781_v1.pdf', 'PDF', 512, '{"scan_type": "CT-Scan"}', 'APPROVED', 'budi.s', TRUE, 3, 3),
(1, 'inpatient_record_22431_v1.pdf', 'PDF', 600, '{"ward": "ICU"}', 'DRAFT', 'maria.k', TRUE, 4, 4),
(1, 'pharmacy_dispense_5501_v1.pdf', 'PDF', 150, '{"drug_name": "Amoxicillin"}', 'APPROVED', 'andi.pratama', TRUE, 5, 5);

INSERT INTO permission
(preview, download, upload, edit_metadata, resource_type, created_at, created_by, id_user, id_folder, id_document_version)
VALUES
(TRUE, TRUE, FALSE, FALSE, 'FOLDER', NOW(), 'andi.pratama', 1002, 1, NULL),
(TRUE, TRUE, TRUE, TRUE, 'DOCUMENT', NOW(), 'siti.rahma', 1003, NULL, 2),
(TRUE, FALSE, FALSE, FALSE, 'DOCUMENT', NOW(), 'budi.s', 1004, NULL, 3),
(TRUE, TRUE, TRUE, FALSE, 'FOLDER', NOW(), 'maria.k', 1005, 4, NULL),
(TRUE, TRUE, TRUE, TRUE, 'DOCUMENT', NOW(), 'andi.pratama', 1001, NULL, 1);

INSERT INTO audit_log
(action, resource_type, details, timestamp, id_user, id_folder, id_document_version)
VALUES
('PREVIEW', 'DOCUMENT', 'Previewed patient registration document', NOW(), 1002, NULL, 1),
('DOWNLOAD', 'DOCUMENT', 'Downloaded hemoglobin lab result', NOW(), 1003, NULL, 2),
('PREVIEW', 'DOCUMENT', 'Previewed CT scan radiology report', NOW(), 1004, NULL, 3),
('UPLOAD', 'FOLDER', 'Uploaded new inpatient admission file', NOW(), 1005, 4, NULL),
('DOWNLOAD', 'DOCUMENT', 'Downloaded pharmacy dispense record', NOW(), 1001, NULL, 5);

INSERT INTO approval_request
(status, notes, created_at, updated_at, id_requester, id_approver, id_version)
VALUES
('PENDING', 'Please review the updated patient registration', NOW(), NOW(), 1002, 1001, 1),
('APPROVED', 'Lab result verified', NOW(), NOW(), 1003, 1001, 2),
('PENDING', 'CT scan report requires validation', NOW(), NOW(), 1004, 1001, 3),
('REJECTED', 'Incomplete inpatient record details', NOW(), NOW(), 1005, 1001, 4),
('APPROVED', 'Pharmacy dispense record confirmed', NOW(), NOW(), 1001, 1003, 5);
