// app/api/batches/clear-cache/route.js
import { clearBatchCache } from '@/lib/googleSheets';

export async function POST(request) {
  try {
    // Clear the server-side cache
    clearBatchCache();
    
    console.log('✅ Server-side batch cache cleared');
    
    return Response.json({ 
      success: true, 
      message: 'Cache cleared successfully' 
    });
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
