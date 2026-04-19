
CREATE TABLE public.site_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'plan_click', 'purchase')),
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_site_events_created ON public.site_events(created_at DESC);
CREATE INDEX idx_site_events_type ON public.site_events(event_type);

ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log events" ON public.site_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read events" ON public.site_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
