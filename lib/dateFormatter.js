// lib/dateFormatter.js - FIXED: Proper MM/DD/YYYY format for Google Sheets API
/**
 * Date formatting utilities for Google Sheets
 * All dates use Indian Standard Time (IST - Asia/Kolkata)
 * IMPORTANT: Google Sheets expects MM/DD/YYYY format for proper date interpretation
 * 
 * NOTE: We format as MM/DD/YYYY but display as DD/MM/YYYY for human readability
 */

// Indian timezone
const INDIAN_TIMEZONE = 'Asia/Kolkata';

/**
 * Get current date/time in Indian timezone
 * @param {Date} date - Input date (defaults to current time)
 * @returns {Date} Date object adjusted to IST
 */
function getIndianDate(date = new Date()) {
  // Convert to IST timezone string and parse back
  const istString = date.toLocaleString('en-US', { timeZone: INDIAN_TIMEZONE });
  const [datePart, timePart] = istString.split(', ');
  
  // Parse US format: MM/DD/YYYY
  const [month, day, year] = datePart.split('/');
  const [time, period] = timePart.split(' ');
  const [hoursStr, minutes, seconds] = time.split(':');
  
  // Convert 12-hour to 24-hour format
  let hours = parseInt(hoursStr);
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return new Date(year, month - 1, day, hours, minutes, seconds || 0);
}

/**
 * Format date for Google Sheets API: MM/DD/YYYY HH:MM:SS
 * Google Sheets expects this format for proper date parsing
 * Example: 01/07/2026 16:53:17 = 7th January 2026, 4:53:17 PM
 * 
 * @param {Date} date - Date object (defaults to current time in IST)
 * @returns {string} Formatted date-time string in MM/DD/YYYY HH:MM:SS format
 */
export function formatDateTime(date = new Date()) {
  const d = getIndianDate(date);
  
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  // MM/DD/YYYY format (Google Sheets/API expected format)
  return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Format date only for Google Sheets API: MM/DD/YYYY
 * Example: 01/07/2026 = 7th January 2026
 * 
 * @param {Date} date - Date object (defaults to current date in IST)
 * @returns {string} Formatted date string in MM/DD/YYYY format
 */
export function formatDate(date = new Date()) {
  const d = getIndianDate(date);
  
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  
  // MM/DD/YYYY format (Google Sheets/API expected format)
  return `${month}/${day}/${year}`;
}

/**
 * Format time only: HH:MM:SS
 * Example: 16:53:17 = 4:53:17 PM
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
 * Format date in human-readable display format (DD/MM/YYYY)
 * For display purposes only - not for Google Sheets API
 * 
 * @param {Date} date - Date object
 * @returns {string} Human-readable date in DD/MM/YYYY format
 */
export function formatDateDisplay(date = new Date()) {
  const d = getIndianDate(date);
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  // DD/MM/YYYY format (Display format for users)
  return `${day}/${month}/${year}`;
}

/**
 * Format date-time in human-readable display format (DD/MM/YYYY HH:MM:SS)
 * For display purposes only - not for Google Sheets API
 * 
 * @param {Date} date - Date object
 * @returns {string} Human-readable date-time in DD/MM/YYYY HH:MM:SS format
 */
export function formatDateTimeDisplay(date = new Date()) {
  const d = getIndianDate(date);
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get current timestamp for Google Sheets in IST (MM/DD/YYYY HH:MM:SS)
 * 
 * @returns {string} Current timestamp in IST with MM/DD/YYYY format
 */
export function getCurrentTimestamp() {
  return formatDateTime();
}

/**
 * Get current date for Google Sheets in IST (MM/DD/YYYY)
 * 
 * @returns {string} Current date in IST with MM/DD/YYYY format
 */
export function getCurrentDate() {
  return formatDate();
}

/**
 * Parse MM/DD/YYYY string to Date object
 * 
 * @param {string} dateString - Date string in MM/DD/YYYY format
 * @returns {Date} Date object
 */
export function parseDate(dateString) {
  const [month, day, year] = dateString.split('/');
  return new Date(year, month - 1, day);
}

/**
 * Parse MM/DD/YYYY HH:MM:SS string to Date object
 * 
 * @param {string} dateTimeString - DateTime string in MM/DD/YYYY HH:MM:SS format
 * @returns {Date} Date object
 */
export function parseDateTime(dateTimeString) {
  const [datePart, timePart] = dateTimeString.split(' ');
  const [month, day, year] = datePart.split('/');
  const [hours, minutes, seconds] = timePart.split(':');
  
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

/**
 * Parse DD/MM/YYYY string from user input to Date object
 * 
 * @param {string} dateString - Date string in DD/MM/YYYY format (user input)
 * @returns {Date} Date object
 */
export function parseDisplayDate(dateString) {
  const [day, month, year] = dateString.split('/');
  return new Date(year, month - 1, day);
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
 * Format date in human-readable text format
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
  formatDateTime,        // For Google Sheets API: MM/DD/YYYY HH:MM:SS
  formatDate,            // For Google Sheets API: MM/DD/YYYY
  formatTime,            // HH:MM:SS
  formatDateDisplay,     // For display: DD/MM/YYYY
  formatDateTimeDisplay, // For display: DD/MM/YYYY HH:MM:SS
  getCurrentTimestamp,
  getCurrentDate,
  parseDate,
  parseDateTime,
  parseDisplayDate,
  getISTOffset,
  getISTDate,
  formatDateHuman,
  INDIAN_TIMEZONE
};

/**
 * USAGE EXAMPLES for Google Sheets API:
 * 
 * Current date: 7th January 2026
 * 
 * For Google Sheets API (setting values):
 * formatDateTime()     → "01/07/2026 16:53:17" (MM/DD/YYYY HH:MM:SS)
 * formatDate()         → "01/07/2026" (MM/DD/YYYY)
 * 
 * For Display (showing to users):
 * formatDateTimeDisplay() → "07/01/2026 16:53:17" (DD/MM/YYYY HH:MM:SS)
 * formatDateDisplay()     → "07/01/2026" (DD/MM/YYYY)
 * 
 * IMPORTANT NOTES:
 * 
 * 1. Google Sheets API expects MM/DD/YYYY format for proper date interpretation
 * 2. When you send "01/07/2026" to Google Sheets, it will correctly interpret as January 7, 2026
 * 3. When sending values via Sheets API, use:
 *    - formatDateTime() for date-time cells
 *    - formatDate() for date-only cells
 *    - Set valueInputOption to 'USER_ENTERED'
 * 
 * 4. For displaying dates to users in India, use:
 *    - formatDateTimeDisplay() shows as DD/MM/YYYY
 *    - formatDateDisplay() shows as DD/MM/YYYY
 * 
 * 5. All times are in IST (Asia/Kolkata, UTC+5:30)
 */
