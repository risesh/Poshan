-- Seeds the 4 products previously hardcoded in web/lib/products.ts (now
-- retired in favor of reading this table), so a fresh Supabase project has
-- real data to develop against. Run after 0001_init.sql through
-- 0008_admin_promo_write.sql. Safe to re-run: it wipes and reinserts these
-- rows (never touches orders/order_items, which hold their own historical
-- snapshots independent of this table).

delete from product_variants;
delete from products;

with inserted as (
  insert into products (
    slug, name, category, badge, description, attributes, is_instock,
    short_description, gradient, badge_style, image_url, tab_categories,
    description_bullets, detail_attrs, usage_bullets, vegetarian,
    ingredients, net_quantity, storage, shelf_life, cart_badge,
    thumb_gradient, thumb_name_lines, thumb_name_size, placeholder_content
  )
  values
    ('kefir', 'Kefir', 'Probiotic', 'Best Seller',
     'Kefir is a tart, fermented drink made by soaking "Kefir grains" - a symbiotic culture of yeasts and bacteria in milk',
     array['Fermented','A2 milk','Small batch'], true,
     'One of the most potent, natural, fermented probiotic food',
     null, 'dark', '/kefir.jpg', array['best-sellers','probiotics'],
     array['30+ strains of bacteria & yeast v/s approx. 5 in Curd','Consume daily for gut health and immunity.'],
     array['A2 milk','Made fresh for every order','Rich in protein, calcium'],
     array['Start slow, take 1-2 spoons per day to let your digestion adjust','Helpful after antibiotics or when digestion feels heavy.'],
     true, 'Pasteurised A2 cow milk, live kefir cultures (Lactococcus, Leuconostoc, kefir yeasts).',
     '500 ml', 'Refrigerate below 4°C', '3-5 days from packing, if kept refrigerated',
     'Probiotic · Best seller', 'linear-gradient(135deg,#1E3A34 0%,#4A9B8E 100%)',
     array['Kefir'], '18px', false),

    ('punjabi-mango-pickle', 'Punjabi Mango Pickle', 'Probiotic', 'Seasonal',
     'A traditional Punjabi-style raw mango pickle, lacto-fermented the way home kitchens have made it for generations.',
     array['Fermented','Seasonal','Traditional'], true,
     'Traditional lacto-fermented, raw mango pickle from Punjab',
     'amla', 'light', null, array['seasonal','pickles','probiotics'],
     array['Raw mango, mustard oil, and whole spices, fermented slowly for tang and bite','Live cultures develop naturally over 2-3 weeks, no added vinegar','A spoonful alongside any meal for a dose of fermented flavor'],
     array['Fermented','Seasonal','Traditional'],
     array['Best enjoyed alongside dal, rice, or parathas.','Refrigerate after opening and use a dry spoon to keep it fresh longer.'],
     true, 'Raw mango, mustard oil, red chilli, mustard seeds, fenugreek, turmeric, salt.',
     '250 g', 'Cool, dry place; refrigerate after opening', '6 months unopened; 4-6 weeks refrigerated after opening',
     'Probiotic · Seasonal', 'linear-gradient(135deg,#7A9B76 0%,#E4A335 100%)',
     array['Punjabi Mango','Pickle'], '14px', true),

    ('lacto-fermented-carrots', 'Lacto Fermented Carrots', 'Probiotic', 'New',
     'Crisp carrots, brine-fermented the traditional way with mustard seeds for a tangy, probiotic-rich bite.',
     array['Live cultures','Brine-fermented','Small batch'], true,
     'Crisp winter carrots, brine-fermented with mustard seeds',
     'amla', 'light', null, array['probiotics'],
     array['Fermented in a simple salt brine, no vinegar or shortcuts','Live cultures develop naturally over 1-2 weeks','A crunchy, tangy side to any meal, or eaten straight from the jar'],
     array['Live cultures','Brine-fermented','Small batch'],
     array['A few pieces alongside a meal help digestion.','Keep refrigerated and use a clean, dry spoon each time.'],
     true, 'Carrots, water, sea salt, mustard seeds.',
     '250 g', 'Refrigerate at all times', '4-6 weeks refrigerated',
     'Probiotic · New', 'linear-gradient(135deg,#7A9B76 0%,#4A9B8E 100%)',
     array['Lacto Fermented','Carrots'], '14px', true),

    ('dryfruit-millet-laddoo', 'Dryfruit Millet Laddoo', 'Energy', 'Instant Energy',
     'Slow-toasted millet laddoos, sweetened only with dates and rounded out with almonds and cardamom.',
     array['Iron-rich','No refined sugar','Small batch'], true,
     'Slow-toasted millet with dates, almonds, and cardamom',
     'turmeric', 'light', null, array['energy'],
     array['No refined sugar — natural sweetness from dates','Iron-rich millets, toasted slowly for flavor and digestibility','A quick, wholesome bite for sustained energy'],
     array['Iron-rich','No refined sugar','Small batch'],
     array['One or two laddoos make a satisfying mid-day snack.','Store in an airtight container away from direct sunlight.'],
     true, 'Finger millet (ragi), dates, almonds, cashews, ghee, cardamom.',
     '500 g', 'Airtight container, room temperature', '3 weeks at room temperature',
     'Energy · Instant Energy', 'linear-gradient(135deg,#C97C3D 0%,#E4A335 100%)',
     array['Dryfruit Millet','Laddoo'], '14px', true)
  returning id, slug
)
insert into product_variants (
  product_id, size_label, sku, price_rupees, stock_quantity, is_instock,
  unit_label, sort_order, nutrition
)
select id, '500 ml', 'KEFIR-500ML', 240, 50, true, '/ 500 ml jar', 0,
  '{"basis":"per 100 ml","rows":[["Energy","62 kcal"],["Protein","3.3 g"],["Fat","3.5 g"],["Carbohydrate","4.2 g"],["Calcium","115 mg"]]}'::jsonb
  from inserted where slug = 'kefir'
union all
select id, '1 L', 'KEFIR-1L', 440, 30, true, '/ 1 L jar', 1, '{}'::jsonb
  from inserted where slug = 'kefir'
union all
select id, '250 g', 'PMP-250G', 250, 40, true, '/ 250 g jar', 0,
  '{"basis":"per 100 g","rows":[["Energy","180 kcal"],["Protein","1.5 g"],["Fat","14 g"],["Carbohydrate","12 g"],["Sodium","850 mg"]]}'::jsonb
  from inserted where slug = 'punjabi-mango-pickle'
union all
select id, '250 g', 'LFC-250G', 210, 40, true, '/ 250 g jar', 0,
  '{"basis":"per 100 g","rows":[["Energy","35 kcal"],["Protein","1 g"],["Fat","0.3 g"],["Carbohydrate","7 g"],["Sodium","620 mg"]]}'::jsonb
  from inserted where slug = 'lacto-fermented-carrots'
union all
select id, '500 g', 'DML-500G', 320, 0, false, '/ 500 g box', 0,
  '{"basis":"per 100 g","rows":[["Energy","410 kcal"],["Protein","8 g"],["Fat","16 g"],["Carbohydrate","58 g"],["Iron","4.5 mg"]]}'::jsonb
  from inserted where slug = 'dryfruit-millet-laddoo';

-- Demo promo codes so the cart/checkout promo box has something real to
-- validate against. No promo_code_products rows for either — that means
-- "applies to every product" (see 0001_init.sql's comment on that table).
-- starts_at left null for both (active immediately), matching the existing
-- expires_at = null ("never expires") convention already used here.
delete from promo_codes;

insert into promo_codes (code, discount_type, discount_value, min_order_rupees, active)
values
  ('WELCOME10', 'percent', 10, 0, true),
  ('FLAT40', 'flat', 40, 300, true);
