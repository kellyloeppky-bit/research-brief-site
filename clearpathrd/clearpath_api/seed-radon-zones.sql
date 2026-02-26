-- Sample radon zone map data for testing
-- Run this in Supabase SQL Editor or via psql

INSERT INTO radon_zone_map (id, fsa, province, zone_level, prevalence_pct, survey_source, survey_year, schema_version, updated_at)
VALUES
  (gen_random_uuid(), 'M5V', 'ON', 2, 15.50, 'Health Canada', 2023, 1, NOW()),
  (gen_random_uuid(), 'M4W', 'ON', 2, 16.20, 'Health Canada', 2023, 1, NOW()),
  (gen_random_uuid(), 'K1A', 'ON', 3, 28.30, 'Health Canada', 2023, 1, NOW()),
  (gen_random_uuid(), 'K1P', 'ON', 3, 29.50, 'Health Canada', 2023, 1, NOW()),
  (gen_random_uuid(), 'V6B', 'BC', 1, 5.20, 'Health Canada', 2023, 1, NOW()),
  (gen_random_uuid(), 'V5K', 'BC', 1, 4.80, 'Health Canada', 2023, 1, NOW()),
  (gen_random_uuid(), 'T2P', 'AB', 3, 32.10, 'Health Canada', 2023, 1, NOW()),
  (gen_random_uuid(), 'R3C', 'MB', 4, 45.60, 'Health Canada', 2023, 1, NOW())
ON CONFLICT (fsa) DO NOTHING;
