// lib/dateFormatter.js - FIXED: Proper DD/MM/YYYY format (Indian format)
/**
 * Date formatting utilities for Google Sheets
 * All dates use Indian Standard Time (IST - Asia/Kolkata)
 * Format: DD/MM/YYYY HH:MM:SS (NOT MM/DD/YYYY - US format)
 * 
 * IMPORTANT: 
 * - DD/MM/YYYY = Day first (Indian/European format)
 * - 07/01/2026 = 7th January 2026 (NOT July 1st)
 */

// Indian timezone
const INDIAN_TIMEZONE = 'Asia/Kolkata';

/**
 * Get current date/time in Indian timezone
 * @param {Date} date - Input date (defaults to current time)
 * @returns {Date} Date object adjusted to IST
 */
function getIndianDate(date = new Date()) {
  // Create a new date by parsing the localized string in IST
  const options = {
    timeZone: INDIAN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  const formatter = new Intl.DateTimeFormat('en-GB', options);
  const parts = formatter.formatToParts(date);
  
  // Extract parts
  const day = parts.find(p => p.type === 'day').value;
  const month = parts.find(p => p.type === 'month').value;
  const year = parts.find(p => p.type === 'year').value;
  const hour = parts.find(p => p.type === 'hour').value;
  const minute = parts.find(p => p.type === 'minute').value;
  const second = parts.find(p => p.type === 'second').value;
  
  // Create date object (month is 0-indexed in JavaScript)
  return new Date(year, parseInt(month) - 1, day, hour, minute, second);
}

/**
 * Format date with time: DD/MM/YYYY HH:MM:SS
 * Example: 07/01/2026 16:53:17 = 7th January 2026, 4:53:17 PM
 * Uses Indian Standard Time (IST - Asia/Kolkata)
 * 
 * @param {Date} date - Date object (defaults to current time in IST)
 * @returns {string} Formatted date-time string in DD/MM/YYYY HH:MM:SS format
 */
export function formatDateTime(date = new Date()) {
  const d = getIndianDate(date);
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  // DD/MM/YYYY format (Indian format - day first)
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Format date only: DD/MM/YYYY
 * Example: 07/01/2026 = 7th January 2026 (NOT July 1st)
 * Uses Indian Standard Time (IST - Asia/Kolkata)
 * 
 * @param {Date} date - Date object (defaults to current date in IST)
 * @returns {string} Formatted date string in DD/MM/YYYY format
 */
export function formatDate(date = new Date()) {
  const d = getIndianDate(date);
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  // DD/MM/YYYY format (Indian format - day first)
  return `${day}/${month}/${year}`;
}

/**
 * Format time only: HH:MM:SS
 * Example: 16:53:17 = 4:53:17 PM
 * Uses Indian Standard Time (IST - Asia/Kolkata)
 * 
 * @param {Date} date - Date object (defaults to current time in IST)
 * @returns {string} Formatted time string in HH:MM:SS format (24-hour)
 */
export function formatTime(date = new Date()) {
  const d = getIndianDate(date);
  
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Get current timestamp for sheets in IST
 * Returns: DD/MM/YYYY HH:MM:SS
 * 
 * @returns {string} Current timestamp in IST with DD/MM/YYYY format
 */
export function getCurrentTimestamp() {
  return formatDateTime();
}

/**
 * Get current date for sheets in IST
 * Returns: DD/MM/YYYY
 * 
 * @returns {string} Current date in IST with DD/MM/YYYY format
 */
export function getCurrentDate() {
  return formatDate();
}

/**
 * Parse DD/MM/YYYY string to Date object
 * 
 * @param {string} dateString - Date string in DD/MM/YYYY format
 * @returns {Date} Date object
 */
export function parseDate(dateString) {
  const [day, month, year] = dateString.split('/');
  return new Date(year, month - 1, day);
}

/**
 * Parse DD/MM/YYYY HH:MM:SS string to Date object
 * 
 * @param {string} dateTimeString - DateTime string in DD/MM/YYYY HH:MM:SS format
 * @returns {Date} Date object
 */
export function parseDateTime(dateTimeString) {
  const [datePart, timePart] = dateTimeString.split(' ');
  const [day, month, year] = datePart.split('/');
  const [hours, minutes, seconds] = timePart.split(':');
  
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

/**
 * Get IST timezone offset
 * @returns {string} Timezone offset string (e.g., "+05:30")
 */
export function getISTOffset() {
  return '+05:30';
}

/**
 * Get current IST Date object
 * @returns {Date} Current date/time in IST
 */
export function getISTDate() {
  return getIndianDate();
}

/**
 * Format date in human-readable format
 * Example: "7th January 2026"
 * 
 * @param {Date} date - Date object
 * @returns {string} Human-readable date
 */
export function formatDateHuman(date = new Date()) {
  const d = getIndianDate(date);
  
  const day = d.getDate();
  const month = d.toLocaleDateString('en-IN', { month: 'long', timeZone: INDIAN_TIMEZONE });
  const year = d.getFullYear();
  
  // Add ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
  const suffix = (day) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  
  return `${day}${suffix(day)} ${month} ${year}`;
}

// Export all functions as default object
export default {
  formatDateTime,
  formatDate,
  formatTime,
  getCurrentTimestamp,
  getCurrentDate,
  parseDate,
  parseDateTime,
  getISTOffset,
  getISTDate,
  formatDateHuman,
  INDIAN_TIMEZONE
};

/**
 * USAGE EXAMPLES:
 * 
 * Current date: 7th January 2026
 * 
 * formatDateTime()     → "07/01/2026 16:53:17"
 * formatDate()         → "07/01/2026"
 * formatTime()         → "16:53:17"
 * formatDateHuman()    → "7th January 2026"
 * 
 * IMPORTANT NOTES:
 * 
 * 1. DD/MM/YYYY vs MM/DD/YYYY:
 *    - DD/MM/YYYY = Day first (Indian/European format)
 *    - MM/DD/YYYY = Month first (US format)
 *    - This code uses DD/MM/YYYY (Indian format)
 * 
 * 2. Date Interpretation:
 *    - 07/01/2026 = 7th January 2026 ✅ (NOT July 1st)
 *    - 31/12/2025 = 31st December 2025 ✅
 *    - 01/02/2026 = 1st February 2026 ✅
 * 
 * 3. Google Sheets:
 *    - Set column format to "Automatic" or "Date time"
 *    - Use USER_ENTERED in valueInputOption
 *    - Google Sheets will interpret DD/MM/YYYY correctly
 * 
 * 4. Timezone:
 *    - All dates are in IST (Asia/Kolkata)
 *    - IST = UTC+5:30
 *    - No daylight saving time
 */
