
-- Fix function search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Restrict bucket listing to admins (individual file access remains public via direct URL)
DROP POLICY IF EXISTS "Club assets public read" ON storage.objects;
DROP POLICY IF EXISTS "Gallery public read" ON storage.objects;

CREATE POLICY "Club assets admin list" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'club-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Gallery admin list" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'gallery' AND public.has_role(auth.uid(), 'admin'));
