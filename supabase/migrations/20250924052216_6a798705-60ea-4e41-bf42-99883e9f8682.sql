-- Update Extra Shield price and make it work for 20 seconds
UPDATE public.shop_items 
SET 
  price = 15,
  description = 'Start each game with a 20-second shield',
  item_data = jsonb_build_object(
    'power_id', 'start_shield',
    'name', 'Start Shield', 
    'description', 'Begin with 20 seconds of invincibility',
    'duration', 20000
  )
WHERE name = 'Power: Extra Shield';

-- Update Super Power price and description to auto collect books after 1 second
UPDATE public.shop_items 
SET 
  price = 75,
  description = 'Auto collect books after seeing them for 1 second',
  item_data = jsonb_build_object(
    'power_id', 'book_magnet',
    'name', 'Auto Collector', 
    'description', 'Automatically collect books after seeing them for 1 second',
    'delay', 1000
  )
WHERE name = 'Super Power';