export const VENPRO_INVITE_QR_PREFIX = 'venpro://invite/';

export function buildOwnerInviteQrPayload(inviteCode: string): string {
  return `${VENPRO_INVITE_QR_PREFIX}${inviteCode.trim().toLowerCase()}`;
}

export function parseInviteCodeFromQr(decodedText: string): string | null {
  const trimmed = decodedText.trim();

  if (trimmed.startsWith(VENPRO_INVITE_QR_PREFIX)) {
    const code = trimmed.slice(VENPRO_INVITE_QR_PREFIX.length).trim();
    return code || null;
  }

  if (/^[a-f0-9]{6,12}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return null;
}
