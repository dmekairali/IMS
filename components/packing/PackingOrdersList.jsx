'use client';
import { useState } from 'react';

export default function PackingOrdersList({ orders, onSelectOrder }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  // Sort: Pending (no packing) on top
  const sortedOrders = [...orders].sort((a, b) => {
    if (!a.hasPacking && b.hasPacking) return -1;
    if (a.hasPacking && !b.hasPacking) return 1;
    return new Date(b.orderDate) - new Date(a.orderDate);
  });

  const filteredOrders = sortedOrders.filter(order => {
    const matchesSearch = order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.orderId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'pending' ? !order.hasPacking :
      filter === 'completed' ? order.hasPacking : true;
    
    return matchesSearch && matchesFilter;
  });

  const pendingCount = orders.filter(o => !o.hasPacking).length;
  const completedCount = orders.filter(o => o.hasPacking).length;

  return (
    <div className="space-y-4">
      {/* Header with search */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-3">
          Select Order for Packing
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({filteredOrders.length} orders)
          </span>
        </h2>
        
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Search by customer name or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === 'all' 
                ? 'bg-teal-600 text-white' 
                : 'bg-gray-100 text-gray-700 active:bg-gray-200'
            }`}
          >
            All ({orders.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === 'pending' 
                ? 'bg-orange-600 text-white' 
                : 'bg-gray-100 text-gray-700 active:bg-gray-200'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === 'completed' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 active:bg-gray-200'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>
      </div>

      {/* Orders list */}
      <div className="space-y-2">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No orders found
          </div>
        ) : (
          filteredOrders.map(order => (
            <OrderListItem 
              key={order.orderId} 
              order={order} 
              onSelect={() => onSelectOrder(order)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function OrderListItem({ order, onSelect }) {
  const isPending = !order.hasPacking;

  return (
    <div 
      onClick={onSelect}
      className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
        isPending 
          ? 'border-orange-400 bg-orange-50' 
          : 'border-green-200 bg-green-50 opacity-75'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isPending ? (
              <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded">
                PENDING
              </span>
            ) : (
              <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded">
                ✓ COMPLETED
              </span>
            )}
            <h3 className="font-bold text-gray-800">{order.customerName}</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-2">
            <div>
              <span className="text-gray-600">Order ID:</span>
              <span className="ml-2 font-semibold text-gray-800">{order.orderId}</span>
            </div>
            <div>
              <span className="text-gray-600">Amount:</span>
              <span className="ml-2 font-semibold text-green-700">₹{order.invoiceAmount?.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600">Items:</span>
              <span className="ml-2 font-semibold text-gray-800">{order.items.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Mobile:</span>
              <span className="ml-2 font-semibold text-gray-800">{order.mobile}</span>
            </div>
          </div>

          {!isPending && (
            <div className="mt-2 flex gap-2">
              {order.packingListLink && (
                <a 
                  href={order.packingListLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  📄 Packing List
                </a>
              )}
              {order.stickerLink && (
                <a 
                  href={order.stickerLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                >
                  🏷️ Sticker
                </a>
              )}
            </div>
          )}
        </div>

        <div className="ml-4">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
