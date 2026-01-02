// lib/logoData.js
// Base64-encoded Kairali logo for use in PDF generation
// This avoids filesystem access issues in serverless environments

// TODO: Replace this placeholder with your actual base64 logo data
// Convert your logo at: https://base64.guru/converter/encode/image
// Then paste the full base64 string here

export const KAIRALI_LOGO_BASE64 = 'data:image/png;base64,PASTE_YOUR_BASE64_STRING_HERE';

// Alternative: If you want to keep using filesystem in development
// but base64 in production, you can export both:
export const USE_BASE64_LOGO = process.env.VERCEL === '1'; // true in Vercel, false locally
