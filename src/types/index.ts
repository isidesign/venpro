/**
 * Types definition for Venpro Inventory System
 */

export type IndustryType = 'restaurante' | 'tienda';

export type ClothingAudience = 'Clásicas' | 'Niños' | 'Bebés';

export interface RecipeComponent {
  productId: string;
  name: string;
  quantity: number;
  unit?: string;
  buyPrice: number;
  order?: number;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  buyPrice: number; // Cost price paid to suppliers
  sellPrice: number; // Sale price to customers
  quantity: number; // Amount currently in stock
  minStock: number; // Low stock warning threshold
  location: string; // Storage section (e.g. Pasillo A, Estante 4)
  image?: string; // Optional product image URL
  isCompound?: boolean; // True if it is a compound product
  unit?: string; // Unidad de medida (restaurante)
  recipe?: RecipeComponent[]; // Ingredientes de producto compuesto
  audience?: ClothingAudience; // Línea de ropa (tienda)
  sizes?: string[]; // Tallas disponibles (tienda)
  colors?: string[]; // Colores disponibles (tienda)
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  sellPrice: number;
  buyPrice: number;
}

export interface Sale {
  id: string;
  date: string; // ISO String
  items: SaleItem[];
  totalAmount: number;
  responsible: 'Propietario' | 'Empleado';
  paymentMethod: 'Efectivo' | 'Tarjeta' | 'Transferencia';
}

export interface StockTransaction {
  id: string;
  productId: string;
  productName: string;
  type: 'addition' | 'subtraction';
  quantity: number;
  reason: string;
  date: string; // ISO String
  responsible: 'Propietario' | 'Empleado';
}

export interface StoreConfig {
  storeName: string;
  currencySymbol: string;
  address: string;
  phone: string;
  taxRate: number; // as percentage, e.g. 19
  ownerAccessPin: string; // Secret lock passcode
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: 'owner' | 'employee';
  organizationId: string | null;
  cargo?: string;
}
