'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import Snackbar from '@/components/ui/Snackbar';
import { subscribeSnackbar, showGlobalSnackbar, SnackbarType } from '@/utils/snackbarBus';

type SnackbarContextValue = {
  showSnackbar: (message: string, type?: SnackbarType) => void;
  hideSnackbar: () => void;
};

const SnackbarContext = createContext<SnackbarContextValue | undefined>(undefined);

export function useGlobalSnackbar() {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useGlobalSnackbar must be used within SnackbarProvider');
  return ctx;
}

export const SnackbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<SnackbarType>('success');

  const show = useCallback((msg: string, t: SnackbarType = 'success') => {
    setMessage(msg);
    setType(t);
    setVisible(true);
  }, []);

  const hide = useCallback(() => setVisible(false), []);

  useEffect(() => {
    const unsubscribe = subscribeSnackbar(({ message, type }) => {
      show(message, type);
    });
    return unsubscribe;
  }, [show]);

  const value: SnackbarContextValue = {
    showSnackbar: (msg, t) => showGlobalSnackbar(msg, t ?? 'success'),
    hideSnackbar: hide,
  };

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar show={visible} message={message} type={type} onClose={hide} />
    </SnackbarContext.Provider>
  );
};