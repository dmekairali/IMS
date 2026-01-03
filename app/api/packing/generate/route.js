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

    // Debug logging
    console.log('🔍 DEBUG - Order data:', {
      orderId: order.orderId,
      invoiceNo: order.invoiceNo,
      customerName: order.customerName,
      mobile: order.mobile
    });
    
    console.log('🔍 DEBUG - Packing items sample:', packingItems.slice(0, 2).map(item => ({
      productName: item.productName,
      sku: item.sku,
      orderedQty: item.orderedQty
    })));

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

    // Calculate total boxes and box numbers from packing items
    const totalBoxes = Math.max(...packingItems.map(item => item.boxNo));
    const boxNumbers = Array.from({ length: totalBoxes }, (_, i) => i + 1).join(',');

    // Update DispatchData sheet with links and box info
    console.log('📊 Updating DispatchData sheet...');
    await updateDispatchDataWithLinks(
      order.orderId,
      packingListFile.webViewLink,
      stickersFile.webViewLink,
      boxNumbers,
      totalBoxes
    );
    console.log('✅ Sheet updated successfully');

    // Log to Form Data sheet
    console.log('📝 Logging to Form Data sheet...');
    const { logPackingToFormData } = await import('@/lib/logPackingToFormData');
    
    // Get total boxes from packing items
   // const totalBoxes = Math.max(...packingItems.map(item => item.boxNo));
    
    await logPackingToFormData({
      orderId: order.orderId,
      invoiceNo: order.invoiceNo || order.orderId,
      customerName: order.customerName,
      totalBoxes: totalBoxes,
      packingListLink: packingListFile.webViewLink,
      stickerLink: stickersFile.webViewLink
    });
    console.log('✅ Form Data log completed');

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

// Helper function to extract product name only (before first " - ")
function formatProductDetails(item) {
  // Extract product name (before first " - ")
  const parts = item.productName.split(' - ');
  const productName = parts[0].trim();
  return productName;
}

async function addLogoToPDF(doc, x = 15, y = 10, width = 30, height = 15) {
  try {
    // Import logo data
    const { KAIRALI_LOGO_BASE64 } = await import('@/lib/logoData');
    
    // Check if base64 logo is available
    if (KAIRALI_LOGO_BASE64 && !KAIRALI_LOGO_BASE64.includes('PASTE_YOUR_BASE64_STRING_HERE')) {
      doc.addImage(KAIRALI_LOGO_BASE64, 'PNG', x, y, width, height);
      console.log('✅ Logo added to PDF from base64');
      return true;
    }
    
    console.log('⚠️ Base64 logo not configured. Please update lib/logoData.js with your logo.');
    console.log('ℹ️ Convert your logo at: https://base64.guru/converter/encode/image');
    
    // Fallback: Try filesystem (works in development)
    if (process.env.NODE_ENV === 'development') {
      try {
        const fs = await import('fs');
        const path = await import('path');
        
        const logoPath = path.default.join(process.cwd(), 'public', 'kairali-logo.png');
        
        if (fs.default.existsSync(logoPath)) {
          const logoData = fs.default.readFileSync(logoPath);
          const logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;
          doc.addImage(logoBase64, 'PNG', x, y, width, height);
          console.log('✅ Logo added to PDF from filesystem (development)');
          return true;
        }
      } catch (fsError) {
        console.log('⚠️ Filesystem fallback failed:', fsError.message);
      }
    }
    
    return false;
  } catch (error) {
    console.log('⚠️ Logo error:', error.message);
    return false;
  }
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
  const logoY = 3;
  const hasLogo = await addLogoToPDF(doc, 3, logoY, 15, 7.5);
  const startY = hasLogo ? 5 : 8;
  
  // Company header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Kairali Ayurvedic Products Pvt Ltd', 52.5, startY + 3, { align: 'center' });
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('121/1-A1, Karattupalayam, Samathur, Pollachi - 642123', 52.5, startY + 7, { align: 'center' });
  
  // Packing List title with border
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(32, startY + 10, 41, 5);
  doc.text('Packing List', 52.5, startY + 13.5, { align: 'center' });

  // Order details section with border
  let yPos = startY + 18;
  doc.setLineWidth(0.2);
  doc.rect(3, yPos, 99, 30); // Increased height to 30mm
  
  // Vertical divider
  doc.line(52.5, yPos, 52.5, yPos + 30);

  // Left side
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('To', 4, yPos + 3);
  
  // Party Name - with wrapping for long names
  doc.text('Party Name : ', 4, yPos + 7);
  doc.setFont('helvetica', 'normal');
  const customerNameLines = doc.splitTextToSize(order.customerName || 'N/A', 42); // Wrap at 42mm
  doc.text(customerNameLines, 4, yPos + 10); // Start below label
  
  // Calculate dynamic address start position
  const nameHeight = customerNameLines.length * 3; // 3mm per line for name
  const addressLabelY = yPos + 10 + nameHeight + 2;
  
  // Party Address + Contact merged area (wider)
  doc.setFont('helvetica', 'bold');
  doc.text('Party Address :', 4, addressLabelY);
  doc.setFont('helvetica', 'normal');
  
  // Get and THOROUGHLY clean the address
  const rawAddress = order.shippingAddress || order.billingAddress || 'N/A';
  const mobile = order.mobile || 'N/A';
  
  // Split by various separators and clean
  const cleanAddress = rawAddress
    .split(/[,\n]/) // Split by comma or newline
    .map(part => part.trim())
    .filter(part => {
      // Remove empty, undefined, null, and common junk
      if (!part || part.length === 0) return false;
      if (part === 'undefined' || part === 'null' || part === 'N/A') return false;
      // Remove standalone numbers (like pin codes appearing separately)
      if (/^\d+$/.test(part)) return false;
      // Remove "Contact :" or "Contact No." entries (we'll add it once at the end)
      if (part.toLowerCase().startsWith('contact')) return false;
      // Remove "E-Mail :" entries
      if (part.toLowerCase().startsWith('e-mail')) return false;
      // Remove "State Name :" entries (usually redundant)
      if (part.toLowerCase().startsWith('state name')) return false;
      return true;
    })
    .join(', ');
  
  // Add contact ONCE at the end
  const fullAddress = cleanAddress !== 'N/A' && cleanAddress ? `${cleanAddress}\nContact No. : ${mobile}` : `Contact No. : ${mobile}`;
  
  // Wider text area for address (use 44mm to stay within 49.5mm border)
  const addressLines = doc.splitTextToSize(fullAddress, 44);
  doc.text(addressLines, 4, addressLabelY + 3);

  // Right side - all inline
  doc.setFont('helvetica', 'bold');
  doc.text('Order ID : ', 54, yPos + 3);
  doc.setFont('helvetica', 'normal');
  doc.text(order.orderId || 'N/A', 68, yPos + 3);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice No : ', 54, yPos + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(order.invoiceNo || order.orderId || 'N/A', 72, yPos + 7);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Date : ', 54, yPos + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 75, yPos + 11);
  
  const totalBoxes = Math.max(...packingItems.map(item => item.boxNo));
  doc.setFont('helvetica', 'bold');
  doc.text('No of Boxes : ', 54, yPos + 15);
  doc.text(totalBoxes.toString(), 77, yPos + 15);

  yPos = yPos + 33;

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
  doc.setFontSize(6);
  
  // Column widths: Box No | Product Details | UOM | Quantity
  const colWidths = [10, 66, 12, 12];
  const colX = [3, 13, 79, 91];
  
  // Draw header cells
  colWidths.forEach((width, i) => {
    doc.rect(colX[i], yPos, width, 5, 'FD');
  });
  
  doc.text('Box', colX[0] + colWidths[0]/2, yPos + 3.5, { align: 'center' });
  doc.text('Product Details', colX[1] + 1, yPos + 3.5);
  doc.text('UOM', colX[2] + colWidths[2]/2, yPos + 3.5, { align: 'center' });
  doc.text('Qty', colX[3] + colWidths[3]/2, yPos + 3.5, { align: 'center' });

  yPos += 5;

  // Table rows - one row per box
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  
  const sortedBoxNos = Object.keys(itemsByBox).sort((a, b) => parseInt(a) - parseInt(b));
  
  sortedBoxNos.forEach((boxNo) => {
    const boxItems = itemsByBox[boxNo];
    
    if (yPos > 138) {
      doc.addPage();
      yPos = 10;
      
      // Redraw headers
      doc.setFillColor(220, 220, 220);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      
      colWidths.forEach((width, i) => {
        doc.rect(colX[i], yPos, width, 5, 'FD');
      });
      
      doc.text('Box', colX[0] + colWidths[0]/2, yPos + 3.5, { align: 'center' });
      doc.text('Product Details', colX[1] + 1, yPos + 3.5);
      doc.text('UOM', colX[2] + colWidths[2]/2, yPos + 3.5, { align: 'center' });
      doc.text('Qty', colX[3] + colWidths[3]/2, yPos + 3.5, { align: 'center' });
      
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
    }

    const productLines = [];
    const uomLines = [];
    const qtyLines = [];
    
    boxItems.forEach((item) => {
      const productText = formatProductDetails(item);
      
      // Use 58mm for wrapping (column is 66mm, need more margin to stay within borders)
      const wrapped = doc.splitTextToSize(productText, 58);
      productLines.push(wrapped);
      uomLines.push(item.package || 'N/A');
      // Use orderedQty (new field name)
      qtyLines.push((item.orderedQty || 0).toString());
    });

    // DYNAMIC row height calculation - SUM all product heights
    let totalProductHeight = 0;
    productLines.forEach((lines) => {
      totalProductHeight += lines.length * 2.5; // Add each product's height
    });
    
    // Add spacing between products and padding
    const spacingBetweenProducts = Math.max((productLines.length - 1) * 2, 0); // 2mm between each product
    const minPadding = 6; // 6mm top+bottom padding
    const rowHeight = Math.max(totalProductHeight + spacingBetweenProducts + minPadding, 12);

    // Draw cell borders
    colWidths.forEach((width, i) => {
      doc.rect(colX[i], yPos, width, rowHeight);
    });

    // Box Number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(boxNo.toString(), colX[0] + colWidths[0]/2, yPos + rowHeight/2 + 1, { align: 'center' });
    
    // Product details - each product with proper wrapping and spacing
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    let lineYPos = yPos + 3; // Start 3mm from top
    productLines.forEach((wrappedLines, index) => {
      doc.text(wrappedLines, colX[1] + 1, lineYPos);
      lineYPos += wrappedLines.length * 2.5; // Move down by line count
      if (index < productLines.length - 1) {
        lineYPos += 2; // Space between products
      }
    });
    
    // UOM - aligned with each product center
    lineYPos = yPos + 3;
    uomLines.forEach((uom, index) => {
      const productLineCount = productLines[index].length;
      const uomYPos = lineYPos + (productLineCount * 2.5) / 2; // Center vertically
      doc.text(uom, colX[2] + colWidths[2]/2, uomYPos, { align: 'center' });
      lineYPos += productLineCount * 2.5;
      if (index < uomLines.length - 1) {
        lineYPos += 2;
      }
    });
    
    // Quantity - aligned with each product center, bold
    doc.setFont('helvetica', 'bold');
    lineYPos = yPos + 3;
    qtyLines.forEach((qty, index) => {
      const productLineCount = productLines[index].length;
      const qtyYPos = lineYPos + (productLineCount * 2.5) / 2; // Center vertically
      doc.text(qty, colX[3] + colWidths[3]/2, qtyYPos, { align: 'center' });
      lineYPos += productLineCount * 2.5;
      if (index < qtyLines.length - 1) {
        lineYPos += 2;
      }
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

    let yPos = currentYPos + 2;

    // Add logo (smaller for sticker)
    await addLogoToPDF(doc, 3, yPos, 12, 6);
    
    // Company header
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Kairali Ayurvedic Products Pvt Ltd', 52.5, yPos + 2, { align: 'center' });
    
    yPos += 4.5;
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.text('121/1-A1, Karattupalayam, Samathur, Pollachi - 642123', 52.5, yPos + 2, { align: 'center' });
    
    yPos += 4.5;
    
    // Packing Slip title
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setLineWidth(0.2);
    doc.rect(35, yPos, 35, 4);
    doc.text('Packing Slip', 52.5, yPos + 2.8, { align: 'center' });

    yPos += 5.5;

    // Order details section with border
    doc.setLineWidth(0.2);
    doc.rect(3, yPos, 99, 24); // Increased height
    
    // Vertical divider
    doc.line(52.5, yPos, 52.5, yPos + 24);

    // Left side
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.text('To', 4, yPos + 2.5);
    
    // Party Name - inline with wrapping
    doc.text('Party Name : ', 4, yPos + 6);
    doc.setFont('helvetica', 'normal');
    const customerNameLines = doc.splitTextToSize(order.customerName, 38); // Limit width to 38mm
    doc.text(customerNameLines, 20, yPos + 6);
    
    // Calculate address start position based on customer name height
    const nameHeight = customerNameLines.length * 2.5;
    const addressStartY = yPos + 6 + nameHeight + 2;
    
    // Party Address + Contact merged area
    doc.setFont('helvetica', 'bold');
    doc.text('Party Address :', 4, addressStartY);
    doc.setFont('helvetica', 'normal');
    
    // Get and THOROUGHLY clean the address
    const rawAddress = order.shippingAddress || order.billingAddress || '';
    
    // Split by various separators and clean
    const cleanAddress = rawAddress
      .split(/[,\n]/) // Split by comma or newline
      .map(part => part.trim())
      .filter(part => {
        // Remove empty, undefined, null, and common junk
        if (!part || part.length === 0) return false;
        if (part === 'undefined' || part === 'null') return false;
        // Remove standalone numbers (like pin codes appearing separately)
        if (/^\d+$/.test(part)) return false;
        // Remove "Contact :" entries (we'll add it once at the end)
        if (part.toLowerCase().startsWith('contact')) return false;
        // Remove "E-Mail :" entries
        if (part.toLowerCase().startsWith('e-mail')) return false;
        // Remove "State Name :" entries (usually redundant)
        if (part.toLowerCase().startsWith('state name')) return false;
        return true;
      })
      .join(', ');
    
    // Add contact ONCE at the end
    const fullAddress = cleanAddress ? `${cleanAddress}\nContact : ${order.mobile}` : `Contact : ${order.mobile}`;
    
    const addressLines = doc.splitTextToSize(fullAddress, 42); // Limit width to 42mm (stays within border)
    doc.text(addressLines, 4, addressStartY + 3);

    // Right side - all inline
    doc.setFont('helvetica', 'bold');
    doc.text('Order ID : ', 54, yPos + 2.5);
    doc.setFont('helvetica', 'normal');
    doc.text(order.orderId, 66, yPos + 2.5);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice No : ', 54, yPos + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(order.invoiceNo || order.orderId || 'N/A', 70, yPos + 6);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Date : ', 54, yPos + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('en-IN'), 74, yPos + 10);
    
    doc.setFont('helvetica', 'bold');
    doc.text('No of Boxes : ', 54, yPos + 14);
    doc.setFontSize(6);
    doc.text(`${boxNo}/${totalBoxes}`, 75, yPos + 14);

    yPos += 26;

    // Table headers
    doc.setFillColor(220, 220, 220);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    
    const colWidths = [10, 66, 12, 12];
    const colX = [3, 13, 79, 91];
    
    colWidths.forEach((width, i) => {
      doc.rect(colX[i], yPos, width, 4, 'FD');
    });
    
    doc.text('Box', colX[0] + colWidths[0]/2, yPos + 2.8, { align: 'center' });
    doc.text('Product Details', colX[1] + 1, yPos + 2.8);
    doc.text('UOM', colX[2] + colWidths[2]/2, yPos + 2.8, { align: 'center' });
    doc.text('Qty', colX[3] + colWidths[3]/2, yPos + 2.8, { align: 'center' });

    yPos += 4;

    // Single row with all products for this box
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    
    const productLines = [];
    const uomLines = [];
    const qtyLines = [];
    
    boxItems.forEach((item) => {
      const productText = formatProductDetails(item);
      
      // Use 58mm for wrapping (column is 66mm, need more margin to stay within borders)
      const wrapped = doc.splitTextToSize(productText, 58);
      productLines.push(wrapped);
      uomLines.push(item.package || 'N/A');
      // Use orderedQty (new field name)
      qtyLines.push((item.orderedQty || 0).toString());
    });

    // DYNAMIC row height calculation - SUM all product heights
    let totalProductHeight = 0;
    productLines.forEach((lines) => {
      totalProductHeight += lines.length * 2.2; // Add each product's height
    });
    
    // Add spacing between products and padding
    const spacingBetweenProducts = Math.max((productLines.length - 1) * 1.5, 0); // 1.5mm between each product
    const minPadding = 6; // 6mm top+bottom padding
    const rowHeight = Math.max(totalProductHeight + spacingBetweenProducts + minPadding, 10);

    // Draw cell borders
    colWidths.forEach((width, i) => {
      doc.rect(colX[i], yPos, width, rowHeight);
    });

    // Box Number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(boxNo.toString(), colX[0] + colWidths[0]/2, yPos + rowHeight/2 + 1, { align: 'center' });
    
    // Product details - properly wrapped with spacing
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    let lineYPos = yPos + 3; // Start 3mm from top
    productLines.forEach((wrappedLines, index) => {
      doc.text(wrappedLines, colX[1] + 1, lineYPos);
      lineYPos += wrappedLines.length * 2.2; // Move down by line count
      if (index < productLines.length - 1) {
        lineYPos += 1.5; // Space between products
      }
    });
    
    // UOM - aligned with each product center
    lineYPos = yPos + 3;
    uomLines.forEach((uom, index) => {
      const productLineCount = productLines[index].length;
      const uomYPos = lineYPos + (productLineCount * 2.2) / 2; // Center vertically
      doc.text(uom, colX[2] + colWidths[2]/2, uomYPos, { align: 'center' });
      lineYPos += productLineCount * 2.2;
      if (index < uomLines.length - 1) {
        lineYPos += 1.5;
      }
    });
    
    // Quantity - aligned with each product center, bold
    doc.setFont('helvetica', 'bold');
    lineYPos = yPos + 3;
    qtyLines.forEach((qty, index) => {
      const productLineCount = productLines[index].length;
      const qtyYPos = lineYPos + (productLineCount * 2.2) / 2; // Center vertically
      doc.text(qty, colX[3] + colWidths[3]/2, qtyYPos, { align: 'center' });
      lineYPos += productLineCount * 2.2;
      if (index < qtyLines.length - 1) {
        lineYPos += 1.5;
      }
    });

    currentYPos += stickerHeight;
    stickersOnPage++;
  }

  return doc;
}
