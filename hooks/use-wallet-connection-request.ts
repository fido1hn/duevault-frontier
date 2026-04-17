"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

type WalletConnectionRequestOptions = {
  onCancel?: () => void;
  onError?: (error: unknown) => void;
};

const MODAL_CANCEL_DELAY_MS = 250;

export function useWalletConnectionRequest({
  onCancel,
  onError,
}: WalletConnectionRequestOptions = {}) {
  const { connect, connected, connecting, publicKey, wallet } = useWallet();
  const { setVisible, visible } = useWalletModal();
  const [isConnectionRequested, setIsConnectionRequested] = useState(false);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const didAttemptConnectRef = useRef(false);
  const didOpenModalRef = useRef(false);
  const cancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCancelTimer = useCallback(() => {
    if (!cancelTimerRef.current) return;

    clearTimeout(cancelTimerRef.current);
    cancelTimerRef.current = null;
  }, []);

  const resetRequest = useCallback(() => {
    clearCancelTimer();
    didAttemptConnectRef.current = false;
    didOpenModalRef.current = false;
    setIsConnectionRequested(false);
    setIsConnectingWallet(false);
  }, [clearCancelTimer]);

  const requestWalletConnection = useCallback(() => {
    clearCancelTimer();
    didAttemptConnectRef.current = false;
    didOpenModalRef.current = false;
    setIsConnectionRequested(true);

    if (connected || publicKey) {
      setIsConnectingWallet(false);
      return;
    }

    setIsConnectingWallet(true);

    if (!wallet) {
      setVisible(true);
    }
  }, [clearCancelTimer, connected, publicKey, setVisible, wallet]);

  useEffect(() => {
    if (!isConnectionRequested) return;

    if (visible) {
      didOpenModalRef.current = true;
      clearCancelTimer();
    }

    if (connected || publicKey) {
      resetRequest();
      return;
    }

    if (!wallet) {
      if (didOpenModalRef.current && !visible && !cancelTimerRef.current) {
        cancelTimerRef.current = setTimeout(() => {
          resetRequest();
          onCancel?.();
        }, MODAL_CANCEL_DELAY_MS);
      }

      return;
    }

    clearCancelTimer();

    if (connecting || didAttemptConnectRef.current) return;

    didAttemptConnectRef.current = true;
    setIsConnectingWallet(true);

    void connect().catch((error: unknown) => {
      resetRequest();
      onError?.(error);
    });
  }, [
    clearCancelTimer,
    connect,
    connected,
    connecting,
    isConnectionRequested,
    onCancel,
    onError,
    publicKey,
    resetRequest,
    visible,
    wallet,
  ]);

  useEffect(() => clearCancelTimer, [clearCancelTimer]);

  return {
    isConnectingWallet: isConnectingWallet || connecting,
    requestWalletConnection,
  };
}
