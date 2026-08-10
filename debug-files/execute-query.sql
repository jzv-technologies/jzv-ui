-- Task: Create request_tracker table for requests & approvals
-- Date: 2026-08-10
-- Tables affected: public.request_tracker

BEGIN;

CREATE TABLE IF NOT EXISTS public.request_tracker (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  requester_id BIGINT NOT NULL,
  requester_name VARCHAR(100) NOT NULL,
  request_type VARCHAR(50) NOT NULL DEFAULT 'Add Work Access',
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  rejected_by VARCHAR(100),
  rejected_at TIMESTAMPTZ,
  active_from TIMESTAMPTZ,
  expire_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_request_tracker_status ON public.request_tracker(status);
CREATE INDEX IF NOT EXISTS idx_request_tracker_requester ON public.request_tracker(requester_id);
CREATE INDEX IF NOT EXISTS idx_request_tracker_type ON public.request_tracker(request_type);

COMMIT;
