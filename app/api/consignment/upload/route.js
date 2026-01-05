// app/api/consignment/upload/route.js - Updated to use order folder
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  console.log('📸 Consignment image upload API called');
  
  try {
    const formData = await request.formData();
    const orderId = formData.get('orderId');
    const imageFile = formData.get('image');

    console.log('📦 Order ID:', orderId);
    console.log('📸 Image file:', imageFile?.name, imageFile?.size);

    if (!orderId || !imageFile) {
      console.error('❌ Missing orderId or image');
      return NextResponse.json(
        { error: 'Order ID and image are required' },
        { status: 400 }
      );
    }

    // Convert image file to buffer
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log('✅ Image buffer created, size:', buffer.length);

    // Dynamic imports
    const { uploadImageToDrive, updateDispatchDataWithConsignmentImage, getOrCreateOrderFolder } = await import('@/lib/googleDrive');
    
    // Shared Drive ID (same as packing/attachment)
    const sharedDriveId = '0ALpZnsXZcrORUk9PVA';
    
    // Get or create order folder (same folder as packing lists, stickers, and attachments)
    console.log('📁 Getting/creating order folder...');
    const orderFolderId = await getOrCreateOrderFolder(orderId, sharedDriveId);
    console.log('✅ Order folder ID:', orderFolderId);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${orderId}_Consignment_${timestamp}.jpg`;
    
    console.log('☁️ Uploading image to order folder...');
    const imageFile_result = await uploadImageToDrive(
      buffer,
      fileName,
      orderFolderId // Use order folder instead of separate consignment folder
    );
    console.log('✅ Image uploaded:', imageFile_result.webViewLink);

    // Update DispatchData sheet with image link
    console.log('📊 Updating DispatchData sheet...');
    await updateDispatchDataWithConsignmentImage(
      orderId,
      imageFile_result.webViewLink
    );
    console.log('✅ Sheet updated successfully');

    const response = {
      success: true,
      imageLink: imageFile_result.webViewLink,
    };
    
    console.log('✅ Success! Returning response:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ ERROR in consignment upload API:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload consignment image',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
