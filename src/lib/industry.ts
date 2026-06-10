import type { IndustryType, StoreConfig } from '@/types';

export function getIndustryDefaultStoreName(industry: IndustryType): string {
  return industry === 'restaurante' ? 'Restaurante El Gourmet' : 'Tienda Venpro';
}

export function getIndustryDefaultConfig(industry: IndustryType): StoreConfig {
  if (industry === 'restaurante') {
    return {
      storeName: 'Restaurante El Gourmet',
      currencySymbol: '$',
      address: 'Av. Gourmet #101, Zona Gourmet',
      phone: '(555) 765-4321',
      taxRate: 16,
      ownerAccessPin: '1234',
    };
  }

  return {
    storeName: 'Tienda Venpro',
    currencySymbol: '$',
    address: 'Av. Costanera #1240, Ciudad Central',
    phone: '+1 555-019-3829',
    taxRate: 16,
    ownerAccessPin: '1234',
  };
}

export function getIndustryWelcomeSubtitle(industry: IndustryType): string {
  return industry === 'restaurante'
    ? 'Gestión de inventario y ventas para cocina gourmet'
    : 'Operación Activa: Almacén y Control de Logística';
}

export function getIndustryCatalogSubtitle(industry: IndustryType): string {
  return industry === 'restaurante'
    ? 'Control de inventario de ingredientes y platillos'
    : 'Control de inventario de prendas y calzado';
}

export function parseIndustry(value: string | null | undefined): IndustryType {
  return value === 'restaurante' ? 'restaurante' : 'tienda';
}
