import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, AlertTriangle, DollarSign, Boxes, FileText, Settings, LogOut,
  PlusCircle, Edit2, Trash2, Search, SlidersHorizontal, RotateCcw, Save, Check,
  ChevronRight, ArrowUpRight, BarChart3, ShoppingBag, Coins, Layers, MapPin, Phone,
  ArrowLeft, LayoutDashboard, History, Users, QrCode, Package, HelpCircle,
  User, Lock, Camera, X, GripVertical, Leaf, Egg, Droplet, Flame, Utensils, Menu, Building2,
  Calendar, Bell
} from 'lucide-react';
import { Product, Sale, StockTransaction, StoreConfig, IndustryType, RecipeComponent } from '@/types';
import {
  type CompositionIngredient,
  formatStockDisplay,
  getIngredientIconName,
  productToCompositionIngredient,
  recipeToCompositionIngredients,
} from '@/lib/restaurantProduct';
import ClothingStoreDashboard from '@/components/dashboards/ClothingStoreDashboard';
import DailySalesPanel, { type DailySalesPanelHandle } from '@/components/dashboards/DailySalesPanel';
import { getMaxCompoundSaleQuantity, isProductAvailableForSale } from '@/lib/compoundProduct';
import ClothingProductFields from '@/components/products/ClothingProductFields';
import { CLOTHING_CATEGORIES } from '@/data/clothingCatalog';
import OwnerInviteQrCode from '@/components/owner/OwnerInviteQrCode';
import VenproWordmark, { VENPRO_LOGO_SRC } from '@/components/brand/VenproWordmark';
import { getIndustryWelcomeSubtitle } from '@/lib/industry';
import { useVenproAuth } from '@/contexts/VenproAuthContext';
import { COUNTRY_PHONE_CODES, formatRegistrationPhone, parseStoredPhone } from '@/lib/phone';
import { STORAGE_KEYS } from '@/constants/storage';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, BarChart, Bar, Cell 
} from 'recharts';

interface OwnerPortalProps {
  products: Product[];
  sales: Sale[];
  transactions: StockTransaction[];
  config: StoreConfig;
  industry: IndustryType;
  onUpdateProducts: (newProducts: Product[]) => void;
  onUpdateSales: (newSales: Sale[]) => void;
  onUpdateTransactions: (newTransactions: StockTransaction[]) => void;
  onUpdateConfig: (newConfig: StoreConfig) => void;
  onBack: () => void;
  onLogout: () => void;
}

type TabType = 'dashboard' | 'inventario' | 'finanzas' | 'config' | 'historial' | 'personal' | 'qr' | 'ayuda';

export default function OwnerPortal({
  products,
  sales,
  transactions,
  config,
  industry,
  onUpdateProducts,
  onUpdateSales,
  onUpdateTransactions,
  onUpdateConfig,
  onBack,
  onLogout,
}: OwnerPortalProps) {
  const { profile } = useVenproAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [stockLevelFilter, setStockLevelFilter] = useState<'todos' | 'bajo' | 'suficiente'>('todos');
  const [showRecipeModal, setShowRecipeModal] = useState(false);

  // States for interactive custom recipe composition/editor matching attached HTML structure
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');
  const [compositionIngredients, setCompositionIngredients] = useState<CompositionIngredient[]>([]);
  const [editingCompoundProduct, setEditingCompoundProduct] = useState<Product | null>(null);

  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [justAddedNames, setJustAddedNames] = useState<string[]>([]);
  const [showProductTypeSelectionModal, setShowProductTypeSelectionModal] = useState(false);

  const [recipeName, setRecipeName] = useState('');
  const [recipeImage, setRecipeImage] = useState('');
  const [recipeCategory, setRecipeCategory] = useState('Alimentos');
  const [recipeSellPrice, setRecipeSellPrice] = useState(0);
  const recipeImageInputRef = useRef<HTMLInputElement>(null);

  const handleRecipeImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('La imagen es demasiado grande. El límite es de 3 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setRecipeImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Profile Settings state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultProfileImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBRUlu9gU9sqqe_bKfQlxLoiEN50vaaaQC7IyzhXxS9CYUwaR0rKOWf0Ro7vZquaNoKfhHpvlBA64hvz0m-3opxgYzNutfLx0rRQ73SWqsKCF74KDaAoMyc-KCu7OZGc1qLo4E0_1UAflpQk_kzRcmChiRfspVy1nuov3cPzt9H6Lr9uMF7VwheM0yPazFxRcrKShKs7ka0aRhwwBUa4xVNtghvfRpFuoTuVVe6eDog3WHhwQ7A-C_aGPVuYgwZCJSDgu9PjN-qJCKY';

  const [profileImage, setProfileImage] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.ownerProfileImage) || defaultProfileImage;
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('La imagen es demasiado grande. El límite es de 3 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setProfileImage(reader.result);
          localStorage.setItem(STORAGE_KEYS.ownerProfileImage, reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileCountryCode, setProfileCountryCode] = useState('+52');
  const [companyName, setCompanyName] = useState(config.storeName);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pinChangeEmail, setPinChangeEmail] = useState('');
  const [newPinValue, setNewPinValue] = useState('');
  const [confirmNewPinValue, setConfirmNewPinValue] = useState('');
  const [pinModalError, setPinModalError] = useState('');
  const [showQrHelpMenu, setShowQrHelpMenu] = useState(false);
  const [showClearInventoryModal, setShowClearInventoryModal] = useState(false);
  const [ownerInviteCode, setOwnerInviteCode] = useState(
    () => localStorage.getItem('venpro_invite_code') ?? '',
  );

  useEffect(() => {
    setOwnerInviteCode(localStorage.getItem('venpro_invite_code') ?? '');
  }, [profile?.organizationId]);

  const accountEmail = profile?.email || localStorage.getItem(STORAGE_KEYS.ownerProfileEmail) || '';

  const hydrateProfileFromSources = useCallback(() => {
    const parsedPhone = parseStoredPhone(config.phone || '');
    setProfileName(profile?.fullName || localStorage.getItem(STORAGE_KEYS.ownerProfileName) || '');
    setProfileEmail(accountEmail);
    setProfileCountryCode(parsedPhone.countryCode);
    setProfilePhone(parsedPhone.number);
    setCompanyName(config.storeName);
  }, [accountEmail, config.phone, config.storeName, profile?.fullName]);

  useEffect(() => {
    hydrateProfileFromSources();
  }, [hydrateProfileFromSources]);

  useEffect(() => {
    setCompanyName(config.storeName);
  }, [config.storeName]);

  const handleSaveProfile = () => {
    setIsSavingProfile(true);
    const formattedPhone = formatRegistrationPhone(profileCountryCode, profilePhone);

    setTimeout(() => {
      onUpdateConfig({
        ...config,
        storeName: companyName.trim() || config.storeName,
        phone: formattedPhone,
      });
      localStorage.setItem(STORAGE_KEYS.ownerProfileName, profileName.trim());
      if (profileEmail.trim()) {
        localStorage.setItem(STORAGE_KEYS.ownerProfileEmail, profileEmail.trim());
      }

      setIsSavingProfile(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }, 600);
  };

  const openPinChangeModal = () => {
    setPinChangeEmail(accountEmail);
    setNewPinValue('');
    setConfirmNewPinValue('');
    setPinModalError('');
    setShowPasswordModal(true);
  };

  const handleClearInventory = () => {
    setShowClearInventoryModal(true);
  };

  const confirmClearInventory = () => {
    onUpdateProducts([]);
    onUpdateTransactions([]);
    setShowClearInventoryModal(false);
  };

  const handlePinChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinModalError('');

    if (!pinChangeEmail.trim() || pinChangeEmail.trim().toLowerCase() !== accountEmail.toLowerCase()) {
      setPinModalError('El correo no coincide con el registrado en tu cuenta.');
      return;
    }

    if (!/^\d{4,6}$/.test(newPinValue)) {
      setPinModalError('El PIN debe tener entre 4 y 6 dígitos numéricos.');
      return;
    }

    if (newPinValue !== confirmNewPinValue) {
      setPinModalError('Los PIN ingresados no coinciden.');
      return;
    }

    onUpdateConfig({ ...config, ownerAccessPin: newPinValue });
    setShowPasswordModal(false);
    alert(`Se envió una confirmación del cambio de PIN a ${pinChangeEmail}. Tu nuevo PIN ya está activo.`);
  };

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  type ProductFormState = Omit<Product, 'id'> & { unit?: string; expiry?: string; isCompound?: boolean };

  const getEmptyProductForm = (): ProductFormState => ({
    code: '',
    name: '',
    category: industry === 'tienda' ? CLOTHING_CATEGORIES[0] : '',
    buyPrice: 0,
    sellPrice: industry === 'tienda' ? 1 : 1,
    quantity: 10,
    minStock: industry === 'tienda' ? 5 : 1,
    location: industry === 'tienda' ? 'Tienda principal' : '',
    image: '',
    unit: 'pza',
    expiry: '',
    isCompound: false,
    audience: industry === 'tienda' ? 'Clásicas' : undefined,
    sizes: industry === 'tienda' ? [] : undefined,
    colors: industry === 'tienda' ? [] : undefined,
  });

  const [productForm, setProductForm] = useState<ProductFormState>(getEmptyProductForm);

  const productImageInputRef = useRef<HTMLInputElement>(null);
  const dailySalesRef = useRef<DailySalesPanelHandle>(null);

  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es demasiado grande. El límite es de 5 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setProductForm(prev => ({ ...prev, image: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [isStockAdjustmentModalOpen, setIsStockAdjustmentModalOpen] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);
  const [stockAdjustmentQty, setStockAdjustmentQty] = useState(0);
  const [stockAdjustmentReason, setStockAdjustmentReason] = useState('Ajuste de almacén');
  const [stockAdjustmentType, setStockAdjustmentType] = useState<'addition' | 'subtraction'>('addition');

  // PIN validation for security
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // List of unique categories for selectors
  const categories = useMemo(() => {
    return ['Todas', ...Array.from(new Set(products.map(p => p.category)))];
  }, [products]);

  // Compute stats helper
  const stats = useMemo(() => {
    const totalStockValuationCost = products.reduce((sum, p) => sum + (p.quantity * p.buyPrice), 0);
    const totalStockValuationRetail = products.reduce((sum, p) => sum + (p.quantity * p.sellPrice), 0);
    const potentialProfit = totalStockValuationRetail - totalStockValuationCost;
    const totalItems = products.reduce((sum, p) => sum + p.quantity, 0);
    const lowStockItems = products.filter(p => p.quantity <= p.minStock).length;
    
    const totalSalesAmount = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    
    // Profit Calculation
    let totalRegisteredCost = 0;
    sales.forEach(s => {
      s.items.forEach(item => {
        totalRegisteredCost += (item.buyPrice * item.quantity);
      });
    });
    const totalProfitAmount = totalSalesAmount - totalRegisteredCost;

    return {
      stockCostValue: totalStockValuationCost,
      stockRetailValue: totalStockValuationRetail,
      potentialProfit,
      totalItems,
      lowStockItems,
      totalSalesAmount,
      totalProfitAmount
    };
  }, [products, sales]);

  // Prepare chart data for Sales Trend
  const salesChartData = useMemo(() => {
    // Group sales by day (last 7 days)
    const days: { [key: string]: { ventas: number, ganancia: number } } = {};
    
    // Initialise last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      days[dateStr] = { ventas: 0, ganancia: 0 };
    }

    sales.forEach(sale => {
      const dateStr = new Date(sale.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      if (days[dateStr] !== undefined) {
        days[dateStr].ventas += sale.totalAmount;
        
        // Calculate profit for this sale
        let cost = 0;
        sale.items.forEach(item => {
          cost += (item.buyPrice * item.quantity);
        });
        days[dateStr].ganancia += (sale.totalAmount - cost);
      }
    });

    return Object.keys(days).map(key => ({
      name: key,
      Ventas: parseFloat(days[key].ventas.toFixed(2)),
      Ganancias: parseFloat(days[key].ganancia.toFixed(2))
    }));
  }, [sales]);

  // Category chart data
  const categoryChartData = useMemo(() => {
    const cats: { [key: string]: { stock: number; cost: number } } = {};
    products.forEach(p => {
      if (!cats[p.category]) {
        cats[p.category] = { stock: 0, cost: 0 };
      }
      cats[p.category].stock += p.quantity;
      cats[p.category].cost += p.quantity * p.buyPrice;
    });

    return Object.keys(cats).map(key => ({
      name: key,
      Stock: cats[key].stock,
      ValorCost: parseFloat(cats[key].cost.toFixed(2))
    }));
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.code.includes(searchQuery) ||
                            p.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'Todas' || p.category === categoryFilter;
      
      let matchesStock = true;
      if (stockLevelFilter === 'bajo') {
        matchesStock = p.quantity <= p.minStock;
      } else if (stockLevelFilter === 'suficiente') {
        matchesStock = p.quantity > p.minStock;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchQuery, categoryFilter, stockLevelFilter]);

  const simpleProducts = useMemo(
    () => products.filter((p) => !p.isCompound),
    [products],
  );

  // Unlock pin handler
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === config.ownerAccessPin) {
      setIsLocked(false);
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  // Product Add / Edit Submit
  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (industry === 'tienda') {
      if (!productForm.sizes?.length) {
        alert('Selecciona al menos una talla disponible.');
        return;
      }
      if (!productForm.colors?.length) {
        alert('Selecciona al menos un color disponible.');
        return;
      }
    }

    const normalizedForm: ProductFormState = {
      ...productForm,
      buyPrice: productForm.buyPrice > 0 ? productForm.buyPrice : productForm.sellPrice * 0.55,
      location: productForm.location || (industry === 'tienda' ? 'Tienda principal' : ''),
      code:
        industry === 'restaurante' && !productForm.code.trim()
          ? `ING-${Date.now().toString().slice(-8)}`
          : productForm.code.trim(),
    };

    if (editingProduct) {
      // Edit mode
      const updatedProducts = products.map(p => 
        p.id === editingProduct.id ? { ...p, ...normalizedForm } : p
      );
      onUpdateProducts(updatedProducts);

      // Log transaction
      const diff = normalizedForm.quantity - editingProduct.quantity;
      if (diff !== 0) {
        const tr: StockTransaction = {
          id: 'tr-' + Date.now(),
          productId: editingProduct.id,
          productName: normalizedForm.name,
          type: diff > 0 ? 'addition' : 'subtraction',
          quantity: Math.abs(diff),
          reason: 'Modificación manual de ficha técnica',
          date: new Date().toISOString(),
          responsible: 'Propietario'
        };
        onUpdateTransactions([tr, ...transactions]);
      }
    } else {
      // Add mode
      const newProduct: Product = {
        id: 'prod-' + Date.now(),
        ...normalizedForm,
        unit: normalizedForm.unit,
      };
      onUpdateProducts([...products, newProduct]);

      // Stock transaction entry
      const tr: StockTransaction = {
        id: 'tr-' + Date.now(),
        productId: newProduct.id,
        productName: newProduct.name,
        type: 'addition',
        quantity: newProduct.quantity,
        reason: 'Registro inicial de nuevo producto',
        date: new Date().toISOString(),
        responsible: 'Propietario'
      };
      onUpdateTransactions([tr, ...transactions]);
    }

    setIsProductModalOpen(false);
    setEditingProduct(null);
    setProductForm(getEmptyProductForm());
  };

  // Open Edit Modal
  const openEditModal = (p: Product) => {
    if (industry === 'restaurante' && p.isCompound) {
      openCompoundForm(p);
      return;
    }
    setEditingProduct(p);
    setProductForm({
      code: p.code,
      name: p.name,
      category: p.category,
      buyPrice: p.buyPrice,
      sellPrice: p.sellPrice,
      quantity: p.quantity,
      minStock: p.minStock,
      location: p.location || '',
      image: p.image || '',
      unit: (p as ProductFormState).unit || 'pza',
      expiry: (p as ProductFormState).expiry || '',
      isCompound: p.isCompound || false,
      audience: p.audience ?? 'Clásicas',
      sizes: p.sizes ?? [],
      colors: p.colors ?? [],
    });
    setIsProductModalOpen(true);
  };

  const openSimpleProductForm = () => {
    setEditingProduct(null);
    setProductForm(getEmptyProductForm());
    setIsProductModalOpen(true);
  };

  // Open Add Product Modal
  const openAddModal = () => {
    if (industry === 'restaurante') {
      setShowProductTypeSelectionModal(true);
      return;
    }
    openSimpleProductForm();
  };

  const resetCompoundForm = () => {
    setEditingCompoundProduct(null);
    setRecipeName('');
    setRecipeImage('');
    setRecipeCategory('Alimentos');
    setRecipeSellPrice(0);
    setCompositionIngredients([]);
    setRecipeSearchQuery('');
  };

  const closeCompoundForm = () => {
    setShowRecipeForm(false);
    resetCompoundForm();
  };

  const openCompoundForm = (product?: Product) => {
    if (product?.isCompound) {
      setEditingCompoundProduct(product);
      setRecipeName(product.name);
      setRecipeImage(product.image ?? '');
      setRecipeCategory(product.category);
      setRecipeSellPrice(product.sellPrice);
      setCompositionIngredients(recipeToCompositionIngredients(product.recipe, products));
    } else {
      resetCompoundForm();
    }
    setRecipeSearchQuery('');
    setShowRecipeForm(true);
  };

  // Delete product with confirmation
  const handleDeleteProduct = (id: string, name: string) => {
    const productToDelete = products.find(p => p.id === id);
    if (!productToDelete) return;

    if (!confirm(`¿Está seguro de que desea eliminar el producto "${name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    const updated = products.filter(p => p.id !== id);
    onUpdateProducts(updated);

    const tr: StockTransaction = {
      id: 'tr-' + Date.now(),
      productId: id,
      productName: name,
      type: 'subtraction',
      quantity: productToDelete.quantity,
      reason: 'Eliminación del sistema',
      date: new Date().toISOString(),
      responsible: 'Propietario'
    };
    onUpdateTransactions([tr, ...transactions]);

    if (editingProduct?.id === id) {
      setEditingProduct(null);
      setIsProductModalOpen(false);
    }
    if (selectedProductForStock?.id === id) {
      setSelectedProductForStock(null);
      setIsStockAdjustmentModalOpen(false);
    }
  };

  // Quick Adjustment Submit
  const handleStockAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForStock) return;

    const modifier = stockAdjustmentType === 'addition' ? 1 : -1;
    const finalQty = Math.max(0, selectedProductForStock.quantity + (stockAdjustmentQty * modifier));

    const updated = products.map(p => 
      p.id === selectedProductForStock.id ? { ...p, quantity: finalQty } : p
    );
    onUpdateProducts(updated);

    // Stock transaction entry
    const tr: StockTransaction = {
      id: 'tr-' + Date.now(),
      productId: selectedProductForStock.id,
      productName: selectedProductForStock.name,
      type: stockAdjustmentType,
      quantity: stockAdjustmentQty,
      reason: stockAdjustmentReason,
      date: new Date().toISOString(),
      responsible: 'Propietario'
    };
    onUpdateTransactions([tr, ...transactions]);

    setIsStockAdjustmentModalOpen(false);
    setSelectedProductForStock(null);
    setStockAdjustmentQty(0);
  };

  const openStockModal = (p: Product) => {
    setSelectedProductForStock(p);
    setStockAdjustmentQty(5);
    setStockAdjustmentReason('Suministro / Reabastecimiento de bodega');
    setStockAdjustmentType('addition');
    setIsStockAdjustmentModalOpen(true);
  };

  const openCompoundSaleFromDashboard = (product: Product) => {
    if (!isProductAvailableForSale(product, products)) {
      alert('No hay stock suficiente de ingredientes para vender este platillo compuesto.');
      return;
    }

    dailySalesRef.current?.adjustProductQuantity(product.id, 1);
    document.getElementById('restaurant-daily-sales')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const getDashboardStockStatus = (product: Product) => {
    if (product.isCompound) {
      return { label: 'COMPUESTO', badgeClass: 'bg-blue-50 text-blue-600 border-blue-200' };
    }
    if (product.quantity <= 0) {
      return { label: 'AGOTADO', badgeClass: 'bg-[#ffdad6] text-[#ba1a1a] border-[#ba1a1a]/10' };
    }
    if (product.quantity <= product.minStock) {
      return { label: 'BAJO STOCK', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200' };
    }
    return { label: 'EN STOCK', badgeClass: 'bg-[#d1f2e5] text-[#0f5132] border-[#00a86a]/10' };
  };

  const getDashboardProductImage = (product: Product) =>
    product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=60';

  // Render Lock Screen if not authorized
  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#002A5C] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background blobs */}
        <div className="fixed inset-0 pointer-events-none opacity-20">
          <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[#50dcff] blur-[120px]" />
          <div className="absolute bottom-[-5%] left-[-5%] w-[300px] h-[300px] rounded-full bg-[#e0e8ff] blur-[100px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full relative z-10 border border-[#c4c6d1]"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#e0e8ff] flex items-center justify-center text-[#00687b] shadow-inner mb-2 p-3">
              <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2.2" y="13" width="3.5" height="8" rx="1" fill="#00AED1" />
                <rect x="6.9" y="9" width="3.5" height="12" rx="1" fill="#00AED1" />
                <rect x="11.6" y="5.5" width="3.5" height="15.5" rx="1" fill="#48F7A6" />
                <rect x="16.3" y="2" width="3.5" height="19" rx="1" fill="#48F7A6" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-[#081b38]">Control Propietario</h2>
            <p className="text-sm text-[#43474f]">
              Por razones de seguridad operacional, introduce tu PIN de acceso exclusivo.
            </p>

            <form onSubmit={handleUnlock} className="w-full space-y-4 pt-2">
              <div>
                <input
                  type="password"
                  placeholder="PIN secreto (por defecto: 1234)"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full text-center tracking-widest text-lg font-bold border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#00687b] bg-[#f9f9ff] text-[#081b38] border-[#c4c6d1]"
                  autoFocus
                />
                {pinError && (
                  <p className="text-red-600 text-xs mt-1 font-semibold flex items-center justify-center gap-1">
                    <AlertTriangle size={12} /> PIN incorrecto. Inténtalo de nuevo.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onBack}
                  className="flex-1 bg-[#f1f3ff] text-[#00687b] hover:bg-[#e0e8ff] p-3 rounded-xl font-semibold transition"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#002A5C] text-white hover:bg-[#003d7c] p-3 rounded-xl font-semibold transition shadow-md"
                >
                  Verificar
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }


  if (showRecipeForm) {
    const calculatedTotalCost = compositionIngredients.reduce(
      (total, item) => total + item.quantity * item.estimatedCost,
      0,
    );

    const filteredSimpleProducts = simpleProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(recipeSearchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(recipeSearchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(recipeSearchQuery.toLowerCase()),
    );

    const displaySku = editingCompoundProduct?.code ?? `VEN-${Date.now().toString().slice(-6)}`;

    const handleSaveComposition = () => {
      if (!recipeName.trim()) {
        alert('Ingresa el nombre del platillo compuesto.');
        return;
      }
      if (compositionIngredients.length === 0) {
        alert('Añade al menos una materia prima a la composición.');
        return;
      }

      const recipe: RecipeComponent[] = compositionIngredients.map((item, order) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        buyPrice: item.estimatedCost,
        order,
      }));

      const buyPrice = calculatedTotalCost;
      const sellPrice = recipeSellPrice > 0 ? recipeSellPrice : buyPrice * 1.5;

      if (editingCompoundProduct) {
        onUpdateProducts(
          products.map((p) =>
            p.id === editingCompoundProduct.id
              ? {
                  ...p,
                  name: recipeName.trim(),
                  category: recipeCategory.trim() || 'Alimentos',
                  image: recipeImage || undefined,
                  buyPrice,
                  sellPrice,
                  recipe,
                  isCompound: true,
                }
              : p,
          ),
        );
      } else {
        const newProduct: Product = {
          id: `prod-${Date.now()}`,
          code: `CMP-${Date.now().toString().slice(-8)}`,
          name: recipeName.trim(),
          category: recipeCategory.trim() || 'Alimentos',
          buyPrice,
          sellPrice,
          quantity: 0,
          minStock: 1,
          location: 'Cocina',
          image: recipeImage || undefined,
          isCompound: true,
          recipe,
        };
        onUpdateProducts([...products, newProduct]);

        const tr: StockTransaction = {
          id: `tr-${Date.now()}`,
          productId: newProduct.id,
          productName: newProduct.name,
          type: 'addition',
          quantity: 0,
          reason: 'Registro de producto compuesto',
          date: new Date().toISOString(),
          responsible: 'Propietario',
        };
        onUpdateTransactions([tr, ...transactions]);
      }

      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
        closeCompoundForm();
      }, 1500);
    };

    const handleAddIngredient = (product: Product) => {
      setJustAddedNames((prev) => [...prev, product.id]);
      setTimeout(() => {
        setJustAddedNames((prev) => prev.filter((id) => id !== product.id));
      }, 1000);

      const existing = compositionIngredients.find((i) => i.productId === product.id);
      if (existing) {
        setCompositionIngredients((prev) =>
          prev.map((i) =>
            i.productId === product.id
              ? { ...i, quantity: i.quantity + 1, stock: formatStockDisplay(product) }
              : i,
          ),
        );
      } else {
        setCompositionIngredients((prev) => [
          ...prev,
          productToCompositionIngredient(product),
        ]);
      }
    };

    const handleRemoveIngredient = (productId: string) => {
      setCompositionIngredients((prev) => prev.filter((item) => item.productId !== productId));
    };

    const handleUpdateQuantity = (productId: string, qty: number) => {
      const safeQty = Math.max(0.1, qty);
      setCompositionIngredients((prev) =>
        prev.map((item) => (item.productId === productId ? { ...item, quantity: safeQty } : item)),
      );
    };

    const handleMoveUp = (index: number) => {
      if (index === 0) return;
      setCompositionIngredients((prev) => {
        const next = [...prev];
        const temp = next[index];
        next[index] = next[index - 1];
        next[index - 1] = temp;
        return next;
      });
    };

    const formatCost = (val: number) => `${config.currencySymbol}${val.toFixed(3)}`;

    return (
      <div className="min-h-screen bg-[#F4F7FA] text-[#081b38] flex flex-col relative pb-32 font-sans applet-embed">
        
        {/* Success Toast */}
        {showSuccessToast && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
            <Check size={18} />
            <span>¡Composición guardada con éxito!</span>
          </div>
        )}

        {/* TopAppBar */}
        <header className="bg-[#002a5c] text-white w-full h-16 flex justify-between items-center px-6 md:px-10 sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <button 
              onClick={closeCompoundForm}
              className="hover:bg-white/10 p-2 rounded-full transition-colors flex items-center justify-center cursor-pointer"
            >
              <ArrowLeft className="text-white" size={24} />
            </button>
            <VenproWordmark className="text-2xl" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold hidden md:block uppercase tracking-wider text-slate-200">Detalles del producto</span>
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300">
              <img alt="User Profile" className="w-full h-full object-cover" src={profileImage} />
            </div>
          </div>
        </header>

        {/* Main layout */}
        <main className="max-w-[1440px] mx-auto w-full px-4 md:px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow pb-16">
          {/* Left Column */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Producto Principal Card */}
            <section className="bg-white border border-[#c4c6d1] rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#c4c6d1] pb-2 mb-4">
                <h2 className="text-[20px] font-semibold text-[#001636]">Producto Principal</h2>
                <span className="bg-[#50dcff] text-[#005f71] px-3 py-1 rounded-full text-xs font-semibold">Artículo Compuesto</span>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Clickable Image Selector / Camera Trigger */}
                <div 
                  onClick={() => recipeImageInputRef.current?.click()}
                  className="relative group cursor-pointer flex-shrink-0"
                >
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-lg bg-slate-50 overflow-hidden border-2 border-dashed border-[#c4c6d1] group-hover:border-[#00B8D9] flex items-center justify-center relative transition-all duration-300">
                    <img 
                      alt={recipeName} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      src={recipeImage} 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white text-center p-2">
                      <Camera size={20} className="mb-1" />
                      <span className="text-[10px] font-bold">Cambiar / Cámara</span>
                    </div>
                  </div>
                  {/* Floating Action Badge */}
                  <div className="absolute -bottom-2 -right-2 bg-[#00b8d9] text-white p-1.5 rounded-full shadow-md hover:bg-[#009cad] transition-colors">
                    <Camera size={14} />
                  </div>
                  <input 
                    type="file" 
                    ref={recipeImageInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleRecipeImageChange} 
                  />
                </div>

                <div className="flex-grow w-full space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#747780] mb-1.5">Nombre del Producto</label>
                    <input 
                      type="text"
                      value={recipeName}
                      onChange={(e) => setRecipeName(e.target.value)}
                      className="w-full text-lg md:text-xl font-bold text-[#081b38] bg-white border border-[#c4c6d1] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#00687b]/20 focus:border-[#00687b] outline-none transition-all placeholder:text-slate-400"
                      placeholder="Nombre del platillo compuesto..."
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#747780] mb-1">Categoría</label>
                      <input
                        type="text"
                        value={recipeCategory}
                        onChange={(e) => setRecipeCategory(e.target.value)}
                        className="w-full text-sm font-medium text-[#081b38] bg-white border border-[#c4c6d1] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#00687b]/20 focus:border-[#00687b] outline-none"
                        placeholder="Ej. Alimentos, Platillos"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#747780] mb-1">
                        Precio venta ({config.currencySymbol})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={recipeSellPrice || ''}
                        onChange={(e) => setRecipeSellPrice(parseFloat(e.target.value) || 0)}
                        className="w-full text-sm font-medium text-[#081b38] bg-white border border-[#c4c6d1] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#00687b]/20 focus:border-[#00687b] outline-none font-mono"
                        placeholder={calculatedTotalCost > 0 ? (calculatedTotalCost * 1.5).toFixed(2) : '0.00'}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-[#43474f] font-medium">SKU: {displaySku}</p>
                </div>
              </div>
            </section>

            {/* Componentes / Ingredientes Card */}
            <section className="bg-white border border-[#c4c6d1] rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[20px] font-semibold text-[#001636]">Componentes / Ingredientes</h2>
                <button className="flex items-center gap-1 text-[#00687b] text-xs font-semibold hover:underline cursor-pointer">
                  <History size={18} />
                  Historial
                </button>
              </div>

              <div className="space-y-2">
                {compositionIngredients.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-[#c4c6d1] rounded-lg p-8 text-center text-[#747780]">
                    No hay componentes seleccionados. Usa la lista para agregar.
                  </div>
                ) : (
                  compositionIngredients.map((item, index) => (
                    <div 
                      key={item.productId} 
                      className="flex items-center justify-between p-4 border border-[#c4c6d1] rounded-lg bg-white hover:border-[#00B8D9] hover:shadow-xs transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <button 
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="text-[#747780] cursor-grab active:cursor-grabbing hover:text-[#00B8D9] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Subir (reordenar)"
                        >
                          <GripVertical size={20} />
                        </button>
                        <div>
                          <p className="font-semibold text-[#081b38] text-sm md:text-base">{item.name}</p>
                          <p className="text-xs text-[#747780]">Stock: {item.stock}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                          <input 
                            className="w-16 border border-[#c4c6d1] rounded px-2 py-1 text-center font-sans focus:ring-2 focus:ring-[#00687b]/20 focus:border-[#00687b] outline-none text-sm" 
                            type="number" 
                            min="0.1"
                            step="0.1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQuantity(item.productId, parseFloat(e.target.value) || 0.1)}
                          />
                          <span className="font-sans text-[#43474f] text-sm w-8">{item.unit}</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleRemoveIngredient(item.productId)}
                          className="text-[#ba1a1a] hover:bg-[#ffdad6] p-2 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Assembly info note banner */}
              <div className="mt-4 p-4 border-2 border-dashed border-[#c4c6d1] rounded-lg flex flex-col items-center justify-center text-[#43474f] gap-2 bg-[#f1f3ff]/30 text-sm">
                <p>Arrastra elementos para reordenar la secuencia de ensamblaje.</p>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <section className="bg-white border border-[#c4c6d1] rounded-lg p-4 shadow-sm flex flex-col h-full">
              <div className="mb-4">
                <h2 className="text-[20px] font-semibold text-[#001636] mb-1">Añadir Componente</h2>
                <p className="text-xs text-[#43474f]">Busca y añade artículos simples a la composición.</p>
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#747780]" size={18} />
                <input 
                  className="w-full pl-10 pr-4 py-3 bg-[#f1f3ff] border border-[#c4c6d1] rounded-lg focus:ring-2 focus:ring-[#00687b]/20 focus:border-[#00687b] outline-none font-sans text-sm transition-all text-[#081b38]" 
                  placeholder="Buscar artículos simples..." 
                  type="text"
                  value={recipeSearchQuery}
                  onChange={(e) => setRecipeSearchQuery(e.target.value)}
                />
              </div>

              {/* Filtered List */}
              <div className="flex-grow space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {simpleProducts.length === 0 ? (
                  <div className="text-center py-8 text-[#747780] text-xs leading-relaxed px-4">
                    Aún no hay materias primas registradas. Cierra este formulario y añade artículos simples primero.
                  </div>
                ) : filteredSimpleProducts.length === 0 ? (
                  <div className="text-center py-8 text-[#747780] text-xs">
                    No se encontraron artículos simples con esa búsqueda.
                  </div>
                ) : (
                  filteredSimpleProducts.map((product) => {
                    const iconName = getIngredientIconName(product.category);
                    return (
                    <div 
                      key={product.id}
                      onClick={() => handleAddIngredient(product)}
                      className="flex items-center justify-between p-3 border border-[#c4c6d1] rounded hover:bg-white border-b hover:border-[#00B8D9] transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-[#e0e8ff] flex items-center justify-center text-[#00687b]">
                          {iconName === 'eco' && <Leaf size={20} />}
                          {iconName === 'egg' && <Egg size={20} />}
                          {iconName === 'kitchen' && <Droplet size={20} />}
                          {iconName === 'restaurant' && <Utensils size={20} />}
                          {iconName === 'lunch_dining' && <Flame size={20} />}
                        </div>
                        <div>
                          <p className="font-bold text-[#081b38] text-sm">{product.name}</p>
                          <p className="text-xs text-[#747780]">Stock: {formatStockDisplay(product)}</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        className={`w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all font-bold text-sm ${
                          justAddedNames.includes(product.id)
                            ? 'bg-emerald-500 text-white'
                            : 'bg-[#50dcff] hover:bg-[#00B8D9] text-[#005f71] hover:text-white'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddIngredient(product);
                        }}
                      >
                        {justAddedNames.includes(product.id) ? <Check size={14} /> : '+'}
                      </button>
                    </div>
                    );
                  })
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-[#c4c6d1]">
                <p className="text-[11px] text-[#747780] text-center">Solo se muestran Artículos Simples. Los artículos compuestos no pueden anidarse en esta versión.</p>
              </div>
            </section>
          </div>
        </main>

        {/* Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#c4c6d1] px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] font-sans">
          <div className="hidden md:flex flex-col">
            <p className="font-bold text-[#081b38] text-sm">Costo Total Estimado</p>
            <p className="text-xl md:text-2xl font-bold text-[#001636]">
              {formatCost(calculatedTotalCost)} <span className="text-xs font-normal text-[#747780]">/ unidad</span>
            </p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className="md:hidden flex flex-col text-left">
              <span className="text-[10px] uppercase font-bold text-[#747780]">Costo</span>
              <span className="text-lg font-extrabold text-[#001636]">{formatCost(calculatedTotalCost)}</span>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <button 
                type="button"
                onClick={closeCompoundForm}
                className="flex-1 md:flex-none px-6 py-3 font-bold text-[#081b38] border border-[#c4c6d1] rounded-lg hover:bg-[#f1f3ff] transition-colors cursor-pointer text-sm"
              >
                Descartar Cambios
              </button>
              <button 
                type="button"
                onClick={handleSaveComposition}
                className="flex-1 md:flex-none px-10 py-3 font-bold text-[#005f71] bg-[#50dcff] rounded-lg hover:bg-[#00B8D9] hover:text-white transition-all active:scale-95 shadow-sm text-sm cursor-pointer"
              >
                Guardar Composición
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sidebarNavItems: { tab: TabType; label: string; icon: React.ReactNode }[] = [
    { tab: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { tab: 'historial', label: 'Historial', icon: <History size={18} /> },
    { tab: 'personal', label: 'Personal', icon: <Users size={18} /> },
    { tab: 'qr', label: 'Enlace QR', icon: <QrCode size={18} /> },
    { tab: 'inventario', label: 'Stock', icon: <Package size={18} /> },
    { tab: 'finanzas', label: 'Ventas', icon: <Coins size={18} /> },
    { tab: 'config', label: 'Perfil', icon: <User size={18} /> },
    { tab: 'ayuda', label: 'Ayuda', icon: <HelpCircle size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#081b38] flex items-stretch font-sans">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 w-64 shrink-0 self-stretch min-h-screen h-screen lg:h-auto bg-[#002A5C] text-white flex flex-col border-r border-white/10 shadow-lg lg:shadow-none transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 border-b border-white/10 flex items-start justify-between shrink-0">
          <VenproWordmark showTagline={activeTab === 'dashboard'} />
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 bg-[#001c3d] p-3 rounded-xl border border-white/10">
            <img
              src={profileImage}
              alt={config.storeName}
              className="w-11 h-11 rounded-xl object-cover border border-[#50dcff]/30 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="text-left min-w-0">
              <p className="text-sm font-bold leading-tight text-white truncate">{config.storeName}</p>
              <p className="text-[10px] leading-tight text-[#abc7ff] font-medium uppercase tracking-wider">
                Portal del Propietario
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto min-h-0">
          {sidebarNavItems.map(({ tab, label, icon }) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-bold transition-all ${
                activeTab === tab
                  ? 'bg-white/10 text-[#50dcff] border-l-4 border-[#50dcff]'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white border-l-4 border-transparent'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 shrink-0 mt-auto">
          <button
            type="button"
            onClick={() => {
              setSidebarOpen(false);
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-red-300 hover:text-white hover:bg-red-500/15 border border-red-500/20 transition-all active:scale-95"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 w-full">

        {/* Mobile top bar */}
        <header className="lg:hidden fixed top-0 right-0 left-0 z-30 h-14 bg-[#002A5C] flex items-center justify-between px-4 border-b border-white/10 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-white/10 transition text-white shrink-0"
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>
            <VenproWordmark className="text-lg" />
          </div>
          <img
            src={VENPRO_LOGO_SRC}
            alt="Venpro"
            className="w-8 h-8 object-contain shrink-0"
          />
        </header>

        <main className="flex-1 pt-14 lg:pt-0 pb-8 bg-[#f9f9ff] w-full">
        <div className="p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          
          {/* Access label (sin botón atrás en el dashboard) */}
          {activeTab !== 'dashboard' && (
            <div className="flex items-center justify-between pb-2">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm text-[#002A5C] hover:text-[#00B8D9] font-bold transition-all group px-4 py-2 rounded-xl bg-white border border-[#c4c6d1] shadow-sm hover:shadow-md active:scale-95 duration-200"
              >
                <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
                <span>Volver Atrás</span>
              </button>
              <span className="text-xs text-gray-500 font-mono hidden sm:inline-block">Tipo de Acceso: <strong>Propietario</strong></span>
            </div>
          )}
          
          {/* Urgent Alert Banner (Dips under min threshold) */}
          {stats.lowStockItems > 0 && activeTab !== 'config' && activeTab !== 'dashboard' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#ffdad6] border border-[#ba1a1a]/20 p-4 rounded-xl flex items-center justify-between text-[#93000a] shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-[#ba1a1a] text-white">
                  <AlertTriangle size={18} />
                </span>
                <div>
                  <strong className="block text-sm font-bold md:text-base">Alerta de Existencias Críticas</strong>
                  <span className="text-xs md:text-sm">Hay {stats.lowStockItems} {stats.lowStockItems === 1 ? 'producto' : 'productos'} por debajo del umbral mínimo de seguridad.</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveTab('inventario');
                  setStockLevelFilter('bajo');
                }}
                className="text-xs uppercase tracking-wider font-extrabold hover:underline underline-offset-4 flex items-center gap-1"
              >
                Reponer <ChevronRight size={14} />
              </button>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
          {isProductModalOpen ? (
            <motion.div
              key="product-details-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-3xl w-full mx-auto"
            >
              {/* Back Navigation Bar */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="inline-flex items-center gap-2 text-[#002A5C] hover:text-[#00B8D9] font-bold transition-colors cursor-pointer text-sm"
                >
                  <ArrowLeft size={18} />
                  <span>Volver al Inventario</span>
                </button>
              </div>

              {/* Form Container */}
              <div className="bg-white border border-[#c4c6d1] rounded-2xl overflow-hidden shadow-sm">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  // Perform core submission function
                  handleProductSubmit(e);
                  // Close full screen form
                  setIsProductModalOpen(false);
                }} className="p-6 md:p-8 space-y-8">
                  {/* Photo Upload Section */}
                  <div className="space-y-3 text-left">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#002a5c] block">
                      Foto del producto <span className="text-[10px] font-normal text-slate-400 capitalize">(Opcional)</span>
                    </label>
                    <div 
                      onClick={() => productImageInputRef.current?.click()}
                      className="relative group cursor-pointer border-2 border-dashed border-[#c4c6d1] hover:border-[#00b8d9] rounded-2xl aspect-video md:aspect-[21/9] flex flex-col items-center justify-center bg-slate-50 transition-all overflow-hidden"
                    >
                      {productForm.image ? (
                        <>
                          <img 
                            src={productForm.image} 
                            alt={productForm.name || "Preview"} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white p-2">
                            <Camera size={26} className="mb-1" />
                            <span className="text-xs font-semibold">Cambiar imagen / Cámara</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center group-hover:scale-105 transition-transform text-center p-4">
                          <Camera size={36} className="text-slate-400 group-hover:text-[#00b8d9] mb-1.5 transition-colors" />
                          <span className="text-sm font-bold text-slate-500 group-hover:text-[#00b8d9] transition-colors">Subir imagen / Tomar Foto</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">Formatos JPG, PNG hasta 5MB.</p>
                        </div>
                      )}
                      <input 
                        type="file" 
                        ref={productImageInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleProductImageChange} 
                      />
                    </div>
                  </div>

                  {/* Section Title */}
                  <div className="pt-2 text-left border-t border-slate-100">
                    <h2 className="text-lg font-bold text-[#002a5c] tracking-tight">
                      {industry === 'tienda' ? 'Detalles de la prenda' : 'Detalles del producto'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {industry === 'tienda'
                        ? 'Registra la prenda con categoría, tallas, colores y código de barras'
                        : 'Especifica las propiedades principales en la ficha del catálogo'}
                    </p>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    {/* Product Name */}
                    <div className="md:col-span-2 space-y-2">
                      <label htmlFor="prod-name-field" className="text-xs font-bold uppercase tracking-wider text-[#002a5c] block">
                        {industry === 'tienda' ? 'Nombre de la Prenda' : 'Nombre del Producto'}
                      </label>
                      <input 
                        id="prod-name-field"
                        type="text"
                        required
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-[#c4c6d1] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8d9]/20 focus:border-[#00b8d9] transition-all text-[#081b38] placeholder:text-slate-300"
                        placeholder={industry === 'tienda' ? 'Ej: Blusa manga larga lino' : 'Ej: Café Espresso Premium'}
                      />
                    </div>

                    {industry === 'tienda' ? (
                      <ClothingProductFields productForm={productForm} setProductForm={setProductForm} />
                    ) : (
                      <div className="md:col-span-2 space-y-2">
                        <label htmlFor="prod-category-field" className="text-xs font-bold uppercase tracking-wider text-[#002a5c] block">
                          Categoría
                        </label>
                        <input
                          id="prod-category-field"
                          type="text"
                          required
                          value={productForm.category}
                          onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-[#c4c6d1] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8d9]/20 focus:border-[#00b8d9] transition-all text-[#081b38]"
                          placeholder="Ej: Carnes, Lácteos, Verduras"
                        />
                      </div>
                    )}

                    {/* Retail Unit */}
                    <div className="space-y-2">
                      <label htmlFor="prod-sell-field" className="text-xs font-bold uppercase tracking-wider text-[#002a5c] block">
                        Precio Unitario Venta ({config.currencySymbol})
                      </label>
                      <input 
                        id="prod-sell-field"
                        type="number"
                        step="0.01"
                        required
                        min="0"
                        value={productForm.sellPrice}
                        onChange={(e) => setProductForm({ ...productForm, sellPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 rounded-xl border border-[#c4c6d1] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8d9]/20 focus:border-[#00b8d9] transition-all text-[#081b38] font-mono"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="space-y-2">
                      <label htmlFor="prod-qty-field" className="text-xs font-bold uppercase tracking-wider text-[#002a5c] block">
                        {industry === 'tienda' ? 'Cantidad Disponible' : 'Cantidad Inicial'}
                      </label>
                      <div className="relative">
                        <input 
                          id="prod-qty-field"
                          type="number"
                          step={industry === 'tienda' ? '1' : '0.1'}
                          required
                          min="0"
                          value={productForm.quantity}
                          onChange={(e) => setProductForm({ ...productForm, quantity: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-4 pr-10 py-3 rounded-xl border border-[#c4c6d1] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8d9]/20 focus:border-[#00b8d9] transition-all text-[#081b38] font-mono"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                          <Layers size={18} />
                        </span>
                      </div>
                    </div>

                    {industry !== 'tienda' && (
                      <>
                        <div className="space-y-2">
                          <label htmlFor="prod-unit-field" className="text-xs font-bold uppercase tracking-wider text-[#002a5c] block">
                            Unidad de Medida
                          </label>
                          <div className="relative">
                            <select
                              id="prod-unit-field"
                              value={productForm.unit || 'pza'}
                              onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl border border-[#c4c6d1] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8d9]/20 focus:border-[#00b8d9] transition-all text-[#081b38] appearance-none"
                            >
                              <option value="pza">Piezas / Unidades</option>
                              <option value="kg">Kilogramos (kg)</option>
                              <option value="oz">Onzas (oz)</option>
                              <option value="lb">Libras (lb)</option>
                              <option value="gr">Gramos (gr)</option>
                            </select>
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                              <ChevronRight size={16} className="transform rotate-90" />
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="prod-expiry-field" className="text-xs font-bold uppercase tracking-wider text-[#002a5c] block">
                            Fecha de Caducidad <span className="text-[10px] font-normal text-slate-400 capitalize">(Opcional)</span>
                          </label>
                          <div className="relative">
                            <input
                              id="prod-expiry-field"
                              type="date"
                              value={productForm.expiry || ''}
                              onChange={(e) => setProductForm({ ...productForm, expiry: e.target.value })}
                              className="w-full pl-4 pr-10 py-3 rounded-xl border border-[#c4c6d1] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8d9]/20 focus:border-[#00b8d9] transition-all text-[#081b38]"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                              <Calendar size={18} />
                            </span>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Min Alert Stock */}
                    <div className="space-y-2">
                      <label htmlFor="prod-min-field" className="text-xs font-bold uppercase tracking-wider text-[#002a5c] block">
                        Alerta de Stock Mínimo
                      </label>
                      <div className="relative">
                        <input 
                          id="prod-min-field"
                          type="number"
                          required
                          min="0"
                          step={industry === 'restaurante' ? '0.1' : '1'}
                          value={productForm.minStock}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              setProductForm({ ...productForm, minStock: 0 });
                              return;
                            }
                            const parsed = industry === 'restaurante'
                              ? parseFloat(raw)
                              : parseInt(raw, 10);
                            if (!Number.isNaN(parsed) && parsed >= 0) {
                              setProductForm({ ...productForm, minStock: parsed });
                            }
                          }}
                          className="w-full pl-4 pr-10 py-3 rounded-xl border border-[#c4c6d1] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8d9]/20 focus:border-[#00b8d9] transition-all text-[#081b38] font-mono"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <Bell size={18} />
                        </span>
                      </div>
                      {industry === 'restaurante' && (
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          Define el umbral de alerta en la unidad del producto (ej. 0.5 kg, 2 L). Puede ser cualquier valor desde 0.
                        </p>
                      )}
                    </div>


                  </div>



                  {/* Form Actions */}
                  <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-6 border-t border-slate-100 w-full">
                    {editingProduct && (
                      <button 
                        type="button"
                        onClick={() => handleDeleteProduct(editingProduct.id, editingProduct.name)}
                        className="w-full sm:w-auto px-6 py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2 cursor-pointer mr-auto"
                      >
                        <Trash2 size={16} />
                        <span>Eliminar de catálogo</span>
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => setIsProductModalOpen(false)}
                      className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-bold text-[#43474f] hover:bg-[#e0e8ff]/50 hover:text-[#002A5C] transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="w-full sm:w-auto px-10 py-3 bg-[#00b8d9] text-white rounded-xl text-sm font-bold shadow-md hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Save size={16} />
                      <span>{editingProduct ? 'Guardar Cambios' : industry === 'tienda' ? 'Guardar Prenda' : 'Guardar Producto'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          ) : (
            <>
            {/* Dashboard Tab — Tienda de ropa */}
            {activeTab === 'dashboard' && industry === 'tienda' && (
              <ClothingStoreDashboard
                config={config}
                products={products}
                sales={sales}
                transactions={transactions}
                stats={{ totalItems: stats.totalItems, lowStockItems: stats.lowStockItems }}
                categories={categories}
                categoryFilter={categoryFilter}
                searchQuery={searchQuery}
                filteredProducts={filteredProducts}
                onCategoryFilterChange={setCategoryFilter}
                onSearchQueryChange={setSearchQuery}
                onAddProduct={() => openAddModal()}
                onEditProduct={openEditModal}
                onDeleteProduct={handleDeleteProduct}
                onUpdateProducts={onUpdateProducts}
                onUpdateSales={onUpdateSales}
                onUpdateTransactions={onUpdateTransactions}
              />
            )}

            {/* Dashboard Tab — Restaurante gourmet */}
            {activeTab === 'dashboard' && industry === 'restaurante' && (() => {
            const today = new Date();
            const todaySales = sales.filter((s) => {
              const d = new Date(s.date);
              return (
                d.getDate() === today.getDate() &&
                d.getMonth() === today.getMonth() &&
                d.getFullYear() === today.getFullYear()
              );
            });
            const totalRevenueToday = todaySales.reduce((tot, s) => tot + s.totalAmount, 0);
            const stockDeductionToday = todaySales.reduce(
              (sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
              0,
            );

            const lowStockProducts = products.filter(p => p.quantity <= p.minStock);

            return (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Header Welcome Area */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#c4c6d1] shadow-sm">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-[#002A5C] tracking-tight">
                      Bienvenido: {config.storeName}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 font-medium">
                      {getIndustryWelcomeSubtitle('restaurante')}
                    </p>
                  </div>
                  <button 
                    onClick={() => openAddModal()}
                    className="bg-[#00B8D9] text-white hover:bg-[#009cad] py-3 px-6 rounded-xl font-bold text-sm transition-all duration-300 shadow-md flex items-center justify-center gap-2 active:scale-95"
                  >
                    <PlusCircle size={18} />
                    <span>Añadir Artículo</span>
                  </button>
                </div>

                {/* Main Bento Grid layout exactly matching HTML template layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column (Stats: Ventas Diarias & Alertas Críticas) */}
                  <div className="lg:col-span-4 space-y-6">
                    
                    {/* Ventas Diarias Card */}
                    <div className="bg-white p-6 rounded-2xl border border-[#c4c6d1] shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Ventas Diarias</h3>
                        <span className="text-xs bg-[#e9edff] text-[#00687b] px-2 py-1 rounded-md font-bold">Hoy</span>
                      </div>
                      <div className="space-y-2">
                        <span className="text-3xl md:text-4xl font-extrabold text-[#002A5C] block tracking-tight">
                          {config.currencySymbol}{totalRevenueToday.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {stockDeductionToday > 0 && (
                          <div className="flex items-center gap-2 text-[#00a86a] font-bold text-sm bg-emerald-50 border border-emerald-100 py-1.5 px-3 rounded-lg w-fit">
                            <TrendingUp size={16} />
                            <span>Deducción de Stock: -{stockDeductionToday} uds</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Alertas Críticas Card */}
                    <div className="bg-white p-6 rounded-2xl border border-[#c4c6d1] shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Alertas Críticas</h3>
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                      </div>
                      <p className="text-xs text-gray-500 mb-4 font-medium">Disponibilidad por debajo del límite de seguridad</p>
                      
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {lowStockProducts.length === 0 ? (
                          <p className="text-xs text-gray-400 font-medium py-2">Sin alertas activas. Todo el inventario está por encima del mínimo.</p>
                        ) : (
                          lowStockProducts.map(product => {
                            const isCritical = product.quantity <= 0;
                            return (
                              <div
                                key={product.id}
                                onClick={() => openStockModal(product)}
                                className={`flex items-center justify-between p-3 rounded-xl transition-colors border cursor-pointer ${
                                  isCritical
                                    ? 'bg-[#ffdad6]/40 hover:bg-[#ffdad6]/60 border-[#ffdad6]'
                                    : 'bg-orange-50 hover:bg-orange-100 border-orange-100'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${isCritical ? 'bg-red-600 animate-ping' : 'bg-orange-500'}`} />
                                  <span className={`text-sm font-bold truncate ${isCritical ? 'text-[#ba1a1a]' : 'text-orange-700'}`}>
                                    {product.name}
                                  </span>
                                </div>
                                <span className={`text-xs font-extrabold bg-white/60 px-2.5 py-1 rounded-lg shrink-0 ml-2 ${isCritical ? 'text-red-700' : 'text-orange-800'}`}>
                                  {product.quantity} u / mín {product.minStock}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Right Column (Inventory Grid Cards) */}
                  <div className="lg:col-span-8 space-y-6">
                    
                    {/* Inventario Header Controls */}
                    <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl border border-[#c4c6d1] shadow-sm">
                      <h3 className="font-extrabold text-[#002A5C] text-lg">
                        Inventario Actual
                        <span className="ml-2 text-sm font-bold text-gray-400">({products.length})</span>
                      </h3>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setActiveTab('inventario')}
                          className="p-2 text-gray-500 hover:text-[#002A5C] hover:bg-slate-100 rounded-lg transition-colors" 
                          title="Filtros"
                        >
                          <SlidersHorizontal size={18} />
                        </button>
                        <button 
                          onClick={() => setActiveTab('inventario')}
                          className="p-2 text-gray-500 hover:text-[#002A5C] hover:bg-slate-100 rounded-lg transition-colors" 
                          title="Buscar"
                        >
                          <Search size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {products.length === 0 ? (
                        <div className="col-span-full bg-white border border-dashed border-[#c4c6d1] rounded-2xl p-12 text-center">
                          <Package className="mx-auto text-gray-300 mb-3" size={40} />
                          <p className="text-gray-500 font-semibold">No hay artículos en el inventario</p>
                          <p className="text-xs text-gray-400 mt-1 mb-4">Agrega tu primer producto para verlo aquí con imagen y detalles.</p>
                          <button
                            type="button"
                            onClick={() => openAddModal()}
                            className="bg-[#00B8D9] text-white hover:bg-[#009cad] py-2.5 px-5 rounded-xl font-bold text-sm transition-all inline-flex items-center gap-2"
                          >
                            <PlusCircle size={16} />
                            Añadir Artículo
                          </button>
                        </div>
                      ) : (
                        products.map(product => {
                          const stockStatus = getDashboardStockStatus(product);
                          const availabilityPercentage = product.minStock > 0
                            ? Math.min(100, Math.round((product.quantity / product.minStock) * 100))
                            : 100;

                          return (
                            <div
                              key={product.id}
                              onClick={() => {
                                if (product.isCompound) {
                                  openCompoundSaleFromDashboard(product);
                                } else {
                                  openStockModal(product);
                                }
                              }}
                              className={`bg-white border border-[#c4c6d1] hover:-translate-y-1 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group relative flex flex-col cursor-pointer ${
                                product.isCompound ? 'hover:border-blue-200' : 'hover:border-[#00B8D9]/40'
                              }`}
                            >
                              <div className="relative h-40 bg-slate-100 overflow-hidden">
                                <img
                                  src={getDashboardProductImage(product)}
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  referrerPolicy="no-referrer"
                                />
                                <span className={`absolute top-3 right-3 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg border shadow-sm ${stockStatus.badgeClass}`}>
                                  {stockStatus.label}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteProduct(product.id, product.name);
                                  }}
                                  className="absolute top-3 left-3 bg-[#ffdad6] hover:bg-red-600 hover:text-white text-red-700 p-2 rounded-lg border border-[#ba1a1a]/10 shadow-sm transition-all z-20"
                                  title="Eliminar"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>

                              <div className="p-4 space-y-3 flex-1">
                                <div>
                                  <h4 className="font-bold text-[#002A5C] text-base group-hover:text-[#00B8D9] transition-colors">{product.name}</h4>
                                  <p className="text-[10px] text-gray-400 font-mono tracking-wider mt-0.5">{product.code}</p>
                                </div>

                                <div className="text-xs space-y-1 text-gray-500">
                                  <p className="flex justify-between">
                                    <span>Categoría:</span>
                                    <strong className="text-slate-700">{product.category}</strong>
                                  </p>
                                  <p className="flex justify-between">
                                    <span>Precio venta:</span>
                                    <strong className="text-slate-800">{config.currencySymbol}{product.sellPrice.toFixed(2)}</strong>
                                  </p>
                                  <p className="flex justify-between">
                                    <span>{product.isCompound ? 'Disponible para venta:' : 'Cantidad actual:'}</span>
                                    <strong className="text-slate-800">
                                      {product.isCompound
                                        ? `${getMaxCompoundSaleQuantity(product, products)} u`
                                        : `${product.quantity} u`}
                                    </strong>
                                  </p>
                                  <p className="flex justify-between border-t border-slate-50 pt-1">
                                    <span>Stock mínimo:</span>
                                    <strong className="text-slate-600">{product.minStock} u</strong>
                                  </p>
                                  {product.location && (
                                    <p className="flex justify-between border-t border-slate-50 pt-1">
                                      <span>Ubicación:</span>
                                      <strong className="text-slate-600 text-right max-w-[55%] truncate">{product.location}</strong>
                                    </p>
                                  )}
                                </div>

                                {product.isCompound && (
                                  <div className="space-y-1 pt-1">
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-gray-500">Disponibilidad:</span>
                                      <strong className={`${availabilityPercentage < 100 ? 'text-orange-600' : 'text-blue-600'} font-bold`}>
                                        {availabilityPercentage}%
                                      </strong>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full transition-all duration-300 ${availabilityPercentage < 100 ? 'bg-orange-500' : 'bg-blue-500'}`}
                                        style={{ width: `${availabilityPercentage}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {product.isCompound && (
                                <div className="p-4 pt-0 border-t border-slate-50 flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openCompoundForm(product);
                                    }}
                                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs py-1.5 px-3 rounded-lg font-bold transition-colors"
                                  >
                                    Receta
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>

                </div>

                <DailySalesPanel
                  ref={dailySalesRef}
                  products={products}
                  sales={sales}
                  transactions={transactions}
                  config={config}
                  industry="restaurante"
                  panelId="restaurant-daily-sales"
                  onUpdateProducts={onUpdateProducts}
                  onUpdateSales={onUpdateSales}
                  onUpdateTransactions={onUpdateTransactions}
                />

                {/* Recipe Modal Overlay */}
                <AnimatePresence>
                  {showRecipeModal && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-[#001636]/75 z-[999] flex items-center justify-center p-4 backdrop-blur-sm"
                    >
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white p-6 rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl relative"
                      >
                        <h4 className="text-lg font-bold text-[#002A5C] flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                          <span>Fórmula / Receta de Hamburguesa Clásica</span>
                        </h4>
                        
                        <div className="space-y-4">
                          <p className="text-xs text-gray-500 leading-relaxed">
                            Esta es una ficha técnica de costeo y composición del platillo compuesto. El sistema descuenta de forma prorrateada los ingredientes individuales cada vez que se consolida una venta.
                          </p>

                          <div className="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="flex justify-between text-xs font-bold text-gray-700">
                              <span>Ingrediente</span>
                              <span>Ratio Necesario</span>
                            </div>
                            
                            <div className="flex justify-between text-xs pt-1 border-t border-gray-100 text-[#43474f]">
                              <span>Carne de Res</span>
                              <span>0.20 kg / pz</span>
                            </div>

                            <div className="flex justify-between text-xs pt-1 border-t border-gray-100 text-[#43474f]">
                              <span>Pan de Brioche</span>
                              <span>1.00 u / pz</span>
                            </div>

                            <div className="flex justify-between text-xs pt-1 border-t border-gray-100 text-[#43474f]">
                              <span>Tomate Saladet</span>
                              <span>0.05 kg / pz</span>
                            </div>
                          </div>

                          <div className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-center gap-2">
                            <span>💡 La disponibilidad del platillo compuesto depende del stock actual de sus ingredientes en inventario.</span>
                          </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                          <button 
                            type="button"
                            onClick={() => setShowRecipeModal(false)}
                            className="bg-[#002A5C] text-white hover:bg-[#003d7c] font-bold text-sm px-6 py-2 rounded-xl transition"
                          >
                            Cerrar
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })()}

          {/* Catalog / Inventory Tab */}
          {activeTab === 'inventario' && (
            <motion.div
              key="inventario"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Section Utilities Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#c4c6d1]">
                
                {/* Search query input */}
                <div className="flex-1 max-w-md relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar producto por nombre, código o sección..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#f9f9ff] text-sm text-[#081b38] border border-[#c4c6d1] rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#00687b]"
                  />
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Category toggle */}
                  <div className="flex items-center gap-1">
                    <SlidersHorizontal size={14} className="text-gray-500" />
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="text-xs md:text-sm bg-[#f9f9ff] text-[#081b38] border border-[#c4c6d1] p-2 rounded-lg font-semibold focus:outline-none focus:ring-1 focus:ring-[#00687b]"
                    >
                      {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Stock level criteria */}
                  <select
                    value={stockLevelFilter}
                    onChange={(e) => setStockLevelFilter(e.target.value as any)}
                    className="text-xs md:text-sm bg-[#f9f9ff] text-[#081b38] border border-[#c4c6d1] p-2 rounded-lg font-semibold focus:outline-none focus:ring-1 focus:ring-[#00687b]"
                  >
                    <option value="todos">Todos los niveles</option>
                    <option value="bajo">Bajo Stock ⚠️</option>
                    <option value="suficiente">Stock Óptimo ✅</option>
                  </select>

                  {/* Add action button */}
                  <button
                    onClick={() => openAddModal()}
                    className="bg-[#002A5C] text-white text-xs md:text-sm hover:bg-[#003d7c] px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-sm"
                  >
                    <PlusCircle size={16} /> Registar Producto
                  </button>
                </div>
              </div>

              {/* Products Grid Canvas */}
              <div className="bg-white rounded-2xl border border-[#c4c6d1] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f9f9ff] border-b border-[#c4c6d1] text-[#43474f] font-bold text-xs uppercase tracking-wider">
                        <th className="p-4 w-12"></th>
                        <th className="p-4">Producto / Código</th>
                        <th className="p-4">Categoría</th>
                        <th className="p-4 text-right">Precio venta</th>
                        <th className="p-4 text-center">Unidades</th>
                        <th className="p-4 text-right">Gestionar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-10 text-center text-gray-400">
                            No se encontraron productos que coincidan con la búsqueda o criterios de filtración.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map(p => {
                          const isLowStock = p.quantity <= p.minStock;
                          return (
                            <tr key={p.id} className="hover:bg-[#f9f9ff]/50 transition-colors">
                              <td className="p-4">
                                {p.image ? (
                                  <img 
                                    src={p.image} 
                                    alt={p.name} 
                                    referrerPolicy="no-referrer"
                                    className="w-10 h-10 object-cover rounded-lg shadow-sm" 
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-[#e8edff] flex items-center justify-center text-[#00687b] font-bold">
                                    {p.name.charAt(0)}
                                  </div>
                                )}
                              </td>
                              <td className="p-4">
                                <span className="block font-semibold text-[#081b38] leading-tight">{p.name}</span>
                                <span className="text-[10px] text-gray-400 font-mono tracking-wider">{p.code}</span>
                              </td>
                              <td className="p-4">
                                <span className="inline-block px-2.5 py-1 text-xs bg-[#e8edff] text-[#00687b] rounded-md font-semibold">
                                  {p.category}
                                </span>
                              </td>
                              <td className="p-4 text-right font-mono font-bold text-gray-900">
                                {config.currencySymbol}{p.sellPrice.toFixed(2)}
                              </td>
                              <td className="p-4 text-center">
                                <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold font-mono ${
                                  isLowStock 
                                    ? 'bg-[#ffdad6] text-red-700 animate-pulse' 
                                    : 'bg-emerald-50 text-emerald-800'
                                }`}>
                                  {p.quantity} u
                                </span>
                                {isLowStock && (
                                  <span className="block text-[9px] text-red-600 font-bold mt-0.5 uppercase tracking-wide">Mín {p.minStock}</span>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {/* Quick Stock supply */}
                                  <button
                                    onClick={() => openStockModal(p)}
                                    title="Ajustar Stock"
                                    className="p-1.5 hover:bg-[#50dcff]/20 text-[#00687b] rounded-lg transition"
                                  >
                                    <Layers size={15} />
                                  </button>
                                  {/* Edit catalog entry */}
                                  <button
                                    onClick={() => openEditModal(p)}
                                    title="Editar Ficha"
                                    className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg transition"
                                  >
                                    <Edit2 size={15} />
                                  </button>
                                  {/* Delete */}
                                  <button
                                    onClick={() => handleDeleteProduct(p.id, p.name)}
                                    title="Eliminar"
                                    className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Capital ledger / Financial reports */}
          {activeTab === 'finanzas' && (
            <motion.div
              key="finanzas"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Financial calculations info row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl border border-[#c4c6d1] shadow-sm">
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Inversión Actual Activa</h4>
                  <p className="text-3xl font-extrabold text-[#081b38] font-mono mt-1">
                    {config.currencySymbol}{stats.stockCostValue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-xs text-gray-400 block mt-2">Capital congelado en mercaderías en almacén.</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-[#c4c6d1] shadow-sm">
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Margen de Margen Promedio</h4>
                  <p className="text-3xl font-extrabold text-blue-800 font-mono mt-1">
                    {stats.stockCostValue > 0
                      ? `${((stats.potentialProfit / stats.stockCostValue) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </p>
                  <span className="text-xs text-gray-400 block mt-2">Rentabilidad bruta esperada respecto a costos de compra.</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-[#c4c6d1] shadow-sm">
                  <h4 className="text-sm font-bold text-[#00a86a] uppercase tracking-wide">Utilidad Líquida Consolidada</h4>
                  <p className="text-3xl font-extrabold text-[#005231] font-mono mt-1">
                    {config.currencySymbol}{stats.totalProfitAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-xs text-teal-600 block mt-2 font-semibold">Crecimiento real libre después de descontar el costo de compra.</span>
                </div>
              </div>

              {/* Transaction Logs area */}
              <div className="bg-white p-5 rounded-2xl border border-[#c4c6d1] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-[#081b38] text-base">Libro de Ventas y Boletas</h4>
                    <p className="text-xs text-gray-500">Historial secuencial de operaciones comerciales liquidadas</p>
                  </div>
                  <button 
                    onClick={() => {
                      if (confirm('¿Desea limpiar el libro de ventas actual para iniciar un nuevo ciclo fiscal?')) {
                        onUpdateSales([]);
                      }
                    }}
                    className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-100 transition flex items-center gap-1"
                  >
                    <RotateCcw size={12} /> Reiniciar Libro
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-[#c4c6d1] text-[#43474f] font-bold text-xs uppercase bg-[#f9f9ff]">
                        <th className="p-3">Boleta ID</th>
                        <th className="p-3">Fecha y Hora</th>
                        <th className="p-3">Artículos del Carrito</th>
                        <th className="p-3">Cajero</th>
                        <th className="p-3">Forma de Pago</th>
                        <th className="p-3 text-right">Monto Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 font-medium">
                      {sales.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-400">
                            Ninguna boleta registrada. Las ventas completadas aparecerán aquí.
                          </td>
                        </tr>
                      ) : (
                        sales.map(s => (
                          <tr key={s.id} className="hover:bg-[#f9f9ff]">
                            <td className="p-3 font-mono font-bold text-[#00687b]">{s.id}</td>
                            <td className="p-3 text-xs text-gray-500">
                              {new Date(s.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-3 text-xs text-gray-600">
                              <div className="space-y-0.5">
                                {s.items.map((it, idx) => (
                                  <span key={idx} className="block">
                                    • {it.name} <span className="text-gray-400 font-semibold">({it.quantity}x)</span>
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                s.responsible === 'Propietario' ? 'bg-[#50dcff]/20 text-[#00687b]' : 'bg-[#e0e8ff] text-blue-800'
                              }`}>
                                {s.responsible}
                              </span>
                            </td>
                            <td className="p-3 text-xs text-gray-500 font-semibold">{s.paymentMethod}</td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-700">
                              {config.currencySymbol}{s.totalAmount.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Physical Inventory Transactions Trail */}
              <div className="bg-white p-5 rounded-2xl border border-[#c4c6d1] shadow-sm space-y-4">
                <h4 className="font-bold text-[#081b38] text-base">Bitácora de Auditoría Física de Almacén</h4>
                <p className="text-xs text-gray-500">Historial interno de ingresos, mermas, hurtos y reposiciones de stock</p>

                <div className="overflow-y-auto max-h-60 border rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="sticky top-0 bg-gray-50 border-b border-gray-100 p-2 font-bold text-gray-500 uppercase">
                        <th className="p-2.5">Fecha</th>
                        <th className="p-2.5">Producto</th>
                        <th className="p-2.5">Responsable</th>
                        <th className="p-2.5">Descripción de Ajuste</th>
                        <th className="p-2.5 text-center">Variación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 font-mono text-gray-600">
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-gray-400 font-sans">
                            No se registran movimientos logísticos en esta sesión.
                          </td>
                        </tr>
                      ) : (
                        transactions.map(t => (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="p-2.5 text-[10px]">
                              {new Date(t.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-2.5 font-bold">{t.productName}</td>
                            <td className="p-2.5">{t.responsible}</td>
                            <td className="p-2.5 font-sans italic">{t.reason}</td>
                            <td className="p-2.5 text-center font-bold">
                              <span className={t.type === 'addition' ? 'text-emerald-600' : 'text-red-500'}>
                                {t.type === 'addition' ? '+' : '-'}{t.quantity}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Perfil de Usuario Tab */}
          {activeTab === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Hero Profile Section */}
              <section className="w-full bg-gradient-to-b from-[#002a5c] to-[#001636] py-12 px-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden border border-white/10 shadow-lg">
                {/* Decorative atmospheric elements */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[150%] bg-[radial-gradient(circle,_#00B8D9_0%,_transparent_70%)]"></div>
                </div>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group cursor-pointer"
                  title="Haz clic para cambiar la imagen de perfil"
                >
                  <div className="w-32 h-32 md:w-36 md:h-36 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white flex items-center justify-center relative">
                    <img 
                      alt="User Profile" 
                      className="w-full h-full object-cover transition-all group-hover:brightness-75 animate-fade-in" 
                      src={profileImage}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Camera size={22} className="text-white mb-1" />
                      <span className="text-[9px] text-white font-bold uppercase tracking-wider">Cambiar</span>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                
                <div className="mt-4 text-center z-10">
                  <h1 className="text-xl md:text-2xl font-bold text-white">{profileName}</h1>
                  <p className="text-xs text-[#abc7ff]/80 font-medium">Administrador de Inventario</p>
                </div>
              </section>

              {/* Form Section */}
              <div className="w-full max-w-2xl mx-auto">
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-[#c4c6d1] shadow-sm space-y-8">
                  {/* Company Info Section */}
                  <div className="space-y-6">
                    <h3 className="text-base font-bold text-[#081b38] border-b border-[#c4c6d1] pb-2 flex items-center gap-2">
                      <Building2 size={18} className="text-[#00B8D9]" /> Datos de la Empresa
                    </h3>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre de la Empresa</label>
                      <input
                        className="w-full bg-white border border-[#CBD5E0] px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B8D9]/20 focus:border-[#00B8D9] text-sm text-[#081b38] font-semibold"
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Nombre registrado en el alta del negocio"
                      />
                      <p className="text-[10px] text-gray-400">Este nombre se muestra en la barra lateral y en el dashboard.</p>
                    </div>
                  </div>

                  {/* Personal Info Section */}
                  <div className="space-y-6">
                    <h3 className="text-base font-bold text-[#081b38] border-b border-[#c4c6d1] pb-2 flex items-center gap-2">
                      <User size={18} className="text-[#00B8D9]" /> Información Personal
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre Completo</label>
                        <input
                          className="w-full bg-white border border-[#CBD5E0] px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B8D9]/20 focus:border-[#00B8D9] text-sm text-[#081b38] font-semibold"
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Correo Electrónico</label>
                        <input
                          className="w-full bg-[#F8FAFC] border border-[#CBD5E0] px-4 py-3 rounded-lg text-sm text-[#081b38] font-semibold"
                          type="email"
                          value={profileEmail}
                          readOnly
                        />
                      </div>

                      <div className="flex flex-col gap-2 md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Teléfono</label>
                        <div className="flex gap-2">
                          <select
                            className="w-[42%] min-w-[8.5rem] bg-[#F8FAFC] border border-[#CBD5E0] px-2 py-3 rounded-lg text-xs text-[#081b38] font-semibold focus:outline-none focus:ring-2 focus:ring-[#00B8D9]/20 focus:border-[#00B8D9]"
                            value={profileCountryCode}
                            onChange={(e) => setProfileCountryCode(e.target.value)}
                          >
                            {COUNTRY_PHONE_CODES.map(({ code, label }) => (
                              <option key={code} value={code}>
                                {label}
                              </option>
                            ))}
                          </select>
                          <input
                            className="flex-1 bg-white border border-[#CBD5E0] px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B8D9]/20 focus:border-[#00B8D9] text-sm text-[#081b38] font-semibold"
                            type="tel"
                            value={profilePhone}
                            onChange={(e) => setProfilePhone(e.target.value.replace(/[^\d\s-]/g, ''))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security Section */}
                  <div className="space-y-6">
                    <h3 className="text-base font-bold text-[#081b38] border-b border-[#c4c6d1] pb-2 flex items-center gap-2">
                      <Lock size={18} className="text-[#00B8D9]" /> Seguridad
                    </h3>
                    <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-[#e8edff]/20 border border-[#e8edff]/50 rounded-xl gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#00687b]/10 text-[#00687b]">
                          <Lock size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#081b38]">PIN de Acceso Dueño</p>
                          <p className="text-xs text-gray-500">Último cambio hace 3 meses</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={openPinChangeModal}
                        className="w-full md:w-auto px-6 py-2.5 border border-[#00B8D9] text-[#00B8D9] rounded-lg text-xs font-bold hover:bg-[#00B8D9]/5 transition-colors cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                      >
                        Cambiar PIN de Acceso
                      </button>
                    </div>
                  </div>

                  {/* Notification Settings */}
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-[#081b38] border-b border-[#c4c6d1] pb-2 flex items-center gap-2">
                      <Settings size={18} className="text-[#00B8D9]" /> Preferencias
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[#081b38]">Notificaciones por Correo</span>
                        <span className="text-xs text-gray-500">Alertas de stock bajo y reportes diarios</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={emailNotifications} 
                          onChange={(e) => setEmailNotifications(e.target.checked)} 
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00B8D9]"></div>
                      </label>
                    </div>
                  </div>

                  {/* Store / Branch Settings */}
                  <div className="space-y-6 pt-2">
                    <h3 className="text-base font-bold text-[#081b38] border-b border-[#c4c6d1] pb-2">
                      Configuraciones de Local
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Moneda / Divisa</label>
                        <input
                          type="text"
                          value={config.currencySymbol}
                          onChange={(e) => onUpdateConfig({ ...config, currencySymbol: e.target.value })}
                          className="w-full text-xs font-semibold p-2.5 border rounded-lg focus:ring-1 focus:ring-[#00687b] bg-[#f9f9ff] text-[#081b38] border-[#c4c6d1]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dirección Física</label>
                        <input
                          type="text"
                          value={config.address}
                          onChange={(e) => onUpdateConfig({ ...config, address: e.target.value })}
                          className="w-full text-xs font-semibold p-2.5 border rounded-lg focus:ring-1 focus:ring-[#00687b] bg-[#f9f9ff] text-[#081b38] border-[#c4c6d1]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tasa de IVA / Impuestos (%)</label>
                        <input
                          type="number"
                          value={config.taxRate}
                          onChange={(e) => onUpdateConfig({ ...config, taxRate: parseFloat(e.target.value) || 0 })}
                          className="w-full text-xs font-semibold p-2.5 border rounded-lg focus:ring-1 focus:ring-[#00687b] bg-[#f9f9ff] text-[#081b38] border-[#c4c6d1]"
                        />
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className="text-left w-full sm:w-auto">
                        <strong className="block text-xs font-bold text-red-600 uppercase">Herramientas Críticas</strong>
                        <span className="text-[10px] text-gray-400 block mt-0.5">
                          Vacía el catálogo de productos y los movimientos de stock. No afecta ventas ni configuraciones.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearInventory}
                        className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-4 py-2 rounded-xl border border-red-200 transition flex items-center gap-1.5 self-start sm:self-center"
                      >
                        <RotateCcw size={14} /> Borrar todo el inventario
                      </button>
                    </div>
                  </div>

                  {/* Save Profile Actions */}
                  <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row gap-4">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      className="flex-grow order-2 md:order-1 px-8 py-3.5 bg-[#00B8D9] text-white rounded-xl font-bold hover:brightness-110 shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      {isSavingProfile ? (
                        <>
                          <span className="animate-spin text-sm">⏳</span>
                          <span>Guardando Cambios...</span>
                        </>
                      ) : saveSuccess ? (
                        <>
                          <Check size={18} className="text-white" />
                          <span>¡Guardado con Éxito!</span>
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          <span>Guardar Cambios</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        hydrateProfileFromSources();
                        setEmailNotifications(true);
                      }}
                      className="order-1 md:order-2 px-8 py-3.5 text-gray-500 hover:text-gray-700 font-bold hover:bg-gray-100 transition-colors rounded-xl active:opacity-80"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Historial de Inventario Tab */}
          {activeTab === 'historial' && (
            <motion.div
              key="historial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 rounded-2xl border border-[#c4c6d1] shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#081b38] flex items-center gap-2">
                      <History className="text-[#00B8D9]" /> Historial de Inventario
                    </h3>
                    <p className="text-xs text-gray-500">Bitácora oficial de auditoría secuencial de movimientos físicos de stock en almacén.</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[#f9f9ff] p-4 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Total Registros</span>
                    <p className="text-2xl font-black text-[#081b38] font-mono mt-1">{transactions.length}</p>
                  </div>
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-600 font-bold uppercase">Entradas</span>
                    <p className="text-2xl font-black text-emerald-700 font-mono mt-1">
                      {transactions.filter(t => t.type === 'addition').length}
                    </p>
                  </div>
                  <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
                    <span className="text-[10px] text-red-500 font-bold uppercase">Salidas / Ajustes</span>
                    <p className="text-2xl font-black text-red-700 font-mono mt-1">
                      {transactions.filter(t => t.type === 'subtraction').length}
                    </p>
                  </div>
                </div>

                {/* Logistics table */}
                <div className="mt-6 overflow-x-auto border border-[#c4c6d1] rounded-xl">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#f9f9ff] border-b border-[#c4c6d1] text-[#43474f] font-bold text-xs uppercase">
                        <th className="p-3">Fecha y Hora</th>
                        <th className="p-3">Producto</th>
                        <th className="p-3">Responsable</th>
                        <th className="p-3">Descripción de Movimiento</th>
                        <th className="p-3 text-center">Variación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-gray-400">
                            No hay transacciones registradas hasta el momento.
                          </td>
                        </tr>
                      ) : (
                        transactions.map(t => (
                          <tr key={t.id} className="hover:bg-gray-50/50">
                            <td className="p-3 text-xs text-gray-500 font-mono">
                              {new Date(t.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="p-3 font-bold text-[#081b38]">{t.productName}</td>
                            <td className="p-3">
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#e0e8ff] text-[#264679]">
                                {t.responsible}
                              </span>
                            </td>
                            <td className="p-3 text-gray-600 text-xs italic">{t.reason}</td>
                            <td className="p-3 text-center font-mono font-bold">
                              <span className={t.type === 'addition' ? 'text-emerald-600' : 'text-red-500'}>
                                {t.type === 'addition' ? '+' : '-'}{t.quantity}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Administración de Personal Tab */}
          {activeTab === 'personal' && (
            <motion.div
              key="personal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 rounded-2xl border border-[#c4c6d1] shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-[#081b38] flex items-center gap-2">
                    <Users className="text-[#00B8D9]" /> Administración de Personal
                  </h3>
                  <p className="text-xs text-gray-500">Gestión de colaboradores autorizados para emitir boletas y auditar stock en cajas locales.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 border border-[#c4c6d1] rounded-xl bg-[#f9f9ff]">
                    <span className="text-xs text-gray-400 font-bold block uppercase">Cajeros Activos</span>
                    <span className="text-xl font-extrabold mt-1 block">2 Colaboradores</span>
                  </div>
                  <div className="p-4 border border-[#c4c6d1] rounded-xl bg-[#f9f9ff]">
                    <span className="text-xs text-gray-400 font-bold block uppercase">Licencia Sistema</span>
                    <span className="text-xl font-extrabold mt-1 block text-emerald-600">Premium Plan</span>
                  </div>
                  <div className="p-4 border border-[#c4c6d1] rounded-xl bg-[#f9f9ff]">
                    <span className="text-xs text-gray-400 font-bold block uppercase">IP Terminal Local</span>
                    <span className="text-xl font-extrabold mt-1 block font-mono">192.168.1.100</span>
                  </div>
                </div>

                <h4 className="font-bold text-[#081b38] text-base mt-8">Colaboradores de Confianza</h4>
                <div className="mt-4 overflow-x-auto border rounded-xl">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#f9f9ff] border-b text-xs font-bold text-[#43474f] uppercase">
                        <th className="p-3">Nombre</th>
                        <th className="p-3">Rol</th>
                        <th className="p-3">Permisos</th>
                        <th className="p-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      <tr>
                        <td className="p-4 flex items-center gap-3">
                          <img 
                            src={profileImage}
                            alt="Alejandro" 
                            className="w-10 h-10 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="font-bold text-[#081b38]">{profileName}</p>
                            <p className="text-[10px] text-gray-400 font-mono">ID: PROP-001</p>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-bold text-blue-900">Propietario / Administrador Principal</td>
                        <td className="p-4 text-xs text-gray-500">Lectura, Escritura, Configuración, Borrado total de Fábrica</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">PROPIETARIO</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-4 flex items-center gap-3">
                          <img 
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWly33-2gCelcUtumhdP7xDc8w8WV7FqhxREPzP_-t3S5DEbO6VC0W9IStdirgx2xSo7eNyJhNcNGnTZP60Baz2y_beMrH48sHF66xP_zdtnjezp_KZeR6N8xysdFct3YFaqY_GUTnW8ZearjC-1CSRKzzh2NoxKTUzZipkXFoltCFl2v51HDCyKgwAMy1pV8t_Yf2Vyg4d2WWeyf8kebiAaIcpTVuDkoxNFr3TRzEGaIdXcxeLjdhj_B03x-USg8L0DBiRLiSOcsc"
                            alt="Cajero" 
                            className="w-10 h-10 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="font-bold text-[#081b38]">Admin User</p>
                            <p className="text-[10px] text-gray-400 font-mono">ID: COLAB-024</p>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-semibold text-gray-600">Cajero / Almacén</td>
                        <td className="p-4 text-xs text-gray-500">Registrar ventas, Descontar stock, Lectura de inventario básico</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-[#005231] font-bold">ACTIVO</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-[#f9f9ff] p-5 rounded-2xl border border-dashed border-[#c4c6d1] mt-6 flex flex-col md:flex-row items-center gap-4 justify-between">
                  <div>
                    <h4 className="font-bold text-[#081b38] text-sm">¿Deseas conectar una nueva tablet o laptop de caja?</h4>
                    <p className="text-xs text-gray-500 max-w-xl">
                      Para dar de alta a un ayudante de ventas en otro dispositivo sin compartir tu PIN de dueño principal, ve a la pestaña de "Generar Código QR".
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('qr')}
                    className="px-4 py-2 bg-[#002A5C] text-white hover:bg-[#00B8D9] text-xs font-bold rounded-xl transition duration-200"
                  >
                    Ir a Generar QR
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Generar Código QR Tab */}
          {activeTab === 'qr' && (
            <motion.div
              key="qr"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              <div className="bg-white p-6 rounded-2xl border border-[#c4c6d1] shadow-sm text-center">
                <div className="inline-flex p-3 bg-blue-50 text-[#002A5C] rounded-2xl mb-4">
                  <QrCode size={36} />
                </div>
                <h3 className="font-bold text-[#081b38] text-lg">Código QR de Enlace Terminal</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                  Muestra este QR a tus cajeros o ayudantes desde su dispositivo de caja para sincronizar los {products.length} productos automáticamente.
                </p>

                <div className="my-8 flex justify-center">
                  <div className="bg-white p-6 border-2 border-dashed border-[#002A5C] rounded-3xl shadow-md relative">
                    <div className="w-56 h-56 bg-slate-50 border border-gray-100 rounded-2xl flex items-center justify-center p-4">
                      <OwnerInviteQrCode inviteCode={ownerInviteCode} size={180} />
                    </div>
                    <span className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-[#00B8D9] text-[#002A5C] text-[9px] font-black px-3 py-1 rounded-full uppercase shadow">
                      VINCULADOR SEGURO
                    </span>
                  </div>
                </div>

                {ownerInviteCode && (
                  <p className="text-[10px] text-gray-400 font-mono mb-4">
                    Código: {ownerInviteCode}
                  </p>
                )}

                <div className="bg-[#f9f9ff] text-left p-4 rounded-xl border space-y-2 max-w-md mx-auto">
                  <p className="text-xs font-bold text-[#081b38] uppercase">Vinculación de Cajas Rápidas:</p>
                  <ol className="text-xs text-gray-500 list-decimal pl-4 space-y-1">
                    <li>Abre Venpro en la tablet o teléfono de caja de tu colaborador.</li>
                    <li>Selecciona &quot;Soy un empleado&quot; y completa tu registro.</li>
                    <li>Escanea este código QR para vincular tu cuenta al negocio.</li>
                  </ol>
                </div>
              </div>
            </motion.div>
          )}

          {/* Ayuda Tab */}
          {activeTab === 'ayuda' && (
            <motion.div
              key="ayuda"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              <div className="bg-white p-6 rounded-2xl border border-[#c4c6d1] shadow-sm">
                <h3 className="text-lg font-bold text-[#081b38] flex items-center gap-2">
                  <HelpCircle className="text-[#00B8D9]" /> Centro de Soporte & Respuestas
                </h3>
                <p className="text-xs text-gray-500">Guía de operación de la plataforma Venpro.</p>

                <div className="mt-6 space-y-4">
                  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                    <h4 className="font-bold text-xs text-[#081b38] uppercase">¿Cómo se actualiza el stock?</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      En la pestaña <strong>Inventory</strong>, haz clic en el icono del lápiz ubicado a la derecha de cualquier producto para ajustar su precio, cantidad física, ubicación de anaquel, y stock mínimo permitido.
                    </p>
                  </div>

                  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                    <h4 className="font-bold text-xs text-[#081b38] uppercase">¿Qué significa el stock mínimo?</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Si el producto baja del límite mínimo definido, se desplegará una alerta preventiva naranja brillante en las cabeceras avisándote que es momento de reponer existencias para evitar pérdidas de venta.
                    </p>
                  </div>

                  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                    <h4 className="font-bold text-xs text-[#081b38] uppercase">¿Es seguro para mis empleados?</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Sí, tus ayudantes entran a través de su portal propio de "Caja" sin acceso a configuraciones fiscales de IVA, precios de costo o el PIN del propietario principal del negocio.
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#e0e8ff]/30 rounded-xl border border-blue-50">
                    <h5 className="font-bold text-xs text-[#002A5C] uppercase">Soporte Técnico Directo</h5>
                    <p className="text-xs text-gray-500 mt-1">Asistencia técnica exclusiva de Venpro:</p>
                    <div className="mt-3 text-xs font-mono font-bold space-y-1 text-gray-700">
                      <p>📞 +1 (800) VENPRO-SOS</p>
                      <p>✉️ soporte@venpro.io</p>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50/30 rounded-xl border border-emerald-100 flex flex-col justify-between">
                    <div>
                      <h5 className="font-bold text-xs text-emerald-800 uppercase">Consultoría Segura</h5>
                      <p className="text-xs text-gray-500 mt-1">Asesoría para sincronizaciones multi-sucursales de inventario local.</p>
                    </div>
                    <button 
                      onClick={() => alert('¡Soporte Técnico Venpro activado! En breve se desplegará el canal de ayuda.')}
                      className="mt-3 px-3 py-2 bg-[#00a86a] text-white hover:bg-[#005231] font-bold text-xs rounded-xl transition"
                    >
                      Asistente en Línea
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          </>
          )}
        </AnimatePresence>
        </div>
      </main>

      {/* MODAL 0: Product Type Selection (Simple vs Compound) */}
      <AnimatePresence>
        {showProductTypeSelectionModal && (
          <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <div className="flex flex-col">
                  <h3 className="text-lg font-bold text-[#002a5c] tracking-tight">¿Qué tipo de artículo deseas registrar?</h3>
                  <p className="text-xs text-slate-500 font-medium">Selecciona la modalidad para configurar el nuevo producto en tu catálogo</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProductTypeSelectionModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-100/50 hover:bg-slate-100 p-2 rounded-full cursor-pointer focus:outline-none"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50">
                {/* Card 1: Materia Prima / Artículo Simple */}
                <div 
                  onClick={() => {
                    setShowProductTypeSelectionModal(false);
                    openSimpleProductForm();
                  }}
                  className="bg-white p-5 border border-slate-200 rounded-2xl hover:border-[#002a5c] hover:shadow-lg transition-all duration-300 flex flex-col justify-between group cursor-pointer text-left"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-[#002a5c] transition-colors group-hover:bg-[#002a5c] group-hover:text-white">
                      <Package size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-[#081b38] group-hover:text-[#002a5c] transition-colors">Materia Prima</h4>
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-500 inline-block mt-0.5">Artículo Simple</span>
                      <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
                        Ingredientes base o mercancías que se compran directamente y se venden o almacenan individuales. (Ej. Pan brioche, verduras, enlatados)
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between text-xs font-bold text-[#002a5c]">
                    <span>Registrar Simple</span>
                    <ChevronRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Card 2: Producto Compuesto / Platillo */}
                <div 
                  onClick={() => {
                    setShowProductTypeSelectionModal(false);
                    openCompoundForm();
                  }}
                  className="bg-white p-5 border border-slate-200 rounded-2xl hover:border-[#00B8D9] hover:shadow-lg transition-all duration-300 flex flex-col justify-between group cursor-pointer text-left"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-[#00b8d9] transition-colors group-hover:bg-[#00B8D9] group-hover:text-white">
                      <Layers size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-[#081b38] group-hover:text-[#00B8D9] transition-colors">Producto Compuesto</h4>
                      <span className="text-[10px] bg-sky-50 px-2 py-0.5 rounded-full font-bold text-sky-600 inline-block mt-0.5">Fórmula de Receta</span>
                      <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
                        Platillos combinados o preparados a partir de una receta de múltiples materias primas. Descuenta stock proporcional del almacén. (Ej. Hamburguesa Especial)
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between text-xs font-bold text-[#00B8D9]">
                    <span>Configurar Receta</span>
                    <ChevronRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-100/50 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400 font-medium">Los artículos compuestos heredan costos estimados en base a sus ingredientes</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 1: Product Add / Edit Dialog */}
      <AnimatePresence>
        {false && (
          <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-[#c4c6d1] overflow-hidden"
            >
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-[#081b38]">
                  {editingProduct ? 'Editar Ficha Logística' : 'Ingresar Nuevo Producto'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleProductSubmit} className="space-y-4 pt-4 max-h-[75vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Comercial</label>
                    <input
                      type="text"
                      required
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="e.g. Papas Fritas 100g"
                      className="w-full text-xs p-2 border rounded-lg focus:ring-1 focus:ring-[#00687b] bg-[#f9f9ff] text-[#081b38] border-[#c4c6d1]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Código de Barras EAN</label>
                    <input
                      type="text"
                      required
                      value={productForm.code}
                      onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                      placeholder="e.g. 7501055..."
                      className="w-full text-xs p-2 border rounded-lg focus:ring-1 focus:ring-[#00687b] bg-[#f9f9ff] text-[#081b38] border-[#c4c6d1] font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoría</label>
                    <input
                      type="text"
                      required
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      placeholder="e.g. Snacks, Bebidas"
                      className="w-full text-xs p-2 border rounded-lg focus:ring-1 focus:ring-[#00687b] bg-[#f9f9ff] text-[#081b38] border-[#c4c6d1]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sección / Ubicación Almacén</label>
                    <input
                      type="text"
                      value={productForm.location}
                      onChange={(e) => setProductForm({ ...productForm, location: e.target.value })}
                      placeholder="e.g. Pasillo 3A"
                      className="w-full text-xs p-2 border rounded-lg focus:ring-1 focus:ring-[#00687b] bg-[#f9f9ff] text-[#081b38] border-[#c4c6d1]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Costo Unitario Compra ({config.currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      value={productForm.buyPrice}
                      onChange={(e) => setProductForm({ ...productForm, buyPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs p-2 border rounded-lg focus:ring-1 focus:ring-[#00687b] bg-[#f9f9ff] text-[#081b38] border-[#c4c6d1] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio Unitario Venta ({config.currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      value={productForm.sellPrice}
                      onChange={(e) => setProductForm({ ...productForm, sellPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs p-2 border rounded-lg focus:ring-1 focus:ring-[#00687b] bg-[#f9f9ff] text-[#081b38] border-[#c4c6d1] font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stock Físico Inicial</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={productForm.quantity}
                      onChange={(e) => setProductForm({ ...productForm, quantity: parseInt(e.target.value, 10) || 0 })}
                      className="w-full text-xs p-2 border rounded-lg focus:ring-1 focus:ring-[#00687b] bg-[#f9f9ff] text-[#081b38] border-[#c4c6d1] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mínimo de Alerta Crítica</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={productForm.minStock}
                      onChange={(e) => setProductForm({ ...productForm, minStock: parseInt(e.target.value, 10) || 5 })}
                      className="w-full text-xs p-2 border rounded-lg focus:ring-1 focus:ring-[#00687b] bg-[#f9f9ff] text-[#081b38] border-[#c4c6d1] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Enlace HTML de Imagen Ilustrativa</label>
                  <input
                    type="url"
                    value={productForm.image}
                    onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full text-xs p-2 border rounded-lg focus:ring-1 focus:ring-[#00687b] bg-[#f9f9ff] text-[#081b38] border-[#c4c6d1]"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">Deja vacío para autogenerar miniatura por nombre</span>
                </div>

                {productForm.sellPrice <= productForm.buyPrice && (
                  <p className="text-red-600 text-[10px] font-semibold">
                    ⚠️ Advertencia: El precio de venta es menor o igual al costo de costo. Esto reportará pérdidas financieras.
                  </p>
                )}

                <div className="pt-4 border-t border-gray-100 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-xs font-bold transition"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#002A5C] hover:bg-[#003d7c] text-white py-2 rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-1"
                  >
                    <Save size={14} /> {editingProduct ? 'Guardar Cambios' : 'Registrar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Quick Stock Adjustment Modifiers */}
      <AnimatePresence>
        {isStockAdjustmentModalOpen && selectedProductForStock && (
          <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-[#c4c6d1]"
            >
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <h3 className="font-bold text-sm uppercase text-gray-500 tracking-wider">Ajuste de Stock Físico</h3>
                <button
                  onClick={() => setIsStockAdjustmentModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleStockAdjustmentSubmit} className="pt-4 space-y-4">
                <div className="text-center bg-[#f9f9ff] p-3 rounded-lg border border-gray-100">
                  <span className="text-[10px] uppercase text-gray-400 font-bold block">Ficha Seleccionada</span>
                  <strong className="block text-[#081b38] text-base mt-0.5">{selectedProductForStock.name}</strong>
                  <span className="text-xs text-gray-500 font-mono">Stock actual: {selectedProductForStock.quantity} u</span>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setStockAdjustmentType('addition')}
                    className={`flex-1 p-2.5 rounded-lg border font-bold text-xs transition text-center ${
                      stockAdjustmentType === 'addition'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'border-[#c4c6d1] text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    Ingreso (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockAdjustmentType('subtraction')}
                    className={`flex-1 p-2.5 rounded-lg border font-bold text-xs transition text-center ${
                      stockAdjustmentType === 'subtraction'
                        ? 'bg-red-50 border-red-500 text-red-800'
                        : 'border-[#c4c6d1] text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    Salida / Ajuste (-)
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cantidad de Ajuste</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stockAdjustmentQty}
                    onChange={(e) => setStockAdjustmentQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full text-sm font-bold text-center border p-2.5 rounded-lg focus:ring-1 focus:ring-[#00687b] bg-[#f9f9ff] text-[#081b38] border-[#c4c6d1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Justificación del ajuste</label>
                  <input
                    type="text"
                    required
                    value={stockAdjustmentReason}
                    onChange={(e) => setStockAdjustmentReason(e.target.value)}
                    placeholder="e.g. Llegada de camión proveedor"
                    className="w-full text-xs p-2.5 border rounded-lg focus:ring-1 focus:ring-[#00687b] bg-[#f9f9ff] text-[#081b38] border-[#c4c6d1]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsStockAdjustmentModalOpen(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-xs font-bold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 text-white py-2 rounded-xl text-xs font-bold transition shadow-md ${
                      stockAdjustmentType === 'addition'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    Aplicar Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Confirmar borrado de inventario */}
      <AnimatePresence>
        {showClearInventoryModal && (
          <div
            className="fixed inset-0 bg-black/65 z-[60] flex items-center justify-center p-4"
            onClick={() => setShowClearInventoryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-[#c4c6d1]"
              role="alertdialog"
              onClick={(e) => e.stopPropagation()}
              aria-labelledby="clear-inventory-title"
              aria-describedby="clear-inventory-desc"
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-600 shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div className="min-w-0">
                  <h3 id="clear-inventory-title" className="text-base font-bold text-[#081b38]">
                    ¿Estás segura de borrar todo el inventario?
                  </h3>
                  <p id="clear-inventory-desc" className="text-sm text-gray-500 mt-2 leading-relaxed">
                    Se eliminarán todos los productos y movimientos de stock. Esta acción no se puede deshacer.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    El historial de ventas, tu perfil y las configuraciones del negocio no se modificarán.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowClearInventoryModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-sm font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmClearInventory}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-sm font-bold transition shadow-md"
                >
                  Sí, borrar inventario
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Cambiar PIN de Acceso Dueño */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-[#c4c6d1]"
            >
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-[#081b38] flex items-center gap-2">
                  <Lock size={16} className="text-[#00B8D9]" /> Cambiar PIN de Acceso
                </h3>
              </div>
              <form onSubmit={handlePinChangeSubmit} className="mt-4 space-y-4">
                {pinModalError && (
                  <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {pinModalError}
                  </p>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirma tu correo</label>
                  <input
                    type="email"
                    required
                    value={pinChangeEmail}
                    onChange={(e) => setPinChangeEmail(e.target.value)}
                    placeholder="nombre@empresa.com"
                    className="w-full p-2.5 border rounded-lg focus:ring-1 focus:ring-[#00B8D9] bg-[#f9f9ff] text-[#081b38] border-[#c4c6d1] text-sm"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Escribe el correo con el que registraste tu cuenta para autorizar el cambio.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nuevo PIN de Acceso</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={newPinValue}
                    onChange={(e) => setNewPinValue(e.target.value.replace(/\D/g, ''))}
                    placeholder="PIN numérico de seguridad"
                    className="w-full text-center tracking-widest font-black text-lg p-2.5 border rounded-lg focus:ring-1 focus:ring-[#00B8D9] bg-[#f9f9ff] text-[#00687b] border-[#c4c6d1]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmar nuevo PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={confirmNewPinValue}
                    onChange={(e) => setConfirmNewPinValue(e.target.value.replace(/\D/g, ''))}
                    placeholder="Repite el PIN"
                    className="w-full text-center tracking-widest font-black text-lg p-2.5 border rounded-lg focus:ring-1 focus:ring-[#00B8D9] bg-[#f9f9ff] text-[#00687b] border-[#c4c6d1]"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Entre 4 y 6 dígitos. Se enviará confirmación a tu correo.</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-xs font-bold transition"
                  >
                    Salir
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#00B8D9] hover:bg-[#00B8D9]/90 text-white py-2 rounded-xl text-xs font-bold transition shadow-md"
                  >
                    Confirmar PIN
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>
    </div>
  );
}
