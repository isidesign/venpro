import React, { useState, useEffect } from 'react';
import RoleSelection from './components/RoleSelection';
import OwnerPortal from './components/OwnerPortal';
import EmployeePortal from './components/EmployeePortal';
import LoginScreen from './components/LoginScreen';
import { Product, Sale, StockTransaction, StoreConfig } from './types';
import { INITIAL_PRODUCTS, INITIAL_SALES, INITIAL_TRANSACTIONS, DEFAULT_CONFIG } from './data';

export default function App() {
  const [selectedRole, setSelectedRole] = useState<'owner' | 'employee' | null>(null);
  const [isOwnerAuthenticated, setIsOwnerAuthenticated] = useState(false);
  const [isEmployeeAuthenticated, setIsEmployeeAuthenticated] = useState(false);

  // Core global persistent states
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [config, setConfig] = useState<StoreConfig>(DEFAULT_CONFIG);

  // Unified State Seeding & Initialization from LocalStorage
  useEffect(() => {
    // 1. Products
    const storedProducts = localStorage.getItem('venpro_products');
    if (storedProducts) {
      try {
        setProducts(JSON.parse(storedProducts));
      } catch (e) {
        setProducts(INITIAL_PRODUCTS);
      }
    } else {
      setProducts(INITIAL_PRODUCTS);
      localStorage.setItem('venpro_products', JSON.stringify(INITIAL_PRODUCTS));
    }

    // 2. Sales
    const storedSales = localStorage.getItem('venpro_sales');
    if (storedSales) {
      try {
        setSales(JSON.parse(storedSales));
      } catch (e) {
        setSales(INITIAL_SALES);
      }
    } else {
      setSales(INITIAL_SALES);
      localStorage.setItem('venpro_sales', JSON.stringify(INITIAL_SALES));
    }

    // 3. Transactions
    const storedTransactions = localStorage.getItem('venpro_transactions');
    if (storedTransactions) {
      try {
        setTransactions(JSON.parse(storedTransactions));
      } catch (e) {
        setTransactions(INITIAL_TRANSACTIONS);
      }
    } else {
      setTransactions(INITIAL_TRANSACTIONS);
      localStorage.setItem('venpro_transactions', JSON.stringify(INITIAL_TRANSACTIONS));
    }

    // 4. Config settings
    const storedConfig = localStorage.getItem('venpro_config');
    if (storedConfig) {
      try {
        setConfig(JSON.parse(storedConfig));
      } catch (e) {
        setConfig(DEFAULT_CONFIG);
      }
    } else {
      setConfig(DEFAULT_CONFIG);
      localStorage.setItem('venpro_config', JSON.stringify(DEFAULT_CONFIG));
    }
  }, []);

  // Update handlers with synchronization logic
  const handleUpdateProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    localStorage.setItem('venpro_products', JSON.stringify(newProducts));
  };

  const handleUpdateSales = (newSales: Sale[]) => {
    setSales(newSales);
    localStorage.setItem('venpro_sales', JSON.stringify(newSales));
  };

  const handleUpdateTransactions = (newTransactions: StockTransaction[]) => {
    setTransactions(newTransactions);
    localStorage.setItem('venpro_transactions', JSON.stringify(newTransactions));
  };

  const handleUpdateConfig = (newConfig: StoreConfig) => {
    setConfig(newConfig);
    localStorage.setItem('venpro_config', JSON.stringify(newConfig));
  };

  const handleLogout = () => {
    setIsOwnerAuthenticated(false);
    setIsEmployeeAuthenticated(false);
    setSelectedRole(null);
  };

  const handleBack = () => {
    setSelectedRole(null);
  };

  const rehydrateFromStorage = () => {
    const storedProducts = localStorage.getItem('venpro_products');
    if (storedProducts) {
      try { setProducts(JSON.parse(storedProducts)); } catch (e) {}
    }
    const storedSales = localStorage.getItem('venpro_sales');
    if (storedSales) {
      try { setSales(JSON.parse(storedSales)); } catch (e) {}
    }
    const storedTransactions = localStorage.getItem('venpro_transactions');
    if (storedTransactions) {
      try { setTransactions(JSON.parse(storedTransactions)); } catch (e) {}
    }
    const storedConfig = localStorage.getItem('venpro_config');
    if (storedConfig) {
      try { setConfig(JSON.parse(storedConfig)); } catch (e) {}
    }
  };

  return (
    <div className="bg-[#f9f9ff] min-h-screen">
      {/* View routing based on select */}
      {selectedRole === null ? (
        <RoleSelection onSelectRole={(role) => {
          setSelectedRole(role);
          if (role === 'employee') {
            rehydrateFromStorage();
            setIsEmployeeAuthenticated(true);
          }
        }} />
      ) : selectedRole === 'owner' && !isOwnerAuthenticated ? (
        <LoginScreen 
          role="owner"
          onBack={() => {
            setSelectedRole(null);
            setIsOwnerAuthenticated(false);
          }} 
          onLoginSuccess={() => {
            rehydrateFromStorage();
            setIsOwnerAuthenticated(true);
          }} 
        />
      ) : selectedRole === 'owner' ? (
        <OwnerPortal
          products={products}
          sales={sales}
          transactions={transactions}
          config={config}
          onUpdateProducts={handleUpdateProducts}
          onUpdateSales={handleUpdateSales}
          onUpdateTransactions={handleUpdateTransactions}
          onUpdateConfig={handleUpdateConfig}
          onBack={handleBack}
        />
      ) : selectedRole === 'employee' && !isEmployeeAuthenticated ? (
        <LoginScreen 
          role="employee"
          onBack={() => {
            setSelectedRole(null);
            setIsEmployeeAuthenticated(false);
          }} 
          onLoginSuccess={() => {
            rehydrateFromStorage();
            setIsEmployeeAuthenticated(true);
          }} 
        />
      ) : (
        <EmployeePortal
          products={products}
          sales={sales}
          transactions={transactions}
          config={config}
          onUpdateProducts={handleUpdateProducts}
          onUpdateSales={handleUpdateSales}
          onUpdateTransactions={handleUpdateTransactions}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
