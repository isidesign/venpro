import { useState } from 'react';
import RoleSelection from '@/components/auth/RoleSelection';
import OwnerPortal from '@/components/owner/OwnerPortal';
import EmployeePortal from '@/components/employee/EmployeePortal';
import LoginScreen from '@/components/auth/LoginScreen';
import { useVenproStorage } from '@/hooks/useVenproStorage';

export default function App() {
  const [selectedRole, setSelectedRole] = useState<'owner' | 'employee' | null>(null);
  const [isOwnerAuthenticated, setIsOwnerAuthenticated] = useState(false);
  const [isEmployeeAuthenticated, setIsEmployeeAuthenticated] = useState(false);

  const {
    products,
    sales,
    transactions,
    config,
    handleUpdateProducts,
    handleUpdateSales,
    handleUpdateTransactions,
    handleUpdateConfig,
    rehydrateFromStorage,
  } = useVenproStorage();

  const handleLogout = () => {
    setIsOwnerAuthenticated(false);
    setIsEmployeeAuthenticated(false);
    setSelectedRole(null);
  };

  const handleBack = () => {
    setSelectedRole(null);
  };

  return (
    <div className="bg-[#f9f9ff] min-h-screen">
      {selectedRole === null ? (
        <RoleSelection
          onSelectRole={(role) => {
            setSelectedRole(role);
            if (role === 'employee') {
              rehydrateFromStorage();
              setIsEmployeeAuthenticated(true);
            }
          }}
        />
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
