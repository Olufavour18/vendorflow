-- Seed data for VendorFlow demo
-- Run AFTER 001 and 002 migrations

-- Categories
INSERT INTO public.categories (id, name, slug, description, is_active, sort_order) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Electronics', 'electronics', 'Phones, gadgets and accessories', true, 1),
  ('a2222222-2222-2222-2222-222222222222', 'Fashion', 'fashion', 'Clothing, shoes and style', true, 2),
  ('a3333333-3333-3333-3333-333333333333', 'Home & Living', 'home-living', 'Furniture and home essentials', true, 3),
  ('a4444444-4444-4444-4444-444444444444', 'Beauty', 'beauty', 'Skincare, makeup and personal care', true, 4)
ON CONFLICT (slug) DO NOTHING;

-- Products with Unsplash images
INSERT INTO public.products (
  id, name, slug, description, short_description, sku, category_id,
  brand, price, compare_at_price, stock_quantity, low_stock_threshold,
  status, is_featured, images
) VALUES
(
  'b1111111-1111-1111-1111-111111111111',
  'Wireless Bluetooth Headphones',
  'wireless-bluetooth-headphones',
  'Premium over-ear wireless headphones with active noise cancellation, 30-hour battery life and crystal clear sound. Perfect for work, travel and music lovers.',
  'Noise-cancelling wireless headphones',
  'ELEC-HEAD-001',
  'a1111111-1111-1111-1111-111111111111',
  'SoundMax',
  45000,
  55000,
  25,
  5,
  'ACTIVE',
  true,
  '["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80"]'::jsonb
),
(
  'b2222222-2222-2222-2222-222222222222',
  'Smart Watch Series 5',
  'smart-watch-series-5',
  'Track your fitness, heart rate, sleep and receive notifications on your wrist. Water resistant, long battery and stylish design.',
  'Fitness & notification smartwatch',
  'ELEC-WATCH-001',
  'a1111111-1111-1111-1111-111111111111',
  'TechWear',
  75000,
  89000,
  18,
  5,
  'ACTIVE',
  true,
  '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80"]'::jsonb
),
(
  'b3333333-3333-3333-3333-333333333333',
  'Classic Leather Sneakers',
  'classic-leather-sneakers',
  'Handcrafted genuine leather sneakers. Comfortable sole, premium finish. Available in multiple sizes. Perfect everyday footwear.',
  'Genuine leather everyday sneakers',
  'FASH-SNEAK-001',
  'a2222222-2222-2222-2222-222222222222',
  'UrbanStep',
  32000,
  40000,
  40,
  8,
  'ACTIVE',
  true,
  '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80"]'::jsonb
),
(
  'b4444444-4444-4444-4444-444444444444',
  'Minimalist Desk Lamp',
  'minimalist-desk-lamp',
  'Modern LED desk lamp with adjustable brightness and color temperature. USB charging port. Perfect for home office or study.',
  'Adjustable LED desk lamp',
  'HOME-LAMP-001',
  'a3333333-3333-3333-3333-333333333333',
  'Lumina',
  18500,
  null,
  30,
  5,
  'ACTIVE',
  false,
  '["https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80"]'::jsonb
),
(
  'b5555555-5555-5555-5555-555555555555',
  'Organic Face Serum',
  'organic-face-serum',
  'Hydrating face serum with vitamin C, hyaluronic acid and natural extracts. Brightens skin and reduces fine lines. Suitable for all skin types.',
  'Vitamin C brightening serum',
  'BEAU-SERUM-001',
  'a4444444-4444-4444-4444-444444444444',
  'GlowNature',
  12500,
  15000,
  50,
  10,
  'ACTIVE',
  true,
  '["https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80"]'::jsonb
),
(
  'b6666666-6666-6666-6666-666666666666',
  'Cotton Oversized T-Shirt',
  'cotton-oversized-tshirt',
  'Soft 100% organic cotton oversized t-shirt. Relaxed fit, breathable and durable. Multiple colors available.',
  'Organic cotton oversized tee',
  'FASH-TEE-001',
  'a2222222-2222-2222-2222-222222222222',
  'PlainBasic',
  8500,
  null,
  60,
  10,
  'ACTIVE',
  false,
  '["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80"]'::jsonb
),
(
  'b7777777-7777-7777-7777-777777777777',
  'Portable Power Bank 20000mAh',
  'portable-power-bank-20000mah',
  'High capacity 20000mAh power bank with fast charging, dual USB ports and LED indicator. Charge your phone multiple times.',
  '20000mAh fast-charge power bank',
  'ELEC-POWER-001',
  'a1111111-1111-1111-1111-111111111111',
  'ChargePro',
  22000,
  28000,
  35,
  7,
  'ACTIVE',
  false,
  '["https://images.unsplash.com/photo-1609091839311-b48b7dbf2d2b?w=800&q=80"]'::jsonb
),
(
  'b8888888-8888-8888-8888-888888888888',
  'Ceramic Plant Pot Set',
  'ceramic-plant-pot-set',
  'Set of 3 elegant ceramic plant pots in different sizes. Modern design, drainage holes included. Ideal for indoor plants.',
  'Set of 3 ceramic plant pots',
  'HOME-POT-001',
  'a3333333-3333-3333-3333-333333333333',
  'GreenNest',
  15000,
  null,
  22,
  5,
  'ACTIVE',
  false,
  '["https://images.unsplash.com/photo-1485955900001-4eac276af882?w=800&q=80"]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
