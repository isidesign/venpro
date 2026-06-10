export const COUNTRY_PHONE_CODES = [
  { code: '+52', label: '🇲🇽 México (+52)' },
  { code: '+34', label: '🇪🇸 España (+34)' },
  { code: '+1', label: '🇺🇸 EE.UU. / Canadá (+1)' },
  { code: '+54', label: '🇦🇷 Argentina (+54)' },
  { code: '+57', label: '🇨🇴 Colombia (+57)' },
  { code: '+51', label: '🇵🇪 Perú (+51)' },
  { code: '+56', label: '🇨🇱 Chile (+56)' },
  { code: '+58', label: '🇻🇪 Venezuela (+58)' },
  { code: '+591', label: '🇧🇴 Bolivia (+591)' },
  { code: '+593', label: '🇪🇨 Ecuador (+593)' },
  { code: '+502', label: '🇬🇹 Guatemala (+502)' },
  { code: '+55', label: '🇧🇷 Brasil (+55)' },
] as const;

export function formatRegistrationPhone(countryCode: string, phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, '');
  return `${countryCode} ${digits}`;
}

export function parseStoredPhone(phone: string): { countryCode: string; number: string } {
  const normalized = phone.trim();
  const sortedCodes = [...COUNTRY_PHONE_CODES].map((c) => c.code).sort((a, b) => b.length - a.length);

  for (const code of sortedCodes) {
    if (normalized.startsWith(code)) {
      return {
        countryCode: code,
        number: normalized.slice(code.length).trim(),
      };
    }
  }

  return { countryCode: '+52', number: normalized };
}

export function isValidRegistrationPhone(phoneNumber: string): boolean {
  const digits = phoneNumber.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}
