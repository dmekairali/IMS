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

    // Create folder for this order in Shared Drive
    console.log('📁 Creating/getting folder for OID:', order.orderId);
    const folderId = await getOrCreateOrderFolder(order.orderId);
    console.log('✅ Folder ID:', folderId);

    // Generate Packing List PDF
    console.log('📄 Generating packing list PDF...');
    const packingListPDF = await generatePackingListPDF(order, packingItems, jsPDF);
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
    const stickersPDF = await generateStickersPDF(order, packingItems, jsPDF);
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

async function addLogoToPDF(doc, x = 15, y = 10, width = 30, height = 15) {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const logoPath = path.default.join(process.cwd(), 'public', 'kairali-logo.png');
    
    if (fs.default.existsSync(logoPath)) {
      const logoData = fs.default.readFileSync(logoPath);
      const logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;
      doc.addImage(logoBase64, 'PNG', x, y, width, height);
      return true;
    }
  } catch (error) {
    console.log('Logo not found, continuing without logo');
  }
  return false;
}

async function generatePackingListPDF(order, packingItems, jsPDF) {
  // A6 size: 105mm x 148mm (4.13" x 5.83")
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [105, 148],
    compress: true
  });
  
  // Custom margins (in mm)
  const margins = {
    top: 0,
    bottom: 5.36, // 0.211 inches = 5.36mm
    left: 0,
    right: 0
  };
  
  // Add logo
  const logoY = 5;
  const hasLogo = await addLogoToPDF(doc, 3, logoY, 15, 7.5);
  const startY = hasLogo ? 5 : 8;
  
  // Company header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Kairali Ayurvedic Products Pvt Ltd', 52.5, startY + 3, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('121/1-A1, Karattupalayam, Samathur, Pollachi - 642123', 52.5, startY + 8, { align: 'center' });
  
  // Packing List title with border
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(32, startY + 11, 41, 5);
  doc.text('Packing List', 52.5, startY + 14.5, { align: 'center' });

  // Order details section with border
  let yPos = startY + 19;
  doc.setLineWidth(0.2);
  doc.rect(3, yPos, 99, 22); // Outer border
  
  // Vertical divider
  doc.line(52.5, yPos, 52.5, yPos + 22);

  // Left side
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('To', 4, yPos + 3);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Party Name', 4, yPos + 7);
  doc.text(`: ${order.customerName || 'N/A'}`, 18, yPos + 7);
  
  doc.text('Party Address', 4, yPos + 11);
  doc.text(':', 18, yPos + 11);
  const address = order.shippingAddress || order.billingAddress || 'N/A';
  const addressLines = doc.splitTextToSize(address, 30);
  doc.text(addressLines, 19, yPos + 11);
  
  const addressHeight = Math.min(addressLines.length * 3, 8);
  doc.text('Contact No.', 4, yPos + 11 + addressHeight + 2);
  doc.text(`: ${order.mobile || 'N/A'}`, 18, yPos + 11 + addressHeight + 2);

  // Right side
  doc.setFont('helvetica', 'bold');
  doc.text('Order ID', 54, yPos + 3);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${order.orderId || 'N/A'}`, 66, yPos + 3);
  
  doc.text('Invoice No', 54, yPos + 7);
  doc.text(`: ${order.invoiceNo || order.orderId || 'N/A'}`, 66, yPos + 7);
  
  doc.text('Invoice Date', 54, yPos + 11);
  doc.text(`: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 66, yPos + 11);
  
  const totalBoxes = Math.max(...packingItems.map(item => item.boxNo));
  doc.text('No of Boxes', 54, yPos + 15);
  doc.setFont('helvetica', 'bold');
  doc.text(`: ${totalBoxes}`, 66, yPos + 15);

  yPos = yPos + 25;

  // Group items by box number
  const itemsByBox = {};
  packingItems.forEach(item => {
    if (!itemsByBox[item.boxNo]) {
      itemsByBox[item.boxNo] = [];
    }
    itemsByBox[item.boxNo].push(item);
  });

  // Table headers
  doc.setFillColor(220, 220, 220);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  
  // Column widths: Box No | Product Details | UOM | Quantity
  const colWidths = [12, 62, 12, 12];
  const colX = [3, 15, 77, 89];
  
  // Draw header cells
  colWidths.forEach((width, i) => {
    doc.rect(colX[i], yPos, width, 5, 'FD');
  });
  
  doc.text('Box No', colX[0] + colWidths[0]/2, yPos + 3.5, { align: 'center' });
  doc.text('Product Details', colX[1] + 1, yPos + 3.5);
  doc.text('UOM', colX[2] + colWidths[2]/2, yPos + 3.5, { align: 'center' });
  doc.text('Quantity', colX[3] + colWidths[3]/2, yPos + 3.5, { align: 'center' });

  yPos += 5;

  // Table rows - one row per box
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  
  const sortedBoxNos = Object.keys(itemsByBox).sort((a, b) => parseInt(a) - parseInt(b));
  
  sortedBoxNos.forEach((boxNo) => {
    const boxItems = itemsByBox[boxNo];
    
    if (yPos > 140) {
      doc.addPage();
      yPos = 10;
      
      // Redraw headers
      doc.setFillColor(220, 220, 220);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      
      colWidths.forEach((width, i) => {
        doc.rect(colX[i], yPos, width, 5, 'FD');
      });
      
      doc.text('Box No', colX[0] + colWidths[0]/2, yPos + 3.5, { align: 'center' });
      doc.text('Product Details', colX[1] + 1, yPos + 3.5);
      doc.text('UOM', colX[2] + colWidths[2]/2, yPos + 3.5, { align: 'center' });
      doc.text('Quantity', colX[3] + colWidths[3]/2, yPos + 3.5, { align: 'center' });
      
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
    }

    const productLines = [];
    const uomLines = [];
    const qtyLines = [];
    
    boxItems.forEach((item) => {
      productLines.push(`${item.productName} - ${item.sku}`);
      uomLines.push(item.package || 'N/A');
      qtyLines.push(item.packingQty.toString());
    });

    const rowHeight = Math.max(boxItems.length * 5, 6);

    // Draw cell borders
    colWidths.forEach((width, i) => {
      doc.rect(colX[i], yPos, width, rowHeight);
    });

    // Box Number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(boxNo.toString(), colX[0] + colWidths[0]/2, yPos + rowHeight/2 + 1, { align: 'center' });
    
    // Product details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    let lineYPos = yPos + 3;
    productLines.forEach((line, index) => {
      const wrappedLines = doc.splitTextToSize(line, colWidths[1] - 2);
      doc.text(wrappedLines, colX[1] + 1, lineYPos);
      lineYPos += wrappedLines.length * 3;
      if (index < productLines.length - 1) {
        lineYPos += 2;
      }
    });
    
    // UOM
    lineYPos = yPos + 3;
    uomLines.forEach((uom) => {
      doc.text(uom, colX[2] + colWidths[2]/2, lineYPos, { align: 'center' });
      lineYPos += 5;
    });
    
    // Quantity
    doc.setFont('helvetica', 'bold');
    lineYPos = yPos + 3;
    qtyLines.forEach((qty) => {
      doc.text(qty, colX[3] + colWidths[3]/2, lineYPos, { align: 'center' });
      lineYPos += 5;
    });
    doc.setFont('helvetica', 'normal');

    yPos += rowHeight;
  });

  return doc;
}

async function generateStickersPDF(order, packingItems, jsPDF) {
  // A6 size: 105mm x 148mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [105, 148],
    compress: true
  });

  // Custom margins
  const margins = {
    top: 0,
    bottom: 5.36,
    left: 0,
    right: 0
  };

  // Group items by box number
  const itemsByBox = {};
  packingItems.forEach(item => {
    if (!itemsByBox[item.boxNo]) {
      itemsByBox[item.boxNo] = [];
    }
    itemsByBox[item.boxNo].push(item);
  });

  const totalBoxes = Math.max(...packingItems.map(item => item.boxNo));
  const sortedBoxNos = Object.keys(itemsByBox).sort((a, b) => parseInt(a) - parseInt(b));

  let currentYPos = 0;
  const stickerHeight = 74; // Half of A6 height for 2 stickers per page
  let stickersOnPage = 0;

  for (const [boxIndex, boxNo] of sortedBoxNos.entries()) {
    const boxItems = itemsByBox[boxNo];

    // Check if we need a new page (after every 2 stickers)
    if (stickersOnPage >= 2) {
      doc.addPage();
      currentYPos = 0;
      stickersOnPage = 0;
    }

    // Add dotted cut line between stickers (not before first sticker)
    if (stickersOnPage > 0) {
      doc.setLineDash([2, 2]);
      doc.setLineWidth(0.1);
      doc.setDrawColor(150, 150, 150);
      doc.line(0, currentYPos, 105, currentYPos);
      doc.setLineDash([]); // Reset to solid line
    }

    let yPos = currentYPos + 3;

    // Add logo (smaller for sticker)
    await addLogoToPDF(doc, 3, yPos, 15, 7.5);
    
    // Company header
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Kairali Ayurvedic Products Pvt Ltd', 52.5, yPos + 2, { align: 'center' });
    
    yPos += 5;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('121/1-A1, Karattupalayam, Samathur, Pollachi - 642123', 52.5, yPos + 2, { align: 'center' });
    
    yPos += 5;
    
    // Packing Slip title
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setLineWidth(0.2);
    doc.rect(35, yPos, 35, 4);
    doc.text('Packing Slip', 52.5, yPos + 3, { align: 'center' });

    yPos += 6;

    // Order details section with border
    doc.setLineWidth(0.2);
    doc.rect(3, yPos, 99, 18);
    
    // Vertical divider
    doc.line(52.5, yPos, 52.5, yPos + 18);

    // Left side
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('To', 4, yPos + 3);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Party Name', 4, yPos + 6);
    doc.text(`: ${order.customerName}`, 16, yPos + 6);
    
    doc.text('Party Address', 4, yPos + 9);
    doc.text(':', 16, yPos + 9);
    const address = order.shippingAddress || order.billingAddress || '';
    const addressLines = doc.splitTextToSize(address, 32);
    doc.text(addressLines, 17, yPos + 9);

    const addressHeight = Math.min(addressLines.length * 2.5, 6);
    doc.text('Contact', 4, yPos + 9 + addressHeight + 1.5);
    doc.text(`: ${order.mobile}`, 16, yPos + 9 + addressHeight + 1.5);

    // Right side
    doc.setFont('helvetica', 'bold');
    doc.text('Order ID', 54, yPos + 3);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${order.orderId}`, 65, yPos + 3);
    
    doc.text('Invoice No', 54, yPos + 6);
    doc.text(`: ${order.invoiceNo || order.orderId || 'N/A'}`, 65, yPos + 6);
    
    doc.text('Invoice Date', 54, yPos + 9);
    doc.text(`: ${new Date().toLocaleDateString('en-IN')}`, 65, yPos + 9);
    
    doc.text('No of Boxes', 54, yPos + 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(`: ${boxNo}/${totalBoxes}`, 65, yPos + 12);

    yPos += 20;

    // Table headers
    doc.setFillColor(220, 220, 220);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    
    const colWidths = [12, 62, 12, 12];
    const colX = [3, 15, 77, 89];
    
    colWidths.forEach((width, i) => {
      doc.rect(colX[i], yPos, width, 4, 'FD');
    });
    
    doc.text('Box No', colX[0] + colWidths[0]/2, yPos + 3, { align: 'center' });
    doc.text('Product Details', colX[1] + 1, yPos + 3);
    doc.text('UOM', colX[2] + colWidths[2]/2, yPos + 3, { align: 'center' });
    doc.text('Qty', colX[3] + colWidths[3]/2, yPos + 3, { align: 'center' });

    yPos += 4;

    // Single row with all products for this box
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    
    const productLines = [];
    const uomLines = [];
    const qtyLines = [];
    
    boxItems.forEach((item) => {
      productLines.push(`${item.productName} - ${item.sku}`);
      uomLines.push(item.package || 'N/A');
      qtyLines.push(item.packingQty.toString());
    });

    const rowHeight = Math.max(boxItems.length * 4.5, 6);

    // Draw cell borders
    colWidths.forEach((width, i) => {
      doc.rect(colX[i], yPos, width, rowHeight);
    });

    // Box Number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(boxNo.toString(), colX[0] + colWidths[0]/2, yPos + rowHeight/2 + 1, { align: 'center' });
    
    // Product details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    let lineYPos = yPos + 2.5;
    productLines.forEach((line, index) => {
      const wrappedLines = doc.splitTextToSize(line, colWidths[1] - 2);
      doc.text(wrappedLines, colX[1] + 1, lineYPos);
      lineYPos += wrappedLines.length * 2.5;
      if (index < productLines.length - 1) {
        lineYPos += 2;
      }
    });
    
    // UOM
    lineYPos = yPos + 2.5;
    uomLines.forEach((uom) => {
      doc.text(uom, colX[2] + colWidths[2]/2, lineYPos, { align: 'center' });
      lineYPos += 4.5;
    });
    
    // Quantity
    doc.setFont('helvetica', 'bold');
    lineYPos = yPos + 2.5;
    qtyLines.forEach((qty) => {
      doc.text(qty, colX[3] + colWidths[3]/2, lineYPos, { align: 'center' });
      lineYPos += 4.5;
    });

    currentYPos += stickerHeight;
    stickersOnPage++;
  }

  return doc;
}
