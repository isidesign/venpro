import type { Product, Sale, StockTransaction, IndustryType } from '@/types';
import { INITIAL_PRODUCTS, INITIAL_SALES, INITIAL_TRANSACTIONS } from '@/data/seed';

export interface IndustrySeedData {
  products: Product[];
  sales: Sale[];
  transactions: StockTransaction[];
}

const RESTAURANT_GOURMET_PRODUCTS: Product[] = [
  {
    id: 'rest-gourmet-1',
    code: '1001001',
    name: 'Carne de Res',
    category: 'Carne',
    buyPrice: 3.5,
    sellPrice: 8.99,
    quantity: 2.5,
    minStock: 15,
    location: 'Cámara Fría A',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMCpg5HM-5dVQVev9eTvhD0KTnX9u_v993yhCGjLMdctdcQMocvyHI1POElLDcTD5vmtHSLjjyaRQxk9rGk8z9O4E8kA5xKWA-4hnJJszW_RYrr2dFa0FaMPz_cW8_TbGFzXNq04EeT9BLRzAzRDoqslV9ontQr52rF3-kjYj9yjuQyImHX5qlZWm7AQ9ALfkncb5QYAvKup8VI2FOpAQRFlya0DQLAUpb4MQC0n7EqD4w4FXRGsULEJlcf_yXSuqPzgtvkFDLLEmO',
  },
  {
    id: 'rest-gourmet-2',
    code: '1001002',
    name: 'Pan Brioche',
    category: 'Panadería',
    buyPrice: 1.2,
    sellPrice: 3.5,
    quantity: 15,
    minStock: 50,
    location: 'Cocina - Estación de Pan',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWly33-2gCelcUtumhdP7xDc8w8WV7FqhxREPzP_-t3S5DEbO6VC0W9IStdirgx2xSo7eNyJhNcNGnTZP60Baz2y_beMrH48sHF66xP_zdtnjezp_KZeR6N8xysdFct3YFaqY_GUTnW8ZearjC-1CSRKzzh2NoxKTUzZipkXFoltCFl2v51HDCyKgwAMy1pV8t_Yf2Vyg4d2WWeyf8kebiAaIcpTVuDkoxNFr3TRzEGaIdXcxeLjdhj_B03x-USg8L0DBiRLiSOcsc',
  },
  {
    id: 'rest-gourmet-3',
    code: '1001003',
    name: 'Papa Russet',
    category: 'Vegetales',
    buyPrice: 0.8,
    sellPrice: 2.2,
    quantity: 84,
    minStock: 20,
    location: 'Almacén de Verduras',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUxpBjhyugH1insprfBd0H7FjE0SIpCzGhdQEuoHdR3RhkSCwdr9-2_g6m_hveZKEghUnP4FSE74E5PFxpv6WzXHG_boCYqaaNph0Z0uGx0WYMsoYC-PKxCxsyksYMnLWsOpPIut892JwtCtQ_uUJthZliuGeoqnQNRTVJ313NLfwHKfdmzhvISXT3tZ9fF__ak6xydgnSPM6Cjv10drhksI9DPWP1sQKRsK9kQFXw8jOFkzR5hm_3SrCk1zzfZVj-D0XFzARs9PHs',
  },
  {
    id: 'rest-gourmet-4',
    code: '1001004',
    name: 'Hamburguesa Clásica',
    category: 'Platillos',
    buyPrice: 4.7,
    sellPrice: 9.99,
    quantity: 12,
    minStock: 30,
    location: 'Cocina - Línea caliente',
    isCompound: true,
    recipe: [
      { productId: 'rest-gourmet-1', name: 'Carne de Res', quantity: 0.2, unit: 'kg', buyPrice: 3.5 },
      { productId: 'rest-gourmet-2', name: 'Pan Brioche', quantity: 1, unit: 'u', buyPrice: 1.2 },
      { productId: 'rest-gourmet-5', name: 'Tomate Saladet', quantity: 0.05, unit: 'kg', buyPrice: 1.1 },
    ],
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCmGR9cJjDs6fXtuH8nZy2ecuYC7bfFODJXRQB9VB8ADjGDpIhwajE2QweA_muC6irgYVXQ3UYSaevGrQzAp04OIO88dtFNU13reBKBpyx0ZuJbaIS3O4dEyGq6v1Y7_bxb5n83KWnHRzAhDb93Ln-I2kvppSlkT3WDMQe3wra45_xgNz3OBO42xGjYjmA2PcU-79cR2QwIutUhhMFFEw4eg-RBeuhb8Od9JrEdDctSdsnRmSlBnYLRdigrRPNSnY0raZfzkcYabcix',
  },
  {
    id: 'rest-gourmet-5',
    code: '1001005',
    name: 'Tomate Saladet',
    category: 'Vegetales',
    buyPrice: 1.1,
    sellPrice: 2.8,
    quantity: 8.2,
    minStock: 5,
    location: 'Almacén de Verduras',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC2fxPQYU8hWOOGdBxIDeJL5rlGV-WeNfNz_iIOG6hP7MiyEXqlYm8wnEDJjbbL-Ii6U0OjIpBfgLoi5dUrUGFicOGVwJ3KO0R8eZlyv8lXMLc0nk-q2t9u_Q9ogCL98uTjk7Bm7leo2-1TEHXFaobBWD6tMC33R6pMxvXi3gQTJqv85ql-bBDPnCURS5OPMLfwsUOqnMsEPJL_95hZqFcVuZQpGbUxHbkGdK9fqKbM_rYqsxeVh34A6uXfnkfXiecjXm6m8ulVSWT9',
  },
];

const RESTAURANT_GOURMET_SALES: Sale[] = [
  {
    id: 'rest-sale-gourmet-1',
    date: new Date().toISOString(),
    items: [
      { productId: 'rest-gourmet-4', name: 'Hamburguesa Clásica', quantity: 3, sellPrice: 9.99, buyPrice: 4.7 },
      { productId: 'rest-gourmet-2', name: 'Pan Brioche', quantity: 3, sellPrice: 3.5, buyPrice: 1.2 },
    ],
    totalAmount: 40.47,
    responsible: 'Propietario',
    paymentMethod: 'Tarjeta',
  },
];

const RESTAURANT_GOURMET_TRANSACTIONS: StockTransaction[] = [
  {
    id: 'rest-tr-gourmet-1',
    productId: 'rest-gourmet-1',
    productName: 'Carne de Res',
    type: 'addition',
    quantity: 2.5,
    reason: 'Inventario inicial de apertura',
    date: new Date().toISOString(),
    responsible: 'Propietario',
  },
  {
    id: 'rest-tr-gourmet-2',
    productId: 'rest-gourmet-4',
    productName: 'Hamburguesa Clásica',
    type: 'addition',
    quantity: 12,
    reason: 'Preparación de platillos compuestos',
    date: new Date().toISOString(),
    responsible: 'Propietario',
  },
];

export function getIndustrySeedData(industry: IndustryType): IndustrySeedData {
  if (industry === 'restaurante') {
    return {
      products: RESTAURANT_GOURMET_PRODUCTS,
      sales: RESTAURANT_GOURMET_SALES,
      transactions: RESTAURANT_GOURMET_TRANSACTIONS,
    };
  }

  return {
    products: INITIAL_PRODUCTS,
    sales: INITIAL_SALES,
    transactions: INITIAL_TRANSACTIONS,
  };
}
