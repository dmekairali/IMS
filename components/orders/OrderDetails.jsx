// components/orders/OrderDetails.jsx - Show package info
'use client';
import { useState } from 'react';
import BatchSelector from '../batches/BatchSelector';

export default function OrderDetails({ order }) {
  const [selectedProduct, setSelectedProduct] = useState(null);

  return (
    <div className="p-4 space-y-3">
      {order.items.map((item, index) => (
        <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800">{item.productName}</h4>
              <p className="text-xs text-gray-500">SKU: {item.sku}</p>
              <p className="text-xs text-gray-500">Package: {item.package}</p>
              <p className="text-xs text-gray-500">MRP: ₹{item.mrp}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Qty</p>
              <p className="text-lg font-bold text-gray-800">{item.quantityOrdered}</p>
              <p className="text-xs text-green-700 font-semibold">₹{item.total?.toFixed(2)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Test with this demo data:**

**DispatchData sheet:**
```
Timestamp	Buyer ID	Oder ID	Name of Client	Mobile	Order Type	Invoice Amount	Order Taken By	Invoice No	Invoice Link	Dispatch From	Planned	Actual	Time Delay	Remarks	Dispatch Status	Dispatched	Dispatched Date
2024-12-20 10:30:00	B001	ORD001	Wellness Pharmacy	9876543210	Retail	15000	Sales Team	INV001		Mumbai			0		Pending		
2024-12-21 14:15:00	B002	ORD002	Apollo Medical	9876543211	Wholesale	25000	Sales Team	INV002		Mumbai			0		Pending		
```

**All Form Data sheet:**
```
Order Id	Products	MRP	Package	Qty	Total	SKU(All)
ORD001	Ashwagandha Tablets	300	60 tabs	500	150000	ASH-TAB-60
ORD002	Triphala Churna	150	100g	300	45000	TRI-CHU-100
ORD002	Chyawanprash	400	500g	200	80000	CHY-500
