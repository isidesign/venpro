import type { Product } from '@/types';

export interface CompositionIngredient {
  productId: string;
  name: string;
  stock: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
}

export function formatProductUnit(product: Pick<Product, 'unit'>): string {
  return product.unit?.trim() || 'u';
}

export function formatStockDisplay(product: Product): string {
  const unit = formatProductUnit(product);
  const qty = Number.isInteger(product.quantity)
    ? product.quantity
    : parseFloat(product.quantity.toFixed(2));
  return `${qty} ${unit}`;
}

export function getIngredientIconName(category: string): string {
  const value = category.toLowerCase();
  if (value.includes('veget') || value.includes('verd') || value.includes('lech')) return 'eco';
  if (value.includes('huevo') || value.includes('egg')) return 'egg';
  if (value.includes('carne') || value.includes('cerdo') || value.includes('tocino')) return 'restaurant';
  if (value.includes('salsa') || value.includes('bebida') || value.includes('láct') || value.includes('lact')) return 'kitchen';
  if (value.includes('pan')) return 'lunch_dining';
  return 'kitchen';
}

export function productToCompositionIngredient(
  product: Product,
  quantity = 1,
): CompositionIngredient {
  return {
    productId: product.id,
    name: product.name,
    stock: formatStockDisplay(product),
    quantity,
    unit: formatProductUnit(product),
    estimatedCost: product.buyPrice,
  };
}

export function recipeToCompositionIngredients(
  recipe: Product['recipe'],
  products: Product[],
): CompositionIngredient[] {
  return (recipe ?? []).map((item) => {
    const source = products.find((p) => p.id === item.productId);
    return {
      productId: item.productId,
      name: item.name,
      stock: source ? formatStockDisplay(source) : '—',
      quantity: item.quantity,
      unit: item.unit ?? (source ? formatProductUnit(source) : 'u'),
      estimatedCost: item.buyPrice,
    };
  });
}
