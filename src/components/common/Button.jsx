// components/common/Button.jsx
export default function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  disabled = false,
  className = '',
  ...props 
}) {
  const baseStyles = 'py-3 px-6 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-blue-600 text-white active:bg-blue-700 shadow-sm',
    secondary: 'bg-gray-200 text-gray-800 active:bg-gray-300',
    danger: 'bg-red-600 text-white active:bg-red-700',
    success: 'bg-green-600 text-white active:bg-green-700'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
