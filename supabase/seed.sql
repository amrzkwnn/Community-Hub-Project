-- ============================================================================
-- TESDH Community Hub - Seed Data (Malaysian Township Demo)
-- Township: Bandar Elmina / Denai Alam / Ara Damansara (Sime Darby Property)
-- ============================================================================

-- Mock Profiles
INSERT INTO public.profiles (id, full_name, display_name, role, township_precinct, unit_number, phone, verification_status, avatar_url)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', 'Nurul Huda binti Ahmad', 'Nurul (EG3)', 'resident', 'Elmina Green 3', '24, Jalan EG 3/4', '+60123456781', 'verified', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'),
  ('b2222222-2222-2222-2222-222222222222', 'Vikram Naidu a/l Mohan', 'Vikram (Denai)', 'resident', 'Denai Alam', '12, Jalan Denai 2/1', '+60139876542', 'pending', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'),
  ('c3333333-3333-3333-3333-333333333333', 'Capt. (R) Azman Salleh', 'Pengurusan Elmina (Azman)', 'management', 'Elmina Central Park Hub', 'Management Office Level 1', '+60192233445', 'verified', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'),
  ('d4444444-4444-4444-4444-444444444444', 'Sarjan Rosli & Pasukan Polis Bantuan', 'Pos Kawalan Keselamatan', 'security', 'Pondok Keselamatan Utama Elmina West', 'Guardhouse Post A', '+601112223344', 'verified', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;

-- Feed Posts
INSERT INTO public.community_posts (id, author_id, category, title, content, is_pinned, is_anonymous, upvotes_count, status)
VALUES
  (
    'e1111111-1111-1111-1111-111111111111',
    'c3333333-3333-3333-3333-333333333333',
    'announcement',
    'Makluman Rasmi: Kerja-Kerja Pembersihan Kolam Takungan Banjir & Perparitan Utama Elmina',
    'Pihak Pengurusan Perbandaran Sime Darby Property dengan kerjasama Majlis Bandaraya Shah Alam (MBSA) akan menjalankan pemeriksaan berkala sistem perparitan monsun dan kolam tadahan Elmina Central Park bermula Isnin ini. Laluan jogging trek seksyen 3 mungkin ditutup sementara waktu demi keselamatan warga perbandaran.',
    true,
    false,
    42,
    'active'
  ),
  (
    'e2222222-2222-2222-2222-222222222222',
    'a1111111-1111-1111-1111-111111111111',
    'event',
    'Program Gotong-Royong Komuniti & Plogging Elmina Lakeside 2026',
    'Jom sertai komuniti kita beramai-ramai pada Sabtu ini jam 7:30 pagi di Tasik Elmina. Kami sediakan plastik sampah kitar semula, sarung tangan dan sarapan kuih-muih tradisional. Sesuai untuk seisi keluarga dan kanak-kanak!',
    false,
    false,
    28,
    'active'
  ),
  (
    'e3333333-3333-3333-3333-333333333333',
    'b2222222-2222-2222-2222-222222222222',
    'complaint',
    'Lori kontraktor ubah suai meletak kenderaan menghalang pili bomba di Jalan EG 1/3',
    'Mohon pihak pengurusan dan pengawal keselamatan maklumkan kepada kontraktor rumah no 18 supaya alihkan lori simen yang menghalang pili bomba dan menyukarkan laluan keluar masuk jiran.',
    false,
    true,
    15,
    'active'
  )
ON CONFLICT (id) DO NOTHING;

-- Resilience Incidents
INSERT INTO public.resilience_incidents (id, reporter_id, incident_type, title, description, location_name, latitude, longitude, severity, status, is_anonymous, assigned_team)
VALUES
  (
    'f1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'blocked_drain',
    'Longkang Tersumbat Sisa Pelepah Sawit & Sampah',
    'Aliran longkang utama tersumbat teruk selepas ribut petang semalam. Air mula bertakung di bahu jalan dan berisiko melimpah jika hujan lebat berterusan.',
    'Persiaran Elmina berhampiran jambatan ikonik pelangi',
    3.179321,
    101.516512,
    'high',
    'dispatched',
    false,
    'MBSA Skuad Pantas & Pasukan Landskap Sime Darby'
  ),
  (
    'f2222222-2222-2222-2222-222222222222',
    'b2222222-2222-2222-2222-222222222222',
    'fallen_tree',
    'Dahan Pokok Angsana Patah Menghempap Sebahagian Laluan Pejalan Kaki',
    'Dahan besar patah menghalang laluan pejalan kaki dan basikal berdekatan laluan Denai. Tiada kecederaan dilaporkan, namun berbahaya kepada penunggang basikal waktu malam.',
    'Denai Alam Walkway / Elmina Ridge Connector',
    3.174120,
    101.521840,
    'medium',
    'under_review',
    false,
    'Unit Penyelenggaraan Pokok & Taman'
  ),
  (
    'f3333333-3333-3333-3333-333333333333',
    'd4444444-4444-4444-4444-444444444444',
    'flood',
    'Paras Air Kolam Tadahan Barat Meningkat ke Tahap Waspada',
    'Hasil rondaan keselamatan jam 12:00 tengah hari mendapati paras air kolam barat naik 0.8 meter susulan hujan hulu sungai. Sistem pam automatik berfungsi baik, pintu kawalan air telah dibuka.',
    'Kolam Takungan Elmina West Wetland',
    3.183400,
    101.509800,
    'critical',
    'dispatched',
    false,
    'Polis Bantuan Patrol & Bilik Kawalan Banjir'
  )
ON CONFLICT (id) DO NOTHING;

-- Circular Exchange Items
INSERT INTO public.circular_exchange (id, author_id, listing_type, category, title, description, condition, precinct, status)
VALUES
  (
    'c1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'giveaway',
    'baby_kids',
    'Kerusi Makan Bayi (Baby High Chair) Ikea Antilop - Percuma',
    'Masih dalam keadaan sangat elok dan bersih. Anak sudah besar. Mahu lepaskan percuma untuk jiran komuniti yang memerlukan.',
    'good',
    'Elmina Green 3',
    'available'
  ),
  (
    'c2222222-2222-2222-2222-222222222222',
    'b2222222-2222-2222-2222-222222222222',
    'exchange',
    'plants_garden',
    'Anak Pokok Bunga Kertas (Bougainvillea) & Pokok Kari Segar',
    'Ingin bertukar dengan pokok herba lain seperti pokok kesum, serai atau selasih. Boleh ambil terus di pagar rumah secara selamat.',
    'brand_new',
    'Denai Alam',
    'available'
  ),
  (
    'c3333333-3333-3333-3333-333333333333',
    'a1111111-1111-1111-1111-111111111111',
    'loan',
    'furniture',
    'Tangga Aluminium Teleskopik 3.8 Meter (Untuk Pinjaman Jiran)',
    'Sedia dipinjamkan kepada mana-mana jiran yang nak pasang langsir atau bersihkan siling. Sila pulangkan dalam tempoh 48 jam.',
    'like_new',
    'Elmina Green 3',
    'available'
  )
ON CONFLICT (id) DO NOTHING;

-- Local Services
INSERT INTO public.local_services (id, author_id, type, category, title, description, price_estimate, precinct, status)
VALUES
  (
    's1111111-1111-1111-1111-111111111111',
    'b2222222-2222-2222-2222-222222222222',
    'offering',
    'tutoring',
    'Kelas Tambahan Matematik & Sains UPSR/PT3 oleh Bekas Guru Sekolah',
    'Pengalaman mengajar 10 tahun. Kelas berkumpulan kecil di rumah atau online hujung minggu. Diskaun istimewa untuk anak-anak komuniti Elmina.',
    'RM 45 / jam',
    'Denai Alam',
    'active'
  ),
  (
    's2222222-2222-2222-2222-222222222222',
    'a1111111-1111-1111-1111-111111111111',
    'requesting',
    'pet_care',
    'Bantuan Penjagaan Kucing Rumah (3 Hari Hujung Minggu Balik Kampung)',
    'Mencari jiran pecinta haiwan yang sudi singgah 1 kali sehari untuk beri makanan kucing dan tukar air minuman di Jalan EG 3.',
    'RM 30 / hari + hadiah ole-ole',
    'Elmina Green 3',
    'active'
  )
ON CONFLICT (id) DO NOTHING;
