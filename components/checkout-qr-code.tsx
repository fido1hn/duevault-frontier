"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode } from "lucide-react";

type CheckoutQrCodeProps = {
  invoiceNumber: string;
  solanaPayUrl: string | null;
};

export default function CheckoutQrCode({
  invoiceNumber,
  solanaPayUrl,
}: CheckoutQrCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    let isCancelled = false;

    if (!solanaPayUrl) {
      setQrDataUrl("");
      return;
    }

    void QRCode.toDataURL(solanaPayUrl, {
      color: {
        dark: "#113537",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
      margin: 1,
      width: 384,
    }).then((url) => {
      if (!isCancelled) {
        setQrDataUrl(url);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [solanaPayUrl]);

  if (!qrDataUrl) {
    return <QrCode className="size-16 animate-pulse text-slate-300" />;
  }

  return (
    <Image
      src={qrDataUrl}
      alt={`Solana Pay QR code for invoice ${invoiceNumber}`}
      width={384}
      height={384}
      unoptimized
      className="size-full object-contain"
    />
  );
}
