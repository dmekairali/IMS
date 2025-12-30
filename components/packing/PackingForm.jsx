'use client';
import { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function PackingForm({ orders, products, onRefresh }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [packingItems, setPackingItems] = useState([]);
  const [generating, setGenerating] = useState(false);

  // When order is selected, populate packing items from products
  const handleOrderSelect = (orderId) => {
    const order = orders.find(o => o.oid === orderId);
    if (!order) return;

    setSelectedOrder(order);

    // Get products for this order from All Form Data
    const orderProducts = products.filter(p => p.oid === orderId);
    
    // Initialize packing items with ordered quantities
    const items = orderProducts.map(product => ({
      sku: product.sku || '',
      productName: product.productName || '',
      package: product.package || '',
      orderedQty: parseInt(product.quantity) || 0,
      packingQty: parseInt(product.quantity) || 0, // Default to ordered quantity
      boxNo: 1, // Default box number
    }));

    setPackingItems(items);
  };

  const handlePackingQtyChange = (index, value) => {
    const newItems = [...packingItems];
    newItems[index].packingQty = parseInt(value) || 0;
    setPackingItems(newItems);
  };

  const handleBoxNoChange = (index, value) => {
    const newItems = [...packingItems];
    newItems[index].boxNo = parseInt(value) || 1;
    setPackingItems(newItems);
  };

  const totalBoxes = useMemo(() => {
    if (packingItems.length === 0) return 0;
    return Math.max(...packingItems.map(item => item.boxNo));
  }, [packingItems]);

  const generatePackingList = () => {
    if (!selectedOrder || packingItems.length === 0) return;

    setGenerating(true);

    try {
      const doc = new jsPDF();
      
      // Add logo placeholder (you'll need to add actual logo)
      // doc.addImage(logoData, 'PNG', 15, 10, 30, 30);

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
      doc.text(`: ${selectedOrder.oid || 'N/A'}`, 170, 50);

      doc.setFont('helvetica', 'normal');
      doc.text('Party Name', 15, 57);
      doc.text(`: ${selectedOrder.clientName || 'N/A'}`, 42, 57);
      
      doc.text('Invoice No', 140, 57);
      doc.text(`: ${selectedOrder.invoiceNo || 'N/A'}`, 170, 57);

      doc.text('Party Address', 15, 64);
      doc.text(':', 42, 64);
      
      // Handle multi-line address
      const address = selectedOrder.address || 'N/A';
      const addressLines = doc.splitTextToSize(address, 85);
      doc.text(addressLines, 45, 64);

      doc.text('Invoice Date', 140, 64);
      doc.text(`: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, 170, 64);

      const addressHeight = addressLines.length * 5;
      doc.text('Contact No.', 15, 64 + addressHeight);
      doc.text(`: ${selectedOrder.contact || 'N/A'}`, 42, 64 + addressHeight);

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

        // Box header
        doc.setFillColor(26, 188, 156);
        doc.rect(15, yPos, 180, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(`Box No: ${boxNo}`, 20, yPos + 5.5);
        doc.setTextColor(0, 0, 0);

        yPos += 8;

        // Table headers
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

        // Table rows
        doc.setFont('helvetica', 'normal');
        boxItems.forEach((item) => {
          // Check if we need a new page
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }

          const productDetail = `${item.productName} - ${item.sku}`;
          const lines = doc.splitTextToSize(productDetail, 95);
          const rowHeight = Math.max(lines.length * 5, 7);

          // Draw cell borders
          doc.rect(15, yPos, 100, rowHeight);
          doc.rect(115, yPos, 25, rowHeight);
          doc.rect(140, yPos, 25, rowHeight);
          doc.rect(165, yPos, 30, rowHeight);

          // Draw text
          doc.text(lines, 17, yPos + 5);
          doc.text(item.package, 127.5, yPos + rowHeight / 2 + 1.5, { align: 'center' });
          doc.text(item.orderedQty.toString(), 152.5, yPos + rowHeight / 2 + 1.5, { align: 'center' });
          doc.text(item.packingQty.toString(), 180, yPos + rowHeight / 2 + 1.5, { align: 'center' });

          yPos += rowHeight;
        });

        yPos += 5; // Space between boxes
      });

      // Save the PDF
      doc.save(`PackingList_${selectedOrder.oid}.pdf`);
    } catch (error) {
      console.error('Error generating packing list:', error);
      alert('Error generating packing list. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const generateStickers = () => {
    if (!selectedOrder || packingItems.length === 0) return;

    setGenerating(true);

    try {
      const doc = new jsPDF();
      let yPos = 15;

      // Group items by box number
      const itemsByBox = packingItems.reduce((acc, item) => {
        if (!acc[item.boxNo]) acc[item.boxNo] = [];
        acc[item.boxNo].push(item);
        return acc;
      }, {});

      Object.keys(itemsByBox).sort((a, b) => a - b).forEach((boxNo, index) => {
        if (index > 0) {
          doc.addPage();
          yPos = 15;
        }

        const boxItems = itemsByBox[boxNo];

        // Sticker header
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

        // Order info
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('To', 15, yPos);
        doc.text('Order ID', 140, yPos);
        doc.text(`: ${selectedOrder.oid}`, 165, yPos);

        yPos += 7;
        doc.setFont('helvetica', 'normal');
        doc.text('Party Name', 15, yPos);
        doc.text(`: ${selectedOrder.clientName}`, 40, yPos);
        doc.text('Invoice No', 140, yPos);
        doc.text(`: ${selectedOrder.invoiceNo || 'N/A'}`, 165, yPos);

        yPos += 7;
        doc.text('Party Address', 15, yPos);
        doc.text(':', 40, yPos);
        const addressLines = doc.splitTextToSize(selectedOrder.address || '', 85);
        doc.text(addressLines, 42, yPos);

        doc.text('Invoice Date', 140, yPos);
        doc.text(`: ${new Date().toLocaleDateString('en-GB')}`, 165, yPos);

        yPos += addressLines.length * 5 + 2;
        doc.text('Contact No.', 15, yPos);
        doc.text(`: ${selectedOrder.contact}`, 40, yPos);
        doc.text('No of Boxes', 140, yPos);
        doc.text(`: ${boxNo}/${totalBoxes}`, 165, yPos);

        yPos += 10;

        // Box header
        doc.setFillColor(26, 188, 156);
        doc.rect(15, yPos, 180, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(`Box No: ${boxNo}`, 20, yPos + 5.5);
        doc.setTextColor(0, 0, 0);

        yPos += 8;

        // Table
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

      doc.save(`Stickers_${selectedOrder.oid}.pdf`);
    } catch (error) {
      console.error('Error generating stickers:', error);
      alert('Error generating stickers. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Order Details Section */}
      <div className="p-6 border-b border-gray-200">
        <h5 className="text-lg font-semibold text-teal-600 mb-4">Order Details</h5>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Order <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              value={selectedOrder?.oid || ''}
              onChange={(e) => handleOrderSelect(e.target.value)}
            >
              <option value="">-- Select an Order --</option>
              {orders.map((order) => (
                <option key={order.oid} value={order.oid}>
                  {order.oid} - {order.clientName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50"
              value={selectedOrder?.oid || ''}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice No <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50"
              value={selectedOrder?.invoiceNo || ''}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name of Client <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50"
              value={selectedOrder?.clientName || ''}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50"
              value={selectedOrder?.contact || ''}
              readOnly
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address <span className="text-red-500">*</span>
            </label>
            <textarea
              rows="3"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50"
              value={selectedOrder?.address || ''}
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Product Details Section */}
      {selectedOrder && packingItems.length > 0 && (
        <div className="p-6">
          <h5 className="text-lg font-semibold text-teal-600 mb-4">Product Details</h5>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-sm">
                    Name of Product
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-sm w-24">
                    Package
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-sm w-24">
                    Ordered QTY
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-sm bg-teal-600 text-white w-24">
                    Packing QTY
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-sm bg-teal-600 text-white w-24">
                    Box No
                  </th>
                </tr>
              </thead>
              <tbody>
                {packingItems.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2 text-sm">
                      {item.productName}
                      <div className="text-xs text-gray-500 mt-1">{item.sku}</div>
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-sm">
                      {item.package}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">
                      {item.orderedQty}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max={item.orderedQty}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                        value={item.packingQty}
                        onChange={(e) => handlePackingQtyChange(index, e.target.value)}
                      />
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      <input
                        type="number"
                        min="1"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                        value={item.boxNo}
                        onChange={(e) => handleBoxNoChange(index, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <button
              onClick={generatePackingList}
              disabled={generating}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold rounded-lg hover:from-teal-700 hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {generating ? 'Generating...' : '📄 Generate Packing List'}
            </button>
            
            <button
              onClick={generateStickers}
              disabled={generating}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {generating ? 'Generating...' : '🏷️ Generate Stickers'}
            </button>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Total Boxes:</strong> {totalBoxes}
            </p>
          </div>
        </div>
      )}

      {selectedOrder && packingItems.length === 0 && (
        <div className="p-6 text-center text-gray-500">
          No products found for this order.
        </div>
      )}

      {!selectedOrder && (
        <div className="p-6 text-center text-gray-500">
          Please select an order to view product details.
        </div>
      )}
    </div>
  );
}
