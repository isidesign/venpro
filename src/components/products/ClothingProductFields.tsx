import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, QrCode, X, Check } from 'lucide-react';
import type { ClothingAudience, Product } from '@/types';
import {
  CLOTHING_AUDIENCES,
  CLOTHING_CATEGORIES,
  CLOTHING_COLORS,
  CLOTHING_SIZES_BY_AUDIENCE,
} from '@/data/clothingCatalog';

type ClothingProductForm = Omit<Product, 'id'> & { unit?: string; expiry?: string; isCompound?: boolean };

interface ClothingProductFieldsProps {
  productForm: ClothingProductForm;
  setProductForm: React.Dispatch<React.SetStateAction<ClothingProductForm>>;
}

function toggleListItem(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

export default function ClothingProductFields({
  productForm,
  setProductForm,
}: ClothingProductFieldsProps) {
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [scanSuccess, setScanSuccess] = useState('');
  const barcodeScannerRef = useRef<Html5Qrcode | null>(null);

  const audience = (productForm.audience ?? 'Clásicas') as ClothingAudience;
  const availableSizes = CLOTHING_SIZES_BY_AUDIENCE[audience];
  const selectedSizes = productForm.sizes ?? [];
  const selectedColors = productForm.colors ?? [];

  useEffect(() => {
    if (!showBarcodeScanner) {
      if (barcodeScannerRef.current?.isScanning) {
        barcodeScannerRef.current.stop().catch(() => undefined);
      }
      barcodeScannerRef.current = null;
      return;
    }

    let mounted = true;
    setScannerError('');
    const scannerElementId = 'clothing-barcode-scanner';

    const timer = setTimeout(() => {
      if (!mounted) return;

      const scanner = new Html5Qrcode(scannerElementId);
      barcodeScannerRef.current = scanner;

      scanner
        .start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.8;
              return { width: size, height: Math.round(size * 0.45) };
            },
          },
          (decodedText) => {
            if (!mounted) return;
            setProductForm((prev) => ({ ...prev, code: decodedText.trim() }));
            setScanSuccess(`Código detectado: ${decodedText}`);
            setShowBarcodeScanner(false);
            setTimeout(() => setScanSuccess(''), 3000);
          },
          () => undefined,
        )
        .catch(() => {
          if (!mounted) return;
          setScannerError('No se pudo acceder a la cámara. Revisa los permisos del navegador.');
        });
    }, 200);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (barcodeScannerRef.current?.isScanning) {
        barcodeScannerRef.current.stop().catch(() => undefined);
      }
      barcodeScannerRef.current = null;
    };
  }, [showBarcodeScanner, setProductForm]);

  const handleAudienceChange = (nextAudience: ClothingAudience) => {
    const validSizes = new Set(CLOTHING_SIZES_BY_AUDIENCE[nextAudience]);
    setProductForm((prev) => ({
      ...prev,
      audience: nextAudience,
      sizes: (prev.sizes ?? []).filter((size) => validSizes.has(size)),
    }));
  };

  return (
    <>
      <div className="md:col-span-2 space-y-2">
        <label htmlFor="prod-code-field" className="text-xs font-bold uppercase tracking-wider text-[#002a5c] block">
          Código de Barras / SKU
        </label>
        <div className="flex gap-2">
          <input
            id="prod-code-field"
            type="text"
            required
            value={productForm.code}
            onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
            className="flex-1 px-4 py-3 rounded-xl border border-[#c4c6d1] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8d9]/20 focus:border-[#00b8d9] transition-all text-[#081b38] font-mono"
            placeholder="Escanea o escribe el código..."
          />
          <button
            type="button"
            onClick={() => setShowBarcodeScanner(true)}
            className="shrink-0 px-4 py-3 rounded-xl border border-[#00b8d9] bg-[#00b8d9]/10 text-[#00687b] hover:bg-[#00b8d9]/20 transition flex items-center gap-2 text-sm font-bold"
            title="Escanear código con cámara"
          >
            <Camera size={18} />
            <span className="hidden sm:inline">Escanear</span>
          </button>
        </div>
        {scanSuccess && (
          <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <Check size={14} />
            {scanSuccess}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="prod-audience-field" className="text-xs font-bold uppercase tracking-wider text-[#002a5c] block">
          Línea de Ropa
        </label>
        <select
          id="prod-audience-field"
          value={audience}
          onChange={(e) => handleAudienceChange(e.target.value as ClothingAudience)}
          className="w-full px-4 py-3 rounded-xl border border-[#c4c6d1] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8d9]/20 focus:border-[#00b8d9] transition-all text-[#081b38]"
        >
          {CLOTHING_AUDIENCES.map((option) => (
            <option key={option} value={option}>
              {option === 'Clásicas' ? 'Clásicas (adulto)' : option === 'Niños' ? 'Ropa de niños' : 'Ropa de bebés'}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="prod-category-field" className="text-xs font-bold uppercase tracking-wider text-[#002a5c] block">
          Categoría
        </label>
        <select
          id="prod-category-field"
          required
          value={productForm.category}
          onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-[#c4c6d1] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8d9]/20 focus:border-[#00b8d9] transition-all text-[#081b38]"
        >
          <option value="" disabled>
            Selecciona una categoría
          </option>
          {CLOTHING_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2 space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-[#002a5c] block">
          Tallas Disponibles
        </label>
        <div className="flex flex-wrap gap-2">
          {availableSizes.map((size) => {
            const isSelected = selectedSizes.includes(size);
            return (
              <button
                key={size}
                type="button"
                onClick={() =>
                  setProductForm((prev) => ({
                    ...prev,
                    sizes: toggleListItem(prev.sizes ?? [], size),
                  }))
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  isSelected
                    ? 'bg-[#002A5C] border-[#002A5C] text-white'
                    : 'bg-white border-[#c4c6d1] text-[#43474f] hover:border-[#00b8d9]'
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
        {selectedSizes.length === 0 && (
          <p className="text-[10px] text-slate-400">Selecciona al menos una talla disponible.</p>
        )}
      </div>

      <div className="md:col-span-2 space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-[#002a5c] block">
          Colores Disponibles
        </label>
        <div className="flex flex-wrap gap-2">
          {CLOTHING_COLORS.map((color) => {
            const isSelected = selectedColors.includes(color);
            return (
              <button
                key={color}
                type="button"
                onClick={() =>
                  setProductForm((prev) => ({
                    ...prev,
                    colors: toggleListItem(prev.colors ?? [], color),
                  }))
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  isSelected
                    ? 'bg-[#00b8d9] border-[#00b8d9] text-white'
                    : 'bg-white border-[#c4c6d1] text-[#43474f] hover:border-[#00b8d9]'
                }`}
              >
                {color}
              </button>
            );
          })}
        </div>
        {selectedColors.length === 0 && (
          <p className="text-[10px] text-slate-400">Selecciona al menos un color disponible.</p>
        )}
      </div>

      {showBarcodeScanner && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[#c4c6d1]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-[#081b38] flex items-center gap-2">
                <QrCode size={18} className="text-[#00B8D9]" />
                Escanear código de barras
              </h3>
              <button
                type="button"
                onClick={() => setShowBarcodeScanner(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Cerrar escáner"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div
                id="clothing-barcode-scanner"
                className="w-full min-h-[220px] rounded-xl overflow-hidden bg-black [&>video]:w-full [&>video]:object-cover"
              />
              <p className="text-xs text-gray-500 text-center">
                Apunta la cámara al código de barras del producto. Se completará automáticamente.
              </p>
              {scannerError && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {scannerError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
