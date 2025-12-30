// app/api/packing/generate/route.js
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  console.log('🔍 Packing API called');
  
  try {
    const body = await request.json();
    console.log('📦 Request body received:', JSON.stringify(body).substring(0, 200));
    
    const { order, packingItems } = body;

    if (!order || !packingItems || packingItems.length === 0) {
      console.error('❌ Invalid request data:', { order: !!order, packingItems: packingItems?.length });
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    console.log('✅ Validation passed. Starting dynamic imports...');

    // Dynamic imports for server-side only modules
    const jsPDF = (await import('jspdf')).default;
    console.log('✅ jsPDF imported');
    
    await import('jspdf-autotable');
    console.log('✅ jspdf-autotable imported');
    
    const { getOrCreateOrderFolder, uploadPDFToDrive, updateDispatchDataWithLinks } = await import('@/lib/googleDrive');
    console.log('✅ Google Drive module imported');
    console.log('✅ Google Drive module imported');

    // Create folder for this order
    console.log('📁 Creating/getting folder for OID:', order.orderId);
    const folderId = await getOrCreateOrderFolder(order.orderId);
    console.log('✅ Folder ID:', folderId);

    // Generate Packing List PDF
    console.log('📄 Generating packing list PDF...');
    const packingListPDF = generatePackingListPDF(order, packingItems, jsPDF);
    console.log('✅ Packing list PDF generated');
    
    const packingListBuffer = Buffer.from(packingListPDF.output('arraybuffer'));
    console.log('✅ Packing list buffer created, size:', packingListBuffer.length);
    
    console.log('☁️ Uploading packing list to Drive...');
    const packingListFile = await uploadPDFToDrive(
      packingListBuffer,
      `PackingList_${order.orderId}.pdf`,
      folderId
    );
    console.log('✅ Packing list uploaded:', packingListFile.webViewLink);

    // Generate Stickers PDF
    console.log('🏷️ Generating stickers PDF...');
    const stickersPDF = generateStickersPDF(order, packingItems, jsPDF);
    console.log('✅ Stickers PDF generated');
    
    const stickersBuffer = Buffer.from(stickersPDF.output('arraybuffer'));
    console.log('✅ Stickers buffer created, size:', stickersBuffer.length);
    
    console.log('☁️ Uploading stickers to Drive...');
    const stickersFile = await uploadPDFToDrive(
      stickersBuffer,
      `Stickers_${order.orderId}.pdf`,
      folderId
    );
    console.log('✅ Stickers uploaded:', stickersFile.webViewLink);

    // Update DispatchData sheet with links
    console.log('📊 Updating DispatchData sheet...');
    await updateDispatchDataWithLinks(
      order.orderId,
      packingListFile.webViewLink,
      stickersFile.webViewLink
    );
    console.log('✅ Sheet updated successfully');

    const response = {
      success: true,
      packingListLink: packingListFile.webViewLink,
      stickerLink: stickersFile.webViewLink,
      folderId: folderId,
    };
    
    console.log('✅ Success! Returning response:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ ERROR in packing generate API:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate packing documents',
        details: error.message,
        errorName: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

function generatePackingListPDF(order, packingItems, jsPDF) {
  const doc = new jsPDF();
  
  // Company header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Kairali Ayurvedic Products Pvt Ltd', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('121/1-A1, Karattupalayam, Samathur, Pollachi - 642123', 105, 27, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Packing List', 105, 37, { align: 'center' });

  // Order details section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('To', 15, 50);
  doc.text('Order ID', 140, 50);
  doc.text(`: ${order.orderId || 'N/A'}`, 170, 50);

  doc.setFont('helvetica', 'normal');
  doc.text('Party Name', 15, 57);
  doc.text(`: ${order.customerName || 'N/A'}`, 42, 57);
  
  doc.text('Invoice No', 140, 57);
  doc.text(`: ${order.invoiceNo || order.orderId || 'N/A'}`, 170, 57);

  doc.text('Party Address', 15, 64);
  doc.text(':', 42, 64);
  
  const address = order.billingAddress || order.shippingAddress || order.mobile || 'N/A';
  const addressLines = doc.splitTextToSize(address, 85);
  doc.text(addressLines, 45, 64);

  doc.text('Invoice Date', 140, 64);
  doc.text(`: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, 170, 64);

  const addressHeight = addressLines.length * 5;
  doc.text('Contact No.', 15, 64 + addressHeight);
  doc.text(`: ${order.mobile || 'N/A'}`, 42, 64 + addressHeight);

  const totalBoxes = Math.max(...packingItems.map(item => item.boxNo));
  doc.text('No of Boxes', 140, 71);
  doc.text(`: ${totalBoxes}`, 170, 71);

  // Group items by box number
  const itemsByBox = packingItems.reduce((acc, item) => {
    if (!acc[item.boxNo]) acc[item.boxNo] = [];
    acc[item.boxNo].push(item);
    return acc;
  }, {});

  let yPos = 85 + addressHeight;

  // Generate table for each box
  Object.keys(itemsByBox).sort((a, b) => a - b).forEach((boxNo) => {
    const boxItems = itemsByBox[boxNo];

    doc.setFillColor(26, 188, 156);
    doc.rect(15, yPos, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(`Box No: ${boxNo}`, 20, yPos + 5.5);
    doc.setTextColor(0, 0, 0);

    yPos += 8;

    doc.setFillColor(204, 204, 204);
    doc.rect(15, yPos, 100, 7, 'F');
    doc.rect(115, yPos, 25, 7, 'F');
    doc.rect(140, yPos, 25, 7, 'F');
    doc.rect(165, yPos, 30, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.text('Product Details', 17, yPos + 5);
    doc.text('UOM', 125, yPos + 5, { align: 'center' });
    doc.text('Ordered', 152.5, yPos + 5, { align: 'center' });
    doc.text('Packing', 180, yPos + 5, { align: 'center' });

    yPos += 7;

    doc.setFont('helvetica', 'normal');
    boxItems.forEach((item) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      const productDetail = `${item.productName} - ${item.sku}`;
      const lines = doc.splitTextToSize(productDetail, 95);
      const rowHeight = Math.max(lines.length * 5, 7);

      doc.rect(15, yPos, 100, rowHeight);
      doc.rect(115, yPos, 25, rowHeight);
      doc.rect(140, yPos, 25, rowHeight);
      doc.rect(165, yPos, 30, rowHeight);

      doc.text(lines, 17, yPos + 5);
      doc.text(item.package, 127.5, yPos + rowHeight / 2 + 1.5, { align: 'center' });
      doc.text(item.orderedQty.toString(), 152.5, yPos + rowHeight / 2 + 1.5, { align: 'center' });
      doc.text(item.packingQty.toString(), 180, yPos + rowHeight / 2 + 1.5, { align: 'center' });

      yPos += rowHeight;
    });

    yPos += 5;
  });

  return doc;
}

function generateStickersPDF(order, packingItems, jsPDF) {
  const doc = new jsPDF();
  let yPos = 15;

  const itemsByBox = packingItems.reduce((acc, item) => {
    if (!acc[item.boxNo]) acc[item.boxNo] = [];
    acc[item.boxNo].push(item);
    return acc;
  }, {});

  const totalBoxes = Math.max(...packingItems.map(item => item.boxNo));

  Object.keys(itemsByBox).sort((a, b) => a - b).forEach((boxNo, index) => {
    if (index > 0) {
      doc.addPage();
      yPos = 15;
    }

    const boxItems = itemsByBox[boxNo];

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Kairali Ayurvedic Products Pvt Ltd', 105, yPos, { align: 'center' });
    
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('121/1-A1, Karattupalayam, Samathur, Pollachi - 642123', 105, yPos, { align: 'center' });
    
    yPos += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Packing Slip', 105, yPos, { align: 'center' });

    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('To', 15, yPos);
    doc.text('Order ID', 140, yPos);
    doc.text(`: ${order.orderId}`, 165, yPos);

    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text('Party Name', 15, yPos);
    doc.text(`: ${order.customerName}`, 40, yPos);
    doc.text('Invoice No', 140, yPos);
    doc.text(`: ${order.invoiceNo || order.orderId || 'N/A'}`, 165, yPos);

    yPos += 7;
    doc.text('Party Address', 15, yPos);
    doc.text(':', 40, yPos);
    const address = order.shippingAddress || order.billingAddress || order.mobile || '';
    const addressLines = doc.splitTextToSize(address, 85);
    doc.text(addressLines, 42, yPos);

    doc.text('Invoice Date', 140, yPos);
    doc.text(`: ${new Date().toLocaleDateString('en-GB')}`, 165, yPos);

    yPos += addressLines.length * 5 + 2;
    doc.text('Contact No.', 15, yPos);
    doc.text(`: ${order.mobile}`, 40, yPos);
    doc.text('No of Boxes', 140, yPos);
    doc.text(`: ${boxNo}/${totalBoxes}`, 165, yPos);

    yPos += 10;

    doc.setFillColor(26, 188, 156);
    doc.rect(15, yPos, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(`Box No: ${boxNo}`, 20, yPos + 5.5);
    doc.setTextColor(0, 0, 0);

    yPos += 8;

    doc.setFillColor(204, 204, 204);
    doc.rect(15, yPos, 120, 7, 'F');
    doc.rect(135, yPos, 30, 7, 'F');
    doc.rect(165, yPos, 30, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.text('Product Details', 17, yPos + 5);
    doc.text('UOM', 150, yPos + 5, { align: 'center' });
    doc.text('Quantity', 180, yPos + 5, { align: 'center' });

    yPos += 7;

    doc.setFont('helvetica', 'normal');
    boxItems.forEach((item) => {
      const productDetail = `${item.productName} - ${item.sku}`;
      const lines = doc.splitTextToSize(productDetail, 115);
      const rowHeight = Math.max(lines.length * 5, 7);

      doc.rect(15, yPos, 120, rowHeight);
      doc.rect(135, yPos, 30, rowHeight);
      doc.rect(165, yPos, 30, rowHeight);

      doc.text(lines, 17, yPos + 5);
      doc.text(item.package, 150, yPos + rowHeight / 2 + 1.5, { align: 'center' });
      doc.text(item.packingQty.toString(), 180, yPos + rowHeight / 2 + 1.5, { align: 'center' });

      yPos += rowHeight;
    });
  });

  return doc;
}
