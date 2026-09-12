INSERT INTO categories (id, name, sort_order) VALUES
  (1, 'Hot Dogs', 1),
  (2, 'Nachos & Snacks', 2),
  (3, 'Popcorn', 3),
  (4, 'Treats', 4),
  (5, 'Coffee & More', 5),
  (6, 'Drinks', 6);

INSERT INTO products (id, category_id, name, description, price, available, sort_order) VALUES
  ('hotdog-001', 1, 'Classic Hot Dog', 'Grilled sausage, ketchup, mustard and crispy potato sticks', 12.90, 1, 1),
  ('hotdog-002', 1, 'Cheesy Hot Dog', 'Grilled sausage topped with melted cheddar', 16.50, 1, 2),
  ('nachos-001', 2, 'Loaded Nachos', 'Tortilla chips with melted cheddar and jalapeños', 18.00, 1, 1),
  ('nachos-002', 2, 'Onion Rings', 'Breaded onion rings served with mustard dip', 15.00, 1, 2),
  ('snack-001', 2, 'Chicken Wings', 'Grilled chicken wings with barbecue sauce', 22.90, 1, 3),
  ('popcorn-001', 3, 'Butter Popcorn', 'Classic buttered popcorn', 8.90, 1, 1),
  ('popcorn-002', 3, 'Caramel Popcorn', 'Sweet caramel-coated popcorn', 11.90, 1, 2),
  ('popcorn-003', 3, 'Cheese Popcorn', 'Mature cheese flavored popcorn', 12.90, 0, 3),
  ('treat-001', 4, 'Chocolate Chip Cookie', 'Soft-baked cookie with chocolate chunks', 6.90, 1, 1),
  ('treat-002', 4, 'Brownie', 'Chocolate brownie with nuts', 9.90, 1, 2),
  ('treat-003', 4, 'Candy Mix', 'Assorted candy selection', 7.90, 0, 3),
  ('coffee-001', 5, 'Brewed Coffee', 'Filter coffee, 200ml', 5.90, 1, 1),
  ('coffee-002', 5, 'Hot Chocolate', 'Creamy hot chocolate with marshmallows', 10.90, 1, 2),
  ('coffee-003', 5, 'Strawberry Shake', 'Strawberry milkshake 350ml', 16.90, 1, 3),
  ('drink-001', 6, 'Cola (Can)', 'Cola can 350ml', 6.50, 1, 1),
  ('drink-002', 6, 'Soda (Bottle)', 'Lemon-lime soda bottle 500ml', 9.50, 1, 2),
  ('drink-003', 6, 'Water 500ml', 'Still mineral water', 4.00, 1, 3),
  ('drink-004', 6, 'Fresh Juice', 'Orange juice 300ml', 8.00, 1, 4);