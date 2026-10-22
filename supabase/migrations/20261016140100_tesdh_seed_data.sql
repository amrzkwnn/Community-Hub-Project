-- ============================================================================
-- TESDH Community Hub - Fictional Malaysian Seed Data
-- Migration: 20261016140100_tesdh_seed_data.sql
-- Note: Uses obviously fictional Malaysian residents and addresses for testing
-- ============================================================================

-- 1. Insert Mock Auth Users & Profiles (for testing via SQL editor)
-- Fictional UUIDs for development and demo seeding
DO $$
DECLARE
  v_user_nurul UUID := '11111111-1111-4111-8111-111111111111';
  v_user_vikram UUID := '22222222-2222-4222-8222-222222222222';
  v_user_azman UUID := '33333333-3333-4333-8333-333333333333';
  v_user_rosli UUID := '44444444-4444-4444-8444-444444444444';
  v_post_1 UUID := 'aaaa1111-1111-4111-8111-111111111111';
  v_post_2 UUID := 'aaaa2222-2222-4222-8222-222222222222';
  v_post_3 UUID := 'aaaa3333-3333-4333-8333-333333333333';
BEGIN
  -- Insert dummy auth users into auth.users if not existing (so foreign keys succeed)
  BEGIN
    INSERT INTO auth.users (
      id, 
      instance_id, 
      aud, 
      role, 
      email, 
      encrypted_password, 
      email_confirmed_at, 
      raw_app_meta_data, 
      raw_user_meta_data, 
      created_at, 
      updated_at
    )
    VALUES 
      (v_user_nurul, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nurul.fictional@elmina.local', crypt('FictionalPass123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name": "Nurul Huda (Fiksyen)"}'::jsonb, NOW(), NOW()),
      (v_user_vikram, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vikram.fictional@elmina.local', crypt('FictionalPass123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name": "Vikram Naidu (Fiksyen)"}'::jsonb, NOW(), NOW()),
      (v_user_azman, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'azman.mgmt.fictional@elmina.local', crypt('FictionalPass123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name": "Capt (B) Azman Salleh (Fiksyen)"}'::jsonb, NOW(), NOW()),
      (v_user_rosli, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rosli.security.fictional@elmina.local', crypt('FictionalPass123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name": "Sarjan Rosli Bakar (Fiksyen)"}'::jsonb, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'auth.users seed step skipped or already present: %', SQLERRM;
  END;

  -- 1. PROFILES
  INSERT INTO public.profiles (id, full_name, display_name, role, township_precinct, unit_number, phone, verification_status, avatar_url)
  VALUES 
    (
      v_user_nurul, 
      'Nurul Huda binti Ahmad (Fiksyen)', 
      'Nurul (EG3)', 
      'resident', 
      'Elmina Green 3', 
      'No. 99 (Fiksyen), Jalan EG 3/4', 
      '+6012-3450001', 
      'verified', 
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
    ),
    (
      v_user_vikram, 
      'Vikram Naidu a/l Mohan (Fiksyen)', 
      'Vikram (Denai)', 
      'resident', 
      'Denai Alam', 
      'No. 88 (Fiksyen), Jalan Denai 2/1', 
      '+6013-9870002', 
      'pending', 
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    ),
    (
      v_user_azman, 
      'Capt (B) Azman Salleh (Fiksyen)', 
      'Pejabat JMB Elmina', 
      'management', 
      'Elmina Central Park Hub', 
      'Pejabat JMB Tingkat 1', 
      '+6019-2230003', 
      'verified', 
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
    ),
    (
      v_user_rosli, 
      'Sarjan Rosli bin Bakar (Fiksyen)', 
      'Pos Kawalan Keselamatan Utama', 
      'security', 
      'Pondok Pengawal Elmina West', 
      'Pos Pengawal A', 
      '+6011-12220004', 
      'verified', 
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
    )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    verification_status = EXCLUDED.verification_status;

  -- 2. ANNOUNCEMENTS
  INSERT INTO public.announcements (id, author_id, title, content, priority, is_pinned, status)
  VALUES 
    (
      'bbbb1111-1111-4111-8111-111111111111',
      v_user_azman,
      'Pemeriksaan Berkala Kolam Takungan Banjir & Denai Basikal Elmina Central Park',
      'Pihak Pengurusan Perbandaran Sime Darby Property dengan kerjasama Majlis Bandaraya Shah Alam (MBSA) akan menjalankan pemeriksaan pintu kawalan air dan pam hidraulik pada Isnin ini.',
      'normal',
      true,
      'published'
    ),
    (
      'bbbb2222-2222-4222-8222-222222222222',
      v_user_rosli,
      'Amaran Keselamatan: Tingkatkan Kewaspadaan Pintu Pagar & Kenderaan',
      'Pasukan Polis Bantuan menambah kekerapan rondaan malam antara jam 2:00 pagi hingga 5:00 pagi di zon Elmina Green susulan pemakluman jiran.',
      'urgent',
      true,
      'published'
    )
  ON CONFLICT (id) DO NOTHING;

  -- 3. COMMUNITY POSTS
  INSERT INTO public.community_posts (id, author_id, category, title, content, is_anonymous, upvotes_count, status)
  VALUES 
    (
      v_post_1,
      v_user_nurul,
      'event',
      'Program Plogging & Gotong-Royong Tasik Elmina 2026',
      'Jom kumpul bersama keluarga pada pagi Sabtu ini jam 7:30 pagi di Tasik Elmina untuk aktiviti mengutip sampah kitar semula sambil beriadah.',
      false,
      32,
      'active'
    ),
    (
      v_post_2,
      v_user_vikram,
      'complaint',
      'Lori muatan simen ubah suai rumah meletak di hadapan pili bomba',
      'Mohon pihak pengurusan dan pengawal periksa kontraktor rumah lorong Jalan Denai 2 kerana lori diletakkan menghalang pili bomba.',
      true, -- Anonymous to neighbours
      18,
      'active'
    ),
    (
      v_post_3,
      v_user_azman,
      'discussion',
      'Sesi Soal Jawab Penyelenggaraan Landskap Pokok & Lampu Jalan',
      'Sila kemukakan cadangan penambahbaikan pencahayaan jalan dan pemangkasan dahan pokok rendang di seksyen anda.',
      false,
      45,
      'active'
    )
  ON CONFLICT (id) DO NOTHING;

  -- 4. COMMENTS
  INSERT INTO public.comments (post_id, author_id, content, is_official_response)
  VALUES 
    (v_post_1, v_user_vikram, 'Saya dan keluarga akan bawa 2 beg kitar semula tambahan. Jumpa di sana!', false),
    (v_post_2, v_user_azman, 'Terima kasih atas makluman. Pengawal keselamatan telah diarahkan mengeluarkan notis amaran kepada pemilik rumah dan kontraktor terbabit.', true)
  ON CONFLICT DO NOTHING;

  -- 5. SERVICE LISTINGS
  INSERT INTO public.service_listings (author_id, type, category, title, description, price_estimate, precinct, status)
  VALUES 
    (
      v_user_vikram,
      'offering',
      'tutoring',
      'Kelas Tambahan Matematik & Fizik SPM oleh Jurutera Tempatan',
      'Bimbingan konsep asas dan persediaan peperiksaan SPM untuk anak-anak kejiranan Elmina dan Denai Alam. Sesi kumpulan kecil hujung minggu.',
      'RM 45 / jam',
      'Denai Alam',
      'active'
    ),
    (
      v_user_nurul,
      'requesting',
      'pet_care',
      'Bantuan Singgah Beri Makanan 2 Ekor Kucing Rumah (Hujung Minggu)',
      'Memerlukan jiran yang sudi singgah sekali sehari untuk mengisi makanan dan air bersih kucing kami waktu balik kampung.',
      'RM 35 / hari',
      'Elmina Green 3',
      'active'
    )
  ON CONFLICT DO NOTHING;

  -- 6. EXCHANGE LISTINGS
  INSERT INTO public.exchange_listings (author_id, listing_type, category, title, description, condition, precinct, status)
  VALUES 
    (
      v_user_nurul,
      'giveaway',
      'baby_kids',
      'Kerusi Makan Bayi (Baby High Chair) Ikea Antilop - Percuma',
      'Keadaan masih sangat baik dan bersih lengkap dengan dulang makan. Anak sudah masuk sekolah rendah.',
      'good',
      'Elmina Green 3',
      'available'
    ),
    (
      v_user_vikram,
      'exchange',
      'plants_garden',
      'Anak Pokok Bunga Kertas & Pokok Kari Segar',
      'Ingin barter tukar suka sama suka dengan anak pokok serai, kesum atau pudina.',
      'brand_new',
      'Denai Alam',
      'available'
    )
  ON CONFLICT DO NOTHING;

  -- 7. COMMUNITY REPORTS
  INSERT INTO public.community_reports (reporter_id, report_type, title, description, location_name, latitude, longitude, severity, status, is_anonymous, assigned_team, management_notes)
  VALUES 
    (
      v_user_nurul,
      'blocked_drain',
      'Longkang Utama Tersumbat Sisa Pelepah Sawit',
      'Aliran longkang tersumbat selepas ribut petang kelmarin. Takungan air mula melimpah ke bahu jalan Persiaran Elmina.',
      'Persiaran Elmina berdekatan Jambatan Pelangi',
      3.179321,
      101.516512,
      'high',
      'dispatched',
      false,
      'Skuad Pantas MBSA & Landskap Sime Darby',
      'Jentera pembersihan telah tiba di tapak untuk mengorek sisa sekatan.'
    ),
    (
      v_user_rosli,
      'flood',
      'Paras Air Kolam Tadahan Wetland Naik ke Tahap Waspada',
      'Paras air naik 0.75m susulan hujan di kawasan hulu. Pintu kawalan air dibuka berperingkat.',
      'Kolam Takungan Wetland Elmina West',
      3.183400,
      101.509800,
      'critical',
      'dispatched',
      false,
      'Pasukan Bilik Gerakan Banjir',
      'Siren amaran diuji dan rondaan perimeter dijalankan.'
    )
  ON CONFLICT DO NOTHING;

END $$;
