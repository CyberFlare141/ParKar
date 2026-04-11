DROP TABLE IF EXISTS parking_tickets CASCADE;
DROP TABLE IF EXISTS auth_otps CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS ai_analysis CASCADE;
DROP TABLE IF EXISTS application_documents CASCADE;
DROP TABLE IF EXISTS parking_applications CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS semesters CASCADE;
DROP TABLE IF EXISTS personal_access_tokens CASCADE;
DROP TABLE IF EXISTS failed_jobs CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS user_auth_provider CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS vehicle_type_enum CASCADE;
DROP TYPE IF EXISTS document_type_enum CASCADE;
DROP TYPE IF EXISTS application_status_enum CASCADE;
DROP TYPE IF EXISTS audit_action_enum CASCADE;
DROP TYPE IF EXISTS otp_purpose_enum CASCADE;
DROP TYPE IF EXISTS otp_channel_enum CASCADE;

CREATE TYPE user_auth_provider AS ENUM ('local', 'google', 'both');
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE vehicle_type_enum AS ENUM ('car', 'motorcycle', 'other');
CREATE TYPE document_type_enum AS ENUM ('license', 'registration', 'insurance', 'id_card', 'vehicle_photo');
CREATE TYPE application_status_enum AS ENUM ('pending', 'approved', 'rejected', 'expired');
CREATE TYPE audit_action_enum AS ENUM ('approved', 'rejected', 'updated');
CREATE TYPE otp_purpose_enum AS ENUM ('register', 'login');
CREATE TYPE otp_channel_enum AS ENUM ('email', 'phone');

CREATE TABLE users (
  id bigserial PRIMARY KEY,
  name varchar(255) NOT NULL,
  email varchar(255) NOT NULL UNIQUE,
  google_id varchar(100) UNIQUE,
  google_avatar varchar(512),
  email_verified_at timestamp NULL,
  password varchar(255),
  auth_provider user_auth_provider NOT NULL DEFAULT 'local',
  role user_role NOT NULL DEFAULT 'student',
  university_id varchar(50),
  department varchar(100),
  phone varchar(20),
  is_active boolean NOT NULL DEFAULT true,
  remember_token varchar(100),
  created_at timestamp NULL,
  updated_at timestamp NULL
);

CREATE TABLE password_reset_tokens (
  email varchar(255) PRIMARY KEY,
  token varchar(255) NOT NULL,
  created_at timestamp NULL
);

CREATE TABLE failed_jobs (
  id bigserial PRIMARY KEY,
  uuid varchar(255) NOT NULL UNIQUE,
  connection text NOT NULL,
  queue text NOT NULL,
  payload text NOT NULL,
  exception text NOT NULL,
  failed_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE personal_access_tokens (
  id bigserial PRIMARY KEY,
  tokenable_type varchar(255) NOT NULL,
  tokenable_id bigint NOT NULL,
  name varchar(255) NOT NULL,
  token varchar(64) NOT NULL UNIQUE,
  abilities text,
  last_used_at timestamp NULL,
  expires_at timestamp NULL,
  created_at timestamp NULL,
  updated_at timestamp NULL
);

CREATE INDEX personal_access_tokens_tokenable_type_tokenable_id_index
  ON personal_access_tokens (tokenable_type, tokenable_id);

CREATE TABLE semesters (
  id bigserial PRIMARY KEY,
  name varchar(255) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  vehicle_quota integer NOT NULL,
  semester_fee numeric(10,2) NOT NULL DEFAULT 0.00,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NULL,
  updated_at timestamp NULL
);

CREATE TABLE vehicles (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plate_number varchar(20) NOT NULL,
  vehicle_type vehicle_type_enum NOT NULL,
  brand varchar(255),
  model varchar(255),
  color varchar(50),
  registration_number varchar(100),
  created_at timestamp NULL,
  updated_at timestamp NULL
);

CREATE INDEX vehicles_user_id_foreign ON vehicles (user_id);

CREATE TABLE documents (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type document_type_enum NOT NULL,
  file_path varchar(255) NOT NULL,
  expiry_date date NULL,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamp NULL,
  updated_at timestamp NULL
);

CREATE INDEX documents_user_id_foreign ON documents (user_id);

CREATE TABLE parking_applications (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  semester_id bigint NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  vehicle_id bigint NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  register_as varchar(20),
  applicant_name varchar(255),
  applicant_university_id varchar(50),
  applicant_email varchar(255),
  applicant_phone varchar(20),
  notes text,
  nda_signed boolean NOT NULL DEFAULT false,
  status application_status_enum NOT NULL DEFAULT 'pending',
  priority_score double precision,
  ai_flag boolean NOT NULL DEFAULT false,
  admin_comment text,
  reviewed_by bigint REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamp NULL,
  created_at timestamp NULL,
  updated_at timestamp NULL
);

CREATE INDEX parking_applications_user_id_foreign ON parking_applications (user_id);
CREATE INDEX parking_applications_semester_id_foreign ON parking_applications (semester_id);
CREATE INDEX parking_applications_vehicle_id_foreign ON parking_applications (vehicle_id);
CREATE INDEX parking_applications_reviewed_by_foreign ON parking_applications (reviewed_by);

CREATE TABLE application_documents (
  id bigserial PRIMARY KEY,
  application_id bigint NOT NULL REFERENCES parking_applications(id) ON DELETE CASCADE,
  document_id bigint NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_at timestamp NULL
);

CREATE INDEX application_documents_application_id_foreign ON application_documents (application_id);
CREATE INDEX application_documents_document_id_foreign ON application_documents (document_id);

CREATE TABLE ai_analysis (
  id bigserial PRIMARY KEY,
  application_id bigint NOT NULL REFERENCES parking_applications(id) ON DELETE CASCADE,
  blurry_score double precision,
  name_match_score double precision,
  expiry_valid boolean,
  renewal_recommendation boolean,
  risk_score double precision,
  raw_response jsonb,
  created_at timestamp NULL,
  updated_at timestamp NULL
);

CREATE INDEX ai_analysis_application_id_foreign ON ai_analysis (application_id);

CREATE TABLE notifications (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp NULL
);

CREATE INDEX notifications_user_id_foreign ON notifications (user_id);

CREATE TABLE audit_logs (
  id bigserial PRIMARY KEY,
  admin_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id bigint NOT NULL REFERENCES parking_applications(id) ON DELETE CASCADE,
  action audit_action_enum NOT NULL,
  reason text,
  created_at timestamp NULL
);

CREATE INDEX audit_logs_admin_id_foreign ON audit_logs (admin_id);
CREATE INDEX audit_logs_application_id_foreign ON audit_logs (application_id);

CREATE TABLE auth_otps (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id varchar(64) NOT NULL UNIQUE,
  purpose otp_purpose_enum NOT NULL,
  channel otp_channel_enum NOT NULL DEFAULT 'email',
  code_hash varchar(255) NOT NULL,
  attempts smallint NOT NULL DEFAULT 0,
  max_attempts smallint NOT NULL DEFAULT 5,
  sent_at timestamp NULL,
  expires_at timestamp NOT NULL,
  consumed_at timestamp NULL,
  invalidated_at timestamp NULL,
  last_attempt_at timestamp NULL,
  meta jsonb,
  created_at timestamp NULL,
  updated_at timestamp NULL
);

CREATE INDEX auth_otps_user_id_purpose_index ON auth_otps (user_id, purpose);
CREATE INDEX auth_otps_expires_at_index ON auth_otps (expires_at);

CREATE TABLE parking_tickets (
  id bigserial PRIMARY KEY,
  ticket_id varchar(40) NOT NULL UNIQUE,
  application_id bigint NOT NULL UNIQUE REFERENCES parking_applications(id) ON DELETE CASCADE,
  issue_date timestamp NOT NULL,
  parking_slot varchar(40),
  created_at timestamp NULL,
  updated_at timestamp NULL
);
