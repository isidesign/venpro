import { useState, useEffect, useCallback } from 'react';
import { Product, Sale, StockTransaction, StoreConfig, IndustryType } from '@/types';
import {
  INITIAL_PRODUCTS,
  INITIAL_SALES,
  INITIAL_TRANSACTIONS,
  DEFAULT_CONFIG,
} from '@/data/seed';
import { STORAGE_KEYS } from '@/constants/storage';
import { useVenproAuth } from '@/contexts/VenproAuthContext';
import { loadOrganizationData } from '@/services/organizationService';
import {
  syncProducts,
  syncSales,
  syncTransactions,
  syncConfig,
} from '@/services/inventoryService';
import { parseIndustry } from '@/lib/industry';

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

function writeLocalData(data: {
  products: Product[];
  sales: Sale[];
  transactions: StockTransaction[];
  config: StoreConfig;
  industry: IndustryType;
}) {
  localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(data.products));
  localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(data.sales));
  localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(data.transactions));
  localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(data.config));
  localStorage.setItem(STORAGE_KEYS.industry, data.industry);
}

export function useVenproStorage() {
  const { organizationId, isSupabaseEnabled } = useVenproAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [config, setConfig] = useState<StoreConfig>(DEFAULT_CONFIG);
  const [industry, setIndustry] = useState<IndustryType>('tienda');

  const loadFromLocal = useCallback(() => {
    setProducts(readFromStorage(STORAGE_KEYS.products, INITIAL_PRODUCTS));
    setSales(readFromStorage(STORAGE_KEYS.sales, INITIAL_SALES));
    setTransactions(readFromStorage(STORAGE_KEYS.transactions, INITIAL_TRANSACTIONS));
    setConfig(readFromStorage(STORAGE_KEYS.config, DEFAULT_CONFIG));
    setIndustry(parseIndustry(localStorage.getItem(STORAGE_KEYS.industry)));
  }, []);

  const loadFromSupabase = useCallback(async (orgId: string) => {
    const data = await loadOrganizationData(orgId);
    if (!data) {
      loadFromLocal();
      return;
    }

    setProducts(data.products);
    setSales(data.sales);
    setTransactions(data.transactions);
    setConfig(data.config);
    setIndustry(data.industry);
    localStorage.setItem('venpro_invite_code', data.inviteCode);
    writeLocalData(data);
  }, [loadFromLocal]);

  useEffect(() => {
    if (isSupabaseEnabled) {
      if (organizationId) {
        loadFromSupabase(organizationId).catch(() => loadFromLocal());
      }
      return;
    }
    loadFromLocal();
  }, [organizationId, isSupabaseEnabled, loadFromSupabase, loadFromLocal]);

  const persistProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(newProducts));
    if (organizationId) {
      syncProducts(organizationId, newProducts).catch(console.error);
    }
  };

  const persistSales = (newSales: Sale[]) => {
    setSales(newSales);
    localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(newSales));
    if (organizationId) {
      syncSales(organizationId, newSales).catch(console.error);
    }
  };

  const persistTransactions = (newTransactions: StockTransaction[]) => {
    setTransactions(newTransactions);
    localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(newTransactions));
    if (organizationId) {
      syncTransactions(organizationId, newTransactions).catch(console.error);
    }
  };

  const persistConfig = (newConfig: StoreConfig) => {
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(newConfig));
    if (organizationId) {
      syncConfig(organizationId, newConfig).catch(console.error);
    }
  };

  const applyOrganizationData = (data: {
    products: Product[];
    sales: Sale[];
    transactions: StockTransaction[];
    config: StoreConfig;
    industry?: IndustryType;
    inviteCode?: string;
  }) => {
    const resolvedIndustry = data.industry ?? parseIndustry(localStorage.getItem(STORAGE_KEYS.industry));
    setProducts(data.products);
    setSales(data.sales);
    setTransactions(data.transactions);
    setConfig(data.config);
    setIndustry(resolvedIndustry);
    if (data.inviteCode) {
      localStorage.setItem('venpro_invite_code', data.inviteCode);
    }
    writeLocalData({
      products: data.products,
      sales: data.sales,
      transactions: data.transactions,
      config: data.config,
      industry: resolvedIndustry,
    });
  };

  const rehydrateFromStorage = () => {
    if (organizationId && isSupabaseEnabled) {
      loadFromSupabase(organizationId).catch(() => loadFromLocal());
      return;
    }
    loadFromLocal();
  };

  return {
    products,
    sales,
    transactions,
    config,
    industry,
    handleUpdateProducts: persistProducts,
    handleUpdateSales: persistSales,
    handleUpdateTransactions: persistTransactions,
    handleUpdateConfig: persistConfig,
    applyOrganizationData,
    rehydrateFromStorage,
  };
}
