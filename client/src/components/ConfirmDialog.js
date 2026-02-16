import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const ConfirmDialog = ({ 
  isOpen, 
  title, 
  message, 
  confirmText = "Delete", 
  cancelText = "Cancel", 
  onConfirm, 
  onCancel,
  type = "delete" 
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {type === 'delete' && (
              <AlertTriangle className="h-5 w-5 text-red-400" />
            )}
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <p className="text-gray-300 mb-6">{message}</p>
        
        <div className="flex space-x-3 justify-end">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
