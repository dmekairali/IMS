// lib/utils.js - COMPLETE FIX with DD/MM/YYYY support
import { parseDateTime } from './dateFormatter';

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    let date;
    
    // Check if date is in DD/MM/YYYY format (Google Sheets format)
    if (typeof dateString === 'string' && dateString.includes('/')) {
      // Use the existing dateFormatter to parse DD/MM/YYYY HH:MM:SS
      date = parseDateTime(dateString);
    } else {
      // Otherwise, use standard Date parsing for ISO format
      date = new Date(dateString);
    }
    
    // Validate date
    if (!date || isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return dateString;
    }
    
    const now = new Date();
    
    // Reset time to midnight for accurate day comparison
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffTime = nowOnly - dateOnly;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Handle relative dates
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays > 0 && diffDays < 7) return `${diffDays} days ago`;
    
    // For older dates or future dates, show formatted date
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return dateString;
  }
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
