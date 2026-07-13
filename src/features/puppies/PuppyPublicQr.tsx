import QRCode from 'react-native-qrcode-svg';

import { getPublicPuppyUrl } from './puppyExperience';

interface PuppyPublicQrProps {
  publicId: string;
  size?: number;
}

/** Deterministic QR: it can be rendered anywhere without storing another asset or URL. */
export function PuppyPublicQr({ publicId, size = 180 }: PuppyPublicQrProps) {
  return <QRCode value={getPublicPuppyUrl(publicId)} size={size} backgroundColor="#FFFFFF" color="#0F172A" />;
}

