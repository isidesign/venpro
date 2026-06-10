import { motion } from 'motion/react';
import {
  PlusCircle, Package, Coins, AlertTriangle, Search, Edit2, Trash2, Image as ImageIcon,
} from 'lucide-react';
import type { Product, Sale, StockTransaction, StoreConfig } from '@/types';
import DailySalesPanel from '@/components/dashboards/DailySalesPanel';
import { getIndustryWelcomeSubtitle, getIndustryCatalogSubtitle } from '@/lib/industry';

interface ClothingStoreDashboardProps {
  config: StoreConfig;
  products: Product[];
  sales: Sale[];
  transactions: StockTransaction[];
  stats: { totalItems: number; lowStockItems: number };
  categories: string[];
  categoryFilter: string;
  searchQuery: string;
  filteredProducts: Product[];
  onCategoryFilterChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string, name: string) => void;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateSales: (sales: Sale[]) => void;
  onUpdateTransactions: (transactions: StockTransaction[]) => void;
}

export default function ClothingStoreDashboard({
  config,
  products,
  sales,
  transactions,
  stats,
  categories,
  categoryFilter,
  searchQuery,
  filteredProducts,
  onCategoryFilterChange,
  onSearchQueryChange,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onUpdateProducts,
  onUpdateSales,
  onUpdateTransactions,
}: ClothingStoreDashboardProps) {
  const today = new Date();
  const todaySales = sales.filter((sale) => {
    const saleDate = new Date(sale.date);
    return (
      saleDate.getDate() === today.getDate() &&
      saleDate.getMonth() === today.getMonth() &&
      saleDate.getFullYear() === today.getFullYear()
    );
  });
  const todayOrders = todaySales.length;
  const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);

  return (
    <motion.div
      key="dashboard-tienda"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#002A5C] tracking-tight">
            Bienvenido: {config.storeName}
          </h2>
          <p className="text-sm text-[#00B8D9] font-sans tracking-wide mt-1 font-bold">
            {getIndustryWelcomeSubtitle('tienda')}
          </p>
        </div>
        <button
          type="button"
          onClick={onAddProduct}
          className="bg-[#00B8D9] text-white px-6 py-3.5 rounded-xl flex items-center gap-2 font-bold hover:brightness-110 active:scale-95 transition-all w-fit shadow-md shadow-[#00B8D9]/20"
        >
          <PlusCircle size={18} />
          <span>Añadir Artículo</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#002A5C]" />
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Stock Total</span>
            <Package className="text-[#002A5C]" size={20} />
          </div>
          <div className="text-3xl font-black text-[#002A5C] leading-none mb-1">
            {Math.round(stats.totalItems).toLocaleString('es-ES')}
          </div>
          <div className="text-xs text-slate-500 font-medium">Unidades en almacén general</div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#00B8D9]" />
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Ventas Hoy</span>
            <Coins className="text-[#00B8D9]" size={20} />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black text-[#002A5C] leading-none">{todayOrders}</div>
            {todayRevenue > 0 && (
              <span className="text-xs font-bold text-[#027a48] bg-[#d1fadf] px-2 py-0.5 rounded-full">
                +{config.currencySymbol}{todayRevenue.toFixed(2)}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">Órdenes procesadas hoy</div>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#ba1a1a]" />
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Alertas de Stock</span>
            <AlertTriangle className="text-[#ba1a1a]" size={20} />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black text-[#ba1a1a] leading-none">{stats.lowStockItems}</div>
            {stats.lowStockItems > 0 && (
              <span className="text-xs font-bold text-[#ba1a1a] bg-[#ffdad6] px-2 py-0.5 rounded-full animate-pulse">
                Crítico
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">Artículos por debajo del mínimo</div>
        </div>
      </div>

      <DailySalesPanel
        products={products}
        sales={sales}
        transactions={transactions}
        config={config}
        onUpdateProducts={onUpdateProducts}
        onUpdateSales={onUpdateSales}
        onUpdateTransactions={onUpdateTransactions}
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-[#002A5C]">Productos Recientes</h3>
            <p className="text-xs text-slate-400 mt-0.5">{getIndustryCatalogSubtitle('tienda')}</p>
          </div>
          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value)}
              className="bg-white text-xs text-slate-600 border border-slate-200 px-3 py-2 rounded-xl font-bold focus:outline-none"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === 'Todas' ? 'Todo' : category}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Buscar..."
                className="bg-white text-xs text-slate-600 border border-slate-200 rounded-xl pl-8 pr-3 py-2 w-32 focus:w-44 transition-all focus:outline-none focus:ring-1 focus:ring-[#00B8D9]"
              />
            </div>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white text-center py-12 text-slate-400 border rounded-2xl border-dashed">
            <Package className="mx-auto text-slate-200 mb-3" size={44} />
            <p className="text-sm font-bold text-slate-500">No se encontraron artículos</p>
            <p className="text-xs text-slate-400 mt-1">
              {products.length === 0
                ? 'Registra tu primer artículo para comenzar.'
                : 'Ajusta los filtros de búsqueda.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const isOutOfStock = product.quantity <= 0;
              const isLowStock = !isOutOfStock && product.quantity <= product.minStock;

              return (
                <div
                  key={product.id}
                  className="group bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-slate-200 transition-all duration-300 relative"
                >
                  <div className="h-44 w-full bg-slate-50 relative overflow-hidden border-b border-slate-100">
                    {product.image ? (
                      <img
                        alt={product.name}
                        src={product.image}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                        <ImageIcon size={32} />
                        <span className="text-[9px] mt-1 uppercase font-mono">Sin foto</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteProduct(product.id, product.name)}
                      className="absolute top-2.5 left-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white p-2 rounded-xl border border-red-100 shadow-sm transition z-10"
                      title="Eliminar"
                    >
                      <Trash2 size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditProduct(product)}
                      className="absolute inset-x-0 bottom-0 bg-black/45 backdrop-blur-sm flex items-center justify-center py-2 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    >
                      <span className="text-[11px] font-bold text-white flex items-center gap-1">
                        <Edit2 size={11} /> Editar Datos / Stock
                      </span>
                    </button>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">
                      <span>{product.category}</span>
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
                    <h4 className="font-extrabold text-sm text-[#002A5C] truncate">{product.name}</h4>
                    <p className="text-[9px] text-[#ea580c] font-mono tracking-widest font-bold uppercase">
                      SKU: {product.code}
                    </p>
                    <div className="border-t border-slate-50 pt-2 flex justify-between text-[11px]">
                      <span className="text-slate-400">Stock: <strong className="text-slate-800">{product.quantity} u</strong></span>
                      <strong className="text-sm font-black text-slate-800 font-mono">
                        {config.currencySymbol}{product.sellPrice.toFixed(2)}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
