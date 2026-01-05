// components/common/LoadingSpinner.jsx - Professional Design
export default function LoadingSpinner({ size = 'md', fullScreen = false, message = 'Loading...' }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const containerClass = fullScreen 
    ? 'fixed inset-0 flex flex-col items-center justify-center bg-white z-50'
    : 'flex flex-col items-center justify-center py-12';

  return (
    <div className={containerClass}>
      {/* Animated Logo Container */}
      <div className="relative">
        {/* Outer rotating ring */}
        <div className={`${sizes[size]} rounded-full border-4 border-gray-200 absolute inset-0 animate-spin-slow`} 
             style={{ 
               borderTopColor: '#0d9488',
               borderRightColor: '#0d9488',
               animationDuration: '3s'
             }} 
        />
        
        {/* Middle rotating ring */}
        <div className={`${sizes[size]} rounded-full border-4 border-transparent absolute inset-0 animate-spin`} 
             style={{ 
               borderTopColor: '#14b8a6',
               borderBottomColor: '#14b8a6',
               animationDuration: '1.5s'
             }} 
        />
        
        {/* Inner pulsing circle */}
        <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center animate-pulse`}>
          <svg className="w-1/2 h-1/2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
      </div>

      {/* Loading text */}
      <div className="mt-6 flex flex-col items-center">
        <p className="text-lg font-semibold text-gray-800 mb-2">{message}</p>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      {/* Subtle background pattern (only for full screen) */}
      {fullScreen && (
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-teal-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" />
          <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000" />
        </div>
      )}
    </div>
  );
}
