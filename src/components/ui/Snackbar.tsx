import React from 'react';

interface SnackbarProps {
  show: boolean;
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Snackbar: React.FC<SnackbarProps> = ({ show, message, type, onClose }) => {
  if (!show) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${
      type === 'success'
        ? 'bg-green-500 text-white'
        : 'bg-red-500 text-white'
    }`}>
      <div className="flex items-center space-x-2">
        <span>{message}</span>
        <button
          onClick={onClose}
          className="ml-2 text-white hover:text-gray-200"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Snackbar;