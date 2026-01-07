// lib/dateFormatter.js
/**
 * Date formatting utilities for Google Sheets
 * All dates use Indian Standard Time (IST - Asia/Kolkata)
 * Format: DD/MM/YYYY HH:MM:SS
 * 
 * IMPORTANT: Google Sheets expects date/time values in specific formats:
 * - For proper date/time handling, use TEXT format in sheets
 * - This prevents timezone conversion issues
 * - IST is UTC+5:30
 */

// Indian timezone
const INDIAN_TIMEZONE = 'Asia/Kolkata';

/**
 * Get current date/time in Indian timezone
 * @param {Date} date - Input date (defaults to current time)
 * @returns {Date} Date object adjusted to IST
 */
function getIndianDate(date = new Date()) {
  // Get the date string in IST timezone
  const istString = date.toLocaleString('en-US', { 
    timeZone: INDIAN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Parse and create new Date object
  const [datePart, timePart] = istString.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hours, minutes, seconds] = timePart.split(':');
  
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

/**
 * Format date with time: DD/MM/YYYY HH:MM:SS
 * Example: 07/01/2026 10:39:39
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
  
  // Return as TEXT format string (not date object) to prevent Google Sheets timezone conversion
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Format date only: DD/MM/YYYY
 * Example: 07/01/2026
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
  
  // Return as TEXT format string to prevent Google Sheets timezone conversion
  return `${day}/${month}/${year}`;
}

/**
 * Format time only: HH:MM:SS
 * Example: 10:39:39
 * Uses Indian Standard Time (IST - Asia/Kolkata)
 * 
 * @param {Date} date - Date object (defaults to current time in IST)
 * @returns {string} Formatted time string in HH:MM:SS format
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
 * @returns {string} Current timestamp in IST
 */
export function getCurrentTimestamp() {
  return formatDateTime();
}

/**
 * Get current date for sheets in IST
 * Returns: DD/MM/YYYY
 * 
 * @returns {string} Current date in IST
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
  INDIAN_TIMEZONE
};

/**
 * USAGE NOTES FOR GOOGLE SHEETS:
 * 
 * 1. Why we use TEXT format instead of Date objects:
 *    - Google Sheets automatically converts dates to UTC
 *    - This causes timezone shift issues (IST gets converted incorrectly)
 *    - Using TEXT format preserves the exact time we want
 * 
 * 2. How to use in Google Sheets:
 *    - Store as TEXT: '07/01/2026 10:39:39'
 *    - Format cells as "Plain Text" or use single quote prefix
 *    - For calculations, use TEXT to DATE conversion in sheets
 * 
 * 3. Benefits:
 *    - No timezone conversion issues
 *    - Consistent display across all users
 *    - Exact time preservation
 *    - Easy sorting and filtering
 * 
 * 4. If you need actual DATE values in sheets:
 *    Use Google Sheets formula: =DATEVALUE() + TIMEVALUE()
 *    Example: =DATEVALUE(LEFT(A1,10)) + TIMEVALUE(RIGHT(A1,8))
 */
