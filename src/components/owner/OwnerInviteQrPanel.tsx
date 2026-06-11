import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, QrCode, RefreshCw, Check, Download } from 'lucide-react';
import OwnerInviteQrCode from '@/components/owner/OwnerInviteQrCode';
import { ensureLocalInviteCode } from '@/lib/inviteQr';
import {
  fetchOrganizationInviteCode,
  regenerateOrganizationInviteCode,
} from '@/services/organizationService';
import { AuthError } from '@/services/authService';

interface OwnerInviteQrPanelProps {
  organizationId: string | null;
  isSupabaseEnabled: boolean;
  businessName: string;
}

export default function OwnerInviteQrPanel({
  organizationId,
  isSupabaseEnabled,
  businessName,
}: OwnerInviteQrPanelProps) {
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const regenerateSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerateSuccess, setRegenerateSuccess] = useState(false);
  const [error, setError] = useState('');

  const showRegenerateSuccessNotice = useCallback(() => {
    if (regenerateSuccessTimerRef.current) {
      clearTimeout(regenerateSuccessTimerRef.current);
    }
    setRegenerateSuccess(true);
    regenerateSuccessTimerRef.current = setTimeout(() => {
      setRegenerateSuccess(false);
      regenerateSuccessTimerRef.current = null;
    }, 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (regenerateSuccessTimerRef.current) {
        clearTimeout(regenerateSuccessTimerRef.current);
      }
    };
  }, []);

  const loadInviteCode = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      if (isSupabaseEnabled && organizationId) {
        const code = await fetchOrganizationInviteCode(organizationId);
        setInviteCode(code ?? '');
      } else if (isSupabaseEnabled) {
        setInviteCode('');
        setError('No se encontró tu negocio. Cierra sesión e inicia de nuevo como propietario.');
      } else {
        setInviteCode(ensureLocalInviteCode());
      }
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'No se pudo cargar el código QR.');
      setInviteCode(isSupabaseEnabled ? '' : ensureLocalInviteCode());
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, isSupabaseEnabled]);

  useEffect(() => {
    loadInviteCode();
  }, [loadInviteCode]);

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('No se pudo copiar el código. Inténtalo manualmente.');
    }
  };

  const handleRegenerate = async () => {
    const confirmed = window.confirm(
      '¿Generar un nuevo código QR?\n\nEl código anterior dejará de funcionar. Los empleados que aún no se hayan vinculado necesitarán escanear el nuevo QR.',
    );
    if (!confirmed) return;

    setIsRegenerating(true);
    setError('');
    setRegenerateSuccess(false);

    try {
      const orgId = organizationId ?? 'local';
      const newCode = await regenerateOrganizationInviteCode(orgId);
      setInviteCode(newCode);
      showRegenerateSuccessNotice();
    } catch (err) {
      setError(
        err instanceof AuthError
          ? err.message
          : 'No se pudo generar un nuevo código. Intenta de nuevo.',
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownloadQr = () => {
    const svg = qrContainerRef.current?.querySelector('svg');
    if (!svg || !inviteCode) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = businessName.replace(/[^\w\s-]/g, '').trim() || 'venpro';
    link.href = url;
    link.download = `venpro-qr-${safeName}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {regenerateSuccess && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce max-w-[min(90vw,28rem)]"
        >
          <Check size={18} className="shrink-0" />
          <span className="text-sm text-left">¡Nuevo QR generado! El código anterior ya no funciona.</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-[#c4c6d1] shadow-sm text-center">
      <div className="inline-flex p-3 bg-blue-50 text-[#002A5C] rounded-2xl mb-4">
        <QrCode size={36} />
      </div>
      <h3 className="font-bold text-[#081b38] text-lg">QR de vinculación de empleados</h3>
      <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 leading-relaxed">
        Este código pertenece a tu cuenta de propietario y a tu negocio{' '}
        <strong className="text-[#081b38]">{businessName}</strong>. Compártelo para que nuevos
        empleados se registren y se conecten al inventario.
      </p>

      {!isSupabaseEnabled && (
        <p className="mt-3 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 max-w-md mx-auto leading-relaxed">
          Modo local: el QR funciona para registrar empleados, pero para sincronizar inventario
          entre dispositivos distintos configura Supabase en <code className="font-mono">.env.local</code>.
        </p>
      )}

      {regenerateSuccess && (
        <div className="mt-4 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 max-w-md mx-auto flex items-center justify-center gap-2">
          <Check size={16} className="text-emerald-600 shrink-0" />
          <span>Nuevo QR activo. Comparte este código con tus empleados.</span>
        </div>
      )}

      {error && (
        <p className="mt-4 text-xs text-red-600 font-semibold bg-red-50 border border-red-100 rounded-lg px-4 py-2 max-w-md mx-auto">
          {error}
        </p>
      )}

      <div className="my-8 flex justify-center">
        <div
          className={`bg-white p-6 border-2 border-dashed rounded-3xl shadow-md relative transition-all duration-500 ${
            regenerateSuccess
              ? 'border-emerald-400 ring-4 ring-emerald-200 ring-offset-2'
              : 'border-[#002A5C]'
          }`}
        >
          <div
            ref={qrContainerRef}
            className="w-56 h-56 bg-slate-50 border border-gray-100 rounded-2xl flex items-center justify-center p-4"
          >
            {isLoading ? (
              <div className="w-8 h-8 border-2 border-[#00B8D9] border-t-transparent rounded-full animate-spin" />
            ) : (
              <OwnerInviteQrCode inviteCode={inviteCode} size={180} />
            )}
          </div>
          <span className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-[#00B8D9] text-[#002A5C] text-[9px] font-black px-3 py-1 rounded-full uppercase shadow">
            VINCULADOR SEGURO
          </span>
        </div>
      </div>

      {inviteCode && !isLoading && (
        <div className="space-y-3 max-w-md mx-auto mb-6">
          <p className="text-[10px] text-gray-400 font-mono break-all">
            Código: {inviteCode}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-[#c4c6d1] text-[#002A5C] hover:bg-[#f1f3ff] transition-colors"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              {copied ? 'Copiado' : 'Copiar código'}
            </button>
            <button
              type="button"
              onClick={handleDownloadQr}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-[#c4c6d1] text-[#002A5C] hover:bg-[#f1f3ff] transition-colors"
            >
              <Download size={14} />
              Descargar QR
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#002A5C] text-white hover:bg-[#003d7c] disabled:opacity-60 transition-colors"
            >
              <RefreshCw size={14} className={isRegenerating ? 'animate-spin' : ''} />
              {isRegenerating ? 'Generando…' : 'Cambiar QR'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#f9f9ff] text-left p-4 rounded-xl border space-y-2 max-w-md mx-auto">
        <p className="text-xs font-bold text-[#081b38] uppercase">Cómo lo usa un empleado</p>
        <ol className="text-xs text-gray-500 list-decimal pl-4 space-y-1">
          <li>En Venpro, elige &quot;Soy un empleado&quot; y completa sus datos.</li>
          <li>En la pantalla de escaneo, apunta la cámara a este QR.</li>
          <li>Al validarse, su cuenta quedará vinculada a tu negocio.</li>
        </ol>
        <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2">
          Si cambias el QR, el código anterior deja de servir. Usa &quot;Cambiar QR&quot; solo si
          necesitas revocar accesos pendientes.
        </p>
      </div>
      </div>
    </>
  );
}
