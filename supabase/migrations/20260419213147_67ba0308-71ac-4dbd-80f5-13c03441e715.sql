
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles (admin metadata)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by self" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  -- Bootstrap: first user becomes admin
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Club settings (singleton)
CREATE TABLE public.club_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Meu Clube',
  bio TEXT DEFAULT 'Bem-vindo ao clube exclusivo.',
  verified BOOLEAN NOT NULL DEFAULT true,
  banner_url TEXT,
  avatar_url TEXT,
  posts_count INT NOT NULL DEFAULT 0,
  videos_count INT NOT NULL DEFAULT 0,
  photos_count INT NOT NULL DEFAULT 0,
  likes_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.club_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings public read" ON public.club_settings FOR SELECT USING (true);
CREATE POLICY "Settings admin write" ON public.club_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER club_settings_updated BEFORE UPDATE ON public.club_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.club_settings (name, bio) VALUES ('Meu Clube', '✨ Conteúdo exclusivo para membros. Entre no clube e tenha acesso completo.');

-- Plans
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_label TEXT NOT NULL,
  description TEXT,
  checkout_url TEXT,
  color TEXT NOT NULL DEFAULT '#FF6B1A',
  highlighted BOOLEAN NOT NULL DEFAULT false,
  badge TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans public read" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Plans admin write" ON public.plans FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER plans_updated BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.plans (name, price_label, description, color, highlighted, badge, sort_order) VALUES
('Mensal', 'R$ 29,90/mês', 'Acesso completo por 30 dias', '#FF6B1A', false, NULL, 1),
('Trimestral', 'R$ 69,90', '3 meses de acesso (economize 22%)', '#FF6B1A', true, 'MAIS POPULAR', 2),
('Semestral', 'R$ 119,90', '6 meses de acesso completo', '#FF6B1A', false, NULL, 3),
('Anual', 'R$ 199,90', '12 meses + bônus exclusivos', '#E55300', false, 'MELHOR OFERTA', 4);

-- Media items (gallery)
CREATE TABLE public.media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('photo', 'video')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  blurred BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Media public read" ON public.media_items FOR SELECT USING (true);
CREATE POLICY "Media admin write" ON public.media_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('club-assets', 'club-assets', true), ('gallery', 'gallery', true);

CREATE POLICY "Club assets public read" ON storage.objects FOR SELECT USING (bucket_id = 'club-assets');
CREATE POLICY "Club assets admin write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'club-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Club assets admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'club-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Club assets admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'club-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gallery public read" ON storage.objects FOR SELECT USING (bucket_id = 'gallery');
CREATE POLICY "Gallery admin write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Gallery admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'gallery' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Gallery admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'gallery' AND public.has_role(auth.uid(), 'admin'));
