import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const STORAGE_KEY = 'venpro_verification';
const CODE_EXPIRY_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

export type VerificationMethod = 'email' | 'sms';

export class VerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VerificationError';
  }
}

interface StoredVerification {
  code: string;
  method: VerificationMethod;
  destination: string;
  expiresAt: number;
  sentAt: number;
  supabaseOtp?: boolean;
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function saveLocalVerification(data: StoredVerification): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getLocalVerification(): StoredVerification | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredVerification;
  } catch {
    return null;
  }
}

function mapSupabaseOtpError(message: string, method: VerificationMethod): string {
  const lower = message.toLowerCase();

  if (method === 'sms') {
    return 'El SMS requiere configurar un proveedor en Supabase (Authentication > Phone, p. ej. Twilio).';
  }

  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Demasiados intentos. Espera unos minutos antes de reenviar el código.';
  }

  if (
    lower.includes('smtp') ||
    lower.includes('mail') ||
    lower.includes('email provider') ||
    lower.includes('sending')
  ) {
    return 'No se pudo enviar el correo. En Supabase activa Authentication > Providers > Email y, si hace falta, SMTP en Project Settings > Authentication.';
  }

  if (lower.includes('signup') || lower.includes('sign up')) {
    return 'El registro por correo no está habilitado en Supabase. Activa Email en Authentication > Providers.';
  }

  return `No se pudo enviar el código: ${message}`;
}

export function formatPhoneE164(countryCode: string, phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, '');
  const code = countryCode.replace(/\D/g, '');
  return `+${code}${digits}`;
}

export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0) return '••••';
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  const visible = local.length <= 2 ? local[0] ?? '•' : local.slice(0, 2);
  return `${visible}•••@${domain}`;
}

export function maskPhone(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  return `Terminado en •••• ${digits.slice(-4)}`;
}

export interface SendVerificationResult {
  destination: string;
  method: VerificationMethod;
  usedSupabase: boolean;
  demoCode?: string;
}

export async function sendVerificationCode(params: {
  method: VerificationMethod;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
}): Promise<SendVerificationResult> {
  const { method, email, phoneCountryCode, phoneNumber } = params;

  const destination =
    method === 'email'
      ? email.trim().toLowerCase()
      : formatPhoneE164(phoneCountryCode, phoneNumber);

  if (method === 'email' && !email.trim()) {
    throw new VerificationError('No hay correo electrónico registrado.');
  }
  if (method === 'sms' && !phoneNumber.trim()) {
    throw new VerificationError('No hay número de teléfono registrado.');
  }

  const existing = getLocalVerification();
  if (
    existing &&
    existing.method === method &&
    existing.destination === destination &&
    Date.now() - existing.sentAt < RESEND_COOLDOWN_MS
  ) {
    const secondsLeft = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.sentAt)) / 1000);
    throw new VerificationError(`Espera ${secondsLeft}s antes de reenviar el código.`);
  }

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.signInWithOtp(
      method === 'email'
        ? {
            email: destination,
            options: { shouldCreateUser: true },
          }
        : {
            phone: destination,
            options: { shouldCreateUser: true, channel: 'sms' },
          },
    );

    if (error) {
      throw new VerificationError(mapSupabaseOtpError(error.message, method));
    }

    saveLocalVerification({
      code: '',
      method,
      destination,
      expiresAt: Date.now() + CODE_EXPIRY_MS,
      sentAt: Date.now(),
      supabaseOtp: true,
    });

    return { destination, method, usedSupabase: true };
  }

  const code = generateCode();
  saveLocalVerification({
    code,
    method,
    destination,
    expiresAt: Date.now() + CODE_EXPIRY_MS,
    sentAt: Date.now(),
    supabaseOtp: false,
  });

  return { destination, method, usedSupabase: false, demoCode: code };
}

export async function verifyVerificationCode(params: {
  method: VerificationMethod;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  code: string;
}): Promise<void> {
  const { method, email, phoneCountryCode, phoneNumber, code } = params;
  const trimmedCode = code.replace(/\D/g, '');

  if (trimmedCode.length !== 6) {
    throw new VerificationError('El código debe tener 6 dígitos.');
  }

  const destination =
    method === 'email'
      ? email.trim().toLowerCase()
      : formatPhoneE164(phoneCountryCode, phoneNumber);

  const stored = getLocalVerification();
  if (!stored) {
    throw new VerificationError('Primero envía el código de verificación.');
  }

  if (stored.method !== method || stored.destination !== destination) {
    throw new VerificationError('El método o destino no coincide. Envía un nuevo código.');
  }

  if (Date.now() > stored.expiresAt) {
    throw new VerificationError('El código ha expirado. Solicita uno nuevo.');
  }

  if (stored.supabaseOtp && isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.verifyOtp(
      method === 'email'
        ? { email: destination, token: trimmedCode, type: 'email' }
        : { phone: destination, token: trimmedCode, type: 'sms' },
    );

    if (error) {
      throw new VerificationError('Código incorrecto. Verifica e intenta de nuevo.');
    }

    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }

  if (stored.code !== trimmedCode) {
    throw new VerificationError('Código incorrecto. Verifica e intenta de nuevo.');
  }

  sessionStorage.removeItem(STORAGE_KEY);
}

export function clearVerificationState(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export { isSupabaseConfigured };
