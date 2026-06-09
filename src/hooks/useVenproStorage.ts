import { useState, useEffect } from 'react';
import { Product, Sale, StockTransaction, StoreConfig } from '@/types';
import {
  INITIAL_PRODUCTS,
  INITIAL_SALES,
  INITIAL_TRANSACTIONS,
  DEFAULT_CONFIG,
} from '@/data/seed';
import { STORAGE_KEYS } from '@/constants/storage';

function readFromStorage<T>(key: string, fallback: T): T {
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }

  try {
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

export function useVenproStorage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [config, setConfig] = useState<StoreConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    setProducts(readFromStorage(STORAGE_KEYS.products, INITIAL_PRODUCTS));
    setSales(readFromStorage(STORAGE_KEYS.sales, INITIAL_SALES));
    setTransactions(readFromStorage(STORAGE_KEYS.transactions, INITIAL_TRANSACTIONS));
    setConfig(readFromStorage(STORAGE_KEYS.config, DEFAULT_CONFIG));
  }, []);

  const handleUpdateProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(newProducts));
  };

  const handleUpdateSales = (newSales: Sale[]) => {
    setSales(newSales);
    localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(newSales));
  };

  const handleUpdateTransactions = (newTransactions: StockTransaction[]) => {
    setTransactions(newTransactions);
    localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(newTransactions));
  };

  const handleUpdateConfig = (newConfig: StoreConfig) => {
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(newConfig));
  };

  const rehydrateFromStorage = () => {
    const storedProducts = localStorage.getItem(STORAGE_KEYS.products);
    if (storedProducts) {
      try {
        setProducts(JSON.parse(storedProducts));
      } catch {
        /* keep current state */
      }
    }

    const storedSales = localStorage.getItem(STORAGE_KEYS.sales);
    if (storedSales) {
      try {
        setSales(JSON.parse(storedSales));
      } catch {
        /* keep current state */
      }
    }

    const storedTransactions = localStorage.getItem(STORAGE_KEYS.transactions);
    if (storedTransactions) {
      try {
        setTransactions(JSON.parse(storedTransactions));
      } catch {
        /* keep current state */
      }
    }

    const storedConfig = localStorage.getItem(STORAGE_KEYS.config);
    if (storedConfig) {
      try {
        setConfig(JSON.parse(storedConfig));
      } catch {
        /* keep current state */
      }
    }
  };

  return {
    products,
    sales,
    transactions,
    config,
    handleUpdateProducts,
    handleUpdateSales,
    handleUpdateTransactions,
    handleUpdateConfig,
    rehydrateFromStorage,
  };
}
