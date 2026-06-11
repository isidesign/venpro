import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, ArrowLeft, Building2, User, Users, Network, Mail, Lock, BarChart3, ShieldCheck, Utensils, Shirt, CheckCircle2, Coins, Check, Delete, UserPlus, Wifi, History, Share2, Download, Plus, X, Info, Briefcase, ChevronDown, MessageSquare, Smartphone, Settings, LayoutDashboard, Phone } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useVenproAuth } from '@/contexts/VenproAuthContext';
import {
  signIn,
  ensureOwnerAccountAfterVerification,
  signUpEmployee,
  AuthError,
  isSupabaseConfigured,
  fetchUserProfile,
} from '@/services/authService';
import {
  createOrganizationWithDatabase,
  fetchOrganizationBootstrapByInviteCode,
  loadOrganizationData,
  validateInviteCode,
  type OrganizationData,
} from '@/services/organizationService';
import { parseInviteCodeFromQr, ensureLocalInviteCode } from '@/lib/inviteQr';
import {
  sendVerificationCode,
  verifyVerificationCode,
  clearVerificationState,
  maskEmail,
  maskPhone,
  VerificationError,
} from '@/services/verificationService';
import { getIndustrySeedData } from '@/data/industrySeeds';
import { getIndustryDefaultConfig, getIndustryDefaultStoreName } from '@/lib/industry';
import type { IndustryType, Product, Sale, StockTransaction, StoreConfig } from '@/types';
import { STORAGE_KEYS, clearVenproLocalData } from '@/constants/storage';
import VenproWordmark from '@/components/brand/VenproWordmark';
import ThemeToggle from '@/components/theme/ThemeToggle';
import {
  COUNTRY_PHONE_CODES,
  formatRegistrationPhone,
  isValidRegistrationPhone,
} from '@/lib/phone';

function isValidRegistrationPassword(password: string): boolean {
  return password.length >= 8 && /\d/.test(password);
}

interface LoginScreenProps {
  role?: 'owner' | 'employee';
  onBack: () => void;
  onLoginSuccess: (options?: { skipRehydrate?: boolean }) => void;
  onOrganizationBootstrap?: (data: {
    products: Product[];
    sales: Sale[];
    transactions: StockTransaction[];
    config: StoreConfig;
    industry: IndustryType;
    inviteCode?: string;
  }) => void;
}

export default function LoginScreen({
  role = 'owner',
  onBack,
  onLoginSuccess,
  onOrganizationBootstrap,
}: LoginScreenProps) {
  const { refreshProfile } = useVenproAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(role === 'employee');
  const [email, setEmail] = useState('ejemplo@venpro.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [showEmployeeQRScanner, setShowEmployeeQRScanner] = useState(false);
  
  // Registration spec
  const [regName, setRegName] = useState('');
  const [regBusiness, setRegBusiness] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regPhoneCountryCode, setRegPhoneCountryCode] = useState('+52');
  const [regPhoneNumber, setRegPhoneNumber] = useState('');
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [regRole, setRegRole] = useState<'owner' | 'employee'>('owner');
  const [regCargo, setRegCargo] = useState('');
  const [pendingEmployeeRegistration, setPendingEmployeeRegistration] = useState<{
    name: string;
    email: string;
    password: string;
    cargo: string;
  } | null>(null);
  const employeeScanProcessingRef = useRef(false);
  const employeeScannedRef = useRef(false);

  const pendingEmployeeRegistrationRef = useRef(pendingEmployeeRegistration);
  pendingEmployeeRegistrationRef.current = pendingEmployeeRegistration;

  const completeEmployeeRegistration = async (inviteCode: string, organizationId: string) => {
    const pending = pendingEmployeeRegistrationRef.current;
    if (!pending) {
      throw new AuthError('No hay datos de registro pendientes. Vuelve atrás e intenta de nuevo.');
    }

    let orgData: OrganizationData | null = null;
    try {
      orgData = await fetchOrganizationBootstrapByInviteCode(inviteCode, organizationId);
    } catch (err) {
      if (!isSupabaseConfigured) {
        throw err instanceof AuthError
          ? err
          : new AuthError('No se pudo cargar el inventario del negocio.');
      }
    }

    if (isSupabaseConfigured) {
      const { user } = await signUpEmployee({
        email: pending.email,
        password: pending.password,
        fullName: pending.name,
        cargo: pending.cargo,
        inviteCode,
      });

      if (!user) {
        throw new AuthError('No se pudo crear la cuenta de empleado.');
      }

      await refreshProfile();

      if (!orgData && organizationId !== 'local') {
        orgData = await loadOrganizationData(organizationId);
      }
    } else {
      if (!orgData) {
        throw new AuthError(
          'No se pudo cargar el inventario del negocio en este dispositivo. Usa el mismo navegador que el propietario o configura Supabase en .env.local.',
        );
      }

      localStorage.setItem('venpro_invite_code', inviteCode.toLowerCase());

      const currentEmployees = JSON.parse(localStorage.getItem('venpro_employees') || '[]');
      currentEmployees.push({
        name: pending.name,
        email: pending.email,
        password: pending.password,
        cargo: pending.cargo,
      });
      localStorage.setItem('venpro_employees', JSON.stringify(currentEmployees));
    }

    if (!orgData) {
      throw new AuthError(
        'No se pudo cargar el inventario del negocio. Verifica que el QR sea el actual y que Supabase tenga las migraciones aplicadas.',
      );
    }

    onOrganizationBootstrap?.({
      products: orgData.products,
      sales: orgData.sales,
      transactions: orgData.transactions,
      config: orgData.config,
      industry: orgData.industry,
      inviteCode: orgData.inviteCode,
    });

    setPendingEmployeeRegistration(null);
    onLoginSuccess({ skipRehydrate: true });
  };

  const handleEmployeeQrScanned = async (decodedText: string) => {
    if (employeeScanProcessingRef.current || employeeScannedRef.current) return;

    const inviteCode = parseInviteCodeFromQr(decodedText);
    if (!inviteCode) {
      setEmployeeScannerError('Código QR no reconocido. Escanea el QR del panel del propietario.');
      return;
    }

    employeeScanProcessingRef.current = true;
    setEmployeeScannerError('');

    try {
      const organizationId = await validateInviteCode(inviteCode);
      if (!organizationId) {
        employeeScanProcessingRef.current = false;
        setEmployeeScannerError(
          isSupabaseConfigured
            ? 'Este QR no pertenece a un negocio Venpro activo. Pide al propietario que lo genere de nuevo en Enlace QR.'
            : 'No se pudo validar el código QR. Escanea el QR actual del panel del propietario.',
        );
        return;
      }

      setIsScanned(true);
      employeeScannedRef.current = true;
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }

      setTimeout(async () => {
        try {
          await completeEmployeeRegistration(inviteCode, organizationId);
        } catch (err) {
          setIsScanned(false);
          employeeScannedRef.current = false;
          setEmployeeScannerError(
            err instanceof AuthError
              ? err.message
              : 'No se pudo vincular tu cuenta con el negocio. Intenta de nuevo.',
          );
        } finally {
          employeeScanProcessingRef.current = false;
        }
      }, 1500);
    } catch (err) {
      employeeScanProcessingRef.current = false;
      setEmployeeScannerError(
        err instanceof AuthError
          ? err.message
          : 'No se pudo validar el código QR. Intenta de nuevo.',
      );
    }
  };
  
  // Multi-step Configuration Wizard State
  const [currentStep, setCurrentStep] = useState(0); // 0 = registro, 1 = industria, 2 = estructura, 3 = equipo/sucursales, 4 = verificación, 5 = facturación, 6 = PIN
  const [selectedIndustry, setSelectedIndustry] = useState<'restaurante' | 'tienda' | null>(null);
  const [businessStructure, setBusinessStructure] = useState<'autonomo' | 'mediana' | 'sucursales'>('mediana');
  const [showInvitarQR, setShowInvitarQR] = useState(false);
  const [configCurrency, setConfigCurrency] = useState('$');
  const [configTax, setConfigTax] = useState(16);
  const [configPin, setConfigPin] = useState('');

  const [sucursalesManagers, setSucursalesManagers] = useState<Array<{name: string, email: string, branch: string}>>([
    { name: 'Sofía Mendoza', email: 'sofia.m@venpro.com', branch: 'Sucursal Norte' },
    { name: 'Carlos Ortega', email: 'carlos.o@venpro.com', branch: 'Sucursal Centro' }
  ]);
  const [showAddManagerModal, setShowAddManagerModal] = useState(false);
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerEmail, setNewManagerEmail] = useState('');
  const [newManagerBranch, setNewManagerBranch] = useState('Sucursal Sur');

  const openTeamOnboardingTab = () => {
    try {
      window.open('/preview-onboarding.html', '_blank');
    } catch (e) {
      console.warn('Tab open requested but kept inline due to environment setup:', e);
    }
  };

  // Identity Verification States
  const [authMethod, setAuthMethod] = useState<'sms' | 'email'>('sms');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [verificationSent, setVerificationSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [demoVerificationCode, setDemoVerificationCode] = useState<string | null>(null);

  const resetVerificationFlow = () => {
    setVerificationSent(false);
    setVerificationMessage('');
    setVerificationError('');
    setDemoVerificationCode(null);
    setOtp(['', '', '', '', '', '']);
    clearVerificationState();
  };

  const handleAuthMethodChange = (method: 'sms' | 'email') => {
    if (method !== authMethod) {
      setAuthMethod(method);
      resetVerificationFlow();
    }
  };

  const handleSendVerificationCode = async () => {
    setVerificationError('');
    setVerificationMessage('');
    setDemoVerificationCode(null);
    setIsSendingCode(true);

    try {
      const result = await sendVerificationCode({
        method: authMethod,
        email: regEmail,
        phoneCountryCode: regPhoneCountryCode,
        phoneNumber: regPhoneNumber,
      });

      setVerificationSent(true);
      setOtp(['', '', '', '', '', '']);

      const destinationLabel =
        authMethod === 'email'
          ? maskEmail(regEmail)
          : maskPhone(regPhoneNumber);

      if (result.usedSupabase) {
        setVerificationMessage(
          `Código enviado a ${destinationLabel}. Revisa tu ${authMethod === 'email' ? 'correo' : 'teléfono'}.`,
        );
      } else {
        setVerificationMessage(`Código generado para ${destinationLabel}.`);
        if (result.demoCode) {
          setDemoVerificationCode(result.demoCode);
        }
      }
    } catch (err) {
      setVerificationError(
        err instanceof VerificationError
          ? err.message
          : 'No se pudo enviar el código. Intenta de nuevo.',
      );
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyAndFinish = async () => {
    const filledCode = otp.join('');
    if (filledCode.length < 6) {
      setVerificationError('Por favor ingresa el código de 6 dígitos que has recibido.');
      return;
    }

    if (!verificationSent) {
      setVerificationError('Primero envía el código de verificación.');
      return;
    }

    setVerificationError('');
    setIsVerifyingCode(true);

    try {
      await verifyVerificationCode({
        method: authMethod,
        email: regEmail,
        phoneCountryCode: regPhoneCountryCode,
        phoneNumber: regPhoneNumber,
        code: filledCode,
      });
      await handleFinishConfiguration();
    } catch (err) {
      setVerificationError(
        err instanceof VerificationError
          ? err.message
          : 'No se pudo verificar el código. Intenta de nuevo.',
      );
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length === 0) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }
    
    const newOtp = [...otp];
    newOtp[index] = cleaned[cleaned.length - 1];
    setOtp(newOtp);

    // Focus next
    if (index < 5 && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        if (otpRefs.current[index - 1]) {
          otpRefs.current[index - 1]?.focus();
        }
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  // Camera scanner states for real action camera feed
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [isScanned, setIsScanned] = useState(false);
  const [useVirtualScan, setUseVirtualScan] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // States for real employee QR scanner using html5-qrcode
  const [employeeScannerError, setEmployeeScannerError] = useState<string | null>(null);
  const [isEmployeeCameraActive, setIsEmployeeCameraActive] = useState(false);
  const employeeQrScannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let scanTimer: NodeJS.Timeout;

    if (currentStep === 3 && showInvitarQR && !useVirtualScan) {
      setIsCameraLoading(true);
      setCameraError(null);
      setIsScanned(false);

      navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // prefer back camera
          width: { ideal: 640 },
          height: { ideal: 640 }
        }
      })
      .then((stream) => {
        activeStream = stream;
        setCameraStream(stream);
        setIsCameraLoading(false);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.log('Camera video play caught:', e));
        }

        // Auto-complete QR scan after 4 seconds of showing standard active camera feed
        scanTimer = setTimeout(() => {
          setIsScanned(true);
        }, 4000);
      })
      .catch((err) => {
        console.warn('Real camera stream not available or blocked:', err);
        setIsCameraLoading(false);
        // Set safe fallback message for iframe sandbox or headless clients
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'El acceso a la cámara fue bloqueado. Por favor, concede los permisos de cámara en tu navegador.'
            : 'No se detectó una cámara física activa. Te sugerimos activar la simulación interactiva.'
        );
      });
    } else if (currentStep === 3 && showInvitarQR && useVirtualScan) {
      // Simulate real QR code camera scanning visually
      setIsScanned(false);
      setIsCameraLoading(false);
      setCameraError(null);
      scanTimer = setTimeout(() => {
        setIsScanned(true);
      }, 3500);
    } else {
      setIsScanned(false);
      setCameraError(null);
      setIsCameraLoading(false);
    }

    return () => {
      clearTimeout(scanTimer);
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      setCameraStream(null);
    };
  }, [currentStep, showInvitarQR, useVirtualScan]);

  // Real-time camera QR scanner effect for Employees
  useEffect(() => {
    let activeScanner: Html5Qrcode | null = null;
    let fallbackTimeout: NodeJS.Timeout;

    if (showEmployeeQRScanner) {
      setIsScanned(false);
      employeeScannedRef.current = false;
      setIsEmployeeCameraActive(false);
      setEmployeeScannerError(null);
      employeeScanProcessingRef.current = false;

      // Give DOM time to mount the element #employee-qr-reader
      fallbackTimeout = setTimeout(() => {
        const scannerContainer = document.getElementById('employee-qr-reader');
        if (scannerContainer) {
          try {
            const qrScanner = new Html5Qrcode('employee-qr-reader');
            activeScanner = qrScanner;
            employeeQrScannerRef.current = qrScanner;

            qrScanner.start(
              { facingMode: 'environment' },
              {
                fps: 15,
                qrbox: (width, height) => {
                  const size = Math.min(width, height) * 0.75;
                  return { width: size, height: size };
                }
              },
              (decodedText) => {
                void handleEmployeeQrScanned(decodedText);
              },
              () => {
                // Silently parse next frame
              }
            ).then(() => {
              setIsEmployeeCameraActive(true);
              setEmployeeScannerError(null);
            }).catch((err) => {
              console.warn('Real camera not started:', err);
              setEmployeeScannerError(
                err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
                  ? 'Permiso de cámara bloqueado. Concede acceso a la cámara para escanear el QR del propietario.'
                  : 'No se pudo iniciar la cámara. Concede permisos e intenta de nuevo.',
              );
              setIsEmployeeCameraActive(false);
            });
          } catch (e) {
            console.error('Error creating Html5Qrcode instance:', e);
            setEmployeeScannerError('Ocurrió un error al configurar la cámara. Recarga la página e intenta de nuevo.');
            setIsEmployeeCameraActive(false);
          }
        }
      }, 400);
    }

    return () => {
      clearTimeout(fallbackTimeout);
      if (activeScanner) {
        if (activeScanner.isScanning) {
          activeScanner.stop()
            .then(() => console.log('Scanner stopped successfully.'))
            .catch(err => console.error('Failed to stop scanner:', err));
        }
      }
      employeeQrScannerRef.current = null;
    };
  }, [showEmployeeQRScanner]);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, ingresa tu correo electrónico.');
      return;
    }
    if (!password) {
      setError('Por favor, ingresa tu contraseña.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      if (isSupabaseConfigured) {
        const { user } = await signIn(email, password);
        if (!user) {
          setError('No se pudo iniciar sesión.');
          return;
        }

        const profile = await fetchUserProfile(user.id);
        if (!profile) {
          setError('Perfil de usuario no encontrado. Completa el registro primero.');
          return;
        }

        if (profile.role !== role) {
          setError(
            role === 'owner'
              ? 'Esta cuenta no es de propietario. Usa el portal de empleado.'
              : 'Esta cuenta no es de empleado. Usa el portal de propietario.',
          );
          return;
        }

        if (role === 'owner') {
          if (profile.fullName) {
            localStorage.setItem(STORAGE_KEYS.ownerProfileName, profile.fullName);
          }
          if (profile.email) {
            localStorage.setItem(STORAGE_KEYS.ownerProfileEmail, profile.email);
          }
        }

        await refreshProfile();

        if (role === 'employee' && profile.organizationId) {
          const orgData = await loadOrganizationData(profile.organizationId);
          if (orgData) {
            onOrganizationBootstrap?.({
              products: orgData.products,
              sales: orgData.sales,
              transactions: orgData.transactions,
              config: orgData.config,
              industry: orgData.industry,
              inviteCode: orgData.inviteCode,
            });
            onLoginSuccess({ skipRehydrate: true });
            return;
          }
        }
      } else if (role === 'employee') {
        const storedEmployees = JSON.parse(localStorage.getItem('venpro_employees') || '[]');
        const matched = storedEmployees.find((emp: { email: string; password: string }) => emp.email === email && emp.password === password);

        const isDefault =
          (email === 'ejemplo@venpro.com' && password === 'password123') ||
          email === 'empleado@venpro.com' ||
          email === 'password123';

        if (!matched && !isDefault) {
          setError('Credenciales inválidas para acceso de empleado.');
          return;
        }
      }

      onLoginSuccess();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Error al iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (role === 'employee') {
      if (!regEmail || !regPassword || !regName || !regCargo) {
        setError('Por favor, completa todos los campos requeridos, incluyendo tu cargo.');
        return;
      }

      setError('');
      setIsLoading(true);

      try {
        setPendingEmployeeRegistration({
          name: regName.trim(),
          email: regEmail.trim(),
          password: regPassword,
          cargo: regCargo,
        });
        setShowEmployeeQRScanner(true);
        setIsScanned(false);
        setEmployeeScannerError(null);
        setRegName('');
        setRegEmail('');
        setRegPassword('');
        setRegCargo('');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!regEmail || !regPassword || !regPasswordConfirm || !regName || !regBusiness || !regPhoneNumber.trim()) {
      setError('Por favor, completa todos los campos requeridos.');
      return;
    }

    if (!isValidRegistrationPassword(regPassword)) {
      setError('La contraseña debe tener al menos 8 caracteres e incluir un número.');
      return;
    }

    if (regPassword !== regPasswordConfirm) {
      setError('Las contraseñas no coinciden. Verifica e intenta de nuevo.');
      return;
    }

    if (!isValidRegistrationPhone(regPhoneNumber)) {
      setError('Ingresa un número de teléfono válido (7 a 15 dígitos).');
      return;
    }

    setError('');
    setIsLoading(true);

    setTimeout(() => {
      clearVenproLocalData();
      setIsLoading(false);
      setCurrentStep(1);
    }, 650);
  };

  const handleKeypadPress = (num: string) => {
    if (configPin.length < 4) {
      setConfigPin(prev => prev + num);
    }
  };

  const handleKeypadDelete = () => {
    setConfigPin(prev => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setConfigPin('');
  };

  const handleFinishConfiguration = async () => {
    setIsLoading(true);
    setError('');

    const industry: IndustryType = selectedIndustry || 'tienda';
    const industryDefaults = getIndustryDefaultConfig(industry);

    const finalConfig: StoreConfig = {
      storeName: regBusiness.trim() || getIndustryDefaultStoreName(industry),
      currencySymbol: configCurrency || industryDefaults.currencySymbol,
      address: industryDefaults.address,
      phone: formatRegistrationPhone(regPhoneCountryCode, regPhoneNumber),
      taxRate: Number(configTax) || industryDefaults.taxRate,
      ownerAccessPin: configPin || industryDefaults.ownerAccessPin,
    };

    try {
      if (isSupabaseConfigured) {
        const { user } = await ensureOwnerAccountAfterVerification({
          email: regEmail,
          password: regPassword,
          fullName: regName,
        });

        if (!user) {
          setError('No se pudo crear la cuenta. Verifica tu correo si la confirmación está activa.');
          return;
        }

        const orgData = await createOrganizationWithDatabase({
          userId: user.id,
          ownerName: regName,
          ownerEmail: regEmail,
          businessName: regBusiness.trim() || getIndustryDefaultStoreName(industry),
          industry,
          businessStructure,
          config: finalConfig,
        });

        onOrganizationBootstrap?.({
          products: orgData.products,
          sales: orgData.sales,
          transactions: orgData.transactions,
          config: orgData.config,
          industry: orgData.industry,
          inviteCode: orgData.inviteCode,
        });

        localStorage.setItem('venpro_invite_code', orgData.inviteCode);
        await refreshProfile();
      } else {
        const seedData = getIndustrySeedData(industry);
        const inviteCode = ensureLocalInviteCode();
        localStorage.setItem('venpro_business_structure', businessStructure);

        onOrganizationBootstrap?.({
          products: seedData.products,
          sales: seedData.sales,
          transactions: seedData.transactions,
          config: finalConfig,
          industry,
          inviteCode,
        });
      }

      localStorage.setItem(STORAGE_KEYS.industry, industry);
      localStorage.setItem(STORAGE_KEYS.ownerProfileName, regName);
      localStorage.setItem(STORAGE_KEYS.ownerProfileEmail, regEmail);
      onLoginSuccess({ skipRehydrate: true });
    } catch (err) {
      setError(
        err instanceof AuthError
          ? err.message
          : 'Error al inicializar la base de datos del negocio.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationBack = () => {
    resetVerificationFlow();
    setCurrentStep(businessStructure === 'autonomo' ? 2 : 3);
  };

  const renderIdentityVerification = () => (
    <main className="flex-1 overflow-y-auto mobile-scroll-main flex flex-col items-center py-6 md:py-12 px-4 md:px-12 relative bento-pattern bg-[#f9f9ff] animate-fade-in font-sans">
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#22d3ee]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#001636]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[500px] flex flex-col gap-8 z-10 animate-fade-in">
        <div className="text-center md:text-left space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#001b38] font-sans tracking-tight">Verifica tu identidad</h1>
          <p className="text-sm md:text-base text-[#43474f] leading-relaxed">
            {verificationSent
              ? 'Ingresa el código de 6 dígitos que enviamos para proteger tu cuenta.'
              : 'Elige cómo quieres recibir tu código de seguridad y pulsa Enviar.'}
          </p>
          {selectedIndustry && (
            <p className="text-xs text-[#00687b] font-semibold">
              {selectedIndustry === 'restaurante' ? 'Restaurante' : 'Tienda de ropa'} ·{' '}
              {businessStructure === 'autonomo'
                ? 'Negocio autónomo'
                : businessStructure === 'mediana'
                  ? 'Mediana empresa'
                  : 'Empresa con sucursales'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={`relative flex flex-col p-4 bg-white border rounded-xl cursor-pointer hover:border-[#00687b] transition-all group active:scale-95 duration-150 ${
              authMethod === 'sms' ? 'border-2 border-[#00B8D9] bg-[#e0e8ff]/40 ring-2 ring-[#00B8D9]/20' : 'border-gray-200'
            }`}
            onClick={() => handleAuthMethodChange('sms')}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[#00687b] group-hover:text-[#001636] flex items-center justify-center">
                <MessageSquare size={20} />
              </span>
              <span className="font-bold text-[#001b38] text-sm">SMS a mi celular</span>
            </div>
            <p className="text-[11px] text-[#43474f]">{maskPhone(regPhoneNumber)}</p>
            <div className={`absolute top-4 right-4 h-4 w-4 rounded-full border border-gray-300 flex items-center justify-center transition-colors ${
              authMethod === 'sms' ? 'bg-[#00B8D9] border-[#00B8D9]' : ''
            }`}>
              {authMethod === 'sms' && <div className="h-1.5 w-1.5 bg-white rounded-full"></div>}
            </div>
          </div>

          <div
            className={`relative flex flex-col p-4 bg-white border rounded-xl cursor-pointer hover:border-[#00687b] transition-all group active:scale-95 duration-150 ${
              authMethod === 'email' ? 'border-2 border-[#00B8D9] bg-[#e0e8ff]/40 ring-2 ring-[#00B8D9]/20' : 'border-gray-200'
            }`}
            onClick={() => handleAuthMethodChange('email')}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[#00687b] group-hover:text-[#001636] flex items-center justify-center">
                <Mail size={20} />
              </span>
              <span className="font-bold text-[#001b38] text-sm">Código por correo</span>
            </div>
            <p className="text-[11px] text-[#43474f]">{maskEmail(regEmail)}</p>
            <div className={`absolute top-4 right-4 h-4 w-4 rounded-full border border-gray-300 flex items-center justify-center transition-colors ${
              authMethod === 'email' ? 'bg-[#00B8D9] border-[#00B8D9]' : ''
            }`}>
              {authMethod === 'email' && <div className="h-1.5 w-1.5 bg-white rounded-full"></div>}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSendVerificationCode}
          disabled={isSendingCode}
          className="w-full bg-[#001636] hover:bg-[#002a5c] disabled:opacity-60 disabled:cursor-not-allowed text-white py-3.5 rounded-lg font-bold text-sm shadow-md active:scale-95 transition-all duration-150 flex justify-center items-center gap-2 font-sans"
        >
          {isSendingCode ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {authMethod === 'email' ? <Mail size={18} /> : <Smartphone size={18} />}
              <span>{verificationSent ? 'Reenviar código' : 'Enviar código'}</span>
            </>
          )}
        </button>

        {verificationMessage && (
          <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            <span>{verificationMessage}</span>
          </div>
        )}

        {demoVerificationCode && !isSupabaseConfigured && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
            <Info size={18} className="shrink-0 mt-0.5" />
            <span>
              Modo demo sin Supabase. Usa este código de prueba:{' '}
              <strong className="font-mono tracking-widest">{demoVerificationCode}</strong>
            </span>
          </div>
        )}

        {verificationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
            {verificationError}
          </div>
        )}

        <div className={`bg-white border border-gray-200 rounded-xl p-8 flex flex-col items-center gap-6 shadow-sm transition-opacity ${
          verificationSent ? 'opacity-100' : 'opacity-60 pointer-events-none'
        }`}>
          <span className="text-xs font-bold text-[#43474f] uppercase tracking-widest text-center">Ingresa el código</span>
          <div className="flex gap-2 md:gap-4 justify-center" id="otp-container">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={el => { otpRefs.current[idx] = el; }}
                value={digit}
                onChange={(e) => handleOtpChange(e.target.value, idx)}
                onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                disabled={!verificationSent || isVerifyingCode}
                className="w-11 h-14 md:w-16 md:h-20 text-center text-3xl font-bold border border-gray-200 rounded-lg bg-slate-50 focus:outline-none focus:border-[#00B8D9] focus:ring-2 focus:ring-[#00B8D9]/20 transition-all text-[#001636] disabled:opacity-50"
                maxLength={1}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleSendVerificationCode}
            disabled={!verificationSent || isSendingCode}
            className="text-sm text-[#00687b] hover:underline cursor-pointer transition-all font-semibold font-sans disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
          >
            ¿No recibiste el código? Reenviar
          </button>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleVerifyAndFinish}
            disabled={!verificationSent || isVerifyingCode}
            className="w-full bg-[#00B8D9] hover:bg-[#009fb8] disabled:opacity-60 disabled:cursor-not-allowed text-white py-4 rounded-lg font-bold text-lg shadow-lg active:scale-95 transition-all duration-150 uppercase tracking-wide cursor-pointer flex justify-center items-center gap-2 font-sans"
          >
            {isVerifyingCode ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Verificar y finalizar'
            )}
          </button>

          <button
            type="button"
            onClick={handleVerificationBack}
            className="w-full py-4 border-2 border-[#22d3ee]/45 text-[#43474f] hover:bg-slate-50 rounded-xl font-bold text-sm font-sans transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            Atrás
          </button>
        </div>

        <p className="text-center text-[11px] text-[#43474f] px-8 leading-relaxed font-sans">
          Al hacer clic en verificar, confirmas que eres el titular de la cuenta Venpro y aceptas nuestros{' '}
          <a className="text-[#00687b] underline hover:text-[#001636]" href="#">Términos de Seguridad</a>.
        </p>
      </div>
    </main>
  );

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess();
    }, 800);
  };

  if (showEmployeeQRScanner) {
    return (
      <div className="min-h-dvh bg-[#f9f9ff] text-[#081b38] flex flex-col relative font-sans">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes scan_laser {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          .custom-scan-line {
            height: 3px;
            background: linear-gradient(to right, transparent, #00B8D9, transparent);
            box-shadow: 0 0 15px 2px rgba(0, 184, 217, 0.7);
            position: absolute;
            width: 100%;
            z-index: 10;
            animation: scan_laser 3s ease-in-out infinite;
          }
          .custom-vignette-overlay {
            background: radial-gradient(circle, transparent 40%, rgba(8, 27, 56, 0.05) 100%);
          }
          #employee-qr-reader video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            border-radius: 12px !important;
          }
          #employee-qr-reader {
            border: none !important;
          }
        `}} />
        
        {/* Top Bar: Navy blue background with the Venpro logo centered */}
        <header className="bg-[#002A5C] h-16 flex items-center w-full z-50 shadow-md px-4 md:px-6 gap-4">
          <button 
            type="button"
            onClick={() => {
              setShowEmployeeQRScanner(false);
              setPendingEmployeeRegistration(null);
              setIsScanned(false);
              employeeScannedRef.current = false;
              setEmployeeScannerError(null);
            }}
            className="text-white hover:text-[#50dcff] flex items-center gap-1.5 text-xs font-bold font-sans transition-all shrink-0"
          >
            <ArrowLeft size={16} /> Corregir datos
          </button>
          <VenproWordmark className="text-xl" />
        </header>

        {/* Main Content Canvas */}
        <main className="flex-grow relative flex flex-col items-center justify-center p-6 md:p-8 custom-vignette-overlay bg-[#f9f9ff]">
          
          {/* Scanner Viewfinder Area */}
          <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center mb-10">
            {/* Scanning Animation Line */}
            <div className="custom-scan-line"></div>
            
            {/* Viewfinder Frame/Decorative Corners */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              <div className="absolute w-[40px] h-[40px] border-[#00B8D9] top-[-2px] left-[-2px] border-t-[4px] border-l-[4px] rounded-tl-[12px]"></div>
              <div className="absolute w-[40px] h-[40px] border-[#00B8D9] top-[-2px] right-[-2px] border-t-[4px] border-r-[4px] rounded-tr-[12px]"></div>
              <div className="absolute w-[40px] h-[40px] border-[#00B8D9] bottom-[-2px] left-[-2px] border-b-[4px] border-l-[4px] rounded-bl-[12px]"></div>
              <div className="absolute w-[40px] h-[40px] border-[#00B8D9] bottom-[-2px] right-[-2px] border-b-[4px] border-r-[4px] rounded-br-[12px]"></div>
            </div>

            {/* Real Camera Scanner Container */}
            <div 
              className="w-[85%] h-[85%] bg-[#081b38] rounded-xl overflow-hidden shadow-sm flex items-center justify-center relative border border-gray-200"
              title="Coloca un código QR frente a tu cámara para escanear"
            >
              {/* Target element for html5-qrcode library */}
              <div id="employee-qr-reader" className="w-full h-full overflow-hidden rounded-xl" />

              {/* Laser overlay line if camera compiles and operates */}
              {isEmployeeCameraActive && !isScanned && (
                <div className="absolute inset-x-0 h-0.5 bg-[#00B8D9] opacity-75 shadow-[0_0_8px_rgba(0,184,217,1)] top-1/2 animate-bounce pointer-events-none z-10" />
              )}

              {/* Status or simulation overlay states */}
              {!isEmployeeCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-[#081b38] text-white z-10">
                  {employeeScannerError ? (
                    <div className="space-y-3 px-2">
                      <span className="text-amber-400 text-sm font-bold font-sans block">⚠️ Cámara no activa</span>
                      <p className="text-[11px] text-gray-300 leading-relaxed font-sans">{employeeScannerError}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-8 h-8 border-2 border-[#50dcff] border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-slate-300 font-sans tracking-wide">Iniciando cámara...</p>
                    </div>
                  )}
                </div>
              )}

              {isScanned && (
                <div className="absolute inset-0 bg-[#00a86a] flex flex-col items-center justify-center text-white z-20 p-4">
                  <span className="text-5xl animate-bounce">✓</span>
                  <p className="font-bold text-sm tracking-wide mt-2">¡Negocio vinculado!</p>
                  <p className="text-xs text-gray-100 opacity-90">Creando tu acceso de empleado...</p>
                </div>
              )}
            </div>
          </div>

          {/* Instructions Text */}
          <div className="text-center space-y-2 max-w-sm font-sans">
            <p className="text-[#081b38] font-bold text-xl px-4">
              Escanea el QR de tu propietario
            </p>
            <p className="text-sm text-gray-500 leading-relaxed px-2">
              Pide al propietario que abra <strong>Enlace QR</strong> en su panel y muestra ese código a la cámara.
            </p>
            {!isSupabaseConfigured && (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 leading-relaxed">
                Si escaneas desde otro dispositivo (por ejemplo, tu teléfono), usa la misma URL de red
                del propietario (ej. <span className="font-mono">192.168.x.x:3001</span>). Para sincronizar
                inventario entre equipos, configura Supabase.
              </p>
            )}
            {employeeScannerError && (
              <p className="text-sm text-red-600 font-semibold bg-red-50 border border-red-100 rounded-lg px-4 py-2 mt-2">
                {employeeScannerError}
              </p>
            )}
          </div>

          {/* Success Message toast */}
          <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#00a86a] text-white px-6 py-3.5 rounded-full shadow-xl flex items-center gap-3 transition-all duration-500 transform ${isScanned ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
            <span className="font-sans font-bold">✓ Empleado registrado con éxito</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#f9f9ff] text-[#081b38] flex flex-col relative font-sans">
      {/* Target CSS Selector matching header for branding persistence depending on wizard */}
      {currentStep === 0 ? (
        <header className="w-full bg-[#002A5C] py-4 px-6 md:px-16 flex items-center justify-between shadow-md z-50">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition"
              title="Volver"
            >
              <ArrowLeft size={20} />
            </button>
            <VenproWordmark className="text-2xl" />
          </div>
          <ThemeToggle variant="header" />
        </header>
      ) : (
        <header className="w-full h-16 bg-[#002a5c] flex justify-between items-center px-6 md:px-12 shadow-md z-50 animate-fade-in sticky top-0">
          <VenproWordmark className="text-2xl" />
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-white tracking-tight uppercase font-sans hidden sm:inline">
              {currentStep === 1
                ? 'PASO 1 DE 4'
                : currentStep === 2
                  ? 'PASO 2 DE 4'
                  : currentStep === 3
                    ? 'PASO 3 DE 4'
                    : currentStep === 4
                      ? 'VERIFICACIÓN'
                      : 'SEGURIDAD'}
            </span>
            <div className="w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#22d3ee] transition-all duration-300" 
                style={{ 
                  width: `${
                    currentStep === 1 ? '25%' : currentStep === 2 ? '50%' : currentStep === 3 ? '75%' : '100%'
                  }` 
                }}
              />
            </div>
            <ThemeToggle variant="header" />
          </div>
        </header>
      )}

      {/* Main layout container with full layout precisely styled as the HTML mockups */}
      {currentStep === 0 && (
        isRegisterMode ? (
          role === 'employee' ? (
            /* REGISTRO DE EMPLEADO (EXACT HTML LOOK AND FEEL) */
            <main className="flex-1 overflow-y-auto mobile-scroll-main flex flex-col items-stretch md:items-center md:justify-center p-4 py-6 md:p-8 z-10 font-sans animate-fade-in">
              <div className="w-full max-w-lg">
                {/* Welcome Header */}
                <div className="mb-6 text-center md:text-left">
                  <h1 className="text-3xl md:text-4xl font-extrabold text-[#001636] mb-2 font-sans tracking-tight">Registro de Empleado</h1>
                  <p className="text-sm md:text-base text-[#43474f] font-sans">Complete los datos para dar de alta un nuevo perfil en el sistema Venpro.</p>
                </div>
                
                {/* Form Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.97, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="bg-white border border-[#c4c6d1] p-5 md:p-8 rounded-2xl shadow-sm relative"
                  id="register-card"
                >
                  {error && (
                    <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold text-center font-sans">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    {/* Full Name */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-bold text-[#081b38] block" htmlFor="reg_full_name">
                        Nombre Completo
                      </label>
                      <div className="relative flex items-center border border-[#c4c6d1] rounded-lg bg-white overflow-hidden transition-all duration-200 focus-within:ring-2 focus-within:ring-[#50dcff]/40 focus-within:border-[#50dcff]">
                        <span className="absolute left-3.5 text-gray-400">
                          <User size={18} />
                        </span>
                        <input 
                          className="w-full pl-11 pr-4 py-3 bg-transparent border-0 ring-0 focus:ring-0 text-sm text-[#081b38] placeholder-gray-400 font-sans outline-none focus:outline-none" 
                          id="reg_full_name" 
                          placeholder="Ej. Juan Pérez" 
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    {/* Cargo */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-bold text-[#081b38] block" htmlFor="reg_cargo">
                        Cargo
                      </label>
                      <div className="relative flex items-center border border-[#c4c6d1] rounded-lg bg-white overflow-hidden transition-all duration-200 focus-within:ring-2 focus-within:ring-[#50dcff]/40 focus-within:border-[#50dcff]">
                        <span className="absolute left-3.5 text-gray-400">
                          <Briefcase size={18} />
                        </span>
                        <select 
                          className="w-full pl-11 pr-10 py-3 bg-transparent border-none focus:outline-none focus:ring-none text-sm text-[#081b38] font-sans outline-none appearance-none" 
                          id="reg_cargo"
                          required
                          value={regCargo}
                          onChange={(e) => setRegCargo(e.target.value)}
                          disabled={isLoading}
                        >
                          <option value="" disabled>Seleccione un cargo</option>
                          <option value="manager">Gerente de Almacén</option>
                          <option value="operator">Operador Logístico</option>
                          <option value="admin">Administrador de Inventario</option>
                          <option value="supervisor">Supervisor de Turno</option>
                        </select>
                        <span className="absolute right-3.5 pointer-events-none text-gray-400">
                          <ChevronDown size={18} />
                        </span>
                      </div>
                    </div>

                    <div className="rounded-lg bg-[#e0e8ff]/40 border border-[#50dcff]/30 px-4 py-3 text-left">
                      <p className="text-xs text-[#00687b] font-semibold leading-relaxed">
                        Tras registrarte, deberás escanear el código QR que muestra tu propietario en la pestaña <strong>Enlace QR</strong> para vincular tu cuenta al negocio.
                      </p>
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-bold text-[#081b38] block" htmlFor="reg_email">
                        Correo Electrónico
                      </label>
                      <div className="relative flex items-center border border-[#c4c6d1] rounded-lg bg-white overflow-hidden transition-all duration-200 focus-within:ring-2 focus-within:ring-[#50dcff]/40 focus-within:border-[#50dcff]">
                        <span className="absolute left-3.5 text-gray-400">
                          <Mail size={18} />
                        </span>
                        <input 
                          className="w-full pl-11 pr-4 py-3 bg-transparent border-0 ring-0 focus:ring-0 text-sm text-[#081b38] placeholder-gray-400 font-sans outline-none focus:outline-none" 
                          id="reg_email" 
                          placeholder="usuario@venpro.com" 
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-bold text-[#081b38] block" htmlFor="reg_password">
                        Contraseña
                      </label>
                      <div className="relative flex items-center border border-[#c4c6d1] rounded-lg bg-white overflow-hidden transition-all duration-200 focus-within:ring-2 focus-within:ring-[#50dcff]/40 focus-within:border-[#50dcff]">
                        <span className="absolute left-3.5 text-gray-400">
                          <Lock size={18} />
                        </span>
                        <input 
                          className="w-full pl-11 pr-11 py-3 bg-transparent border-0 ring-0 focus:ring-0 text-sm text-[#081b38] placeholder-gray-400 font-sans outline-none focus:outline-none" 
                          id="reg_password" 
                          placeholder="••••••••" 
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          disabled={isLoading}
                        />
                        <button 
                          className="absolute right-3.5 flex items-center text-gray-400 hover:text-[#081b38] transition-colors" 
                          onClick={() => setShowPassword(!showPassword)}
                          type="button"
                          disabled={isLoading}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      <button 
                        className="w-full bg-[#50dcff] hover:bg-[#00687b] hover:text-white font-semibold py-3 px-4 rounded-lg shadow-sm active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 text-white font-sans text-sm outline-none border-none" 
                        type="submit"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          'Registrarse'
                        )}
                      </button>
                    </div>

                    {/* Social Logic */}
                    <div className="flex items-center gap-4 py-1">
                      <div className="flex-grow h-px bg-[#c4c6d1]"></div>
                      <span className="font-semibold text-xs text-gray-400 px-1 font-sans">o</span>
                      <div className="flex-grow h-px bg-[#c4c6d1]"></div>
                    </div>

                    <div>
                      <button 
                        className="w-full bg-white border border-[#c4c6d1] hover:bg-gray-50 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-3 text-[#081b38] py-3 px-4 rounded-lg shadow-sm font-semibold text-sm outline-none" 
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                        </svg>
                        <span className="font-sans text-sm text-gray-700">Registrarse con Google</span>
                      </button>
                    </div>

                    <div className="text-center pt-2 font-sans text-sm text-[#43474f]">
                      <span>¿Ya tienes una cuenta? </span>
                      <a 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          setSuccessMsg('');
                          setIsRegisterMode(false);
                        }}
                        className="font-bold text-[#50dcff] hover:text-[#00687b] transition-colors underline-offset-4 hover:underline"
                      >
                        Inicia sesión
                      </a>
                    </div>

                    <div className="text-center pt-2 leading-relaxed">
                      <p className="text-[11px] text-gray-400 font-sans">
                        Al registrarse, el empleado recibirá un correo de activación para validar sus credenciales corporativas.
                      </p>
                    </div>
                  </form>
                </motion.div>
              </div>
            </main>
          ) : (
            /* REGISTRO DE NEGOCIO (OWNER REGISTER MODE) */
            <main className="flex-1 overflow-y-auto mobile-scroll-main flex flex-col items-stretch md:items-center md:justify-center p-4 py-6 md:p-8 z-10 animate-fade-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="bg-white border border-[#d2d4dc] rounded-2xl shadow-xl max-w-md w-full p-6 md:p-10 relative"
                id="register-card"
              >
                <div className="mb-6 text-left">
                  <h2 className="text-3xl font-bold text-[#001636] mb-2 font-sans tracking-tight">
                    Registra tu negocio
                  </h2>
                  <p className="text-sm text-[#43474f]">
                    Comienza a gestionar tu negocio hoy mismo.
                  </p>
                </div>

                {error && (
                  <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold text-center">
                    {error}
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  {/* Nombre Completo */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#081b38] block" htmlFor="reg_full_name">
                      Nombre Completo
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                        <User size={18} />
                      </span>
                      <input 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-[#081b38] placeholder-gray-400 focus:outline-none focus:border-[#00B8D9] focus:ring-2 focus:ring-[#00B8D9]/20 transition-all font-sans" 
                        id="reg_full_name" 
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Ej. Juan Pérez"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Nombre del Negocio */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#081b38] block" htmlFor="reg_business_name">
                      Nombre del Negocio
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                        <Building2 size={18} />
                      </span>
                      <input 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-[#081b38] placeholder-gray-400 focus:outline-none focus:border-[#00B8D9] focus:ring-2 focus:ring-[#00B8D9]/20 transition-all font-sans" 
                        id="reg_business_name" 
                        type="text"
                        required
                        value={regBusiness}
                        onChange={(e) => setRegBusiness(e.target.value)}
                        placeholder="Ej. Mi Bodega S.A."
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Correo Electrónico */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#081b38] block" htmlFor="reg_email">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                        <Mail size={18} />
                      </span>
                      <input 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-[#081b38] placeholder-gray-400 focus:outline-none focus:border-[#00B8D9] focus:ring-2 focus:ring-[#00B8D9]/20 transition-all font-sans" 
                        id="reg_email" 
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="nombre@empresa.com"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Contraseña */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#081b38] block" htmlFor="reg_password">
                      Contraseña
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                        <Lock size={18} />
                      </span>
                      <input 
                        className="w-full pl-10 pr-12 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-[#081b38] placeholder-gray-400 focus:outline-none focus:border-[#00B8D9] focus:ring-2 focus:ring-[#00B8D9]/20 transition-all font-sans" 
                        id="reg_password" 
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={isLoading}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#081b38] p-1 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium font-sans">Mínimo 8 caracteres, incluye un número.</p>
                  </div>

                  {/* Confirmar contraseña */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#081b38] block" htmlFor="reg_password_confirm">
                      Confirmar Contraseña
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                        <Lock size={18} />
                      </span>
                      <input
                        className={`w-full pl-10 pr-12 py-2.5 bg-white border rounded-lg text-sm text-[#081b38] placeholder-gray-400 focus:outline-none focus:ring-2 transition-all font-sans ${
                          regPasswordConfirm && regPassword !== regPasswordConfirm
                            ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                            : 'border-gray-300 focus:border-[#00B8D9] focus:ring-[#00B8D9]/20'
                        }`}
                        id="reg_password_confirm"
                        type={showPasswordConfirm ? 'text' : 'password'}
                        required
                        value={regPasswordConfirm}
                        onChange={(e) => setRegPasswordConfirm(e.target.value)}
                        placeholder="Repite tu contraseña"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#081b38] p-1 transition-colors"
                      >
                        {showPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {regPasswordConfirm && regPassword !== regPasswordConfirm && (
                      <p className="text-[11px] text-red-500 font-medium font-sans">Las contraseñas no coinciden.</p>
                    )}
                  </div>

                  {/* Teléfono */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#081b38] block" htmlFor="reg_phone">
                      Teléfono de contacto
                    </label>
                    <div className="flex gap-2">
                      <select
                        id="reg_phone_country"
                        value={regPhoneCountryCode}
                        onChange={(e) => setRegPhoneCountryCode(e.target.value)}
                        disabled={isLoading}
                        className="w-[42%] min-w-[8.5rem] px-2 py-2.5 bg-white border border-gray-300 rounded-lg text-xs text-[#081b38] focus:outline-none focus:border-[#00B8D9] focus:ring-2 focus:ring-[#00B8D9]/20 transition-all font-sans"
                        aria-label="Código de país"
                      >
                        {COUNTRY_PHONE_CODES.map(({ code, label }) => (
                          <option key={code} value={code}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <Phone size={16} />
                        </span>
                        <input
                          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-[#081b38] placeholder-gray-400 focus:outline-none focus:border-[#00B8D9] focus:ring-2 focus:ring-[#00B8D9]/20 transition-all font-sans"
                          id="reg_phone"
                          type="tel"
                          inputMode="numeric"
                          required
                          value={regPhoneNumber}
                          onChange={(e) => setRegPhoneNumber(e.target.value.replace(/[^\d\s-]/g, ''))}
                          placeholder="555 123 4567"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium font-sans">
                      Selecciona tu país e ingresa tu número sin el código internacional.
                    </p>
                  </div>

                  {/* Terms and Conditions */}
                  <div className="flex items-start space-x-2 py-1">
                    <input 
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-[#00B8D9] focus:ring-[#00B8D9]" 
                      id="reg_terms" 
                      type="checkbox"
                      required
                    />
                    <label className="text-[11px] text-[#43474f] leading-tight" htmlFor="reg_terms">
                      Acepto los <a className="text-[#00687b] font-bold hover:underline" href="#" onClick={(e) => e.preventDefault()}>Términos de Servicio</a> y la <a className="text-[#00687b] font-bold hover:underline" href="#" onClick={(e) => e.preventDefault()}>Política de Privacidad</a> de Venpro.
                    </label>
                  </div>

                  {/* Primary Action Button with brand cyan glow */}
                  <button 
                    className="w-full bg-[#00B8D9] text-white font-semibold py-3 rounded-lg shadow-lg shadow-[#00B8D9]/20 hover:bg-[#009cb9] active:scale-[0.98] transition-all duration-150 flex items-center justify-center space-x-2 font-sans text-sm" 
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Registrarse'
                    )}
                  </button>

                  {/* Social Login Alternative */}
                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs font-bold uppercase tracking-wider">
                      <span className="bg-white px-4 text-gray-400 font-sans">O</span>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-4">
                    <button 
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center space-x-3 border border-gray-200 py-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors bg-white font-semibold text-xs text-[#081b38]" 
                      type="button"
                    >
                      <img alt="Google" className="w-5 h-5" src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" />
                      <span>Registrarse con Google</span>
                    </button>
                  </div>
                </form>

                <footer className="mt-6 text-center">
                  <p className="text-sm text-[#43474f]">
                    ¿Ya tienes una cuenta?{' '}
                    <a 
                      className="text-[#00687b] font-bold hover:underline ml-1" 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setSuccessMsg('');
                        setIsRegisterMode(false);
                      }}
                    >
                      Inicia Sesión
                    </a>
                  </p>
                </footer>
              </motion.div>
            </main>
          )
        ) : (
          /* Login Mode Form - styled perfectly to match */
          <main className="flex-1 overflow-y-auto mobile-scroll-main flex flex-col items-stretch md:items-center md:justify-center p-4 py-6 md:p-8 z-10 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="bg-white border border-[#d2d4dc] rounded-2xl shadow-xl max-w-md w-full p-8 md:p-10 relative"
              id="login-card"
            >
              {/* Header & Meta */}
              <div className="text-center space-y-2 mb-6">
                <h2 className="text-3xl font-extrabold text-[#002A5C] tracking-tight">
                  Inicia Sesión
                </h2>
                <p className="text-sm text-[#5a5f6a] tracking-wide">
                  {role === 'employee' 
                    ? 'Accede a tu cuenta para ver o editar el inventario de la empresa donde perteneces' 
                    : 'Accede a tu cuenta para gestionar tu negocio.'}
                </p>
              </div>

              {successMsg && (
                <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold text-center animate-pulse">
                  {successMsg}
                </div>
              )}

              {error && (
                <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <label 
                    htmlFor="email-input" 
                    className="block text-xs font-bold text-[#081b38] uppercase tracking-wider"
                  >
                    Correo Electrónico
                  </label>
                  <input
                    id="email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@venpro.com"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00687b] bg-white text-[#081b38] placeholder-gray-400 transition"
                    disabled={isLoading}
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label 
                      htmlFor="password-input" 
                      className="block text-xs font-bold text-[#081b38] uppercase tracking-wider"
                    >
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={() => alert('Función de recuperación de contraseña disponible en producción.')}
                      className="text-xs font-bold text-[#00687b] hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border border-gray-300 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00687b] bg-white text-[#081b38] placeholder-gray-400 transition"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-md transition"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button (Cyan styled) */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#50dcff] hover:bg-[#34d1f5] active:bg-[#1dbadccc] text-[#001f27] py-3.5 rounded-xl font-extrabold text-center shadow-md text-base transition-all duration-200 flex items-center justify-center gap-2 font-sans"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-[#001f27] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Ingresar'
                  )}
                </button>
              </form>

              {/* Social Separator */}
              <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-4 text-xs text-gray-400 font-bold uppercase tracking-wider">
                  o
                </span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              {/* Google SSO Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full bg-white border border-[#c4c6d1] hover:bg-gray-50 active:bg-gray-100 text-gray-700 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center transition-all duration-200 shadow-sm"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 2.47 2.18 5.64l3.66 2.84c.87-2.6 3.3-4.1 6.16-4.1z"
                  />
                </svg>
                Continuar con Google
              </button>

              {/* New Register Selector Button / Login Mode Toggle under the main Google login */}
              <button
                type="button"
                onClick={() => {
                  setSuccessMsg('');
                  setIsRegisterMode(true);
                }}
                className="w-full mt-4 bg-[#f1f3f7] hover:bg-[#e4e7eb] text-[#002A5C] py-3 rounded-xl font-bold text-xs text-center transition-all duration-200 border border-[#d2d4dc]/60 shadow-sm animate-pulse"
              >
                {role === 'employee' ? '¿No tienes una cuenta de empleado? Regístrate aquí' : '¿No tienes una cuenta de negocio? Regístrate gratis'}
              </button>
            </motion.div>
          </main>
        )
      )}

      {/* Step 1: Configura tu negocio (Mockup image based) */}
      {currentStep === 1 && (
        <main className="flex-1 overflow-y-auto mobile-scroll-main flex flex-col items-center justify-start md:justify-center px-4 py-6 md:py-8 relative bento-pattern bg-[#f9f9ff] animate-fade-in">
          {/* Background decorative elements */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#64FFB1]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#001636]/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-4xl w-full z-10">
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-extrabold text-[#001636] mb-2 font-sans tracking-tight">Configura tu negocio</h1>
              <p className="text-[#43474f] max-w-lg mx-auto text-sm md:text-base leading-relaxed">
                Selecciona el tipo de industria que mejor describe tu operación para personalizar tu inventario.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Restaurant Card */}
              <div 
                onClick={() => setSelectedIndustry('restaurante')}
                className={`group relative bg-white border rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:border-[#00B8D9] hover:-translate-y-1 shadow-md hover:shadow-lg ${
                  selectedIndustry === 'restaurante' 
                    ? 'border-[#00B8D9] ring-2 ring-[#00B8D9]/20' 
                    : 'border-gray-200'
                }`}
                id="card-restaurante"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center text-[#001636] group-hover:bg-[#64FFB1]/10 transition-colors">
                    <Utensils size={28} className="text-[#001636]" />
                  </div>
                  <div className={`transition-opacity duration-200 ${selectedIndustry === 'restaurante' ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-[#00B8D9] block">
                      <CheckCircle2 size={24} fill="#00B8D9" className="text-white" />
                    </span>
                  </div>
                </div>
                <h2 className="text-xl font-bold text-[#001636] mb-2 font-sans tracking-tight">Restaurante</h2>
                <p className="text-xs text-[#43474f] mb-6 leading-relaxed">
                  Optimizado para la gestión de recetas, insumos detallados y unidades alimentarias. Controla mermas y costos por plato automáticamente.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md font-bold text-[10px] text-[#43474f] uppercase tracking-wider font-mono">RECETAS</span>
                  <span className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md font-bold text-[10px] text-[#43474f] uppercase tracking-wider font-mono">COSTOS</span>
                  <span className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md font-bold text-[10px] text-[#43474f] uppercase tracking-wider font-mono">MERMAS</span>
                </div>
              </div>

              {/* Clothes/Retail Card */}
              <div 
                onClick={() => setSelectedIndustry('tienda')}
                className={`group relative bg-white border rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:border-[#00B8D9] hover:-translate-y-1 shadow-md hover:shadow-lg ${
                  selectedIndustry === 'tienda' 
                    ? 'border-[#00B8D9] ring-2 ring-[#00B8D9]/20' 
                    : 'border-gray-200'
                }`}
                id="card-tienda"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center text-[#001636] group-hover:bg-[#64FFB1]/10 transition-colors">
                    <Shirt size={28} className="text-[#001636]" />
                  </div>
                  <div className={`transition-opacity duration-200 ${selectedIndustry === 'tienda' ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-[#00B8D9] block">
                      <CheckCircle2 size={24} fill="#00B8D9" className="text-white" />
                    </span>
                  </div>
                </div>
                <h2 className="text-xl font-bold text-[#001636] mb-2 font-sans tracking-tight">Tienda de Ropa</h2>
                <p className="text-xs text-[#43474f] mb-6 leading-relaxed">
                  Especializado en matriz de variantes (tallas/colores) e integración directa con códigos QR para un despacho ágil y sin errores.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md font-bold text-[10px] text-[#43474f] uppercase tracking-wider font-mono">VARIANTES</span>
                  <span className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md font-bold text-[10px] text-[#43474f] uppercase tracking-wider font-mono">QR CODE</span>
                  <span className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md font-bold text-[10px] text-[#43474f] uppercase tracking-wider font-mono">STOCK</span>
                </div>
              </div>
            </div>

            {/* Custom Interactive Feedback to match mockup button continue action states and styling */}
            <div className="mt-12 flex flex-col items-center gap-2">
              <button 
                onClick={() => setCurrentStep(2)}
                disabled={!selectedIndustry}
                className={`w-full md:w-64 py-4 px-8 text-white rounded-lg font-bold text-sm transition-all duration-300 active:scale-95 shadow-lg ${
                  selectedIndustry 
                    ? 'bg-[#00B8D9] hover:bg-[#009cb9] cursor-pointer shadow-[#00B8D9]/20' 
                    : 'bg-[#7db1c1] opacity-50 cursor-not-allowed shadow-none'
                }`}
                id="btn-continue"
              >
                Siguiente
              </button>
              <p className="text-[11px] font-sans text-gray-400 font-medium">Puedes cambiar esto más tarde en los ajustes.</p>
            </div>
          </div>
        </main>
      )}

      {/* Step 2: Estructura de tu Negocio */}
      {currentStep === 2 && (
        <main className="flex-1 overflow-y-auto mobile-scroll-main flex flex-col items-center py-8 md:py-12 px-4 relative bento-pattern bg-[#f9f9ff] animate-fade-in">
          {/* Background decorative elements */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#22d3ee]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#001c0e]/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-4xl w-full z-10">
            {/* Header Section */}
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-extrabold text-[#001636] mb-2 font-sans tracking-tight">Estructura de tu Negocio</h1>
              <p className="text-[#43474f] max-w-lg mx-auto text-sm md:text-base leading-relaxed">
                Selecciona cómo está organizado tu equipo para configurar los permisos adecuados y optimizar el flujo de trabajo.
              </p>
            </div>

            {/* Business Structure Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Option 1: Negocio Autónomo */}
              <button 
                type="button"
                id="card-autonomo"
                onClick={() => setBusinessStructure('autonomo')}
                className={`group relative flex flex-col bg-white border rounded-xl p-6 text-left transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-lg focus:outline-none ${
                    businessStructure === 'autonomo'
                      ? 'border-2 border-[#22d3ee] ring-2 ring-[#22d3ee]/30 shadow-lg'
                      : 'border-gray-200'
                  }`}
              >
                <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-[#001c0e] transition-colors mb-6 ${
                  businessStructure === 'autonomo' ? 'bg-[#22d3ee]/10' : 'bg-slate-50 group-hover:bg-[#22d3ee]/10'
                }`}>
                  <User size={28} className="text-[#001636]" />
                </div>
                <h3 className="text-lg font-bold text-[#001636] mb-2 font-sans tracking-tight">Negocio Autónomo</h3>
                <p className="text-xs text-[#43474f] leading-relaxed">
                  Un solo dueño y empleado. Ideal para profesionales independientes o micro-emprendedores.
                </p>
                <div className={`absolute top-4 right-4 transition-opacity duration-200 ${
                  businessStructure === 'autonomo' ? 'opacity-100' : 'opacity-0'
                }`}>
                  <CheckCircle2 size={24} fill="#22d3ee" className="text-white" />
                </div>
              </button>

              {/* Option 2: Mediana Empresa (Selected by default) */}
              <button 
                type="button"
                id="card-mediana"
                onClick={() => {
                  setBusinessStructure('mediana');
                }}
                className={`group relative flex flex-col bg-white border rounded-xl p-6 text-left transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-lg focus:outline-none ${
                    businessStructure === 'mediana'
                      ? 'border-2 border-[#22d3ee] ring-2 ring-[#22d3ee]/30 shadow-lg'
                      : 'border-gray-200'
                  }`}
              >
                <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-[#001c0e] transition-colors mb-6 ${
                  businessStructure === 'mediana' ? 'bg-[#22d3ee]/10' : 'bg-slate-50 group-hover:bg-[#22d3ee]/10'
                }`}>
                  <Users size={28} className="text-[#001636]" />
                </div>
                <h3 className="text-lg font-bold text-[#001636] mb-2 font-sans tracking-tight">Mediana Empresa</h3>
                <p className="text-xs text-[#43474f] leading-relaxed">
                  Varios trabajadores en un mismo lugar. Equipos colaborativos con roles definidos.
                </p>
                <div className={`absolute top-4 right-4 transition-opacity duration-200 ${
                  businessStructure === 'mediana' ? 'opacity-100' : 'opacity-0'
                }`}>
                  <CheckCircle2 size={24} fill="#22d3ee" className="text-white" />
                </div>
              </button>

              {/* Option 3: Empresa con Sucursales */}
              <button 
                type="button"
                id="card-sucursales"
                onClick={() => {
                  setBusinessStructure('sucursales');
                }}
                className={`group relative flex flex-col bg-white border rounded-xl p-6 text-left transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-lg focus:outline-none ${
                    businessStructure === 'sucursales'
                      ? 'border-2 border-[#22d3ee] ring-2 ring-[#22d3ee]/30 shadow-lg'
                      : 'border-gray-200'
                  }`}
              >
                <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-[#001c0e] transition-colors mb-6 ${
                  businessStructure === 'sucursales' ? 'bg-[#22d3ee]/10' : 'bg-slate-50 group-hover:bg-[#22d3ee]/10'
                }`}>
                  <Building2 size={28} className="text-[#001636]" />
                </div>
                <h3 className="text-lg font-bold text-[#001636] mb-2 font-sans tracking-tight">Empresa con Sucursales</h3>
                <p className="text-xs text-[#43474f] leading-relaxed">
                  Múltiples sedes y equipos. Gestión centralizada para inventarios distribuidos.
                </p>
                <div className={`absolute top-4 right-4 transition-opacity duration-200 ${
                  businessStructure === 'sucursales' ? 'opacity-100' : 'opacity-0'
                }`}>
                  <CheckCircle2 size={24} fill="#22d3ee" className="text-white" />
                </div>
              </button>
            </div>

            {/* Action Section */}
            <div className="mt-12 flex flex-col items-center gap-4">
              <button 
                type="button"
                id="btn-structure-next"
                onClick={() => {
                  if (businessStructure === 'autonomo') {
                    resetVerificationFlow();
                    setCurrentStep(4);
                  } else {
                    setCurrentStep(3);
                  }
                }}
                className="w-full md:w-64 py-4 px-8 bg-[#22d3ee] text-white rounded-lg font-bold text-sm transition-all duration-300 active:scale-95 shadow-lg shadow-[#22d3ee]/20 hover:brightness-110"
              >
                Siguiente
              </button>
              <button 
                type="button"
                id="btn-structure-back"
                onClick={() => setCurrentStep(1)}
                className="w-full md:w-64 py-4 px-8 border-2 border-[#22d3ee] text-[#43474f] hover:bg-slate-50 rounded-lg font-bold text-sm transition-all duration-300 active:scale-95 flex items-center justify-center gap-2"
              >
                Atrás
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Step 3: Gestiona tu Equipo / Sucursales (mediana y sucursales) */}
      {currentStep === 3 && businessStructure !== 'autonomo' && (
        businessStructure === 'sucursales' ? (
          <div className="flex flex-1 min-h-0 flex-col bg-[#f9f9ff] font-sans md:flex-row">
            {/* Sidebar Left */}
            <aside className="hidden md:flex flex-col w-64 bg-[#001636]/90 border-r border-white/5 h-[calc(100vh-4rem)] sticky top-16 shrink-0 text-white z-20">
               <div className="p-6 flex items-center gap-3 border-b border-white/10">
                 <div className="w-10 h-10 rounded-lg bg-[#50dcff]/10 border border-[#50dcff]/20 flex items-center justify-center">
                   <User className="text-[#50dcff]" size={20} />
                 </div>
                 <div>
                   <p className="font-bold text-base text-white leading-none">Admin User</p>
                   <p className="text-slate-400 text-xs mt-1">Sedes & Sucursales</p>
                 </div>
               </div>
               <nav className="flex-1 py-4">
                 <button 
                   type="button"
                   onClick={() => alert('Estás en el flujo de gestión de sucursales de Venpro.')}
                   className="w-full text-left flex items-center gap-3 px-6 py-3 text-[#50dcff] bg-white/5 font-bold cursor-pointer"
                 >
                   <LayoutDashboard size={18} />
                   <span>Sucursales</span>
                 </button>
                 <button 
                   type="button"
                   onClick={() => alert('Configuración General de la Organización')}
                   className="w-full text-left flex items-center gap-3 px-6 py-3 text-slate-300 font-medium hover:bg-white/5 transition-all cursor-pointer"
                 >
                   <Settings size={18} />
                   <span>Settings</span>
                 </button>
               </nav>
            </aside>

            <div className="flex flex-1 min-h-0 flex-col">
            {/* Main Content Pane */}
            <main className="flex-1 overflow-y-auto mobile-scroll-main p-4 md:p-12">
              <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                {/* Section Header exactly matching HTML spec */}
                <div className="space-y-2 text-center">
                  <h2 className="text-3xl md:text-4xl font-extrabold text-[#001636] tracking-tight">Gestión de Sucursales</h2>
                  <p className="text-[#43474f] max-w-xl mx-auto text-sm md:text-base leading-relaxed">
                    Configura gerentes para tus distintas sedes. Ellos podrán gestionar sus propios equipos y optimizar la operatividad local de forma autónoma.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <button 
                    type="button"
                    onClick={() => setShowAddManagerModal(true)}
                    className="bg-[#00B8D9] hover:bg-[#009fb8] text-white font-bold px-6 py-3.5 rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-md cursor-pointer"
                  >
                    <UserPlus size={18} />
                    <span>Añadir Gerente</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => alert('Lista de sucursales activas:\n- Sucursal Norte (Gerente asignado)\n- Sucursal Centro (Gerente asignado)\n- Sucursal Sur (Pendiente gerente)\n- Almacén Principal (Gerente general)')}
                    className="border border-[#00B8D9] text-[#00687b] hover:bg-[#00B8D9]/5 font-bold px-6 py-3.5 rounded-xl transition-all cursor-pointer"
                  >
                    Ver Sucursales
                  </button>
                </div>

                {/* Managers Display */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Gerentes de Sedes Asignados</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sucursalesManagers.map((mgr, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#00B8D9]/10 text-[#00687b] flex items-center justify-center font-bold">
                            {mgr.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm leading-snug">{mgr.name}</p>
                            <p className="text-xs text-slate-500 leading-snug">{mgr.email}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-full text-[10px] font-bold">
                          {mgr.branch}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Features Bento cards matching HTML styling spec */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                  <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-[#00687b] w-10.5 h-10.5 rounded-xl bg-[#22d3ee]/5 flex items-center justify-center text-secondary">
                      <Users size={22} className="text-[#001636]" />
                    </div>
                    <h4 className="font-bold text-primary text-base">Gestión de Equipos</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">Los gerentes asignados pueden contratar y dar de baja a sus propios colaboradores.</p>
                  </div>
                  <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-[#00687b] w-10.5 h-10.5 rounded-xl bg-[#22d3ee]/5 flex items-center justify-center text-secondary">
                      <BarChart3 size={22} className="text-[#001636]" />
                    </div>
                    <h4 className="font-bold text-primary text-base">Reportes Locales</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">Acceso a métricas de rendimiento específicas para cada punto de venta o almacén.</p>
                  </div>
                </div>
              </div>
            </main>

            {/* Bottom Action Footer bar matching the HTML layout */}
            <div className="mobile-form-footer-solid px-4 py-3 md:px-6 md:py-4 flex items-center justify-center gap-3 md:gap-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
              <button 
                type="button"
                onClick={() => {
                  setCurrentStep(2);
                }}
                className="px-6 py-4 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl font-bold text-sm transition-all active:scale-95"
              >
                Atrás
              </button>
              <button 
                type="button"
                onClick={() => {
                  resetVerificationFlow();
                  setCurrentStep(4);
                }}
                className="w-full max-w-sm bg-[#00B8D9] hover:bg-[#009fb8] text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>Continuar</span>
              </button>
            </div>
            </div>

            {/* Modal for Add Manager */}
            {showAddManagerModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <h3 className="font-bold text-primary text-base">Añadir Gerente de Sucursal</h3>
                    <button 
                      type="button" 
                      onClick={() => setShowAddManagerModal(false)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!newManagerName || !newManagerEmail) {
                      alert('Por favor, completa todos los campos.');
                      return;
                    }
                    setSucursalesManagers([...sucursalesManagers, {
                      name: newManagerName,
                      email: newManagerEmail,
                      branch: newManagerBranch
                    }]);
                    setNewManagerName('');
                    setNewManagerEmail('');
                    setShowAddManagerModal(false);
                    alert(`¡Gerente ${newManagerName} asignado correctamente a ${newManagerBranch}!`);
                  }} className="p-6 space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Nombre Completo</label>
                      <input 
                        type="text" 
                        required
                        value={newManagerName}
                        onChange={(e) => setNewManagerName(e.target.value)}
                        placeholder="Ej. Juan Pérez"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#00B8D9] transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Correo Electrónico</label>
                      <input 
                        type="email" 
                        required
                        value={newManagerEmail}
                        onChange={(e) => setNewManagerEmail(e.target.value)}
                        placeholder="juan.p@venpro.com"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#00B8D9] transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Sucursal Asignada</label>
                      <select 
                        value={newManagerBranch}
                        onChange={(e) => setNewManagerBranch(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#00B8D9] transition-all"
                      >
                        <option value="Sucursal Norte">Sucursal Norte</option>
                        <option value="Sucursal Sur">Sucursal Sur</option>
                        <option value="Sucursal Centro">Sucursal Centro</option>
                        <option value="Almacén Principal">Almacén Principal</option>
                      </select>
                    </div>
                    <div className="pt-4 flex gap-3">
                      <button 
                        type="button" 
                        onClick={() => setShowAddManagerModal(false)}
                        className="w-1/2 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-sm font-bold active:scale-95 transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        className="w-1/2 py-2.5 bg-[#00B8D9] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#009fb8] active:scale-95 transition-all"
                      >
                        Guardar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 min-h-0 flex-col bg-[#f9f9ff] font-sans md:flex-row">
            {/* Sidebar Left */}
            <aside className="hidden md:flex flex-col w-64 bg-[#001636]/90 border-r border-white/5 h-[calc(100vh-4rem)] sticky top-16 shrink-0 text-white z-20">
               <div className="p-6 flex items-center gap-3 border-b border-white/10">
                 <div className="w-10 h-10 rounded-lg bg-[#50dcff]/10 border border-[#50dcff]/20 flex items-center justify-center">
                   <User className="text-[#50dcff]" size={20} />
                 </div>
                 <div>
                   <p className="font-bold text-base text-white leading-none">Admin User</p>
                   <p className="text-slate-400 text-xs mt-1">Warehouse Manager</p>
                 </div>
               </div>
               <nav className="flex-1 py-4">
                 <button 
                   type="button"
                   onClick={() => alert('Estás en el flujo de configuración de equipo de Venpro.')}
                   className="w-full text-left flex items-center gap-3 px-6 py-3 text-slate-300 font-medium hover:bg-white/5 transition-all cursor-pointer"
                 >
                   <LayoutDashboard size={18} />
                   <span>Dashboard</span>
                 </button>
                 <button 
                   type="button"
                   className="w-full text-left flex items-center gap-3 px-6 py-3 border-l-4 border-[#00B8D9] text-[#50dcff] bg-white/5 font-bold cursor-pointer"
                 >
                   <Settings size={18} />
                   <span>Settings</span>
                 </button>
               </nav>
            </aside>

            <div className="flex flex-1 min-h-0 flex-col">
            {/* Main Content Pane */}
            <main className="flex-1 overflow-y-auto mobile-scroll-main p-4 md:p-12">
              <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                {/* Section Header */}
                <div className="space-y-2 text-center">
                  <h2 className="text-3xl md:text-4xl font-extrabold text-[#001636] tracking-tight">Gestiona tu Equipo</h2>
                  <p className="text-[#43474f] max-w-xl mx-auto text-sm md:text-base leading-relaxed">
                    Añade colaboradores para que puedan actualizar el inventario desde sus dispositivos.
                  </p>
                </div>

                {/* Conditional Onboarding content area (Empty State vs QR State) */}
                <div id="main-content-area">
                  {!showInvitarQR ? (
                    /* EMPTY STATE */
                    <div 
                      id="empty-state"
                      className="bg-white border border-slate-200 rounded-2xl p-10 md:p-12 text-center flex flex-col items-center gap-6 shadow-sm transition-all duration-300"
                    >
                      <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-[#001a36]">
                        <UserPlus size={40} className="text-[#001636]" />
                      </div>
                      <div className="max-w-md">
                        <h3 className="text-xl font-bold text-primary">No hay colaboradores aún</h3>
                        <p className="text-sm text-[#43474f] mt-2 leading-relaxed">
                          Empieza a digitalizar tu almacén permitiendo que tu equipo escanee y registre movimientos.
                        </p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowInvitarQR(true)}
                        className="bg-[#00B8D9] hover:bg-[#009fb8] text-white px-8 py-3.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 mt-2"
                      >
                        <Plus size={18} />
                        <span>Añadir Empleado</span>
                      </button>
                    </div>
                  ) : (
                    /* QR CODE INVITATION STATE */
                    <div className="animate-in fade-in zoom-in duration-300" id="qr-state">
                      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                          <h3 className="text-lg font-bold text-primary">Invitar Colaborador</h3>
                          <button 
                            type="button"
                            className="text-[#43474f] hover:text-primary transition-colors cursor-pointer"
                            onClick={() => setShowInvitarQR(false)}
                          >
                            <X size={20} />
                          </button>
                        </div>
                        <div className="p-10 flex flex-col items-center text-center space-y-6">
                          <div className="relative group flex justify-center items-center w-full">
                            <div className="absolute -inset-4 bg-[#00B8D9]/10 rounded-2xl blur-xl transition-all group-hover:bg-[#00B8D9]/25"></div>
                            <div className="relative bg-white p-5 rounded-2xl shadow-lg border border-slate-100">
                              <div className="w-60 h-60 bg-gradient-to-br from-[#001636] to-[#002a5c] rounded-xl p-4 relative flex items-center justify-center">
                                {/* Structured Mock QR Code Blocks */}
                                <div className="w-full h-full border-4 border-white/15 rounded-lg flex flex-wrap gap-2 overflow-hidden opacity-90 p-2">
                                  <div className="w-10 h-10 border-4 border-white rounded-md bg-transparent"></div>
                                  <div className="w-10 h-10 bg-white rounded-sm"></div>
                                  <div className="w-10 h-10 border-4 border-white rounded-md bg-transparent ml-auto"></div>
                                  <div className="w-full flex justify-between gap-1">
                                    <div className="w-12 h-6 bg-white/40 rounded-sm"></div>
                                    <div className="w-16 h-8 bg-white rounded-sm"></div>
                                  </div>
                                  <div className="w-10 h-10 border-4 border-white rounded-md bg-transparent mt-auto"></div>
                                  <div className="w-12 h-12 bg-white/50 rounded-sm ml-auto mt-auto"></div>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="bg-white p-3 rounded-xl shadow-md border border-slate-100">
                                    <Building2 className="text-[#001636]" size={32} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="max-w-md space-y-2">
                            <p className="text-base font-medium text-slate-800">Comparte este código con tu empleado para que se vincule a tu inventario.</p>
                            <p className="text-xs text-slate-400">Este código expirará en 24 horas por motivos de seguridad.</p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm pt-4">
                            <button 
                              type="button" 
                              className="flex-1 border-2 border-slate-200 hover:border-[#00B8D9] text-[#00687b] hover:text-[#00B8D9] py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all cursor-pointer"
                              onClick={() => alert('Enlace de invitación copiado al portapapeles con éxito.')}
                            >
                              <Share2 size={16} />
                              <span>Compartir</span>
                            </button>
                            <button 
                              type="button"
                              className="flex-1 bg-[#00B8D9] hover:bg-[#009fb8] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                              onClick={() => alert('Descargando archivo Venpro-Invite-QR.png...')}
                            >
                              <Download size={16} />
                              <span>Descargar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Collaborative Feature List */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                  <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
                    <div className="text-[#00687b] w-10 h-10 rounded-xl bg-[#22d3ee]/5 flex items-center justify-center">
                      <Wifi size={22} className="text-[#22d3ee]" />
                    </div>
                    <h4 className="font-bold text-primary">Sincronización Real</h4>
                    <p className="text-xs text-[#43474f] leading-relaxed">Los cambios realizados por tu equipo se reflejan instantáneamente.</p>
                  </div>
                  <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
                    <div className="text-[#00687b] w-10 h-10 rounded-xl bg-[#22d3ee]/5 flex items-center justify-center">
                      <ShieldCheck size={22} className="text-[#22d3ee]" />
                    </div>
                    <h4 className="font-bold text-primary">Control de Acceso</h4>
                    <p className="text-xs text-[#43474f] leading-relaxed">Define qué almacenes o acciones puede gestionar cada persona.</p>
                  </div>
                  <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm">
                    <div className="text-[#00687b] w-10 h-10 rounded-xl bg-[#22d3ee]/5 flex items-center justify-center">
                      <History size={22} className="text-[#001636]" />
                    </div>
                    <h4 className="font-bold text-primary">Historial de Auditoría</h4>
                    <p className="text-xs text-[#43474f] leading-relaxed">Rastrea exactamente quién actualizó qué producto y cuándo.</p>
                  </div>
                </div>
              </div>
            </main>

            {/* Bottom Action Footer bar matching the HTML design precisely */}
            <div className="mobile-form-footer-solid px-4 py-3 md:px-6 md:py-4 flex items-center justify-center gap-3 md:gap-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
              <button 
                type="button"
                onClick={() => {
                  setCurrentStep(2);
                  setShowInvitarQR(false);
                }}
                className="px-6 py-4 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl font-bold text-sm transition-all active:scale-95"
              >
                Atrás
              </button>
              <button 
                type="button"
                onClick={() => {
                  resetVerificationFlow();
                  setShowInvitarQR(false);
                  setCurrentStep(4);
                }}
                className="w-full max-w-sm bg-[#00B8D9] hover:bg-[#009fb8] text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>Continuar</span>
              </button>
            </div>
            </div>
          </div>
        )
      )}

      {/* Step 4: Verificación de identidad (todas las estructuras) */}
      {currentStep === 4 && renderIdentityVerification()}

      {/* Step 5: Detalles de Facturación & Propiedades */}
      {currentStep === 5 && (
        <main className="flex-1 overflow-y-auto mobile-scroll-main flex flex-col items-center justify-start md:justify-center px-4 py-6 md:py-8 relative bento-pattern bg-[#f9f9ff] animate-fade-in">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#64FFB1]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#001636]/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-md w-full z-10 bg-white border border-[#d2d4dc] rounded-2xl shadow-xl p-8 md:p-10 mx-auto">
            <div className="text-center mb-8">
              <span className="w-12 h-12 bg-[#00B8D9]/10 rounded-full flex items-center justify-center text-[#00B8D9] mx-auto mb-4">
                <Coins size={24} />
              </span>
              <h1 className="text-2xl font-extrabold text-[#001636] mb-2 font-sans tracking-tight">Facturación local</h1>
              <p className="text-[#43474f] text-xs">Configura la divisa principal y el impuesto para {regBusiness || 'tu negocio'}.</p>
            </div>

            <div className="space-y-6">
              {/* Currency Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#081b38] block uppercase tracking-wider">Divisa principal</label>
                <div className="grid grid-cols-4 gap-2">
                  {['$', '€', 'S/.', 'COP'].map((symbol) => (
                    <button
                      key={symbol}
                      type="button"
                      onClick={() => setConfigCurrency(symbol)}
                      className={`py-2 px-1.5 border rounded-xl font-bold text-xs transition-all duration-150 ${
                        configCurrency === symbol 
                          ? 'border-[#00B8D9] bg-[#00B8D9]/5 text-[#00B8D9] font-extrabold shadow-sm' 
                          : 'border-gray-200 text-[#43474f] hover:bg-slate-50'
                      }`}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tax input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#081b38] block uppercase tracking-wider">Tasa de Impuestos (%)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={configTax}
                  onChange={(e) => setConfigTax(Math.min(50, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-[#081b38] placeholder-gray-400 focus:outline-none focus:border-[#00B8D9] focus:ring-2 focus:ring-[#00B8D9]/20 transition-all font-sans"
                />
                <p className="text-[11px] text-gray-400 font-medium font-sans">IVA de ley para facturar y calcular rendimiento neto.</p>
              </div>

              {/* Informative box */}
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 leading-normal font-sans">
                💡 Al avanzar, crearemos un inventario piloto de <strong className="text-slate-700 capitalize text-sm">{selectedIndustry === 'restaurante' ? 'Restaurante' : 'Tienda de Ropa'}</strong> para que lo uses inmediatamente.
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <button 
                onClick={() => setCurrentStep(4)}
                className="w-1/3 py-2.5 border border-gray-200 text-[#43474f] font-bold rounded-xl text-center hover:bg-slate-50 transition-colors text-xs font-sans"
              >
                Atrás
              </button>
              <button 
                onClick={() => setCurrentStep(6)}
                className="w-2/3 bg-[#00B8D9] hover:bg-[#009cb9] text-white font-bold py-2.5 rounded-xl text-center shadow-lg shadow-[#00B8D9]/20 active:scale-[0.98] transition-all text-xs font-sans"
              >
                Siguiente
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Step 6: PIN / Seguridad */}
      {currentStep === 6 && (
        <main className="flex-1 overflow-y-auto mobile-scroll-main flex flex-col items-center justify-start md:justify-center px-4 py-6 md:py-8 relative bento-pattern bg-[#f9f9ff] animate-fade-in">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#64FFB1]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#001636]/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-md w-full z-10 bg-white border border-[#d2d4dc] rounded-2xl shadow-xl p-8 md:p-10 mx-auto font-sans">
            <div className="text-center mb-6">
              <span className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-[#002A5C] mx-auto mb-3">
                <Lock size={22} className="text-[#002A5C]" />
              </span>
              <h1 className="text-2xl font-extrabold text-[#001636] mb-1 font-sans tracking-tight">PIN de Seguridad</h1>
              <p className="text-[#43474f] text-xs leading-normal">Instaura un PIN de 4 dígitos para autorizar cierres de caja y modificaciones.</p>
            </div>

            {/* Bubble pin indicators */}
            <div className="flex justify-center space-x-4 my-6">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                    configPin.length > index
                      ? 'bg-[#00B8D9] border-[#00B8D9] scale-110 shadow-sm shadow-[#00B8D9]/30'
                      : 'border-slate-300 bg-white'
                  }`}
                />
              ))}
            </div>

            {/* Tactile Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto mb-6">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  className="w-full py-2 font-bold text-base text-[#001636] bg-slate-50 hover:bg-slate-100 rounded-xl active:bg-slate-200 transition-colors font-mono"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleKeypadClear}
                className="w-full py-2 text-[10px] text-red-600 hover:bg-red-50 font-bold rounded-xl transition-colors font-sans"
              >
                LIMPIAR
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="w-full py-2 font-bold text-base text-[#001636] bg-slate-50 hover:bg-slate-100 rounded-xl active:bg-slate-200 transition-colors font-mono"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleKeypadDelete}
                className="w-full py-2 flex items-center justify-center text-[#43474f] hover:bg-slate-100 rounded-xl transition-colors"
                title="Retroceder"
                aria-label="Retroceder"
              >
                <Delete size={18} />
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-600 font-semibold text-center mb-4">{error}</p>
            )}

            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setCurrentStep(5)}
                className="w-1/3 py-2.5 border border-gray-200 text-[#43474f] font-bold rounded-xl text-center hover:bg-slate-50 transition-colors text-xs font-sans"
              >
                Atrás
              </button>
              <button 
                type="button"
                onClick={handleFinishConfiguration}
                disabled={configPin.length !== 4 || isLoading}
                className={`w-2/3 py-2.5 text-white font-bold rounded-xl text-center shadow-lg active:scale-[0.98] transition-all text-xs flex items-center justify-center gap-2 ${
                  configPin.length === 4 && !isLoading
                    ? 'bg-[#002A5C] hover:bg-[#001c3d] shadow-indigo-900/10'
                    : 'bg-indigo-300 opacity-50 cursor-not-allowed shadow-none'
                }`}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={14} />
                    Finalizar
                  </>
                )}
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Decorative ambient elements */}
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-30">
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[#50dcff] blur-[120px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[300px] h-[300px] rounded-full bg-[#e0e8ff] blur-[100px]" />
      </div>
    </div>
  );
}
