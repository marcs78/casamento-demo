-- ==============================================================================
-- SCHEMA SUPABASE - PILOTO CASAMENTO PAULA & MARCELO (09/01/2027)
-- Preparado para futura plataforma multi-casamentos
-- ==============================================================================

-- 1. Tabela de Casamentos (Multi-tenant)
CREATE TABLE IF NOT EXISTS weddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    bride_name TEXT NOT NULL,
    groom_name TEXT NOT NULL,
    wedding_date DATE NOT NULL,
    rsvp_deadline DATE NOT NULL,
    pix_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir dados do piloto
INSERT INTO weddings (slug, bride_name, groom_name, wedding_date, rsvp_deadline, pix_key)
VALUES ('paula-marcelo', 'Paula', 'Marcelo', '2027-01-09', '2026-12-10', 'casamentopaulaemarcelo2027@gmail.com')
ON CONFLICT (slug) DO NOTHING;

-- 2. Confirmações de Presença (RSVP)
CREATE TABLE IF NOT EXISTS rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_slug TEXT NOT NULL REFERENCES weddings(slug) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    notes TEXT,
    is_confirmed BOOLEAN DEFAULT TRUE,
    is_waitlist BOOLEAN DEFAULT FALSE,
    checked_in BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Mural de Recados
CREATE TABLE IF NOT EXISTS guest_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_slug TEXT NOT NULL REFERENCES weddings(slug) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    message TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Fotos e Memórias dos Convidados
CREATE TABLE IF NOT EXISTS guest_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_slug TEXT NOT NULL REFERENCES weddings(slug) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    uploader_name TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Sugestões de Louvores
CREATE TABLE IF NOT EXISTS song_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_slug TEXT NOT NULL REFERENCES weddings(slug) ON DELETE CASCADE,
    song_title TEXT NOT NULL,
    artist TEXT,
    suggested_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Mesas (Área Cerimonialista)
CREATE TABLE IF NOT EXISTS event_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_slug TEXT NOT NULL REFERENCES weddings(slug) ON DELETE CASCADE,
    name TEXT NOT NULL,
    capacity INT NOT NULL DEFAULT 8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Alocação de Convidados às Mesas
CREATE TABLE IF NOT EXISTS table_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES event_tables(id) ON DELETE CASCADE,
    rsvp_id UUID NOT NULL REFERENCES rsvps(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(rsvp_id)
);

-- 8. Fornecedores
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_slug TEXT NOT NULL REFERENCES weddings(slug) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    notes TEXT
);

-- 9. Checklist Cerimonial
CREATE TABLE IF NOT EXISTS ceremonial_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_slug TEXT NOT NULL REFERENCES weddings(slug) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    time_schedule TIME
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceremonial_checklists ENABLE ROW LEVEL SECURITY;

-- Políticas Públicas (Convidados podem enviar RSVP, Recados, Sugestões e ler dados do casamento)
CREATE POLICY "Public read weddings" ON weddings FOR SELECT USING (true);

CREATE POLICY "Public insert rsvps" ON rsvps FOR INSERT WITH CHECK (true);

CREATE POLICY "Public insert messages" ON guest_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read approved messages" ON guest_messages FOR SELECT USING (is_approved = true);

CREATE POLICY "Public insert photos" ON guest_photos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read approved photos" ON guest_photos FOR SELECT USING (is_approved = true);

CREATE POLICY "Public insert song suggestions" ON song_suggestions FOR INSERT WITH CHECK (true);

-- Políticas Administrativas (Apenas autenticados: noivos e cerimonialistas têm acesso total)
CREATE POLICY "Auth full access rsvps" ON rsvps FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth full access messages" ON guest_messages FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth full access photos" ON guest_photos FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth full access songs" ON song_suggestions FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth full access tables" ON event_tables FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth full access assignments" ON table_assignments FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth full access suppliers" ON suppliers FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth full access checklists" ON ceremonial_checklists FOR ALL TO authenticated USING (true);
