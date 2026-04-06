import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from '../utils';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  confirmVariant?: 'danger' | 'primary';
}

export function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'Delete',
  confirmVariant = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            confirmVariant === 'danger' ? "bg-red-100" : "bg-indigo-100"
          )}>
            <AlertTriangle className={cn(
              "w-5 h-5",
              confirmVariant === 'danger' ? "text-red-600" : "text-indigo-600"
            )} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors",
              confirmVariant === 'danger' 
                ? "bg-red-600 hover:bg-red-700 focus:ring-red-500" 
                : "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
