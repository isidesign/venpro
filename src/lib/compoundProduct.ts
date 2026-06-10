import type { Product, SaleItem, StockTransaction } from '@/types';

export function getMaxCompoundSaleQuantity(compound: Product, products: Product[]): number {
  if (!compound.isCompound) {
    return Math.max(0, compound.quantity);
  }

  const preparedStock = Math.max(0, compound.quantity);
  const recipe = compound.recipe ?? [];

  if (recipe.length === 0) {
    return preparedStock;
  }

  let maxFromIngredients = Infinity;

  for (const item of recipe) {
    const ingredient = products.find((p) => p.id === item.productId);
    if (!ingredient || item.quantity <= 0) {
      return 0;
    }

    const servings = Math.floor(ingredient.quantity / item.quantity);
    maxFromIngredients = Math.min(maxFromIngredients, servings);
  }

  if (maxFromIngredients === Infinity) {
    return preparedStock;
  }

  if (preparedStock > 0) {
    return Math.min(preparedStock, maxFromIngredients);
  }

  return maxFromIngredients;
}

export function isProductAvailableForSale(product: Product, products: Product[]): boolean {
  if (product.isCompound) {
    return getMaxCompoundSaleQuantity(product, products) > 0;
  }
  return product.quantity > 0;
}

export function applySaleStockUpdates(products: Product[], cart: SaleItem[]): Product[] {
  let updated = products.map((product) => ({ ...product }));

  for (const cartItem of cart) {
    const soldProduct = updated.find((p) => p.id === cartItem.productId);
    if (!soldProduct) continue;

    updated = updated.map((p) =>
      p.id === cartItem.productId
        ? { ...p, quantity: Math.max(0, p.quantity - cartItem.quantity) }
        : p,
    );

    if (!soldProduct.isCompound || !soldProduct.recipe?.length) continue;

    for (const recipeItem of soldProduct.recipe) {
      const deduction = recipeItem.quantity * cartItem.quantity;
      updated = updated.map((p) =>
        p.id === recipeItem.productId
          ? { ...p, quantity: Math.max(0, p.quantity - deduction) }
          : p,
      );
    }
  }

  return updated;
}

export function buildSaleStockTransactions(
  cart: SaleItem[],
  products: Product[],
  saleId: string,
): StockTransaction[] {
  const transactions: StockTransaction[] = [];
  const timestamp = new Date().toISOString();

  for (const cartItem of cart) {
    const soldProduct = products.find((p) => p.id === cartItem.productId);
    if (!soldProduct) continue;

    transactions.push({
      id: `tr-${Math.floor(Math.random() * 900000)}`,
      productId: cartItem.productId,
      productName: cartItem.name,
      type: 'subtraction',
      quantity: cartItem.quantity,
      reason: `Venta Diaria Boleta #${saleId}`,
      date: timestamp,
      responsible: 'Propietario',
    });

    if (!soldProduct.isCompound || !soldProduct.recipe?.length) continue;

    for (const recipeItem of soldProduct.recipe) {
      transactions.push({
        id: `tr-${Math.floor(Math.random() * 900000)}`,
        productId: recipeItem.productId,
        productName: recipeItem.name,
        type: 'subtraction',
        quantity: recipeItem.quantity * cartItem.quantity,
        reason: `Consumo por venta de ${soldProduct.name} (Boleta #${saleId})`,
        date: timestamp,
        responsible: 'Propietario',
      });
    }
  }

  return transactions;
}
