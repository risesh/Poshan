-- Seeds the 4 products currently hardcoded in web/lib/products.ts, so a
-- fresh Supabase project has real data to develop against. Run after
-- 0001_init.sql. Safe to re-run: it wipes and reinserts these rows.

delete from product_variants;
delete from products;

with inserted as (
  insert into products (slug, name, category, badge, description, attributes, is_instock)
  values
    ('kefir', 'Kefir', 'Probiotic', 'Best Seller',
     'One of the most potent, natural, fermented probiotic food',
     array['Fermented','A2 milk','Small batch'], true),
    ('punjabi-mango-pickle', 'Punjabi Mango Pickle', 'Probiotic', 'Seasonal',
     'Traditional lacto-fermented, raw mango pickle from Punjab',
     array['Fermented','Seasonal','Traditional'], true),
    ('lacto-fermented-carrots', 'Lacto Fermented Carrots', 'Probiotic', 'New',
     'Crisp winter carrots, brine-fermented with mustard seeds',
     array['Live cultures','Brine-fermented','Small batch'], true),
    ('dryfruit-millet-laddoo', 'Dryfruit Millet Laddoo', 'Energy', 'Instant Energy',
     'Slow-toasted millet with dates, almonds, and cardamom',
     array['Iron-rich','No refined sugar','Small batch'], true)
  returning id, slug
)
insert into product_variants (product_id, size_label, sku, price_rupees, stock_quantity, is_instock)
select id, '500 ml', 'KEFIR-500ML', 240, 50, true from inserted where slug = 'kefir'
union all
select id, '250 g', 'PMP-250G', 250, 40, true from inserted where slug = 'punjabi-mango-pickle'
union all
select id, '250 g', 'LFC-250G', 210, 40, true from inserted where slug = 'lacto-fermented-carrots'
union all
select id, '500 g', 'DML-500G', 320, 0, false from inserted where slug = 'dryfruit-millet-laddoo';
