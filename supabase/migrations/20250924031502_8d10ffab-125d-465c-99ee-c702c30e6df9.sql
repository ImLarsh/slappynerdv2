-- Update shop item prices and descriptions
UPDATE shop_items SET 
  price = 20,
  item_data = jsonb_set(item_data, '{emoji}', '"👹"')
WHERE name = 'Speed Demon Character';

-- Change Nerd Character to Snail Character  
UPDATE shop_items SET 
  name = 'Snail Character',
  price = 10,
  description = 'Unlock the slow but steady snail character',
  emoji = '🐌',
  item_data = jsonb_set(
    jsonb_set(item_data, '{name}', '"Snail"'),
    '{emoji}', '"🐌"'
  )
WHERE name = 'Nerd Character';

-- Update Extra Shield power price
UPDATE shop_items SET 
  price = 5
WHERE name = 'Power: Extra Shield';

-- Update Book Magnet to Super Power
UPDATE shop_items SET 
  name = 'Super Power',
  price = 50,
  description = 'Auto collect books for the first 30 seconds of each game',
  item_data = jsonb_set(
    jsonb_set(item_data, '{name}', '"Auto Collector"'),
    '{description}', '"Automatically collect all books for 30 seconds"'
  )
WHERE name = 'Power: Book Magnet';