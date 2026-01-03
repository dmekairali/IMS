'use client';
import { useState, useRef } from 'react';

export default function ConsignmentUploadForm({ order, onCancel, onSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [uploadedImageLink, setUploadedImageLink] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const fileInputRef = useRef(null);
  const hasExistingImage = order.consignmentImageUrl && order.consignmentImageUrl !== '';

  const handleCameraCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please capture an image file');
      setShowErrorModal(true);
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setCapturedImage({ file, preview: imageUrl });
  };

  const handleRemoveImage = () => {
    if (capturedImage?.preview) {
      URL.revokeObjectURL(capturedImage.preview);
    }
    setCapturedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenCamera = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!capturedImage) {
      setErrorMessage('Please capture an image first');
      setShowErrorModal(true);
      return;
    }

    setUploading(true);
    setShowErrorModal(false);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('orderId', order.orderId);
      formData.append('image', capturedImage.file);

      const response = await fetch('/api/consignment/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to upload consignment image');
      }

      const data = await response.json();
      setUploadedImageLink(data.imageLink);
      setShowSuccessModal(true);

    } catch (error) {
      console.error('Error uploading consignment image:', error);
      setErrorMessage(error.message);
      setShowErrorModal(true);
    } finally {
      setUploading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    if (capturedImage?.preview) {
      URL.revokeObjectURL(capturedImage.preview);
    }
    if (onSuccess) {
      onSuccess(order.orderId, uploadedImageLink);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-lg font-semibold text-purple-600">📸 Consignment Image Upload</h5>
            {hasExistingImage && (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                ✓ IMAGE UPLOADED
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order ID</label>
              <input type="text" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50" value={order.orderId || ''} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice No</label>
              <input type="text" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50" value={order.invoiceNo || order.orderId || ''} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
              <input type="text" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50" value={order.customerName || ''} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact</label>
              <input type="text" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50" value={order.mobile || ''} readOnly />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {order.invoiceLink && (
              <a href={order.invoiceLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium">
                📋 View Invoice
              </a>
            )}
            {order.packingListLink && (
              <a href={order.packingListLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium">
                📄 View Packing List
              </a>
            )}
            {order.stickerLink && (
              <a href={order.stickerLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium">
                🏷️ View Stickers
              </a>
            )}
          </div>

          {hasExistingImage && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-semibold mb-2">Current Consignment Image:</p>
              <a href={order.consignmentImageUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-green-700 hover:text-green-900 underline flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                View Uploaded Image
              </a>
              <p className="text-xs text-green-600 mt-2">You can upload a new image to replace the existing one.</p>
            </div>
          )}
        </div>

        <div className="p-6">
          <h5 className="text-lg font-semibold text-purple-600 mb-4">Capture Consignment Image</h5>
          
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-blue-900 font-semibold mb-1">Camera Only - No Gallery Upload</p>
                <p className="text-xs text-blue-800">For authenticity, you must capture the consignment image using your device camera. Gallery/file uploads are disabled.</p>
              </div>
            </div>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleCameraCapture} className="hidden" />

          {!capturedImage ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-gray-600 mb-4">No image captured yet</p>
                <button onClick={handleOpenCamera} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-sm flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Open Camera
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative border-2 border-purple-300 rounded-lg overflow-hidden">
                <img src={capturedImage.preview} alt="Captured consignment" className="w-full h-auto" />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button onClick={handleRemoveImage} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg" title="Remove image">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleOpenCamera} className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Recapture
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <button onClick={onCancel} className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all">
              ← Back to List
            </button>
            <button onClick={handleUpload} disabled={!capturedImage || uploading} className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm">
              {uploading ? '📤 Uploading...' : hasExistingImage ? '🔄 Replace Image & Upload' : '📤 Upload to Drive'}
            </button>
          </div>
        </div>
      </div>

      {uploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50" />
          <div className="relative bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 text-center mb-2">Uploading Image</h3>
            <p className="text-sm text-gray-600 text-center mb-6">Please wait while we upload your consignment image to Google Drive...</p>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-slide-up">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={handleSuccessModalClose} />
          <div className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 text-center mb-2">Image Uploaded Successfully!</h3>
            <p className="text-sm text-gray-600 text-center mb-6">Your consignment image has been uploaded to Google Drive and saved to the system.</p>
            <a href={uploadedImageLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg hover:bg-purple-100 transition-colors group mb-6">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">Consignment Image</p>
                <p className="text-xs text-gray-500">Click to view in Google Drive</p>
              </div>
              <svg className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <button onClick={handleSuccessModalClose} className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-sm">
              Done
            </button>
          </div>
        </div>
      )}

      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-slide-up">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowErrorModal(false)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 text-center mb-2">Upload Failed</h3>
            <p className="text-sm text-gray-600 text-center mb-6">There was an error uploading your consignment image.</p>
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800 font-mono break-words">{errorMessage}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowErrorModal(false)} className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all">
                Close
              </button>
              <button onClick={() => { setShowErrorModal(false); handleUpload(); }} disabled={!capturedImage} className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-sm disabled:opacity-50">
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
