-- Synapsis Database Schema
-- Run this file once against your local PostgreSQL database to create all tables.
-- Command: psql -U postgres -d synapsis -f src/database/schema.sql

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Courses table (each user manages their own courses)
CREATE TABLE IF NOT EXISTS courses (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  code       VARCHAR(50),
  color      VARCHAR(20) DEFAULT '#6366f1',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tasks table (optionally linked to a course)
CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  due_date    DATE,
  priority    VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status      VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done')),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Notes table (optionally linked to a course; supports text + whiteboard modes)
CREATE TABLE IF NOT EXISTS notes (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id        INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  title            VARCHAR(255) NOT NULL,
  content          TEXT,
  course           VARCHAR(255),
  course_name      VARCHAR(255),
  note_type        VARCHAR(20) DEFAULT 'text',
  whiteboard_data  JSONB DEFAULT '{}'::jsonb,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

-- Notebook AI sources
CREATE TABLE IF NOT EXISTS ai_sources (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          VARCHAR(255) NOT NULL,
  source_type    VARCHAR(50) NOT NULL DEFAULT 'upload',
  mime_type      VARCHAR(100),
  raw_text       TEXT NOT NULL,
  origin_note_id INTEGER REFERENCES notes(id) ON DELETE SET NULL,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_source_chunks (
  id           SERIAL PRIMARY KEY,
  source_id    INTEGER NOT NULL REFERENCES ai_sources(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chunk_index  INTEGER NOT NULL,
  chunk_text   TEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- Saved AI study outputs
CREATE TABLE IF NOT EXISTS ai_artifacts (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_name    VARCHAR(255),
  artifact_type  VARCHAR(50) NOT NULL DEFAULT 'summary',
  title          VARCHAR(255) NOT NULL,
  content        TEXT NOT NULL,
  output_format  VARCHAR(50) DEFAULT 'markdown',
  output_depth   VARCHAR(50) DEFAULT 'standard',
  output_tone    VARCHAR(50) DEFAULT 'neutral',
  citations      JSONB DEFAULT '[]'::jsonb,
  cache_key      VARCHAR(64),
  created_at     TIMESTAMP DEFAULT NOW()
);

-- Cache for study-set generations (summary / questions / cards / etc.)
CREATE TABLE IF NOT EXISTS ai_study_cache (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cache_key          VARCHAR(64) NOT NULL,
  course_name        VARCHAR(255),
  mode               VARCHAR(50) NOT NULL,
  output_format      VARCHAR(50) NOT NULL DEFAULT 'markdown',
  output_depth       VARCHAR(50) NOT NULL DEFAULT 'standard',
  output_tone        VARCHAR(50) NOT NULL DEFAULT 'neutral',
  prompt             TEXT NOT NULL,
  content            TEXT NOT NULL,
  citations          JSONB DEFAULT '[]'::jsonb,
  source_fingerprint TEXT,
  hit_count          INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMP DEFAULT NOW(),
  updated_at         TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_sources_user_id ON ai_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_source_chunks_source_id ON ai_source_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_ai_artifacts_user_id ON ai_artifacts(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_study_cache_user_id ON ai_study_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_study_cache_key ON ai_study_cache(cache_key);
