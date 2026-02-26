-- Phase 4: Test Session Management - Seed Data
-- Creates sample KitOrders and TestSessions for testing

-- Note: This assumes existing users and homes from Phase 3 seed data
-- Replace UUIDs with actual values from your database

-- ============================================================================
-- Kit Orders (3 orders in 'paid' status for testing)
-- ============================================================================

-- Order 1: Standard long-term kit for user 1, home 1
INSERT INTO kit_orders (
  id,
  user_id,
  home_id,
  product_sku,
  quantity,
  shipping_address,
  shipping_city,
  shipping_province,
  shipping_postal_code,
  subtotal,
  tax,
  total,
  payment_status,
  created_at,
  updated_at
) VALUES (
  'order-uuid-1',
  'user-id-1', -- Replace with actual user ID
  'home-id-1', -- Replace with actual home ID
  'standard_long',
  1,
  '123 Main Street',
  'Toronto',
  'ON',
  'M5H 2N2',
  89.99,
  11.70,
  101.69,
  'paid',
  '2026-02-15 10:00:00',
  '2026-02-15 10:00:00'
);

-- Order 2: Real estate short-term kit for user 2, home 3
INSERT INTO kit_orders (
  id,
  user_id,
  home_id,
  product_sku,
  quantity,
  shipping_address,
  shipping_city,
  shipping_province,
  shipping_postal_code,
  subtotal,
  tax,
  total,
  payment_status,
  created_at,
  updated_at
) VALUES (
  'order-uuid-2',
  'user-id-2', -- Replace with actual user ID
  'home-id-3', -- Replace with actual home ID
  'real_estate_short',
  1,
  '456 Oak Avenue',
  'Vancouver',
  'BC',
  'V6B 1A1',
  49.99,
  6.50,
  56.49,
  'paid',
  '2026-02-20 14:00:00',
  '2026-02-20 14:00:00'
);

-- Order 3: Twin pack for user 1, home 2
INSERT INTO kit_orders (
  id,
  user_id,
  home_id,
  product_sku,
  quantity,
  shipping_address,
  shipping_city,
  shipping_province,
  shipping_postal_code,
  subtotal,
  tax,
  total,
  payment_status,
  created_at,
  updated_at
) VALUES (
  'order-uuid-3',
  'user-id-1', -- Replace with actual user ID
  'home-id-2', -- Replace with actual home ID
  'twin_pack',
  1,
  '123 Main Street',
  'Toronto',
  'ON',
  'M5H 2N2',
  149.99,
  19.50,
  169.49,
  'paid',
  '2026-02-10 09:00:00',
  '2026-02-10 09:00:00'
);

-- ============================================================================
-- Test Sessions (5 sessions in various states)
-- ============================================================================

-- Session 1: Active session (10 days in)
INSERT INTO test_sessions (
  id,
  home_id,
  kit_order_id,
  kit_type,
  status,
  kit_serial_number,
  placement_room,
  placement_description,
  activated_at,
  expected_completion_date,
  retrieval_due_at,
  created_at,
  updated_at
) VALUES (
  'session-uuid-1',
  'home-id-1', -- Replace with actual home ID
  'order-uuid-1',
  'long_term',
  'active',
  'KIT001',
  'Basement',
  'Placed on floor near sump pump',
  '2026-02-15 10:30:00',
  '2026-05-17 10:30:00', -- 91 days after activation
  '2026-05-06 10:30:00', -- 80 days after activation
  '2026-02-15 10:30:00',
  '2026-02-15 10:30:00'
);

-- Session 2: Retrieval due (75 days in, nearing completion)
INSERT INTO test_sessions (
  id,
  home_id,
  kit_order_id,
  kit_type,
  status,
  kit_serial_number,
  placement_room,
  placement_description,
  activated_at,
  expected_completion_date,
  retrieval_due_at,
  created_at,
  updated_at
) VALUES (
  'session-uuid-2',
  'home-id-1', -- Replace with actual home ID
  'order-uuid-1',
  'long_term',
  'retrieval_due',
  'KIT002',
  'Primary Bedroom',
  'Placed on nightstand',
  '2025-12-10 08:00:00',
  '2026-03-11 08:00:00', -- 91 days after activation
  '2026-02-28 08:00:00', -- 80 days after activation (already passed)
  '2025-12-10 08:00:00',
  '2026-02-23 15:00:00' -- Status updated to retrieval_due
);

-- Session 3: Mailed (short-term test completed and sent back)
INSERT INTO test_sessions (
  id,
  home_id,
  kit_order_id,
  kit_type,
  status,
  kit_serial_number,
  placement_room,
  placement_description,
  activated_at,
  expected_completion_date,
  retrieval_due_at,
  retrieved_at,
  mailed_at,
  created_at,
  updated_at
) VALUES (
  'session-uuid-3',
  'home-id-3', -- Replace with actual home ID
  'order-uuid-2',
  'real_estate_short',
  'mailed',
  'KIT003',
  'Living Room',
  'Placed on coffee table',
  '2026-02-20 14:30:00',
  '2026-02-24 14:30:00', -- 4 days after activation
  '2026-02-22 14:30:00', -- 2 days after activation
  '2026-02-23 10:00:00', -- Retrieved on day 3
  '2026-02-23 11:00:00', -- Mailed same day
  '2026-02-20 14:30:00',
  '2026-02-23 11:00:00'
);

-- Session 4: Cancelled (user decided not to proceed)
INSERT INTO test_sessions (
  id,
  home_id,
  kit_order_id,
  kit_type,
  status,
  kit_serial_number,
  placement_room,
  placement_description,
  activated_at,
  expected_completion_date,
  retrieval_due_at,
  created_at,
  updated_at
) VALUES (
  'session-uuid-4',
  'home-id-2', -- Replace with actual home ID
  'order-uuid-3',
  'long_term',
  'cancelled',
  'KIT004',
  'Guest Bedroom',
  NULL,
  '2026-02-10 09:30:00',
  '2026-05-12 09:30:00',
  '2026-05-01 09:30:00',
  '2026-02-10 09:30:00',
  '2026-02-12 16:00:00' -- Cancelled 2 days after activation
);

-- Session 5: Results pending (mailed back, awaiting lab results)
INSERT INTO test_sessions (
  id,
  home_id,
  kit_order_id,
  kit_type,
  status,
  kit_serial_number,
  placement_room,
  placement_description,
  activated_at,
  expected_completion_date,
  retrieval_due_at,
  retrieved_at,
  mailed_at,
  created_at,
  updated_at
) VALUES (
  'session-uuid-5',
  'home-id-2', -- Replace with actual home ID
  'order-uuid-3',
  'long_term',
  'results_pending',
  'KIT005',
  'Basement',
  'Placed on storage shelf',
  '2025-11-20 12:00:00',
  '2026-02-19 12:00:00', -- 91 days after activation
  '2026-02-08 12:00:00', -- 80 days after activation
  '2026-02-10 14:00:00', -- Retrieved on day 82
  '2026-02-11 09:00:00', -- Mailed day after retrieval
  '2025-11-20 12:00:00',
  '2026-02-15 10:00:00' -- Status updated to results_pending
);

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. Replace all placeholder IDs (user-id-X, home-id-X) with actual UUIDs from your database
-- 2. Run this after seeding Phase 3 data (users and homes)
-- 3. Verify foreign key relationships before running
-- 4. Timeline calculations:
--    - Long-term: 91 days total, retrieval due at 80 days
--    - Short-term: 4 days total, retrieval due at 2 days
-- 5. All kit orders have paymentStatus: 'paid' for testing (Stripe integration in Phase 6)
