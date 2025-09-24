-- Add new characters to the characters table
INSERT INTO public.characters (id, name, emoji, unlock_condition, unlock_description, sort_order) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Phoenix', '🔥', 'shop', 'Available in shop for 50 books', 10),
('550e8400-e29b-41d4-a716-446655440002', 'Eagle', '🦅', 'shop', 'Available in shop for 75 books', 11),
('550e8400-e29b-41d4-a716-446655440003', 'Owl', '🦉', 'shop', 'Available in shop for 100 books', 12),
('550e8400-e29b-41d4-a716-446655440004', 'Parrot', '🦜', 'shop', 'Available in shop for 125 books', 13),
('550e8400-e29b-41d4-a716-446655440005', 'Flamingo', '🦩', 'shop', 'Available in shop for 150 books', 14),
('550e8400-e29b-41d4-a716-446655440006', 'Peacock', '🦚', 'shop', 'Available in shop for 200 books', 15),
('550e8400-e29b-41d4-a716-446655440007', 'Dragon', '🐉', 'shop', 'Available in shop for 300 books', 16),
('550e8400-e29b-41d4-a716-446655440008', 'Unicorn', '🦄', 'shop', 'Available in shop for 500 books', 17);

-- Add new shop items for characters
INSERT INTO public.shop_items (id, name, description, price, emoji, item_type, item_data, sort_order) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'Phoenix', 'A majestic fire bird that rises from ashes', 50, '🔥', 'character', '{"character_id": "550e8400-e29b-41d4-a716-446655440001"}', 10),
('650e8400-e29b-41d4-a716-446655440002', 'Eagle', 'Soar high with this powerful predator', 75, '🦅', 'character', '{"character_id": "550e8400-e29b-41d4-a716-446655440002"}', 11),
('650e8400-e29b-41d4-a716-446655440003', 'Wise Owl', 'Navigate with wisdom and precision', 100, '🦉', 'character', '{"character_id": "550e8400-e29b-41d4-a716-446655440003"}', 12),
('650e8400-e29b-41d4-a716-446655440004', 'Tropical Parrot', 'Bright and colorful island flyer', 125, '🦜', 'character', '{"character_id": "550e8400-e29b-41d4-a716-446655440004"}', 13),
('650e8400-e29b-41d4-a716-446655440005', 'Elegant Flamingo', 'Grace and beauty in flight', 150, '🦩', 'character', '{"character_id": "550e8400-e29b-41d4-a716-446655440005"}', 14),
('650e8400-e29b-41d4-a716-446655440006', 'Royal Peacock', 'Fly in royal splendor', 200, '🦚', 'character', '{"character_id": "550e8400-e29b-41d4-a716-446655440006"}', 15),
('650e8400-e29b-41d4-a716-446655440007', 'Mighty Dragon', 'Legendary creature of power', 300, '🐉', 'character', '{"character_id": "550e8400-e29b-41d4-a716-446655440007"}', 16),
('650e8400-e29b-41d4-a716-446655440008', 'Magical Unicorn', 'Ultimate mythical flyer', 500, '🦄', 'character', '{"character_id": "550e8400-e29b-41d4-a716-446655440008"}', 17);

-- Add new powerup shop items
INSERT INTO public.shop_items (id, name, description, price, emoji, item_type, item_data, sort_order) VALUES
('750e8400-e29b-41d4-a716-446655440001', 'Super Jump', 'Start each game with higher jump power', 80, '🚀', 'power', '{"power_id": "super_jump", "name": "Super Jump", "description": "Higher jump power at game start", "duration": 10000}', 50),
('750e8400-e29b-41d4-a716-446655440002', 'Feather Fall', 'Slower falling speed for easier control', 60, '🪶', 'power', '{"power_id": "feather_fall", "name": "Feather Fall", "description": "Fall 30% slower for better control", "duration": 15000}', 51),
('750e8400-e29b-41d4-a716-446655440003', 'Book Magnet', 'Automatically collect books after 1 second', 100, '🧲', 'power', '{"power_id": "book_magnet", "name": "Book Magnet", "description": "Auto-collect books that stay on screen", "delay": 1000}', 52),
('750e8400-e29b-41d4-a716-446655440004', 'Start Shield', 'Begin each game with temporary invincibility', 120, '🛡️', 'power', '{"power_id": "start_shield", "name": "Start Shield", "description": "3 seconds of invincibility at game start", "duration": 3000}', 53),
('750e8400-e29b-41d4-a716-446655440005', 'Double Points', 'Earn 2x books from all collections', 150, '💎', 'power', '{"power_id": "double_points", "name": "Double Points", "description": "Collect 2x books for entire game"}', 54),
('750e8400-e29b-41d4-a716-446655440006', 'Lucky Start', 'Higher chance of beneficial powerups', 90, '🍀', 'power', '{"power_id": "lucky_start", "name": "Lucky Start", "description": "Better powerup luck throughout the game"}', 55),
('750e8400-e29b-41d4-a716-446655440007', 'Ghost Mode', 'Pass through first locker hit', 200, '👻', 'power', '{"power_id": "ghost_mode", "name": "Ghost Mode", "description": "Survive your first collision with a locker"}', 56),
('750e8400-e29b-41d4-a716-446655440008', 'Time Warp', 'Start games in slow motion', 75, '⏰', 'power', '{"power_id": "time_warp", "name": "Time Warp", "description": "Begin with 5 seconds of slow motion", "duration": 5000}', 57);