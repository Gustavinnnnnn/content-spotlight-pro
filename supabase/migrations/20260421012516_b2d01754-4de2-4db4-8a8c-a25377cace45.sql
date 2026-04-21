ALTER TABLE public.telegram_settings
ADD COLUMN IF NOT EXISTS admin_chat_id bigint,
ADD COLUMN IF NOT EXISTS sale_notifications_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS sale_notification_message text NOT NULL DEFAULT '💸 Venda aprovada%0ACliente: {{customer_name}}%0APlano: {{plan_name}}%0AValor: {{amount}}%0AReferência: {{reference}}';

CREATE TABLE IF NOT EXISTS public.post_purchase_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  amount integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT post_purchase_fees_amount_positive CHECK (amount >= 100)
);

ALTER TABLE public.post_purchase_fees ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'post_purchase_fees'
      AND policyname = 'Post purchase fees admin all'
  ) THEN
    CREATE POLICY "Post purchase fees admin all"
    ON public.post_purchase_fees
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.transaction_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  fee_id uuid REFERENCES public.post_purchase_fees(id) ON DELETE SET NULL,
  fee_name text NOT NULL,
  fee_description text,
  amount integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  reference text NOT NULL UNIQUE,
  paradise_transaction_id text,
  qr_code text,
  qr_code_base64 text,
  raw_payload jsonb,
  expires_at timestamp with time zone,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT transaction_fees_amount_positive CHECK (amount >= 100),
  CONSTRAINT transaction_fees_status_valid CHECK (status IN ('pending', 'processing', 'approved', 'under_review', 'failed', 'refunded', 'chargeback')),
  CONSTRAINT transaction_fees_unique_per_transaction UNIQUE (transaction_id, fee_id)
);

ALTER TABLE public.transaction_fees ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transaction_fees'
      AND policyname = 'Transaction fees admin all'
  ) THEN
    CREATE POLICY "Transaction fees admin all"
    ON public.transaction_fees
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_post_purchase_fees_sort_order
ON public.post_purchase_fees (sort_order, active);

CREATE INDEX IF NOT EXISTS idx_transaction_fees_transaction_id
ON public.transaction_fees (transaction_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_transaction_fees_reference
ON public.transaction_fees (reference);

DROP TRIGGER IF EXISTS set_post_purchase_fees_updated_at ON public.post_purchase_fees;
CREATE TRIGGER set_post_purchase_fees_updated_at
BEFORE UPDATE ON public.post_purchase_fees
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_transaction_fees_updated_at ON public.transaction_fees;
CREATE TRIGGER set_transaction_fees_updated_at
BEFORE UPDATE ON public.transaction_fees
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();