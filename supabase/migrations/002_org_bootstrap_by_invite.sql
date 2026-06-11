-- Permite a empleados (sin sesión) cargar el inventario del negocio al escanear el QR.

create or replace function public.fetch_organization_bootstrap_by_invite_code(code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  org_id uuid;
  org_row public.organizations%rowtype;
  config_row public.store_configs%rowtype;
begin
  select * into org_row
  from public.organizations
  where invite_code = lower(trim(code))
  limit 1;

  if org_row.id is null then
    return null;
  end if;

  org_id := org_row.id;

  select * into config_row
  from public.store_configs
  where organization_id = org_id;

  return jsonb_build_object(
    'organizationId', org_id,
    'inviteCode', org_row.invite_code,
    'industry', org_row.industry,
    'config', jsonb_build_object(
      'storeName', coalesce(config_row.store_name, org_row.name),
      'currencySymbol', coalesce(config_row.currency_symbol, '$'),
      'address', coalesce(config_row.address, ''),
      'phone', coalesce(config_row.phone, ''),
      'taxRate', coalesce(config_row.tax_rate, 16),
      'ownerAccessPin', coalesce(config_row.owner_access_pin, '1234')
    ),
    'products', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'code', p.code,
          'name', p.name,
          'category', p.category,
          'buyPrice', p.buy_price,
          'sellPrice', p.sell_price,
          'quantity', p.quantity,
          'minStock', p.min_stock,
          'location', p.location,
          'image', p.image,
          'isCompound', coalesce(p.is_compound, false)
        )
        order by p.name
      )
      from public.products p
      where p.organization_id = org_id
    ), '[]'::jsonb),
    'sales', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'date', s.date,
          'items', s.items,
          'totalAmount', s.total_amount,
          'responsible', s.responsible,
          'paymentMethod', s.payment_method
        )
        order by s.date desc
      )
      from public.sales s
      where s.organization_id = org_id
    ), '[]'::jsonb),
    'transactions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'productId', t.product_id,
          'productName', t.product_name,
          'type', t.type,
          'quantity', t.quantity,
          'reason', t.reason,
          'date', t.date,
          'responsible', t.responsible
        )
        order by t.date desc
      )
      from public.stock_transactions t
      where t.organization_id = org_id
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.fetch_organization_bootstrap_by_invite_code(text) to anon, authenticated;
