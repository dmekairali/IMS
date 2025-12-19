// lib/utils.js
export function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(amount);
}

export function calculateExpiryDays(expiryDate) {
  const expiry = new Date(expiryDate);
  const today = new Date();
  const diffTime = expiry - today;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function getExpiryStatus(expiryDate) {
  const days = calculateExpiryDays(expiryDate);
  
  if (days < 0) return { status: 'expired', color: 'red', label: 'EXPIRED' };
  if (days < 90) return { status: 'critical', color: 'red', label: 'Expiring Soon' };
  if (days < 180) return { status: 'warning', color: 'yellow', label: 'Use First' };
  return { status: 'good', color: 'green', label: 'Good' };
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
