-- Remove specific powerups from shop_items
DELETE FROM public.shop_items 
WHERE id IN (
  '750e8400-e29b-41d4-a716-446655440001', -- Super Jump
  '750e8400-e29b-41d4-a716-446655440002', -- Feather Fall
  '750e8400-e29b-41d4-a716-446655440003', -- Book Magnet
  '750e8400-e29b-41d4-a716-446655440004', -- Start Shield
  '750e8400-e29b-41d4-a716-446655440008'  -- Time Warp
);