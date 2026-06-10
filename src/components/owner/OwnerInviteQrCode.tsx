import { QRCodeSVG } from 'qrcode.react';
import { buildOwnerInviteQrPayload } from '@/lib/inviteQr';

interface OwnerInviteQrCodeProps {
  inviteCode: string;
  size?: number;
}

export default function OwnerInviteQrCode({ inviteCode, size = 180 }: OwnerInviteQrCodeProps) {
  if (!inviteCode.trim()) {
    return (
      <div
        className="flex items-center justify-center text-xs text-gray-400 font-medium text-center px-4"
        style={{ width: size, height: size }}
      >
        Código de invitación no disponible
      </div>
    );
  }

  return (
    <QRCodeSVG
      value={buildOwnerInviteQrPayload(inviteCode)}
      size={size}
      level="M"
      includeMargin
      className="rounded-lg"
    />
  );
}
