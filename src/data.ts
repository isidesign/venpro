import { Product, Sale, StockTransaction, StoreConfig } from './types';

// Default initial products
export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-oxford',
    code: 'OX-2024-WHT',
    name: 'Camisa Oxford Slim Fit',
    category: 'Camisas',
    buyPrice: 22.00,
    sellPrice: 45.00,
    quantity: 40,
    minStock: 10,
    location: 'Estante A-3',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFpQ4r86hCzJNvud7UMBkZwhPP3bvNPZVaoKCGamtW-sA5Gzl2abIX5DMWdNgGL_aki0cMrKFPrUwlMsJwaErRAcCAfk0f2N6B_9sRpuQJ_Zb8is6Z3cfKzXjvtvlc3lEozDhv7yCbgcJ5F5gR4kopTPW4or95nPivKsOE3w1Q7ywuZCSdCFsrIjMtBgBA0y_wgfid85em8-Wb7VfgZo9iFzKXolbL9l-q3xBFXk5nZDJFDORfyUr143nDyQIJdwwCelE3ZIOQ825H'
  },
  {
    id: 'prod-jeans',
    code: 'JN-DNV-99',
    name: 'Jeans Straight Leg Indigo',
    category: 'Pantalones',
    buyPrice: 39.00,
    sellPrice: 79.90,
    quantity: 3,
    minStock: 5,
    location: 'Estante B-1',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCiCnQPyMz6giEq7XbnuAKu4fydhVyjVhDbVmqMwv--a2BHvHEpIEsFTzJlP8eqNMyd5-PscFxJwXHhwmTLnp4Uij6mqNHcF4Xps9IvBHBc2Ue3rhIM3PVzBzyOoirOJN5g0zMQnFiGDFps_SmvKcUEimN_PfWR1MVl_Y2n8rDCmbnoKLFOCKEGgcd_1DDQ5_hxdg60sc_N1WDnb43kacHOEVYy3uXQ4v6MV7D6OBulYCqd1kJu1eT_xi4XGdilX0GlZtSqp1aKpkOB'
  },
  {
    id: 'prod-sudadera',
    code: 'HD-GRIZ-22',
    name: 'Sudadera Oversize Gris',
    category: 'Sudaderas',
    buyPrice: 25.00,
    sellPrice: 55.00,
    quantity: 43,
    minStock: 15,
    location: 'Perchero C-2',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcsy6cjQgho3ZvhiSL80ec01q6e92kuEZM2_CRRJEoDH_cCpMa7-JV7Uhf39KjZVnGEOcQ4y-UcSy-96qJi2eaADts8A37frf7a52S3o0cJX4R8qk7uytqM8Erqf4pHJDQ-cGUSSOO-ULU3bXVepdeRA5r5N-PFLXquM5jtkKSsXEWbRwa-LrYKPGxj6WERIaHfXTM2hkGF-dDLw7g6L67EcSosyENOt1UHcgVji9OIXFYvYPMcefRP634rDWEtgTvIERjprx3Ra-D'
  }
];

// Seed sales database
export const INITIAL_SALES: Sale[] = [
  {
    id: 'sale-1',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    items: [
      { productId: 'prod-1', name: 'Refresco Cola Premium 500ml', quantity: 4, sellPrice: 1.50, buyPrice: 0.85 },
      { productId: 'prod-5', name: 'Chocolate Oscuro 70% Cacao 100g', quantity: 2, sellPrice: 2.10, buyPrice: 0.90 }
    ],
    totalAmount: 10.20,
    responsible: 'Empleado',
    paymentMethod: 'Efectivo'
  },
  {
    id: 'sale-2',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    items: [
      { productId: 'prod-2', name: 'Aceite de Girasol Gourmet 1L', quantity: 2, sellPrice: 3.80, buyPrice: 2.10 },
      { productId: 'prod-3', name: 'Café Orgánico de Altura 500g', quantity: 1, sellPrice: 8.90, buyPrice: 4.50 }
    ],
    totalAmount: 16.50,
    responsible: 'Propietario',
    paymentMethod: 'Tarjeta'
  },
  {
    id: 'sale-3',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    items: [
      { productId: 'prod-4', name: 'Detergente Líquido Activo 3L', quantity: 2, sellPrice: 6.50, buyPrice: 3.20 },
      { productId: 'prod-1', name: 'Refresco Cola Premium 500ml', quantity: 6, sellPrice: 1.50, buyPrice: 0.85 }
    ],
    totalAmount: 22.00,
    responsible: 'Empleado',
    paymentMethod: 'Transferencia'
  },
  {
    id: 'sale-4',
    date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // Today 4 hours ago
    items: [
      { productId: 'prod-6', name: 'Leche Entera Cremosa 1L', quantity: 6, sellPrice: 1.20, buyPrice: 0.65 },
      { productId: 'prod-5', name: 'Chocolate Oscuro 70% Cacao 100g', quantity: 1, sellPrice: 2.10, buyPrice: 0.90 }
    ],
    totalAmount: 9.30,
    responsible: 'Empleado',
    paymentMethod: 'Efectivo'
  }
];

// Initial stock transactions
export const INITIAL_TRANSACTIONS: StockTransaction[] = [
  {
    id: 'tr-1',
    productId: 'prod-1',
    productName: 'Refresco Cola Premium 500ml',
    type: 'addition',
    quantity: 50,
    reason: 'Compra inicial a distribuidor',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    responsible: 'Propietario'
  },
  {
    id: 'tr-2',
    productId: 'prod-3',
    productName: 'Café Orgánico de Altura 500g',
    type: 'addition',
    quantity: 10,
    reason: 'Inventario inicial de tienda',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    responsible: 'Propietario'
  },
  {
    id: 'tr-3',
    productId: 'prod-6',
    productName: 'Leche Entera Cremosa 1L',
    type: 'subtraction',
    quantity: 2,
    reason: 'Reporte de merma por caducidad',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    responsible: 'Empleado'
  }
];

// Config Default settings
export const DEFAULT_CONFIG: StoreConfig = {
  storeName: 'Tienda Venpro',
  currencySymbol: '$',
  address: 'Av. Costanera #1240, Ciudad Central',
  phone: '+1 555-019-3829',
  taxRate: 16,
  ownerAccessPin: '1234' // Very easy default pin
};
