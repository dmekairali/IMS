// components/PackingSuccessModal.jsx
'use client';

import { useEffect } from 'react';
import { CheckCircle, ExternalLink, X, FileText, Tag } from 'lucide-react';

export default function PackingSuccessModal({ 
  isOpen, 
  onClose, 
  packingListLink, 
  stickerLink,
  orderId 
}) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fadeIn"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              
              <div className="flex-1 pt-1">
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  Packing Documents Generated!
                </h2>
                <p className="text-sm text-gray-600">
                  Order: <span className="font-semibold text-gray-900">{orderId}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 space-y-3">
            {/* Packing List Link */}
            <a
              href={packingListLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group border border-blue-100"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 mb-0.5">
                  Packing List
                </div>
                <div className="text-xs text-gray-600 truncate">
                  View detailed packing list
                </div>
              </div>
              
              <ExternalLink className="w-5 h-5 text-blue-600 flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>

            {/* Stickers Link */}
            <a
              href={stickerLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors group border border-purple-100"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Tag className="w-5 h-5 text-white" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 mb-0.5">
                  Packing Stickers
                </div>
                <div className="text-xs text-gray-600 truncate">
                  View box-wise stickers
                </div>
              </div>
              
              <ExternalLink className="w-5 h-5 text-purple-600 flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6">
            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle2, FileText, Tag, ExternalLink, Download } from 'lucide-react';

export default function PackingSuccessModal({ 
  isOpen, 
  onClose, 
  orderId, 
  invoiceNo,
  customerName,
  packingListLink, 
  stickerLink 
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Trigger animation
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  const openLink = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'bg-black/50 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={handleOverlayClick}
    >
      <div 
        className={`relative bg-white rounded-2xl shadow-2xl max-w-lg w-full transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Success Icon */}
        <div className="flex flex-col items-center pt-8 pb-6 px-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce-once">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Packing Documents Generated!
          </h2>
          
          <p className="text-gray-600 text-center mb-6">
            Your packing list and stickers have been created successfully
          </p>

          {/* Order Details */}
          <div className="w-full bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Order ID:</span>
              <span className="font-semibold text-gray-900">{orderId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Invoice No:</span>
              <span className="font-semibold text-gray-900">{invoiceNo}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Customer:</span>
              <span className="font-semibold text-gray-900 truncate ml-2 max-w-[200px]" title={customerName}>
                {customerName}
              </span>
            </div>
          </div>

          {/* Document Links */}
          <div className="w-full space-y-3">
            {/* Packing List */}
            <button
              onClick={() => openLink(packingListLink)}
              className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-lg transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    Packing List
                    <ExternalLink className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-xs text-gray-600">Click to open in Google Drive</div>
                </div>
              </div>
              <Download className="w-5 h-5 text-blue-600" />
            </button>

            {/* Stickers */}
            <button
              onClick={() => openLink(stickerLink)}
              className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 rounded-lg transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Tag className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    Packing Stickers
                    <ExternalLink className="w-4 h-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-xs text-gray-600">Click to open in Google Drive</div>
                </div>
              </div>
              <Download className="w-5 h-5 text-purple-600" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex gap-3 mt-6">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors"
            >
              Done
            </button>
          </div>

          {/* Helper Text */}
          <p className="text-xs text-gray-500 mt-4 text-center">
            Documents are saved to Google Drive and logged automatically
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-once {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-once {
          animation: bounce-once 0.6s ease-in-out;
        }
      `}</style>
    </div>
  );
}
