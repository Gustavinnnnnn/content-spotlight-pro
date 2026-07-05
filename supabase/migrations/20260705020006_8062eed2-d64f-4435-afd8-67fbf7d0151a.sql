
ALTER TABLE public.telegram_messages
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'in';

CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat_created
  ON public.telegram_messages (chat_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_messages;
