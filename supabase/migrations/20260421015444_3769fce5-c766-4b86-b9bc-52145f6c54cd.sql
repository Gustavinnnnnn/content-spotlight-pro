CREATE TABLE public.admin_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_title text NOT NULL DEFAULT 'Venda aprovada',
  sale_body_template text NOT NULL DEFAULT '{{customer_name}} · {{amount}}',
  sale_icon_url text,
  fee_title text NOT NULL DEFAULT 'Taxa aprovada',
  fee_body_template text NOT NULL DEFAULT '{{fee_name}} · {{amount}}',
  fee_icon_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read notification settings"
ON public.admin_notification_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert notification settings"
ON public.admin_notification_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notification settings"
ON public.admin_notification_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete notification settings"
ON public.admin_notification_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_admin_notification_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_admin_notification_settings_updated_at
BEFORE UPDATE ON public.admin_notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_admin_notification_settings_updated_at();

INSERT INTO public.admin_notification_settings (
  sale_title,
  sale_body_template,
  fee_title,
  fee_body_template
)
SELECT
  'Venda aprovada',
  '{{customer_name}} · {{amount}}',
  'Taxa aprovada',
  '{{fee_name}} · {{amount}}'
WHERE NOT EXISTS (
  SELECT 1 FROM public.admin_notification_settings
);