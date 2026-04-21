ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'telegram_bot_state'
      AND policyname = 'Telegram bot state admin all'
  ) THEN
    CREATE POLICY "Telegram bot state admin all"
    ON public.telegram_bot_state
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;