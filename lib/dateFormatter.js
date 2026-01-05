// lib/dateFormatter.js
/**
 * Date formatting utilities for Google Sheets
 * All dates in sheets should use DD/MM/YYYY format
 */

/**
 * Format date with time: DD/MM/YYYY HH:MM:SS
 * Example: 06/01/2025 11:42:56
 * 
 * @param {Date} date - Date object (defaults to now)
 * @returns {string} Formatted date string
 */
export function formatDateTime(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Format date only: DD/MM/YYYY
 * Example: 06/01/2025
 * 
 * @param {Date} date - Date object (defaults to now)
 * @returns {string} Formatted date string
 */
export function formatDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Format time only: HH:MM:SS
 * Example: 11:42:56
 * 
 * @param {Date} date - Date object (defaults to now)
 * @returns {string} Formatted time string
 */
export function formatTime(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Get current timestamp for sheets
 * Returns: DD/MM/YYYY HH:MM:SS
 */
export function getCurrentTimestamp() {
  return formatDateTime();
}

/**
 * Get current date for sheets
 * Returns: DD/MM/YYYY
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

// Export all functions as default object
export default {
  formatDateTime,
  formatDate,
  formatTime,
  getCurrentTimestamp,
  getCurrentDate,
  parseDate,
  parseDateTime
};
