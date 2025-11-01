import { useState } from 'react';

interface SnackbarState {
  show: boolean;
  message: string;
  type: 'success' | 'error';
}

export const useSnackbar = () => {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    show: false,
    message: '',
    type: 'success'
  });

  const showSnackbar = (message: string, type: 'success' | 'error' = 'success') => {
    setSnackbar({ show: true, message, type });
    setTimeout(() => {
      setSnackbar({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const hideSnackbar = () => {
    setSnackbar({ show: false, message: '', type: 'success' });
  };

  return {
    snackbar,
    showSnackbar,
    hideSnackbar
  };
};