/**
 * Types definition for Venpro Inventory System
 */

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
