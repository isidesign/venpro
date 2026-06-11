import { useEffect, useState } from 'react';
import RoleSelection from '@/components/auth/RoleSelection';
import OwnerPortal from '@/components/owner/OwnerPortal';
import EmployeePortal from '@/components/employee/EmployeePortal';
import LoginScreen from '@/components/auth/LoginScreen';
import { VenproAuthProvider, useVenproAuth } from '@/contexts/VenproAuthContext';
import { useVenproStorage } from '@/hooks/useVenproStorage';
import { useMobileKeyboardInset } from '@/hooks/useMobileKeyboardInset';
import { clearVenproLocalData } from '@/constants/storage';

function AppContent() {
  useMobileKeyboardInset();
  const [selectedRole, setSelectedRole] = useState<'owner' | 'employee' | null>(null);
  const [isOwnerAuthenticated, setIsOwnerAuthenticated] = useState(false);
  const [isEmployeeAuthenticated, setIsEmployeeAuthenticated] = useState(false);
  const { signOut, session, profile, isLoading, isSupabaseEnabled } = useVenproAuth();

  const {
    products,
    sales,
    transactions,
    config,
    industry,
    handleUpdateProducts,
    handleUpdateSales,
    handleUpdateTransactions,
    handleUpdateConfig,
    rehydrateFromStorage,
    applyOrganizationData,
  } = useVenproStorage();

  useEffect(() => {
    if (isLoading || !isSupabaseEnabled || !session || !profile) return;

    // No auto-autenticar mientras el usuario está en el flujo de login/registro
    if (selectedRole === 'owner' && !isOwnerAuthenticated) return;
    if (selectedRole === 'employee' && !isEmployeeAuthenticated) return;

    if (profile.role === 'owner') {
      setSelectedRole('owner');
      setIsOwnerAuthenticated(true);
      setIsEmployeeAuthenticated(false);
    } else if (profile.role === 'employee') {
      setSelectedRole('employee');
      setIsEmployeeAuthenticated(true);
      setIsOwnerAuthenticated(false);
    }
  }, [isLoading, isSupabaseEnabled, session, profile, selectedRole, isOwnerAuthenticated, isEmployeeAuthenticated]);

  const handleLogout = async () => {
    clearVenproLocalData();
    await signOut();
    setIsOwnerAuthenticated(false);
    setIsEmployeeAuthenticated(false);
    setSelectedRole(null);
  };

  const handleBack = () => {
    setSelectedRole(null);
  };

  if (isLoading && isSupabaseEnabled) {
    return (
      <div className="bg-[#f9f9ff] dark:bg-[#0b1220] min-h-screen flex items-center justify-center text-[#002A5C] dark:text-[#67e8f9] font-bold">
        Cargando sesión...
      </div>
    );
  }

  return (
    <div className="bg-[#f9f9ff] dark:bg-[#0b1220] min-h-screen">
      {selectedRole === null ? (
        <RoleSelection onSelectRole={setSelectedRole} />
      ) : selectedRole === 'owner' && !isOwnerAuthenticated ? (
        <LoginScreen
          role="owner"
          onBack={() => {
            setSelectedRole(null);
            setIsOwnerAuthenticated(false);
          }}
          onLoginSuccess={(options) => {
            if (!options?.skipRehydrate) {
              rehydrateFromStorage();
            }
            setIsOwnerAuthenticated(true);
          }}
          onOrganizationBootstrap={applyOrganizationData}
        />
      ) : selectedRole === 'owner' ? (
        <OwnerPortal
          products={products}
          sales={sales}
          transactions={transactions}
          config={config}
          industry={industry}
          onUpdateProducts={handleUpdateProducts}
          onUpdateSales={handleUpdateSales}
          onUpdateTransactions={handleUpdateTransactions}
          onUpdateConfig={handleUpdateConfig}
          onBack={handleBack}
          onLogout={handleLogout}
        />
      ) : selectedRole === 'employee' && !isEmployeeAuthenticated ? (
        <LoginScreen
          role="employee"
          onBack={() => {
            setSelectedRole(null);
            setIsEmployeeAuthenticated(false);
          }}
          onLoginSuccess={(options) => {
            if (!options?.skipRehydrate) {
              rehydrateFromStorage();
            }
            setIsEmployeeAuthenticated(true);
          }}
          onOrganizationBootstrap={applyOrganizationData}
        />
      ) : (
        <EmployeePortal
          products={products}
          sales={sales}
          transactions={transactions}
          config={config}
          industry={industry}
          onUpdateProducts={handleUpdateProducts}
          onUpdateSales={handleUpdateSales}
          onUpdateTransactions={handleUpdateTransactions}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <VenproAuthProvider>
      <AppContent />
    </VenproAuthProvider>
  );
}
