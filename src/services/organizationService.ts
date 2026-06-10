import { supabase } from '@/lib/supabase';
import { getIndustrySeedData } from '@/data/industrySeeds';
import type { IndustryType, Product, Sale, StockTransaction, StoreConfig } from '@/types';
import { parseIndustry } from '@/lib/industry';
import { AuthError } from '@/services/authService';

export interface CreateOrganizationParams {
  userId: string;
  ownerName: string;
  ownerEmail: string;
  businessName: string;
  industry: 'restaurante' | 'tienda';
  businessStructure: string;
  config: StoreConfig;
}

export interface OrganizationData {
  organizationId: string;
  inviteCode: string;
  industry: IndustryType;
  products: Product[];
  sales: Sale[];
  transactions: StockTransaction[];
  config: StoreConfig;
}

function requireSupabase() {
  if (!supabase) {
    throw new AuthError('Supabase no está configurado.');
  }
  return supabase;
}

export async function validateInviteCode(code: string): Promise<string | null> {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return null;

  if (!supabase) {
    const stored = localStorage.getItem('venpro_invite_code');
    return stored && stored.toLowerCase() === normalized ? 'local' : null;
  }

  const { data, error } = await supabase.rpc('validate_invite_code', { code: normalized });
  if (error) throw new AuthError(error.message);
  return (data as string | null) ?? null;
}

export async function createOrganizationWithDatabase(
  params: CreateOrganizationParams,
): Promise<OrganizationData> {
  const client = requireSupabase();
  const seedData = getIndustrySeedData(params.industry);

  const { data: org, error: orgError } = await client
    .from('organizations')
    .insert({
      name: params.businessName,
      industry: params.industry,
      business_structure: params.businessStructure,
      owner_id: params.userId,
    })
    .select('id, invite_code')
    .single();

  if (orgError) throw new AuthError(orgError.message);

  const { error: profileError } = await client.from('profiles').insert({
    id: params.userId,
    full_name: params.ownerName,
    email: params.ownerEmail,
    role: 'owner',
    organization_id: org.id,
  });

  if (profileError) throw new AuthError(profileError.message);

  const { error: configError } = await client.from('store_configs').insert({
    organization_id: org.id,
    store_name: params.config.storeName,
    currency_symbol: params.config.currencySymbol,
    address: params.config.address,
    phone: params.config.phone,
    tax_rate: params.config.taxRate,
    owner_access_pin: params.config.ownerAccessPin,
  });

  if (configError) throw new AuthError(configError.message);

  const productRows = seedData.products.map((p) => ({
    organization_id: org.id,
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

  const { error: productsError } = await client.from('products').insert(productRows);
  if (productsError) throw new AuthError(productsError.message);

  const saleRows = seedData.sales.map((s) => ({
    organization_id: org.id,
    id: s.id,
    date: s.date,
    items: s.items,
    total_amount: s.totalAmount,
    responsible: s.responsible,
    payment_method: s.paymentMethod,
  }));

  const { error: salesError } = await client.from('sales').insert(saleRows);
  if (salesError) throw new AuthError(salesError.message);

  const txRows = seedData.transactions.map((t) => ({
    organization_id: org.id,
    id: t.id,
    product_id: t.productId,
    product_name: t.productName,
    type: t.type,
    quantity: t.quantity,
    reason: t.reason,
    date: t.date,
    responsible: t.responsible,
  }));

  const { error: txError } = await client.from('stock_transactions').insert(txRows);
  if (txError) throw new AuthError(txError.message);

  return {
    organizationId: org.id,
    inviteCode: org.invite_code,
    industry: params.industry,
    products: seedData.products,
    sales: seedData.sales,
    transactions: seedData.transactions,
    config: params.config,
  };
}

export async function loadOrganizationData(organizationId: string): Promise<OrganizationData | null> {
  const client = requireSupabase();

  const { data: org, error: orgError } = await client
    .from('organizations')
    .select('id, invite_code, industry')
    .eq('id', organizationId)
    .maybeSingle();

  if (orgError) throw new AuthError(orgError.message);
  if (!org) return null;

  const { data: configRow, error: configError } = await client
    .from('store_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (configError) throw new AuthError(configError.message);

  const { data: productRows, error: productsError } = await client
    .from('products')
    .select('*')
    .eq('organization_id', organizationId);

  if (productsError) throw new AuthError(productsError.message);

  const { data: saleRows, error: salesError } = await client
    .from('sales')
    .select('*')
    .eq('organization_id', organizationId);

  if (salesError) throw new AuthError(salesError.message);

  const { data: txRows, error: txError } = await client
    .from('stock_transactions')
    .select('*')
    .eq('organization_id', organizationId);

  if (txError) throw new AuthError(txError.message);

  const config: StoreConfig = configRow
    ? {
        storeName: configRow.store_name,
        currencySymbol: configRow.currency_symbol,
        address: configRow.address,
        phone: configRow.phone,
        taxRate: Number(configRow.tax_rate),
        ownerAccessPin: configRow.owner_access_pin,
      }
    : {
        storeName: 'Venpro Negocio',
        currencySymbol: '$',
        address: '',
        phone: '',
        taxRate: 16,
        ownerAccessPin: '1234',
      };

  const products: Product[] = (productRows ?? []).map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    category: p.category,
    buyPrice: Number(p.buy_price),
    sellPrice: Number(p.sell_price),
    quantity: Number(p.quantity),
    minStock: Number(p.min_stock),
    location: p.location,
    image: p.image ?? undefined,
    isCompound: p.is_compound ?? false,
  }));

  const sales: Sale[] = (saleRows ?? []).map((s) => ({
    id: s.id,
    date: s.date,
    items: s.items as Sale['items'],
    totalAmount: Number(s.total_amount),
    responsible: s.responsible as Sale['responsible'],
    paymentMethod: s.payment_method as Sale['paymentMethod'],
  }));

  const transactions: StockTransaction[] = (txRows ?? []).map((t) => ({
    id: t.id,
    productId: t.product_id,
    productName: t.product_name,
    type: t.type as StockTransaction['type'],
    quantity: Number(t.quantity),
    reason: t.reason,
    date: t.date,
    responsible: t.responsible as StockTransaction['responsible'],
  }));

  return {
    organizationId: org.id,
    inviteCode: org.invite_code,
    industry: parseIndustry(org.industry),
    products,
    sales,
    transactions,
    config,
  };
}
