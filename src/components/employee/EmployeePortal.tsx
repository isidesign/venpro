import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  ShoppingBag, Search, ShoppingCart, User, LogOut, Receipt, Check, CreditCard,
  Plus, Minus, Trash2, ArrowRight, Layers, QrCode, ClipboardList, RefreshCw, AlertTriangle,
  ArrowLeft, Menu, Edit2, LayoutDashboard, Coins, Eye, Settings, MapPin, Tag, Package, Image as ImageIcon, X,
  History, HelpCircle, ChevronDown, Camera
} from 'lucide-react';
import { Product, Sale, SaleItem, StockTransaction, StoreConfig, IndustryType } from '@/types';
import { getIndustryWelcomeSubtitle, getIndustryCatalogSubtitle } from '@/lib/industry';
import VenproWordmark from '@/components/brand/VenproWordmark';

interface EmployeePortalProps {
  products: Product[];
  sales: Sale[];
  transactions: StockTransaction[];
  config: StoreConfig;
  industry: IndustryType;
  onUpdateProducts: (newProducts: Product[]) => void;
  onUpdateSales: (newSales: Sale[]) => void;
  onUpdateTransactions: (newTransactions: StockTransaction[]) => void;
  onLogout: () => void;
}

type TabType = 'dashboard' | 'ventas' | 'ajustes' | 'movimientos' | 'qr_scan' | 'nuevo_producto';

export default function EmployeePortal({
  products,
  sales,
  transactions,
  config,
  industry,
  onUpdateProducts,
  onUpdateSales,
  onUpdateTransactions,
  onLogout
}: EmployeePortalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedVariantProd, setSelectedVariantProd] = useState<string>('prod-oxford');
  
  // Interactive Custom QR Scanner Simulator States
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [scanSuccessMsg, setScanSuccessMsg] = useState('');

  // New detailed Product Registration Form States (matching attached layout/mockup)
  const [formUnit, setFormUnit] = useState('pza');
  const [formExpiry, setFormExpiry] = useState('');
  const [formCompound, setFormCompound] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  // Product Camera Photo states & refs for mobile/desktop capture
  const [formImageMode, setFormImageMode] = useState<'gallery' | 'camera'>('gallery');
  const [productCameraError, setProductCameraError] = useState('');
  const productCameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const [productCameraStream, setProductCameraStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    if (activeTab === 'nuevo_producto' && formImageMode === 'camera') {
      setProductCameraError('');
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      }).then(stream => {
        activeStream = stream;
        setProductCameraStream(stream);
        if (productCameraVideoRef.current) {
          productCameraVideoRef.current.srcObject = stream;
        }
      }).catch(err => {
        console.error("Error accessing camera for photo:", err);
        setProductCameraError("No se pudo iniciar la cámara. Revisa los permisos de tu navegador o carga un archivo.");
      });
    } else {
      if (productCameraStream) {
        productCameraStream.getTracks().forEach(track => track.stop());
        setProductCameraStream(null);
      }
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeTab, formImageMode]);

  const captureProductPhoto = () => {
    if (productCameraVideoRef.current) {
      const video = productCameraVideoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 645;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setFormImage(dataUrl);
        setFormImageMode('gallery');
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Real Camera QR Scanner States & System Integrations
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (activeTab !== 'qr_scan' || !isCameraActive) {
      if (qrScannerRef.current) {
        const scanner = qrScannerRef.current;
        if (scanner.isScanning) {
          scanner.stop().then(() => {
            console.log("Scanner stopped.");
          }).catch(err => {
            console.warn("Scanner stop error:", err);
          });
        }
        qrScannerRef.current = null;
      }
      return;
    }

    let isMounted = true;
    setCameraError('');
    const scannerId = "real-qr-scanner-view";
    
    const timer = setTimeout(() => {
      if (!isMounted) return;
      
      try {
        const scanner = new Html5Qrcode(scannerId);
        qrScannerRef.current = scanner;
        
        scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.75;
              return { width: size, height: size };
            },
            aspectRatio: 1.0
          },
          (decodedText) => {
            if (!isMounted) return;
            
            // Beep sound
            try {
              const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioCtx) {
                const context = new AudioCtx();
                const osc = context.createOscillator();
                const gain = context.createGain();
                osc.connect(gain);
                gain.connect(context.destination);
                osc.frequency.value = 1100;
                gain.gain.setValueAtTime(0.15, context.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + 0.12);
                osc.start();
                osc.stop(context.currentTime + 0.12);
              }
            } catch (e) {
              console.warn("AudioContext block:", e);
            }

            // Visual flash
            setFlashActive(true);
            setTimeout(() => setFlashActive(false), 200);

            // Try to match product by code or ID or name
            const matchedProduct = products.find(p => 
              p.code === decodedText || 
              p.id === decodedText || 
              p.name.toLowerCase() === decodedText.toLowerCase()
            );
            
            if (matchedProduct) {
              setScannedProduct(matchedProduct);
              setScanSuccessMsg(`¡Escaneado con éxito: ${matchedProduct.name}!`);
            } else {
              setScanSuccessMsg(`Escaneado: "${decodedText}" (No coincide con inventario)`);
            }
            
            setTimeout(() => setScanSuccessMsg(''), 4000);
          },
          () => {
            // Noise handler, ignore to keep console healthy
          }
        ).catch(err => {
          if (!isMounted) return;
          console.error("Camera access failed:", err);
          setCameraError("No se pudo iniciar la cámara. Revisa permisos o abre el applet en pestaña nueva.");
          setIsCameraActive(false);
        });
      } catch (err: any) {
        console.error("Scanner creation error:", err);
        setCameraError(err.message || "Error al inicializar el escáner");
        setIsCameraActive(false);
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (qrScannerRef.current) {
        const scanner = qrScannerRef.current;
        if (scanner.isScanning) {
          scanner.stop().catch(err => {
            console.warn("Clean up stop error:", err);
          });
        }
        qrScannerRef.current = null;
      }
    };
  }, [isCameraActive, activeTab, products]);

  const triggerMockScan = () => {
    if (products.length === 0) return;
    
    // Play laser/scanner hardware beep sound mimicking real physical scanner feedback
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const context = new AudioCtx();
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.connect(gain);
        gain.connect(context.destination);
        osc.frequency.value = 1100; // Perfect standard warehouse beep pitch
        gain.gain.setValueAtTime(0.15, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + 0.12);
        osc.start();
        osc.stop(context.currentTime + 0.12);
      }
    } catch (e) {
      console.warn("AudioContext block:", e);
    }

    // Trigger visual camera flash feedback in viewfinder
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);

    // Dynamic selection of a random product
    const randomIndex = Math.floor(Math.random() * products.length);
    const prod = products[randomIndex];
    setScannedProduct(prod);

    setScanSuccessMsg(`¡Escaneado con éxito: ${prod.name}!`);
    setTimeout(() => setScanSuccessMsg(''), 3000);
  };
  
  // Search & Filters for Catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  
  // Detail Modals States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addProductType, setAddProductType] = useState<'compuesto' | 'materia_prima' | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form States for Adding/Editing
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formBuyPrice, setFormBuyPrice] = useState(0);
  const [formSellPrice, setFormSellPrice] = useState(0);
  const [formQuantity, setFormQuantity] = useState(0);
  const [formMinStock, setFormMinStock] = useState(0);
  const [formLocation, setFormLocation] = useState('');
  const [formImage, setFormImage] = useState('');

  // POS Cashier Cart States
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia'>('Efectivo');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannerSuccessMsg, setScannerSuccessMsg] = useState('');
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Manual stock report adjustment
  const [opSelectedProduct, setOpSelectedProduct] = useState<Product | null>(null);
  const [opQty, setOpQty] = useState(1);
  const [opType, setOpType] = useState<'addition' | 'subtraction'>('subtraction');
  const [opReason, setOpReason] = useState('Daño / Merma de góndola');

  // Categories list
  const categories = useMemo(() => {
    return ['Todas', ...Array.from(new Set(products.map(p => p.category)))];
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.code.includes(searchQuery) ||
                            p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'Todas' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  // Today's Sales Calculation
  const todaySalesStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter(s => s.date.startsWith(todayStr));
    const totalTodayAmount = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
    
    // Dynamic or baseline to display professional revenue
    const revenueToDisplay = totalTodayAmount > 0 ? totalTodayAmount : 12450.00;
    
    // Sum stock deduction in units
    const stockDeductionUnits = todaySales.reduce((sum, s) => {
      return sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);
    const deductionText = stockDeductionUnits > 0 ? `-${stockDeductionUnits} uds` : '-42 kg';

    return {
      revenue: revenueToDisplay,
      deduction: deductionText
    };
  }, [sales]);

  // Critical stock alerts
  const criticalProducts = useMemo(() => {
    return products.filter(p => p.quantity <= p.minStock);
  }, [products]);

  // Open "Añadir Artículo" modal
  const openAddModal = () => {
    setFormName('');
    setFormCode('');
    setFormCategory('Verduras');
    setFormBuyPrice(1.00);
    setFormSellPrice(2.00);
    setFormQuantity(10);
    setFormMinStock(5);
    setFormLocation('Pasillo Central');
    setFormImage('https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=60');
    setAddProductType(null);
    setIsAddModalOpen(true);
  };

  const handleRegisterNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;

    setSavingStatus('saving');

    // Simulate saving delay to execute micro-interaction matching user HTML code precisely
    setTimeout(() => {
      setSavingStatus('success');

      setTimeout(() => {
        // Auto-detect a smart category matching name
        const lowerName = formName.toLowerCase();
        let detectedCategory = 'Abarrotes';
        if (lowerName.includes('café') || lowerName.includes('cafe') || lowerName.includes('espresso') || lowerName.includes('bebida') || lowerName.includes('agua') || lowerName.includes('soda') || lowerName.includes('jugo') || lowerName.includes('refresco')) {
          detectedCategory = 'Bebidas';
        } else if (lowerName.includes('carne') || lowerName.includes('pollo') || lowerName.includes('res') || lowerName.includes('cerdo') || lowerName.includes('tbone') || lowerName.includes('bife') || lowerName.includes('filete')) {
          detectedCategory = 'Carnes';
        } else if (lowerName.includes('pan') || lowerName.includes('concha') || lowerName.includes('pastel') || lowerName.includes('muffin') || lowerName.includes('donas') || lowerName.includes('cuernito')) {
          detectedCategory = 'Panadería';
        } else if (lowerName.includes('tomate') || lowerName.includes('lechuga') || lowerName.includes('zanahoria') || lowerName.includes('limón') || lowerName.includes('limon') || lowerName.includes('aguacate') || lowerName.includes('cebolla') || lowerName.includes('verdura')) {
          detectedCategory = 'Verduras';
        } else if (lowerName.includes('hamburguesa') || lowerName.includes('papas') || lowerName.includes('tacos') || lowerName.includes('preparado') || lowerName.includes('sándwich') || lowerName.includes('sandwich')) {
          detectedCategory = 'Preparados';
        }

        const newProduct: Product = {
          id: 'prod-' + Date.now(),
          name: formName,
          code: formCode || 'EAN-' + Math.floor(100000 + Math.random() * 900000),
          category: detectedCategory,
          buyPrice: 1.50, // sensible defaults or random
          sellPrice: 3.50, // sensible defaults or random
          quantity: Number(formQuantity),
          minStock: Number(formMinStock) || 5,
          location: 'Pasillo Central',
          image: formImage || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=60'
        };

        const newTransaction: StockTransaction = {
          id: 'tr-' + Date.now(),
          productId: newProduct.id,
          productName: newProduct.name,
          type: 'addition',
          quantity: newProduct.quantity,
          reason: formCompound ? 'Registro inicial de artículo nuevo compuesto' : 'Registro inicial de artículo nuevo',
          date: new Date().toISOString(),
          responsible: 'Empleado'
        };

        onUpdateProducts([...products, newProduct]);
        onUpdateTransactions([newTransaction, ...transactions]);

        // Clean up & Redirect back to Inventory (dashboard / catalog tab)
        setFormName('');
        setFormCode('');
        setFormQuantity(0);
        setFormUnit('pza');
        setFormExpiry('');
        setFormMinStock(5);
        setFormCompound(false);
        setFormImage('');
        setSavingStatus('idle');
        
        setActiveTab('dashboard'); // Redirect to inventory main dashboard
      }, 1500);
    }, 1200);
  };

  // Open "Editar Artículo" modal
  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setFormName(product.name);
    setFormCode(product.code);
    setFormCategory(product.category);
    setFormBuyPrice(product.buyPrice || 1.00);
    setFormSellPrice(product.sellPrice || 2.00);
    setFormQuantity(product.quantity);
    setFormMinStock(product.minStock || 5);
    setFormLocation(product.location || 'Pasillo Central');
    setFormImage(product.image || '');
    setIsEditModalOpen(true);
  };

  // Add Article Submit handler
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;

    const newProduct: Product = {
      id: 'prod-' + Date.now(),
      name: formName,
      code: formCode || ('EAN-' + Math.floor(100000 + Math.random() * 900000)),
      category: formCategory,
      buyPrice: Number(formBuyPrice),
      sellPrice: Number(formSellPrice),
      quantity: Number(formQuantity),
      minStock: Number(formMinStock),
      location: formLocation,
      image: formImage || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=60',
      isCompound: addProductType === 'compuesto'
    };

    const newTransaction: StockTransaction = {
      id: 'tr-' + Date.now(),
      productId: newProduct.id,
      productName: newProduct.name,
      type: 'addition',
      quantity: newProduct.quantity,
      reason: addProductType === 'compuesto' ? 'Registro inicial de artículo nuevo compuesto' : 'Registro inicial de artículo nuevo',
      date: new Date().toISOString(),
      responsible: 'Empleado'
    };

    onUpdateProducts([...products, newProduct]);
    onUpdateTransactions([newTransaction, ...transactions]);
    setIsAddModalOpen(false);
  };

  // Edit Article Submit handler
  const handleEditProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const qtyDiff = Number(formQuantity) - selectedProduct.quantity;

    const updatedProducts = products.map(p => {
      if (p.id === selectedProduct.id) {
        return {
          ...p,
          name: formName,
          code: formCode,
          category: formCategory,
          buyPrice: Number(formBuyPrice),
          sellPrice: Number(formSellPrice),
          quantity: Number(formQuantity),
          minStock: Number(formMinStock),
          location: formLocation,
          image: formImage
        };
      }
      return p;
    });

    onUpdateProducts(updatedProducts);

    // If stock changed, log a standard audit transaction
    if (qtyDiff !== 0) {
      const transaction: StockTransaction = {
        id: 'tr-' + Date.now(),
        productId: selectedProduct.id,
        productName: formName,
        type: qtyDiff > 0 ? 'addition' : 'subtraction',
        quantity: Math.abs(qtyDiff),
        reason: 'Ajuste manual de stock via edición rápida de menú',
        date: new Date().toISOString(),
        responsible: 'Empleado'
      };
      onUpdateTransactions([transaction, ...transactions]);
    }

    setIsEditModalOpen(false);
  };

  // Delete Article handler
  const handleDeleteProduct = (productId: string) => {
    const productToDelete = products.find(p => p.id === productId);
    if (!productToDelete) return;

    if (!window.confirm(`¿Estás seguro de que deseas eliminar este artículo "${productToDelete.name}" de forma permanente?`)) {
      return;
    }

    const updated = products.filter(p => p.id !== productId);
    onUpdateProducts(updated);

    const transaction: StockTransaction = {
      id: 'tr-' + Date.now(),
      productId: productId,
      productName: productToDelete.name,
      type: 'subtraction',
      quantity: productToDelete.quantity,
      reason: 'Artículo eliminado permanentemente del catálogo',
      date: new Date().toISOString(),
      responsible: 'Empleado'
    };
    onUpdateTransactions([transaction, ...transactions]);

    setSelectedProduct(null);
    setIsEditModalOpen(false);

    if (selectedVariantProd === productId) {
      setSelectedVariantProd(updated[0]?.id ?? '');
    }
  };

  // Quick Mock Scanner for POS checkout
  const handleSimulateScan = (code: string) => {
    const product = products.find(p => p.code === code);
    if (!product) return;

    if (product.quantity <= 0) {
      alert(`⚠️ Producto fuera de stock: ${product.name}`);
      return;
    }

    const existingIndex = cart.findIndex(item => item.productId === product.id);
    if (existingIndex > -1) {
      const currentQtyInCart = cart[existingIndex].quantity;
      if (currentQtyInCart >= product.quantity) {
        alert(`⚠️ No hay más de las ${product.quantity} unidades en existencia.`);
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      const newItem: SaleItem = {
        productId: product.id,
        name: product.name,
        quantity: 1,
        sellPrice: product.sellPrice,
        buyPrice: product.buyPrice || (product.sellPrice * 0.6)
      };
      setCart([...cart, newItem]);
    }

    setScannerSuccessMsg(`¡Escaneado!: ${product.name}`);
    setTimeout(() => setScannerSuccessMsg(''), 2200);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;
    const prod = products.find(p => p.code === barcodeInput);
    if (prod) {
      handleSimulateScan(prod.code);
      setBarcodeInput('');
    } else {
      alert('⚠️ Código de barras no encontrado.');
    }
  };

  const handleAddToCart = (product: Product) => {
    handleSimulateScan(product.code);
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const existingIndex = cart.findIndex(item => item.productId === productId);
    if (existingIndex === -1) return;

    const updatedCart = [...cart];
    const newQty = updatedCart[existingIndex].quantity + delta;

    if (newQty <= 0) {
      updatedCart.splice(existingIndex, 1);
    } else {
      if (newQty > prod.quantity) {
        alert(`No hay stock suficiente.`);
        return;
      }
      updatedCart[existingIndex].quantity = newQty;
    }
    setCart(updatedCart);
  };

  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.sellPrice * item.quantity), 0);
    const taxAmount = (subtotal * config.taxRate) / 100;
    return { subtotal, taxAmount, total: subtotal };
  }, [cart, config]);

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const updatedProducts = products.map(prod => {
      const cartItem = cart.find(item => item.productId === prod.id);
      if (cartItem) {
        return { ...prod, quantity: Math.max(0, prod.quantity - cartItem.quantity) };
      }
      return prod;
    });

    const newSale: Sale = {
      id: 'BOLETA-' + Math.floor(100000 + Math.random() * 900000),
      date: new Date().toISOString(),
      items: cart,
      totalAmount: cartTotals.total,
      responsible: 'Empleado',
      paymentMethod: selectedPaymentMethod
    };

    const newTransactions: StockTransaction[] = cart.map(item => ({
      id: 'tr-' + Math.floor(Math.random() * 900000),
      productId: item.productId,
      productName: item.name,
      type: 'subtraction' as const,
      quantity: item.quantity,
      reason: `Venta Comercial Boleta #${newSale.id}`,
      date: new Date().toISOString(),
      responsible: 'Empleado' as const
    }));

    onUpdateProducts(updatedProducts);
    onUpdateSales([newSale, ...sales]);
    onUpdateTransactions([...newTransactions, ...transactions]);

    setLastCompletedSale(newSale);
    setIsReceiptOpen(true);
    setCart([]);
  };

  const handleManualOpsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opSelectedProduct) return;

    const deltaSign = opType === 'addition' ? 1 : -1;
    const newQty = Math.max(0, opSelectedProduct.quantity + (opQty * deltaSign));

    const updated = products.map(p => 
      p.id === opSelectedProduct.id ? { ...p, quantity: newQty } : p
    );
    onUpdateProducts(updated);

    const tr: StockTransaction = {
      id: 'tr-' + Date.now(),
      productId: opSelectedProduct.id,
      productName: opSelectedProduct.name,
      type: opType,
      quantity: opQty,
      reason: opReason,
      date: new Date().toISOString(),
      responsible: 'Empleado'
    };
    onUpdateTransactions([tr, ...transactions]);

    alert(`¡Ajuste aplicado y registrado en bitácora!`);
    setOpSelectedProduct(null);
    setOpQty(1);
  };

  return (
    <div className="bg-[#f9f9ff] text-[#081b38] font-sans min-h-screen flex flex-col antialiased">
      
      {/* Top Bar: Dark Navy blue header with title & Profile elements */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#002a5c] flex justify-between items-center px-4 md:px-8 w-full border-b border-white/10 shadow-md">
        <div className="flex items-center gap-4">
          <VenproWordmark className="text-xl md:text-2xl" />
          
          {/* Top navigation for desktop (replaces sidebar) */}
          <nav className="hidden md:flex items-center ml-8 gap-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-white/15 text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('movimientos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'movimientos' 
                  ? 'bg-white/15 text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Historial de Inventario
            </button>
            <button
              onClick={() => setActiveTab('qr_scan')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'qr_scan' 
                  ? 'bg-white/15 text-white shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Escanear Código QR
            </button>
            <span className="h-4 w-px bg-white/25 mx-2 hidden md:inline-block" />
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-300 hover:text-white hover:bg-red-500/15 border border-red-500/20 transition-all flex items-center gap-1.5 active:scale-95 duration-200 cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut size={12} />
              <span>Salir</span>
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {/* Profile name on desktop */}
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-300">Carlos Méndez</span>
            <span className="text-[10px] text-slate-400">Operador</span>
          </div>

          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-300">Estás en:</span>
            <span className="text-sm font-extrabold text-[#50dcff]">{config.storeName}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-300 overflow-hidden border border-white/20 shadow-inner">
            <img 
              alt="User" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBvWZ017rsk0Sp_urzLXbuQL9-YgdnkNNeKwvvQ2ONqg1oQe-RZx6GvXB6_ey-ZXOBC_Bfw8CzjATSEqF5Cx8iqswjAffCq8RVFpfh30aRwoi6nO_iBrUk7k-jexQE6k6QQl-zJvsDDUiV08qVGZEwCMx9adRrIRdBnN1OmafyNItB7-1YHm8HnZAQVI9nVpMMJSNV6npwuRbKNNkSDAYjaQEZoCL1z6-8U0SDXbJaxUi7x1waBLoSk0BePgIgahpZUvSGddYc3ncTB"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </header>

      {/* Navigation Drawer Sidebar & Main Container wrapper */}
      <div className="w-full flex-grow flex pt-16 relative">
        
        {/* Content canvas container */}
        <main className="flex-grow min-h-[calc(100vh-4rem)] bg-[#f9f9ff] flex flex-col pb-24 md:pb-8">
          <div className="max-w-[1440px] w-full mx-auto p-4 md:p-8 flex-grow">
            
            <AnimatePresence mode="wait">
              
              {/* TAB 1: DASHBOARD (EXACT VISUAL MATCH) */}
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  {/* Dynamic welcome header bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-extrabold text-[#002A5C] tracking-tight">
                        Bienvenido: {config.storeName}
                      </h2>
                      <p className="text-sm text-[#00B8D9] font-sans tracking-wide mt-1 font-bold">
                        {getIndustryWelcomeSubtitle(industry)}
                      </p>
                    </div>
                    
                    {/* Floating Add Item Trigger */}
                    <button 
                      onClick={openAddModal}
                      className="bg-[#00B8D9] text-white px-6 py-3.5 rounded-xl flex items-center gap-2 font-bold hover:brightness-110 active:scale-95 transition-all w-fit shadow-md shadow-[#00B8D9]/20"
                    >
                      <Plus size={18} />
                      <span>Añadir Artículo</span>
                    </button>
                  </div>

                  {/* Top Stats summary cards section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: Stock Total */}
                    <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-[#002A5C]" />
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Stock Total</span>
                        <Package className="text-[#002A5C]" size={20} />
                      </div>
                      <div className="text-3xl font-black text-[#002A5C] leading-none mb-1">
                        12,840
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        Unidades en almacén general
                      </div>
                    </div>

                    {/* Card 2: Ventas Hoy */}
                    <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-[#00B8D9]" />
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Ventas Hoy</span>
                        <Coins className="text-[#00B8D9]" size={20} />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-black text-[#002A5C] leading-none">
                          48
                        </div>
                        <span className="text-xs font-bold text-[#027a48] bg-[#d1fadf] px-2 py-0.5 rounded-full">
                          +$1,420.50
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-1">
                        Órdenes procesadas hoy
                      </div>
                    </div>

                    {/* Card 3: Alertas Stock */}
                    <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-[#ba1a1a]" />
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Alertas de Stock</span>
                        <AlertTriangle className="text-[#ba1a1a]" size={20} />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-black text-[#ba1a1a] leading-none">
                          14
                        </div>
                        <span className="text-xs font-bold text-[#ba1a1a] bg-[#ffdad6] px-2 py-0.5 rounded-full animate-pulse">
                          Crítico
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-1">
                        Artículos por debajo del mínimo
                      </div>
                    </div>
                  </div>

                  {/* Main section splits */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column (Span 8) - Product Catalogue */}
                    <div className="lg:col-span-8 space-y-8">
                      {/* Section Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-black text-[#002A5C]">Productos Recientes</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{getIndustryCatalogSubtitle(industry)}</p>
                        </div>
                        
                        {/* Selector/Filters */}
                        <div className="flex gap-2">
                          <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="bg-white text-xs text-slate-600 border border-slate-200 px-3 py-2 rounded-xl font-bold focus:outline-none"
                          >
                            {categories.map(c => (
                              <option key={c} value={c}>{c === 'Todas' ? 'Todo' : c}</option>
                            ))}
                          </select>
                          
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Buscar..."
                              className="bg-white text-xs text-slate-600 border border-slate-200 rounded-xl pl-8 pr-3 py-2 w-32 focus:w-44 transition-all focus:outline-none focus:ring-1 focus:ring-[#00B8D9]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Product Grid */}
                      {filteredProducts.length === 0 ? (
                        <div className="bg-white text-center py-12 text-slate-400 border rounded-2xl border-dashed">
                          <Package className="mx-auto text-slate-200 mb-3 animate-bounce" size={44} />
                          <p className="text-sm font-bold text-slate-500">No se encontraron artículos</p>
                          <p className="text-xs text-slate-400 mt-1">Registra o reabastece nuevos artículos para darlos de alta.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          {filteredProducts.map(p => {
                            const isSelected = selectedVariantProd === p.id;
                            const isOutOfStock = p.quantity <= 0;
                            const isLowStock = !isOutOfStock && p.quantity <= p.minStock;

                            // Custom sizes mockup metadata matching clothes
                            let sizesDesc = "Genérica";
                            if (p.id === 'prod-oxford') sizesDesc = "S: 24 | M: 4 | L: 12";
                            else if (p.id === 'prod-jeans') sizesDesc = "30: 2 | 32: 0 | 34: 1";
                            else if (p.id === 'prod-sudadera') sizesDesc = "M: 15 | L: 20 | XL: 8";

                            return (
                              <div
                                key={p.id}
                                onClick={() => setSelectedVariantProd(p.id)}
                                className={`group bg-white border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 relative ${
                                  isSelected 
                                    ? 'border-2 border-[#00B8D9] bg-gradient-to-b from-white to-[#00B8D9]/2 shadow-sm' 
                                    : 'border-slate-100 hover:shadow-md hover:border-slate-200'
                                }`}
                              >
                                {isSelected && (
                                  <div className="absolute top-2.5 right-2.5 bg-[#00B8D9] text-white text-[9px] font-black tracking-widest px-2 py-1 rounded shadow-sm z-10 uppercase">
                                    Seleccionado
                                  </div>
                                )}

                                {/* Image Frame */}
                                <div className="h-44 w-full bg-slate-50 relative overflow-hidden border-b border-slate-100 flex items-center justify-center">
                                  {p.image ? (
                                    <img 
                                      alt={p.name}
                                      src={p.image}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="text-slate-300 flex flex-col items-center">
                                      <ImageIcon size={32} />
                                      <span className="text-[9px] mt-1 uppercase font-mono">Sin foto</span>
                                    </div>
                                  )}

                                  {/* Delete button overlay */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteProduct(p.id);
                                    }}
                                    className="absolute top-2.5 left-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white p-2 rounded-xl border border-red-100 shadow-sm transition duration-200 z-10"
                                    title="Eliminar"
                                  >
                                    <Trash2 size={12} />
                                  </button>

                                  {/* Hover overlay edit call */}
                                  <div 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditModal(p);
                                    }}
                                    className="absolute inset-x-0 bottom-0 bg-black/45 backdrop-blur-sm flex items-center justify-center py-2 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                  >
                                    <span className="text-[11px] font-bold text-white flex items-center gap-1">
                                      <Edit2 size={11} /> Editar Datos / Stock
                                    </span>
                                  </div>
                                </div>

                                {/* Content description */}
                                <div className="p-4 space-y-2">
                                  <div>
                                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-extrabold tracking-wider uppercase mb-0.5">
                                      <span>{p.category}</span>
                                      
                                      {/* Status display */}
                                      {isOutOfStock ? (
                                        <span className="bg-red-50 text-red-600 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                                          AGOTADO
                                        </span>
                                      ) : isLowStock ? (
                                        <span className="bg-amber-50 text-amber-600 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                                          BAJO STOCK
                                        </span>
                                      ) : (
                                        <span className="bg-[#d1fadf] text-[#027a48] text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                                          EN STOCK
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="font-extrabold text-sm text-[#002A5C] truncate hover:text-[#00B8D9] transition-colors">
                                      {p.name}
                                    </h4>
                                    <p className="text-[9px] text-[#ea580c] font-mono tracking-widest mt-0.5 font-bold uppercase font-sans">
                                      SKU: {p.code}
                                    </p>
                                  </div>

                                  <div className="border-t border-slate-50 pt-2 flex flex-col gap-1 text-[11px]">
                                    <div className="flex justify-between">
                                      <span className="text-slate-400 font-sans">Tallas:</span>
                                      <span className="text-[#002a5c] font-semibold">{sizesDesc}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline mt-1">
                                      <span className="text-slate-400">Precio:</span>
                                      <strong className="text-sm font-black text-slate-800 font-mono">
                                        {config.currencySymbol}{p.sellPrice.toFixed(2)}
                                      </strong>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Variants Matrix Panel (solo tienda de ropa) */}
                      {industry === 'tienda' && (
                      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
                        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                          <div>
                            <h4 className="text-md font-extrabold text-[#002A5C]">Matriz de Variantes</h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Artículos vinculados al modelo: <strong className="text-slate-600">
                                {products.find(p => p.id === selectedVariantProd)?.name || 'Camisa Oxford Slim Fit'}
                              </strong>
                            </p>
                          </div>
                          <span className="bg-[#50dcff]/10 text-[#00687b] text-[10px] font-extrabold px-2 py-1 rounded-lg uppercase font-mono">
                            SKU principal: {products.find(p => p.id === selectedVariantProd)?.code || 'OX-2024-WHT'}
                          </span>
                        </div>

                        {/* Variants matrix table responsive */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse p-1">
                            <thead>
                              <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                                <th className="py-2.5">Talla</th>
                                <th className="py-2.5">Color / Opción</th>
                                <th className="py-2.5 text-right">Inventario disponible</th>
                                <th className="py-2.5 text-center font-sans pr-4">Estado del stock</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedVariantProd === 'prod-oxford' ? (
                                <>
                                  <tr className="border-b border-slate-50 text-xs text-slate-600 hover:bg-slate-50/50">
                                    <td className="py-3 font-bold text-slate-800">S</td>
                                    <td className="py-3">Blanco Perla</td>
                                    <td className="py-3 text-right font-mono font-bold">24 Unidades</td>
                                    <td className="py-3 text-center pr-4">
                                      <span className="bg-[#d1fadf] text-[#027a48] font-extrabold px-2.5 py-1 text-[9px] rounded-full uppercase">ÓPTIMO</span>
                                    </td>
                                  </tr>
                                  <tr className="border-b border-slate-50 text-xs text-slate-600 hover:bg-slate-50/50">
                                    <td className="py-3 font-bold text-slate-800">M</td>
                                    <td className="py-3">Blanco Perla</td>
                                    <td className="py-3 text-right font-mono font-bold">4 Unidades</td>
                                    <td className="py-3 text-center pr-4">
                                      <span className="bg-amber-50 text-amber-600 font-extrabold px-2.5 py-1 text-[9px] rounded-full uppercase">BAJO</span>
                                    </td>
                                  </tr>
                                  <tr className="border-b border-slate-50 text-xs text-slate-600 hover:bg-slate-50/50">
                                    <td className="py-3 font-bold text-slate-800">L</td>
                                    <td className="py-3">Blanco Perla</td>
                                    <td className="py-3 text-right font-mono font-bold">12 Unidades</td>
                                    <td className="py-3 text-center pr-4">
                                      <span className="bg-[#d1fadf] text-[#027a48] font-extrabold px-2.5 py-1 text-[9px] rounded-full uppercase">ÓPTIMO</span>
                                    </td>
                                  </tr>
                                  <tr className="border-b border-slate-50 text-xs text-slate-600 hover:bg-slate-50/50">
                                    <td className="py-3 font-bold text-slate-800">XL</td>
                                    <td className="py-3">Blanco Perla</td>
                                    <td className="py-3 text-right font-mono font-bold text-slate-400">0 Unidades</td>
                                    <td className="py-3 text-center pr-4">
                                      <span className="bg-red-50 text-red-600 font-extrabold px-2.5 py-1 text-[9px] rounded-full uppercase">AGOTADO</span>
                                    </td>
                                  </tr>
                                </>
                              ) : selectedVariantProd === 'prod-jeans' ? (
                                <>
                                  <tr className="border-b border-slate-50 text-xs text-slate-600 hover:bg-slate-50/50">
                                    <td className="py-3 font-bold text-slate-800">30</td>
                                    <td className="py-3">Azul Indigo</td>
                                    <td className="py-3 text-right font-mono font-bold">2 Unidades</td>
                                    <td className="py-3 text-center pr-4">
                                      <span className="bg-amber-50 text-amber-600 font-extrabold px-2.5 py-1 text-[9px] rounded-full uppercase">BAJO</span>
                                    </td>
                                  </tr>
                                  <tr className="border-b border-slate-50 text-xs text-slate-600 hover:bg-slate-50/50">
                                    <td className="py-3 font-bold text-slate-800">32</td>
                                    <td className="py-3">Azul Indigo</td>
                                    <td className="py-3 text-right font-mono font-bold text-slate-400">0 Unidades</td>
                                    <td className="py-3 text-center pr-4">
                                      <span className="bg-red-50 text-red-600 font-extrabold px-2.5 py-1 text-[9px] rounded-full uppercase">AGOTADO</span>
                                    </td>
                                  </tr>
                                  <tr className="border-b border-slate-50 text-xs text-slate-600 hover:bg-slate-50/50">
                                    <td className="py-3 font-bold text-slate-800">34</td>
                                    <td className="py-3">Azul Indigo</td>
                                    <td className="py-3 text-right font-mono font-bold">1 Unidades</td>
                                    <td className="py-3 text-center pr-4">
                                      <span className="bg-amber-50 text-amber-600 font-extrabold px-2.5 py-1 text-[9px] rounded-full uppercase">BAJO</span>
                                    </td>
                                  </tr>
                                </>
                              ) : (
                                <>
                                  <tr className="border-b border-slate-50 text-xs text-slate-600 hover:bg-slate-50/50">
                                    <td className="py-3 font-bold text-slate-800">M</td>
                                    <td className="py-3">Gris Melange</td>
                                    <td className="py-3 text-right font-mono font-bold">15 Unidades</td>
                                    <td className="py-3 text-center pr-4">
                                      <span className="bg-[#d1fadf] text-[#027a48] font-extrabold px-2.5 py-1 text-[9px] rounded-full uppercase">ÓPTIMO</span>
                                    </td>
                                  </tr>
                                  <tr className="border-b border-slate-50 text-xs text-slate-600 hover:bg-slate-50/50">
                                    <td className="py-3 font-bold text-slate-800">L</td>
                                    <td className="py-3">Gris Melange</td>
                                    <td className="py-3 text-right font-mono font-bold">20 Unidades</td>
                                    <td className="py-3 text-center pr-4">
                                      <span className="bg-[#d1fadf] text-[#027a48] font-extrabold px-2.5 py-1 text-[9px] rounded-full uppercase">ÓPTIMO</span>
                                    </td>
                                  </tr>
                                  <tr className="border-b border-slate-50 text-xs text-slate-600 hover:bg-slate-50/50">
                                    <td className="py-3 font-bold text-slate-800">XL</td>
                                    <td className="py-3">Gris Melange</td>
                                    <td className="py-3 text-right font-mono font-bold">8 Unidades</td>
                                    <td className="py-3 text-center pr-4">
                                      <span className="bg-amber-50 text-amber-600 font-extrabold px-2.5 py-1 text-[9px] rounded-full uppercase">BAJO</span>
                                    </td>
                                  </tr>
                                </>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      )}
                    </div>

                    {/* Right column (Span 4) - Timeline / Movement History */}
                    <div className="lg:col-span-4 space-y-6">
                      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-5">
                        <div>
                          <h4 className="text-md font-extrabold text-[#002A5C]">Historial de Movimientos</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Últimas transacciones de stock</p>
                        </div>

                        <div className="space-y-5 relative before:absolute before:top-2 before:bottom-2 before:left-3 before:w-0.5 before:bg-slate-100">
                          {/* Row 1 */}
                          <div className="flex gap-4 relative">
                            <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-500 z-10 flex items-center justify-center text-emerald-600 font-black text-xs">
                              +
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-[#027a48] bg-[#d1fadf] px-2 py-0.5 rounded-full uppercase">
                                  Completado
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">Hace 2 horas</span>
                              </div>
                              <h5 className="text-xs font-bold text-slate-800">Reabastecimiento de Inventario</h5>
                              <p className="text-[11px] text-slate-500 font-sans">50 x Camisa Oxford Slim Fit (Blanco)</p>
                              <strong className="text-xs font-extrabold text-[#027a48] font-mono">+$2,250.00</strong>
                            </div>
                          </div>

                          {/* Row 2 */}
                          <div className="flex gap-4 relative">
                            <div className="w-6 h-6 rounded-full bg-[#50dcff]/10 border border-[#00B8D9] z-10 flex items-center justify-center text-[#00B8D9] font-black text-xs">
                              ✓
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-[#00687b] bg-[#50dcff]/10 px-2 py-0.5 rounded-full uppercase">
                                  Enviado
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">Hace 4 horas</span>
                              </div>
                              <h5 className="text-xs font-bold text-slate-800">Orden de Venta #8429</h5>
                              <p className="text-[11px] text-slate-500 font-sans">2 x Jeans Straight Leg (Indigo)</p>
                              <strong className="text-xs font-extrabold text-slate-800 font-mono">$159.80</strong>
                            </div>
                          </div>

                          {/* Row 3 */}
                          <div className="flex gap-4 relative">
                            <div className="w-6 h-6 rounded-full bg-amber-50 border border-amber-500 z-10 flex items-center justify-center text-amber-500 font-black text-xs">
                              ~
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full uppercase">
                                  En Proceso
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">Ayer, 14:30</span>
                              </div>
                              <h5 className="text-xs font-bold text-slate-800 font-sans">Transferencia entre Bodegas</h5>
                              <p className="text-[11px] text-slate-500 font-sans">10 x Sudadera Oversize (Gris)</p>
                              <strong className="text-xs font-extrabold text-[#ea580c] font-mono">$550.00</strong>
                            </div>
                          </div>
                        </div>

                        {/* Interactive button to see all transactions in movements list */}
                        <button
                          onClick={() => setActiveTab('movimientos')}
                          className="w-full text-center py-2.5 text-xs text-[#002A5C] hover:text-[#00B8D9] border-t border-slate-100 font-bold transition-all block mt-4"
                        >
                          Ver historial de transacciones completo
                        </button>
                      </div>

                      {/* Alertas de Almacén section (Bajo Stock warning card lists) */}
                      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                          <h4 className="text-sm font-extrabold text-[#ba1a1a] flex items-center gap-1.5">
                            <AlertTriangle size={16} /> Almacén en Alerta
                          </h4>
                        </div>
                        
                        <div className="space-y-2">
                          {products.filter(p => p.quantity <= p.minStock).map(p => (
                            <div 
                              key={p.id}
                              onClick={() => openEditModal(p)}
                              className="p-3 bg-red-50/70 hover:bg-red-50 border border-red-100 rounded-xl transition text-left flex justify-between items-center cursor-pointer"
                            >
                              <div>
                                <h5 className="text-xs font-bold text-red-900 leading-tight">{p.name}</h5>
                                <span className="text-[9px] text-[#ea580c] font-mono tracking-wide">SKU: {p.code}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-black text-red-600 font-mono block">{p.quantity} uds</span>
                                <span className="text-[8px] text-slate-400 font-bold uppercase font-sans">Mínimo: {p.minStock}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB QR_SCAN: VENPRO QR SCANNER PAGE MATCHING ATTACHED DESIGN */}
              {activeTab === 'qr_scan' && (
                <motion.div
                  key="qr_scan"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex flex-col items-center justify-center py-8 min-h-[calc(100vh-10rem)] bg-gradient-to-b from-[#ffffff] to-[#f9f9ff] relative overflow-hidden rounded-2xl border border-[#c4c6d1]/30 p-4"
                >
                  {/* Style block for specific scanning animations */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @keyframes scan {
                      0% { top: 0%; opacity: 0; }
                      10% { opacity: 1; }
                      90% { opacity: 1; }
                      100% { top: 100%; opacity: 0; }
                    }
                    .custom-scan-line {
                      height: 3px;
                      background: linear-gradient(to right, transparent, #00B8D9, transparent);
                      box-shadow: 0 0 15px 3px rgba(0, 184, 217, 0.8);
                      position: absolute;
                      width: 100%;
                      z-index: 10;
                      animation: scan 3s ease-in-out infinite;
                    }
                    .corner-border-pt {
                      position: absolute;
                      width: 40px;
                      height: 40px;
                      border-color: #00B8D9;
                    }
                    .c-tl { top: -2px; left: -2px; border-top-width: 4px; border-left-width: 4px; border-top-left-radius: 12px; }
                    .c-tr { top: -2px; right: -2px; border-top-width: 4px; border-right-width: 4px; border-top-right-radius: 12px; }
                    .c-bl { bottom: -2px; left: -2px; border-bottom-width: 4px; border-left-width: 4px; border-bottom-left-radius: 12px; }
                    .c-br { bottom: -2px; right: -2px; border-bottom-width: 4px; border-right-width: 4px; border-bottom-right-radius: 12px; }
                  `}} />

                  {/* Scanned Feedback Overlay Alert */}
                  {scanSuccessMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-4 bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-lg z-40 flex items-center gap-2"
                    >
                      <Check size={16} />
                      <span>{scanSuccessMsg}</span>
                    </motion.div>
                  )}

                  {/* Viewfinder area */}
                  <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center mb-8">
                    {/* flash active glow effect */}
                    <AnimatePresence>
                      {flashActive && (
                        <motion.div 
                          initial={{ opacity: 0.8 }}
                          animate={{ opacity: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-white rounded-xl z-30 pointer-events-none"
                        />
                      )}
                    </AnimatePresence>

                    {/* Scanning Animation Line */}
                    <div className="custom-scan-line"></div>
                    
                    {/* Viewfinder Frame/Decorative Corners */}
                    <div className="absolute inset-0 z-20 pointer-events-none">
                      <div className="corner-border-pt c-tl"></div>
                      <div className="corner-border-pt c-tr"></div>
                      <div className="corner-border-pt c-bl"></div>
                      <div className="corner-border-pt c-br"></div>
                    </div>

                    {/* Real Camera Video Stream or Mock Image with scanner trigger on click */}
                    {isCameraActive ? (
                      <div className="w-[85%] h-[85%] bg-black rounded-xl overflow-hidden shadow-md relative border border-[#c4c6d1]/50 flex flex-col justify-center items-center">
                        <div id="real-qr-scanner-view" className="w-full h-full object-cover [&>video]:object-cover [&>video]:h-full [&>video]:w-full"></div>
                        
                        {/* Overlay back/stop button inside scanner */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsCameraActive(false);
                          }}
                          className="absolute bottom-3 right-3 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg z-30 transition cursor-pointer flex items-center justify-center"
                          title="Detener cámara"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setActiveTab('nuevo_producto');
                        }}
                        title="Haz clic para registrar un nuevo producto"
                        className="w-[85%] h-[85%] bg-white rounded-xl overflow-hidden shadow-md flex items-center justify-center relative border border-[#c4c6d1]/50 group cursor-pointer hover:scale-101 active:scale-99 transition-transform"
                      >
                        <img 
                          alt="QR Code Scanning View" 
                          className="w-full h-full object-cover opacity-80 grayscale group-hover:scale-105 transition-transform duration-700" 
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBD-9WbX_6NGH8QZ_oj02TgB16aZZqg2gZdBm8xF6MmKdwLIR0QF1Xwj33V-a9n7LakwWh961bycB_RvkHOCkni67v9ssamiNPLkDMytphMSPPpEWLb6ic-iRhzbDdLvp0aGvhecjLTsUnUVqg8lfw_9KsjrSn57otKpWZKvh7u1qGzg96WVPqQimeySLDu2uhMmhX90fClKA6OXQ0H9Mx6ckN6hnvf910CfCtiVqbqqglrAci-R8CHYC0py8RALrq0D2FQSz5wMyzU"
                          referrerPolicy="no-referrer"
                        />
                        
                        {/* Central focus pulse indicator */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-blue-900/5 group-hover:bg-blue-900/0 transition-colors">
                          <QrCode className="text-[#00687b] scale-150 opacity-20 group-hover:scale-175 transition-transform duration-300" size={48} />
                        </div>
                        
                        <div className="absolute bottom-4 inset-x-4 bg-[#00b8d9] text-white rounded-lg py-2 text-xs font-bold opacity-90 group-hover:opacity-100 transition-all flex items-center justify-center gap-1.5 shadow-sm">
                          <QrCode size={14} className="animate-pulse" />
                          <span>Registrar Nuevo Producto</span>
                        </div>
                      </button>
                    )}
                  </div>

                  {cameraError && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mb-4 max-w-sm bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2 shadow-xs"
                    >
                      <AlertTriangle className="text-red-600 flex-shrink-0 animate-bounce" size={16} />
                      <span>{cameraError}</span>
                    </motion.div>
                  )}

                  {/* Instructions Text */}
                  <div className="text-center space-y-2 max-w-sm px-4 mb-6">
                    <p className="text-lg md:text-xl text-[#081b38] font-extrabold tracking-tight">
                      Si eres empleado escanea el código QR
                    </p>
                    <p className="text-sm text-gray-500 italic">
                      Alinea el código dentro del recuadro
                    </p>
                  </div>

                  {/* scanned real-time product drawer detail or CTA */}
                  <AnimatePresence>
                    {scannedProduct ? (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 15 }}
                        className="w-full max-w-sm bg-white p-5 rounded-2xl border border-emerald-100 shadow-lg flex flex-col gap-4 mt-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] bg-emerald-50 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider block w-fit mb-1">
                              Lectura Exitosa
                            </span>
                            <h4 className="font-extrabold text-[#081b38] text-sm leading-tight">
                              {scannedProduct.name}
                            </h4>
                            <p className="text-[11px] text-gray-400 font-mono mt-0.5">{scannedProduct.code}</p>
                          </div>
                          <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md font-mono font-bold">
                            {scannedProduct.category}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
                          <div>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Existencia</span>
                            <strong className="text-sm font-extrabold text-[#081b38] font-mono">
                              {scannedProduct.quantity} uds
                            </strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Precio PVP</span>
                            <strong className="text-sm font-extrabold text-emerald-700 font-mono">
                              {config.currencySymbol}{scannedProduct.sellPrice.toFixed(2)}
                            </strong>
                          </div>
                        </div>

                        {scannedProduct.location && (
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin size={12} className="text-[#00B8D9]" />
                            <span>Ubicación: <strong>{scannedProduct.location}</strong></span>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              // Open edit modal directly for this product
                              openEditModal(scannedProduct);
                            }}
                            className="flex-1 py-2.5 bg-[#002A5C] hover:bg-[#003d7c] text-white text-xs rounded-xl font-bold transition shadow-xs text-center block"
                          >
                            Modificar Stock / Datos
                          </button>
                          <button
                            onClick={() => {
                              // Fast add to POS terminal cashier cart & jump to POS cash system!
                              handleAddToCart(scannedProduct);
                              setActiveTab('ventas');
                              setScannerSuccessMsg(`¡${scannedProduct.name} agregado a la boleta!`);
                              setTimeout(() => setScannerSuccessMsg(''), 3000);
                            }}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl font-bold transition shadow-xs text-center block"
                          >
                            Vender Artículo
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <button 
                        onClick={triggerMockScan}
                        className="py-3 px-6 rounded-xl border border-[#00B8D9]/40 hover:border-[#00B8D9] bg-[#50dcff]/5 text-[#00687b] text-xs font-bold transition hover:bg-[#50dcff]/10 active:scale-95 shadow-xs flex items-center justify-center gap-2 w-full max-w-sm"
                      >
                        <QrCode size={16} className="animate-spin duration-3000" />
                        <span>Simular Escaneo Electrónico</span>
                      </button>
                    )}
                  </AnimatePresence>

                </motion.div>
              )}

              {/* TAB NUEVO_PRODUCTO: REGISTRO DETALLADO DE PRODUCTO MATCHING ATTACHED DESIGN */}
              {activeTab === 'nuevo_producto' && (
                <motion.div
                  key="nuevo_producto"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="max-w-3xl w-full mx-auto"
                >
                  <div className="mb-6">
                    <button
                      onClick={() => setActiveTab('qr_scan')}
                      className="inline-flex items-center gap-2 text-[#001636] font-semibold hover:text-[#00b8d9] transition-colors"
                      type="button"
                    >
                      <ArrowLeft size={18} />
                      <span>Volver al Inventario</span>
                    </button>
                  </div>

                  <div className="bg-white border border-[#c4c6d1] rounded-2xl overflow-hidden shadow-xs">
                    <form onSubmit={handleRegisterNewProduct} className="p-6 md:p-8 space-y-8 animate-fade-in" id="add-product-form">
                      
                      {/* Photo Upload Section */}
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <label className="font-bold text-sm text-[#001b3f] block">
                            Foto del producto <span className="text-xs font-normal text-gray-400">(Opcional)</span>
                          </label>
                          <div className="flex bg-[#f1f3ff] p-0.5 rounded-lg text-xs self-start sm:self-auto border border-slate-100">
                            <button
                              type="button"
                              onClick={() => setFormImageMode('gallery')}
                              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                                formImageMode === 'gallery' 
                                  ? 'bg-white text-[#00687b] shadow-xs' 
                                  : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              Galería / Archivos
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormImageMode('camera')}
                              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                                formImageMode === 'camera' 
                                  ? 'bg-white text-[#00687b] shadow-xs' 
                                  : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              Tomar Foto
                            </button>
                          </div>
                        </div>

                        {formImageMode === 'gallery' ? (
                          <div className="relative group border-2 border-dashed border-[#c4c6d1]/80 rounded-xl aspect-[21/9] flex flex-col items-center justify-center bg-[#f1f3ff] hover:bg-white hover:border-[#00b8d9] transition-all overflow-hidden min-h-[160px]">
                            {formImage ? (
                              <div className="relative w-full h-full">
                                <img 
                                  src={formImage} 
                                  alt="Vista previa" 
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => setFormImage('')}
                                  className="absolute top-2.5 right-2.5 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-md z-20 transition-all active:scale-90 flex items-center justify-center"
                                  title="Eliminar Foto"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <input 
                                  accept="image/*" 
                                  className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                                  type="file"
                                  onChange={handleImageUpload}
                                />
                                <div className="flex flex-col items-center group-hover:scale-105 transition-transform text-center p-4">
                                  <ImageIcon className="text-[#747780] group-hover:text-[#00b8d9] mb-2 transition-colors" size={36} />
                                  <span className="font-bold text-sm text-[#747780] group-hover:text-[#00b8d9] transition-colors">Abrir Galería / Cargar Archivo</span>
                                  <p className="text-[10px] text-gray-400 mt-1 font-sans">Haz clic para buscar en el almacenamiento de tu equipo o celular</p>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center relative shadow-inner min-h-[180px]">
                            {formImage ? (
                              <div className="relative w-full aspect-[21/9] rounded-lg overflow-hidden bg-black flex items-center justify-center">
                                <img 
                                  src={formImage} 
                                  alt="Foto capturada" 
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                                  <span className="text-white text-xs font-bold font-sans">¡Foto capturada con éxito!</span>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormImage('');
                                      }}
                                      className="px-3 py-1.5 bg-white text-slate-800 text-xs rounded-lg font-bold hover:bg-slate-100 transition-all font-sans"
                                    >
                                      Volver a tomar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setFormImageMode('gallery')}
                                      className="px-3 py-1.5 bg-[#00b8d9] text-white text-xs rounded-lg font-bold hover:brightness-105 transition-all font-sans"
                                    >
                                      Continuar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full flex flex-col items-center">
                                {productCameraError ? (
                                  <div className="text-center p-4">
                                    <AlertTriangle className="text-red-500 mx-auto mb-2" size={24} />
                                    <p className="text-xs text-red-300 font-sans">{productCameraError}</p>
                                    <button
                                      type="button"
                                      onClick={() => setFormImageMode('gallery')}
                                      className="mt-3 px-3 py-1.5 bg-slate-800 text-xs text-white rounded-lg hover:bg-slate-700 transition-all font-sans"
                                    >
                                      Volver a Galería de Archivos
                                    </button>
                                  </div>
                                ) : (
                                  <div className="w-full flex flex-col items-center gap-3">
                                    <div className="relative w-full max-w-[320px] aspect-video rounded-lg overflow-hidden bg-black border border-slate-800 shadow-inner">
                                      <video 
                                        ref={productCameraVideoRef}
                                        autoPlay 
                                        playsInline 
                                        className="w-full h-full object-cover"
                                      />
                                      {productCameraStream && (
                                        <div className="absolute top-2 left-2 bg-black/60 text-[9px] text-[#50dcff] font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5 font-sans">
                                          <span className="w-1.5 h-1.5 bg-[#50dcff] rounded-full animate-ping"></span>
                                          Cámara de Equipo Activa
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={captureProductPhoto}
                                        className="px-4 py-2 bg-[#00b8d9] text-white rounded-xl text-xs font-bold hover:brightness-105 shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                                      >
                                        <Camera size={14} />
                                        <span>Capturar Foto</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setFormImageMode('gallery')}
                                        className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:text-white hover:bg-slate-700 transition-all"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Section Title */}
                      <div className="pt-2">
                        <h2 className="font-bold text-lg text-[#001b3f]">Detalles del producto</h2>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Product Name */}
                        <div className="md:col-span-2 space-y-2">
                          <label className="font-bold text-sm text-[#002a5c] block" htmlFor="product-name">Nombre del Producto</label>
                          <input 
                            className="w-full px-4 py-3 rounded-xl border border-[#747780]/60 bg-white text-sm text-[#081b38] placeholder:text-gray-300 focus:outline-none focus:border-[#00b8d9] focus:ring-2 focus:ring-[#00b8d9]/20 transition-all font-medium font-sans" 
                            id="product-name" 
                            placeholder="Ej: Café Espresso Premium" 
                            required 
                            type="text"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                          />
                        </div>

                        {/* Quantity */}
                        <div className="space-y-2">
                          <label className="font-bold text-sm text-[#002a5c] block" htmlFor="quantity">Cantidad inicial</label>
                          <div className="relative">
                            <input 
                              className="w-full pl-4 pr-12 py-3 rounded-xl border border-[#747780]/60 bg-white text-sm text-[#081b38] focus:outline-none focus:border-[#00b8d9] focus:ring-2 focus:ring-[#00b8d9]/20 transition-all font-medium font-mono" 
                              id="quantity" 
                              min="0" 
                              type="number"
                              value={formQuantity}
                              onChange={(e) => setFormQuantity(Number(e.target.value) || 0)}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                              <Layers size={18} />
                            </span>
                          </div>
                        </div>

                        {/* Unit */}
                        <div className="space-y-2">
                          <label className="font-bold text-sm text-[#002a5c] block" htmlFor="unit">Unidad de Medida</label>
                          <div className="relative">
                            <select 
                              className="w-full px-4 py-3 rounded-xl border border-[#747780]/60 bg-white text-sm text-[#081b38] focus:outline-none focus:border-[#00b8d9] focus:ring-2 focus:ring-[#00b8d9]/20 transition-all font-medium appearance-none font-sans" 
                              id="unit"
                              value={formUnit}
                              onChange={(e) => setFormUnit(e.target.value)}
                            >
                              <option value="pza">Piezas / Unidades</option>
                              <option value="kg">Kilogramos (kg)</option>
                              <option value="oz">Onzas (oz)</option>
                              <option value="lb">Libras (lb)</option>
                              <option value="gr">Gramos (gr)</option>
                            </select>
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                              <ChevronDown size={18} />
                            </span>
                          </div>
                        </div>

                        {/* Expiration Date */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="font-bold text-sm text-[#002a5c] block" htmlFor="expiry">Fecha de Caducidad</label>
                            <span className="text-xs text-gray-400 font-sans">Opcional</span>
                          </div>
                          <div className="relative">
                            <input 
                              className="w-full pl-4 pr-12 py-3 rounded-xl border border-[#747780]/60 bg-white text-sm text-[#081b38] focus:outline-none focus:border-[#00b8d9] focus:ring-2 focus:ring-[#00b8d9]/20 transition-all font-medium font-mono" 
                              id="expiry" 
                              type="date"
                              value={formExpiry}
                              onChange={(e) => setFormExpiry(e.target.value)}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                              <ClipboardList size={18} />
                            </span>
                          </div>
                        </div>

                        {/* Min Stock */}
                        <div className="space-y-2">
                          <label className="font-bold text-sm text-[#002a5c] block" htmlFor="min-stock">Alerta de Stock Mínimo</label>
                          <div className="relative">
                            <input 
                              className="w-full pl-4 pr-12 py-3 rounded-xl border border-[#747780]/60 bg-white text-sm text-[#081b38] placeholder:text-gray-300 focus:outline-none focus:border-[#00b8d9] focus:ring-2 focus:ring-[#00b8d9]/20 transition-all font-medium font-sans" 
                              id="min-stock" 
                              placeholder="Avisarme si baja de..." 
                              type="number"
                              value={formMinStock}
                              onChange={(e) => setFormMinStock(Number(e.target.value) || 0)}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500/80 pointer-events-none">
                              <AlertTriangle size={18} />
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Compound Item Toggle */}
                      <div className="bg-[#f1f3ff]/40 p-5 rounded-xl border border-[#00b8d9]/20 flex items-start gap-4 transition-colors hover:bg-[#f1f3ff]/60">
                        <div className="relative inline-block w-12 h-6 flex-shrink-0 mt-1">
                          <input 
                            className="absolute opacity-0 w-0 h-0" 
                            id="compound-toggle" 
                            type="checkbox"
                            checked={formCompound}
                            onChange={(e) => setFormCompound(e.target.checked)}
                          />
                          <label 
                            className={`block w-11 h-6 rounded-full cursor-pointer transition-colors relative ${formCompound ? 'bg-[#00b8d9]' : 'bg-[#c4c6d1]'}`} 
                            htmlFor="compound-toggle"
                          >
                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-xs ${formCompound ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                          </label>
                        </div>
                        <div className="flex-1">
                          <label className="font-bold text-sm text-[#002a5c] cursor-pointer select-none" htmlFor="compound-toggle">
                            Artículo Compuesto
                          </label>
                          <p className="text-xs text-gray-500 mt-1 leading-snug">
                            Active esto si el producto se prepara con otros ingredientes. Esto permite descontar stock automáticamente de las materias primas vinculadas.
                          </p>
                        </div>
                      </div>

                      {/* Form Actions */}
                      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-6 border-t border-[#c4c6d1]/50">
                        <button 
                          className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-sm text-gray-500 hover:bg-[#e0e8ff] transition-all font-sans" 
                          type="button"
                          onClick={() => setActiveTab('qr_scan')}
                        >
                          Cancelar
                        </button>
                        <button 
                          disabled={savingStatus !== 'idle'}
                          className={`w-full sm:w-auto px-10 py-3 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 font-sans ${
                            savingStatus === 'success' 
                              ? 'bg-emerald-600' 
                              : 'bg-[#00b8d9] hover:brightness-105 active:scale-98'
                          }`}
                          type="submit"
                        >
                          {savingStatus === 'saving' && (
                            <>
                              <RefreshCw size={16} className="animate-spin" />
                              <span>Guardando...</span>
                            </>
                          )}
                          {savingStatus === 'success' && (
                            <>
                              <Check size={16} className="text-[#64ff1b]" />
                              <span>¡Listo!</span>
                            </>
                          )}
                          {savingStatus === 'idle' && (
                            <span>Guardar Producto</span>
                          )}
                        </button>
                      </div>

                    </form>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: TERMINAL DE COBARZA (POS CASHIER) */}
              {activeTab === 'ventas' && (
                <motion.div
                  key="ventas"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
                >
                  {/* Left explore section */}
                  <div className="lg:col-span-7 flex flex-col space-y-4">
                    
                    {/* Barcode scanner emulation bar */}
                    <div className="bg-white p-4 rounded-xl border border-[#c4c6d1] shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <strong className="block text-sm text-[#081b38] flex items-center gap-1.5">
                          <QrCode className="text-[#00687b]" size={18} /> Lector y Registrador Virtual
                        </strong>
                        <span className="text-[10px] bg-sky-50 text-sky-800 px-2 py-0.5 rounded font-bold uppercase font-mono">Instant Laser</span>
                      </div>

                      <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Escribe el código EAN / Código del artículo..."
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          className="flex-grow text-xs p-2.5 bg-[#f9f9ff] text-[#081b38] border border-[#c4c6d1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00687b] font-mono"
                        />
                        <button
                          type="submit"
                          className="bg-[#002A5C] hover:bg-[#003d7c] text-white text-xs px-4 rounded-lg font-bold transition flex items-center gap-1"
                        >
                          Agregar
                        </button>
                      </form>

                      {/* Instant Beep display message feedback */}
                      <AnimatePresence>
                        {scannerSuccessMsg && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-emerald-50 text-emerald-800 text-xs font-bold p-1.5 rounded-lg text-center flex items-center justify-center gap-1 border border-emerald-200"
                          >
                            <Check size={14} /> {scannerSuccessMsg}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Catalog Grid selector */}
                    <div className="bg-white p-4 rounded-xl border border-[#c4c6d1] shadow-sm flex-grow flex flex-col space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                        <strong className="text-sm font-bold text-[#081b38]">Selecciona Productos para Venta</strong>
                        
                        <div className="flex gap-2">
                          <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="text-xs bg-[#f9f9ff] text-[#081b38] border border-[#c4c6d1] p-1.5 rounded-md font-semibold"
                          >
                            {categories.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="text-xs max-w-[120px] bg-[#f9f9ff] text-slate-700 border p-1.5 rounded-md border-[#c4c6d1]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto max-h-[350px] pr-1">
                        {filteredProducts.map(p => {
                          const isOutOfStock = p.quantity <= 0;
                          return (
                            <button
                              key={p.id}
                              disabled={isOutOfStock}
                              onClick={() => handleAddToCart(p)}
                              className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between h-28 text-xs relative ${
                                isOutOfStock 
                                  ? 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed'
                                  : 'bg-white border-[#c4c6d1] hover:border-[#00687b] hover:shadow-sm'
                              }`}
                            >
                              <div>
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{p.category}</span>
                                <h4 className="font-bold text-gray-900 line-clamp-2 mt-0.5">{p.name}</h4>
                              </div>

                              <div className="flex items-end justify-between w-full pt-1">
                                <span className="font-mono text-xs font-bold text-gray-900">
                                  {config.currencySymbol}{p.sellPrice.toFixed(2)}
                                </span>
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                                  p.quantity <= p.minStock
                                    ? 'bg-red-50 text-red-700 font-bold'
                                    : 'bg-[#e0e8ff] text-[#00687b]'
                                }`}>
                                  {p.quantity} u
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* Cashier invoice ledger side screen */}
                  <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-[#c4c6d1] shadow-sm flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-3">
                        <h3 className="font-bold text-[#081b38] flex items-center gap-2">
                          <ShoppingCart className="text-[#00B8D9]" /> Boleta Actual
                        </h3>
                        <span className="text-xs bg-[#e8edff] text-[#00687b] px-2 py-0.5 rounded-md font-bold">
                          {cart.reduce((s, i) => s + i.quantity, 0)} uds
                        </span>
                      </div>

                      <div className="overflow-y-auto max-h-[280px] divide-y divide-gray-100 pr-1">
                        {cart.length === 0 ? (
                          <div className="text-center py-10 text-gray-400 space-y-2">
                            <ShoppingCart size={40} className="mx-auto text-gray-200" />
                            <p className="text-xs font-semibold">El carrito está vacío.</p>
                            <p className="text-[10px]">Añade productos de la lista lateral o ingresa con código de barras.</p>
                          </div>
                        ) : (
                          cart.map(item => (
                            <div key={item.productId} className="py-2.5 flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <strong className="block text-xs text-gray-900 truncate">{item.name}</strong>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {config.currencySymbol}{item.sellPrice.toFixed(2)}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleUpdateCartQty(item.productId, -1)}
                                  className="w-6 h-6 rounded bg-[#f1f3ff] hover:bg-gray-200 text-[#00687b] flex items-center justify-center font-bold"
                                >
                                  <Minus size={11} />
                                </button>
                                <span className="font-bold text-xs w-5 text-center font-mono">{item.quantity}</span>
                                <button
                                  onClick={() => handleUpdateCartQty(item.productId, 1)}
                                  className="w-6 h-6 rounded bg-[#f1f3ff] hover:bg-gray-200 text-[#00687b] flex items-center justify-center font-bold"
                                >
                                  <Plus size={11} />
                                </button>
                              </div>

                              <span className="text-xs font-mono font-bold text-slate-800 w-16 text-right">
                                {config.currencySymbol}{(item.sellPrice * item.quantity).toFixed(2)}
                              </span>

                              <button
                                onClick={() => handleUpdateCartQty(item.productId, -item.quantity)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4 space-y-4 mt-4">
                      <div>
                        <span className="text-[10px] uppercase text-gray-400 font-bold block mb-1">Elegir Liquidación</span>
                        <div className="grid grid-cols-3 gap-2">
                          {(['Efectivo', 'Tarjeta', 'Transferencia'] as const).map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setSelectedPaymentMethod(m)}
                              className={`p-2 rounded-lg text-xs font-bold border transition text-center ${
                                selectedPaymentMethod === m
                                  ? 'bg-[#e8edff] border-[#00687b] text-[#00687b]'
                                  : 'border-[#c4c6d1] text-gray-500 bg-white hover:bg-gray-50'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bg-[#f9f9ff] p-3 rounded-lg border border-[#c4c6d1] space-y-1.5 font-semibold text-xs font-mono text-slate-600">
                        <div className="flex justify-between">
                          <span>Subtotal neto</span>
                          <span>{config.currencySymbol}{cartTotals.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>IVA incluido ({config.taxRate}%)</span>
                          <span>{config.currencySymbol}{cartTotals.taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-gray-900 border-t pt-1.5 mt-1">
                          <span>Monto Cobro</span>
                          <span className="text-emerald-700 font-extrabold">{config.currencySymbol}{cartTotals.total.toFixed(2)}</span>
                        </div>
                      </div>

                      <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0}
                        className={`w-full py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-md ${
                          cart.length === 0
                            ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        <Check size={14} /> Emitir Comprobante
                      </button>
                    </div>

                  </div>

                </motion.div>
              )}

              {/* TAB 3: ADJUSTMENT STOCKS / LOSS REPORT */}
              {activeTab === 'ajustes' && (
                <motion.div
                  key="ajustes"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="max-w-2xl mx-auto space-y-6"
                >
                  <div className="bg-white p-6 rounded-2xl border border-[#c4c6d1] shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b pb-3">
                      <ClipboardList className="text-[#00B8D9]" />
                      <div>
                        <h3 className="font-bold text-base text-[#081b38]">Registrar Auditoría / Movimientos</h3>
                        <p className="text-xs text-slate-400 font-sans">Introduce mermas, daños de góndola o mermas de traslado</p>
                      </div>
                    </div>

                    <form onSubmit={handleManualOpsSubmit} className="space-y-4 font-sans">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Producto Factible</label>
                        <select
                          value={opSelectedProduct?.id || ''}
                          onChange={(e) => {
                            const prod = products.find(p => p.id === e.target.value);
                            setOpSelectedProduct(prod || null);
                          }}
                          required
                          className="w-full text-xs p-3 border rounded-lg focus:ring-1 focus:ring-[#00b8d9] bg-[#f9f9ff] text-[#081b38] border-[#c4c6d1]"
                        >
                          <option value="">-- Seleccionar de catálogo --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (Code: {p.code}) [Stock: {p.quantity}]</option>
                          ))}
                        </select>
                      </div>

                      {opSelectedProduct && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Sentido Cambio</label>
                            <select
                              value={opType}
                              onChange={(e) => setOpType(e.target.value as any)}
                              className="w-full text-xs p-3 border rounded-lg bg-[#f9f9ff] text-[#081b38] border-[#c4c6d1]"
                            >
                              <option value="subtraction">Disminuir de Almacén (Merma / Consumo)</option>
                              <option value="addition">Aumentar Almacén (Reposición/Ingreso)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1 font-mono">Cantidad Unidades</label>
                            <input
                              type="number"
                              min="1"
                              step="any"
                              required
                              value={opQty}
                              onChange={(e) => setOpQty(Number(e.target.value) || 1)}
                              className="w-full text-xs p-3 border rounded-lg bg-[#f9f9ff] text-[#081b38] border-[#c4c6d1]"
                            />
                          </div>
                        </div>
                      )}

                      {opSelectedProduct && (
                        <>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Justificante / Auditoría</label>
                            <select
                              value={opReason}
                              onChange={(e) => setOpReason(e.target.value)}
                              className="w-full text-xs p-3 border rounded-lg bg-[#f9f9ff] text-[#081b38] border-[#c4c6d1]"
                            >
                              <option value="Daño / Merma de góndola">Daño en pasillo comercial</option>
                              <option value="Producto Caducado">Ingrediente vencido / mermado</option>
                              <option value="Exhibición / Demostración">Trasladado a exhibición</option>
                              <option value="Devolución de cliente">Ingreso por devolución</option>
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="w-full bg-[#002a5c] hover:bg-[#003d7c] text-white py-3 rounded-xl text-xs font-bold transition shadow-sm"
                          >
                            Registrar Movimiento Especial
                          </button>
                        </>
                      )}

                    </form>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: COMPLETE DIRECTORY AUDIT MOVE LOGS */}
              {activeTab === 'movimientos' && (
                <motion.div
                  key="movimientos"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="bg-white p-4 rounded-xl border border-[#c4c6d1] flex items-center justify-between gap-4 shadow-xs">
                    <div className="flex-1 max-w-md relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        placeholder="Buscar precios, códigos o ubicaciones..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#f9f9ff] text-xs text-[#081b38] border border-[#c4c6d1] rounded-lg pl-10 pr-4 py-2"
                      />
                    </div>
                    <button
                      onClick={() => { setSearchQuery(''); setCategoryFilter('Todas'); }}
                      className="text-xs text-[#00687b] hover:text-[#00B8D9] font-bold"
                    >
                      Limpiar Filtros
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl border border-[#c4c6d1] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs md:text-sm">
                        <thead>
                          <tr className="bg-[#f9f9ff] border-b border-[#c4c6d1] text-gray-500 font-bold">
                            <th className="p-4">Producto</th>
                            <th className="p-4">Código EAN</th>
                            <th className="p-4 text-center">Unidades</th>
                            <th className="p-4">Ubicación Coor.</th>
                            <th className="p-4 text-right">Precio Al Público</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products
                            .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.includes(searchQuery))
                            .map(p => (
                              <tr key={p.id} className="hover:bg-slate-50 border-b border-slate-100 font-sans">
                                <td className="p-4 font-bold text-[#001636]">{p.name}</td>
                                <td className="p-4 font-mono text-gray-400 font-medium">{p.code}</td>
                                <td className="p-4 text-center">
                                  <span className={`inline-block px-2.5 py-1 rounded font-extrabold ${
                                    p.quantity <= p.minStock ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-800'
                                  }`}>
                                    {p.quantity} uds
                                  </span>
                                </td>
                                <td className="p-4 font-medium text-slate-500">{p.location || 'Local General'}</td>
                                <td className="p-4 text-right font-mono font-extrabold text-[#001c0e]">
                                  {config.currencySymbol}{p.sellPrice.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </main>

        {/* BottomNavBar (Mobile Only matching attached bottom navigator) */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#002a5c] flex justify-around items-center px-4 md:hidden border-t border-white/10 shadow-lg z-50">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center rounded-xl p-2 transition active:scale-90 ${
              activeTab === 'dashboard' ? 'text-white bg-white/15' : 'text-slate-300'
            }`}
          >
            <LayoutDashboard size={20} />
            <span className="text-[9px] font-bold mt-1">Dashboard</span>
          </button>
          
          <button
            onClick={() => setActiveTab('qr_scan')}
            className={`flex flex-col items-center justify-center rounded-xl p-2 transition active:scale-90 ${
              activeTab === 'qr_scan' ? 'text-white bg-white/15' : 'text-slate-300'
            }`}
          >
            <QrCode size={20} />
            <span className="text-[9px] font-bold mt-1">Escanear QR</span>
          </button>
          
          <button
            onClick={() => setActiveTab('ajustes')}
            className={`flex flex-col items-center justify-center rounded-xl p-2 transition active:scale-90 ${
              activeTab === 'ajustes' ? 'text-white bg-white/15' : 'text-slate-300'
            }`}
          >
            <ClipboardList size={20} />
            <span className="text-[9px] font-bold mt-1">Stock</span>
          </button>
          
          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center rounded-xl p-2 transition active:scale-90 text-red-300"
          >
            <LogOut size={20} />
            <span className="text-[9px] font-bold mt-1 text-red-200">Salir</span>
          </button>
        </nav>

        {/* Floating Action Button on mobile matching GOURMET design */}
        <button 
          onClick={openAddModal}
          className="md:hidden fixed bottom-20 right-5 w-14 h-14 rounded-full bg-[#00B8D9] text-white shadow-xl flex items-center justify-center active:scale-90 transition-transform z-40 hover:brightness-115"
        >
          <Plus size={24} />
        </button>

      </div>

      {/* MODAL 1: "AÑADIR ARTÍCULO" (Premium high-fidelity form dialog) */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-[#081b38]/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-[#e8edff]"
            >
              <div className="bg-[#002a5c] text-white px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-2 rounded-md bg-[#00B8D9] text-[#001f27] text-xs font-extrabold font-mono">NEW</span>
                  <h3 className="font-extrabold text-lg">Registrar Nuevo Artículo</h3>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>

              {addProductType === null ? (
                <div className="p-6 md:p-8 space-y-6">
                  <div className="text-center space-y-1">
                    <h4 className="text-sm font-bold text-[#002a5c]">Clasificación del Nuevo Artículo</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      ¿Qué tipo de producto deseas dar de alta en este de momento?
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setAddProductType('compuesto');
                        setFormCategory('Preparados');
                      }}
                      className="flex items-start gap-4 p-4 text-left border border-slate-200 rounded-2xl hover:border-[#00B8D9] hover:bg-slate-50 transition-all group active:scale-99 cursor-pointer"
                    >
                      <div className="p-3 rounded-xl bg-cyan-50 text-[#00B8D9] group-hover:bg-[#00B8D9] group-hover:text-white transition-colors">
                        <Layers size={22} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-sm text-slate-800 group-hover:text-[#00B8D9] transition-colors">Producto Compuesto</h5>
                          <span className="text-[9px] font-bold text-[#00B8D9] bg-cyan-50 px-1.5 py-0.5 rounded">Combo / Platillo</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed font-sans">
                          Se prepara a partir de ingredientes o materias primas. El stock total se calcula o depende de sus componentes (ej. hamburguesas, pizzas, ensaladas).
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAddProductType('materia_prima');
                        setFormCategory('Carnes');
                      }}
                      className="flex items-start gap-4 p-4 text-left border border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-slate-50 transition-all group active:scale-99 cursor-pointer"
                    >
                      <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Package size={22} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors">Materia Prima / Insumo</h5>
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Ingrediente básico</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed font-sans">
                          Ingrediente individual o insumo complementario utilizado en recetas y productos compuestos (ej. lechuga, panes, carne molida, salsas).
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-5 py-2 text-xs font-bold text-slate-400 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                    >
                      Volver
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200/60 flex justify-between items-center text-[10px] text-slate-500">
                    <span className="font-semibold flex items-center gap-1 font-sans">
                      <span className={`w-2 h-2 rounded-full ${addProductType === 'compuesto' ? 'bg-[#00B8D9]' : 'bg-blue-500'}`}></span>
                      Tipo seleccionado: <strong className="text-slate-800 uppercase font-bold">{addProductType === 'compuesto' ? 'Producto Compuesto' : 'Materia Prima'}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAddProductType(null)}
                      className="text-[#00B8D9] hover:underline font-bold cursor-pointer"
                    >
                      Cambiar Tipo
                    </button>
                  </div>

                  <form onSubmit={handleAddProductSubmit} className="p-6 space-y-4 font-sans text-xs">
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Nombre Comercial del Artículo</label>
                        <input 
                          type="text" 
                          required
                          placeholder={addProductType === 'compuesto' ? "Ej. Hamburguesa Doble Queso, Cappuccino Mediano" : "Ej. Carne de Res Wagyu, Brioche buns, Queso Cheddar"}
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00B8D9]"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Categoría</label>
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                        >
                          <option value="Carnes">Carnes</option>
                          <option value="Panadería">Panadería</option>
                          <option value="Verduras">Verduras</option>
                          <option value="Preparados">Preparados</option>
                          <option value="Bebidas">Bebidas</option>
                          <option value="Abarrotes">Abarrotes</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1 font-sans">Precio PVP (Venta)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-gray-400 font-bold">$</span>
                          <input 
                            type="number" 
                            step="0.01"
                            required
                            value={formSellPrice || ''}
                            onChange={(e) => setFormSellPrice(Number(e.target.value))}
                            className="w-full p-2.5 pl-8 bg-slate-50 border border-slate-200 rounded-xl font-mono text-emerald-800 font-extrabold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Stock Físico Inicial</label>
                        <input 
                          type="number" 
                          step="any"
                          required
                          value={formQuantity || ''}
                          onChange={(e) => setFormQuantity(Number(e.target.value))}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Stock Mínimo Alerta</label>
                        <input 
                          type="number" 
                          step="any"
                          required
                          value={formMinStock || ''}
                          onChange={(e) => setFormMinStock(Number(e.target.value))}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Enlace Ilustración / Imagen (URL)</label>
                        <input 
                          type="text" 
                          placeholder="https://images.unsplash.com/... o enlace de internet"
                          value={formImage}
                          onChange={(e) => setFormImage(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[10px]"
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3 border-t">
                      <button
                        type="button"
                        onClick={() => setAddProductType(null)}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition text-center cursor-pointer"
                      >
                        Atrás
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-[#00B8D9] text-white py-3 rounded-xl font-bold hover:brightness-110 active:scale-95 transition text-center cursor-pointer"
                      >
                        Confirmar Registro
                      </button>
                    </div>

                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: "EDITAR/ELIMINAR ARTÍCULO" (Beautiful item action manager overlay) */}
      <AnimatePresence>
        {isEditModalOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 bg-[#081b38]/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-[#e8edff]"
            >
              <div className="bg-[#002a5c] text-white px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-2 rounded-md bg-[#00B8D9] text-[#001f27] text-xs font-extrabold font-mono">EDIT</span>
                  <h3 className="font-extrabold text-lg">Modificar Artículo</h3>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleEditProductSubmit} className="p-6 space-y-4 font-sans text-xs">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Nombre Comercial del Artículo</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej. Carne de Res, Tomate, etc..."
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00B8D9]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Código Barra / EAN</label>
                    <input 
                      type="text" 
                      required
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Categoría</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                    >
                      <option value="Carnes">Carnes</option>
                      <option value="Panadería">Panadería</option>
                      <option value="Verduras">Verduras</option>
                      <option value="Preparados">Preparados</option>
                      <option value="Bebidas">Bebidas</option>
                      <option value="Abarrotes">Abarrotes</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Precio PVP ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400 font-bold">$</span>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={formSellPrice || ''}
                        onChange={(e) => setFormSellPrice(Number(e.target.value))}
                        className="w-full p-2.5 pl-8 bg-slate-50 border border-slate-200 rounded-xl font-mono text-emerald-800 font-extrabold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1 font-bold text-slate-800">Existencias Disponibles</label>
                    <div className="flex gap-1 items-center">
                      <button 
                        type="button"
                        onClick={() => setFormQuantity(prev => Math.max(0, prev - 1))}
                        className="bg-slate-100 p-2.5 rounded-xl border font-bold text-slate-700 w-10 text-center text-sm"
                      >
                        -
                      </button>
                      <input 
                        type="number" 
                        step="any"
                        required
                        value={formQuantity}
                        onChange={(e) => setFormQuantity(Number(e.target.value) || 0)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-center"
                      />
                      <button 
                        type="button"
                        onClick={() => setFormQuantity(prev => prev + 1)}
                        className="bg-slate-100 p-2.5 rounded-xl border font-bold text-slate-700 w-10 text-center text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Mínimo Alerta Bajo Stock</label>
                    <input 
                      type="number" 
                      step="any"
                      required
                      value={formMinStock || ''}
                      onChange={(e) => setFormMinStock(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Enlace Ilustración (URL)</label>
                    <input 
                      type="text" 
                      value={formImage}
                      onChange={(e) => setFormImage(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[10px]"
                    />
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3 border-t">
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(selectedProduct.id)}
                    className="bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 px-4 py-3 rounded-xl font-bold transition text-center flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                  <div className="flex-grow flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition text-center"
                    >
                      Regresar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 active:scale-95 transition text-center"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: COMPROBANTE DE COMPRA (POS TICKET) */}
      <AnimatePresence>
        {isReceiptOpen && lastCompletedSale && (
          <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-dashed border-[#c4c6d1]"
            >
              <div className="space-y-4 text-center text-xs font-mono text-gray-800">
                <div className="border-b border-dashed pb-3 space-y-1">
                  <h3 className="font-extrabold text-base tracking-wide flex items-center justify-center gap-1">
                    <Receipt className="text-[#00B8D9]" size={16} /> {config.storeName}
                  </h3>
                  <p className="text-[10px] text-gray-400">{config.address}</p>
                </div>

                <div className="text-left border-b border-dashed pb-3 space-y-1">
                  <p><strong>NRO BOLETA:</strong> {lastCompletedSale.id}</p>
                  <p><strong>FECHA:</strong> {new Date(lastCompletedSale.date).toLocaleString('es-ES')}</p>
                  <p><strong>PAGO:</strong> {lastCompletedSale.paymentMethod}</p>
                </div>

                <div className="text-left border-b border-dashed pb-3 space-y-2">
                  <div className="grid grid-cols-12 font-bold uppercase text-[10px]">
                    <span className="col-span-6">Concepto</span>
                    <span className="col-span-2 text-center">Cant</span>
                    <span className="col-span-4 text-right">Monto</span>
                  </div>
                  {lastCompletedSale.items.map((item, id) => (
                    <div key={id} className="grid grid-cols-12 text-[11px]">
                      <span className="col-span-6 truncate font-medium">{item.name}</span>
                      <span className="col-span-2 text-center text-gray-500">x{item.quantity}</span>
                      <span className="col-span-4 text-right font-bold">{config.currencySymbol}{(item.sellPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="text-right border-b border-dashed pb-3 space-y-1 font-bold">
                  <div className="flex justify-between text-sm font-extrabold text-gray-900 mt-1">
                    <span>TOTAL PAGADO</span>
                    <span>{config.currencySymbol}{lastCompletedSale.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-2 text-slate-400 text-[10px]">
                  <p className="font-bold text-[#00B8D9]">¡GRACIAS POR SU COMPRA!</p>
                  <p>Sistema Certificado Venpro Restaurantes</p>
                </div>

                <div className="pt-4 flex gap-2 font-sans text-xs">
                  <button
                    onClick={() => window.print()}
                    className="flex-grow bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition"
                  >
                    🖨️ Imprimir Ticket
                  </button>
                  <button
                    onClick={() => setIsReceiptOpen(false)}
                    className="flex-grow bg-[#001636] hover:bg-[#002a5c] text-white py-3 rounded-xl font-bold transition"
                  >
                    Cerrar Boleta
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
