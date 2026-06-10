import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Minus, Plus, Search, ShoppingCart, Check } from 'lucide-react';
import type { IndustryType, Product, Sale, SaleItem, StockTransaction, StoreConfig } from '@/types';
import {
  applySaleStockUpdates,
  buildSaleStockTransactions,
  getMaxCompoundSaleQuantity,
  isProductAvailableForSale,
} from '@/lib/compoundProduct';

export interface DailySalesPanelHandle {
  adjustProductQuantity: (productId: string, delta: number) => void;
}

interface DailySalesPanelProps {
  products: Product[];
  sales: Sale[];
  transactions: StockTransaction[];
  config: StoreConfig;
  industry?: IndustryType;
  panelId?: string;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateSales: (sales: Sale[]) => void;
  onUpdateTransactions: (transactions: StockTransaction[]) => void;
}

const DailySalesPanel = forwardRef<DailySalesPanelHandle, DailySalesPanelProps>(function DailySalesPanel(
  {
    products,
    sales,
    transactions,
    config,
    industry,
    panelId = 'daily-sales-panel',
    onUpdateProducts,
    onUpdateSales,
    onUpdateTransactions,
  },
  ref,
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [saleQuantities, setSaleQuantities] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia'>('Efectivo');
  const [successMessage, setSuccessMessage] = useState('');

  const getMaxSaleQuantity = (product: Product) => {
    if (industry === 'restaurante' && product.isCompound) {
      return getMaxCompoundSaleQuantity(product, products);
    }
    return Math.max(0, product.quantity);
  };

  const availableProducts = useMemo(() => {
    if (industry === 'restaurante') {
      return [...products].sort((a, b) => {
        const aAvailable = isProductAvailableForSale(a, products);
        const bAvailable = isProductAvailableForSale(b, products);
        if (aAvailable !== bAvailable) return aAvailable ? -1 : 1;
        return a.name.localeCompare(b.name, 'es');
      });
    }
    return products.filter((p) => p.quantity > 0);
  }, [products, industry]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return availableProducts;

    return availableProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.code.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query),
    );
  }, [availableProducts, searchQuery]);

  const selectedItems = useMemo(() => {
    return Object.entries(saleQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return null;
        return { product, quantity };
      })
      .filter((item): item is { product: Product; quantity: number } => item !== null);
  }, [saleQuantities, products]);

  const saleTotal = useMemo(
    () => selectedItems.reduce((sum, { product, quantity }) => sum + product.sellPrice * quantity, 0),
    [selectedItems],
  );

  const totalUnits = useMemo(
    () => selectedItems.reduce((sum, { quantity }) => sum + quantity, 0),
    [selectedItems],
  );

  const updateQuantity = (product: Product, delta: number) => {
    const maxQty = getMaxSaleQuantity(product);

    setSaleQuantities((prev) => {
      const current = prev[product.id] ?? 0;
      const next = current + delta;

      if (next <= 0) {
        const { [product.id]: _, ...rest } = prev;
        return rest;
      }

      if (next > maxQty) return prev;

      return { ...prev, [product.id]: next };
    });
  };

  useImperativeHandle(ref, () => ({
    adjustProductQuantity: (productId: string, delta: number) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return;
      updateQuantity(product, delta);
    },
  }));

  const handleRegisterSale = () => {
    if (selectedItems.length === 0) return;

    const cart: SaleItem[] = selectedItems.map(({ product, quantity }) => ({
      productId: product.id,
      name: product.name,
      quantity,
      sellPrice: product.sellPrice,
      buyPrice: product.buyPrice || product.sellPrice * 0.6,
    }));

    const newSale: Sale = {
      id: 'BOLETA-' + Math.floor(100000 + Math.random() * 900000),
      date: new Date().toISOString(),
      items: cart,
      totalAmount: saleTotal,
      responsible: 'Propietario',
      paymentMethod,
    };

    const updatedProducts = applySaleStockUpdates(products, cart);
    const newTransactions = buildSaleStockTransactions(cart, products, newSale.id);

    onUpdateProducts(updatedProducts);
    onUpdateSales([newSale, ...sales]);
    onUpdateTransactions([...newTransactions, ...transactions]);

    setSaleQuantities({});
    setSuccessMessage(`Venta registrada: ${config.currencySymbol}${saleTotal.toFixed(2)} (${totalUnits} uds)`);
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  return (
    <section
      id={panelId}
      className="bg-white rounded-2xl border border-[#c4c6d1] shadow-sm overflow-hidden"
    >
      <div className="p-5 md:p-6 border-b border-[#c4c6d1] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-[#002A5C] flex items-center gap-2">
            <ShoppingCart size={20} className="text-[#00B8D9]" />
            Ventas Diarias
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {industry === 'restaurante'
              ? 'Añade platillos compuestos o materias primas. Los compuestos descuentan sus ingredientes automáticamente.'
              : 'Selecciona productos con + y − para registrar la venta del día.'}
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, código o categoría..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#c4c6d1] rounded-xl bg-[#f9f9ff] text-[#081b38] focus:outline-none focus:ring-2 focus:ring-[#00B8D9]/20 focus:border-[#00B8D9]"
          />
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
        {products.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <ShoppingCart size={36} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm font-semibold">No hay productos en el inventario</p>
            <p className="text-xs mt-1">Agrega artículos al inventario para registrarlos aquí en ventas.</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Search size={36} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm font-semibold">Sin resultados para &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const qty = saleQuantities[product.id] ?? 0;
            const lineTotal = product.sellPrice * qty;
            const maxQty = getMaxSaleQuantity(product);
            const isCompound = industry === 'restaurante' && product.isCompound;
            const isOutOfStock = maxQty <= 0;

            return (
              <div
                key={product.id}
                className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 hover:bg-[#f9f9ff]/80 transition-colors"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold">
                      N/A
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#081b38] truncate">{product.name}</p>
                    {isCompound && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                        Compuesto
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-gray-500 mt-0.5">
                    <span className="font-mono">{product.code}</span>
                    <span>·</span>
                    <span>{product.category}</span>
                    <span>·</span>
                    <span className={`font-semibold ${isOutOfStock ? 'text-red-500' : 'text-[#00687b]'}`}>
                      {isCompound ? `Disponible: ${maxQty} u` : `${product.quantity} en stock`}
                    </span>
                    {isCompound && product.recipe?.length ? (
                      <>
                        <span>·</span>
                        <span>{product.recipe.length} ingredientes</span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-sm font-black text-[#002A5C] font-mono">
                    {config.currencySymbol}{product.sellPrice.toFixed(2)}
                  </p>
                  {qty > 0 && (
                    <p className="text-[10px] font-bold text-[#00B8D9] font-mono">
                      = {config.currencySymbol}{lineTotal.toFixed(2)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateQuantity(product, -1)}
                    disabled={qty === 0}
                    className="w-8 h-8 rounded-lg bg-[#f1f3ff] hover:bg-gray-200 text-[#00687b] flex items-center justify-center font-bold disabled:opacity-40 disabled:cursor-not-allowed transition"
                    aria-label={`Disminuir ${product.name}`}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-bold text-sm w-7 text-center font-mono text-[#081b38]">{qty}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(product, 1)}
                    disabled={qty >= maxQty}
                    className="w-8 h-8 rounded-lg bg-[#00B8D9] hover:bg-[#009cad] text-white flex items-center justify-center font-bold disabled:opacity-40 disabled:cursor-not-allowed transition"
                    aria-label={`Aumentar ${product.name}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 md:p-5 border-t border-[#c4c6d1] bg-[#f9f9ff]/50 space-y-4">
        {successMessage && (
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
            <Check size={14} />
            {successMessage}
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase text-gray-400 font-bold block mb-1.5">Método de pago</span>
            <div className="flex flex-wrap gap-2">
              {(['Efectivo', 'Tarjeta', 'Transferencia'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    paymentMethod === method
                      ? 'bg-[#e8edff] border-[#00687b] text-[#00687b]'
                      : 'border-[#c4c6d1] text-gray-500 bg-white hover:bg-gray-50'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="text-right sm:text-left lg:text-right px-1">
              <p className="text-[10px] uppercase text-gray-400 font-bold">Total seleccionado</p>
              <p className="text-xl font-black text-[#002A5C] font-mono">
                {config.currencySymbol}{saleTotal.toFixed(2)}
              </p>
              <p className="text-[10px] text-gray-500 font-semibold">{totalUnits} unidades</p>
            </div>
            <button
              type="button"
              onClick={handleRegisterSale}
              disabled={selectedItems.length === 0}
              className="bg-[#002A5C] hover:bg-[#003d7c] text-white px-6 py-3 rounded-xl font-bold text-sm transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ShoppingCart size={16} />
              Registrar venta
            </button>
          </div>
        </div>
      </div>
    </section>
  );
});

export default DailySalesPanel;
