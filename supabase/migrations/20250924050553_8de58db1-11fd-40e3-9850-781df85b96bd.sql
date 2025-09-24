-- Create the snail character that's referenced in the shop
INSERT INTO public.characters (name, emoji, unlock_condition, unlock_description, is_default, sort_order)
VALUES (
  'Snail',
  '🐌',
  'purchased',
  'Purchase from the shop for 10 books',
  false,
  100
);

-- Get the newly created snail character ID and update the shop item
UPDATE public.shop_items 
SET item_data = jsonb_set(
  item_data, 
  '{character_id}', 
  to_jsonb((SELECT id FROM public.characters WHERE emoji = '🐌' LIMIT 1)::text)
)
WHERE name = 'Snail Character';