-- Pega este código en: Supabase Dashboard > SQL Editor > New Query
-- Luego haz clic en "Run"

CREATE TABLE diagnosticos (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  business_name TEXT,
  city         TEXT,
  email        TEXT,
  rfc          TEXT,
  activity_type TEXT,
  finance_score      NUMERIC(5,2),
  marketing_score    NUMERIC(5,2),
  innovation_score   NUMERIC(5,2),
  operations_score   NUMERIC(5,2),
  total_score        NUMERIC(5,2),
  verdict            TEXT,
  finance_letter     TEXT,
  marketing_letter   TEXT,
  innovation_letter  TEXT,
  operations_letter  TEXT,
  sales              NUMERIC(14,2),
  net_profit         NUMERIC(14,2),
  margin             NUMERIC(8,4),
  marketing_spend    NUMERIC(14,2),
  is_innovating      TEXT,
  raw_data           JSONB
);

ALTER TABLE diagnosticos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo service_role puede acceder"
  ON diagnosticos FOR ALL TO service_role USING (true);
