export const VENPRO_INVITE_QR_PREFIX = 'venpro://invite/';

export function isValidInviteCodeFormat(code: string): boolean {
  return /^[a-f0-9]{6,12}$/i.test(code.trim());
}

export function buildOwnerInviteQrPayload(inviteCode: string): string {
  return `${VENPRO_INVITE_QR_PREFIX}${inviteCode.trim().toLowerCase()}`;
}

export function parseInviteCodeFromQr(decodedText: string): string | null {
  const trimmed = decodedText.trim().replace(/\uFEFF/g, '');
  const lower = trimmed.toLowerCase();
  const prefix = VENPRO_INVITE_QR_PREFIX.toLowerCase();

  if (lower.startsWith(prefix)) {
    const code = lower.slice(prefix.length).split(/[/?#\s&]/)[0]?.trim();
    return code && isValidInviteCodeFormat(code) ? code : null;
  }

  const inviteMatch = lower.match(/invite\/([a-f0-9]{6,12})/);
  if (inviteMatch?.[1]) {
    return inviteMatch[1];
  }

  if (isValidInviteCodeFormat(trimmed)) {
    return trimmed.toLowerCase();
  }

  return null;
}

export function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function ensureLocalInviteCode(): string {
  const stored = localStorage.getItem('venpro_invite_code');
  if (stored?.trim() && isValidInviteCodeFormat(stored)) {
    return stored.trim().toLowerCase();
  }
  const code = generateInviteCode();
  localStorage.setItem('venpro_invite_code', code);
  return code;
}
