import { supabase } from '@/lib/supabase';
import type { Product, Sale, StockTransaction, StoreConfig } from '@/types';
import { AuthError } from '@/services/authService';

function requireSupabase() {
  if (!supabase) return null;
  return supabase;
}

export async function syncProducts(organizationId: string, products: Product[]) {
  const client = requireSupabase();
  if (!client) return;

  await client.from('products').delete().eq('organization_id', organizationId);

  if (products.length === 0) return;

  const rows = products.map((p) => ({
    organization_id: organizationId,
    id: p.id,
    code: p.code,
    name: p.name,
    category: p.category,
    buy_price: p.buyPrice,
    sell_price: p.sellPrice,
    quantity: p.quantity,
    min_stock: p.minStock,
    location: p.location,
    image: p.image ?? null,
    is_compound: p.isCompound ?? false,
  }));

  const { error } = await client.from('products').insert(rows);
  if (error) throw new AuthError(error.message);
}

export async function syncSales(organizationId: string, sales: Sale[]) {
  const client = requireSupabase();
  if (!client) return;

  await client.from('sales').delete().eq('organization_id', organizationId);

  if (sales.length === 0) return;

  const rows = sales.map((s) => ({
    organization_id: organizationId,
    id: s.id,
    date: s.date,
    items: s.items,
    total_amount: s.totalAmount,
    responsible: s.responsible,
    payment_method: s.paymentMethod,
  }));

  const { error } = await client.from('sales').insert(rows);
  if (error) throw new AuthError(error.message);
}

export async function syncTransactions(organizationId: string, transactions: StockTransaction[]) {
  const client = requireSupabase();
  if (!client) return;

  await client.from('stock_transactions').delete().eq('organization_id', organizationId);

  if (transactions.length === 0) return;

  const rows = transactions.map((t) => ({
    organization_id: organizationId,
    id: t.id,
    product_id: t.productId,
    product_name: t.productName,
    type: t.type,
    quantity: t.quantity,
    reason: t.reason,
    date: t.date,
    responsible: t.responsible,
  }));

  const { error } = await client.from('stock_transactions').insert(rows);
  if (error) throw new AuthError(error.message);
}

export async function syncConfig(organizationId: string, config: StoreConfig) {
  const client = requireSupabase();
  if (!client) return;

  const { error } = await client.from('store_configs').upsert({
    organization_id: organizationId,
    store_name: config.storeName,
    currency_symbol: config.currencySymbol,
    address: config.address,
    phone: config.phone,
    tax_rate: config.taxRate,
    owner_access_pin: config.ownerAccessPin,
  });

  if (error) throw new AuthError(error.message);
}
