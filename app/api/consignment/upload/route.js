// app/api/consignment/upload/route.js
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
    const { uploadImageToDrive, updateDispatchDataWithConsignmentImage } = await import('@/lib/googleDrive');
    
    // Consignment folder ID - YOUR SHARED FOLDER
    const consignmentFolderId = '0AHxwMBnkAoboUk9PVA';
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${orderId}_${timestamp}.jpg`;
    
    console.log('☁️ Uploading image to Drive...');
    const imageFile_result = await uploadImageToDrive(
      buffer,
      fileName,
      consignmentFolderId
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
