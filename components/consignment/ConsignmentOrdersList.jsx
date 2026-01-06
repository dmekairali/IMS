'use client';
import { useState, useEffect } from 'react';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '../common/Pagination';

export default function ConsignmentOrdersList({ orders, onSelectOrder }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  // Filter orders: must have sticker (packing completed) to be eligible
  // AND must NOT have consignment image already (prevent re-upload)
  const eligibleOrders = orders.filter(order => 
    order.stickerLink && order.stickerLink !== '' &&
    (!order.consignmentImageUrl || order.consignmentImageUrl === '') // ⭐ Only orders without images
  );

  // Sort by date (newest first) - all are pending uploads
  const sortedOrders = [...eligibleOrders].sort((a, b) => 
    new Date(b.orderDate) - new Date(a.orderDate)
  );

  const filteredOrders = sortedOrders.filter(order => {
    const matchesSearch = order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.orderId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'pending' ? true : // All eligible orders are pending
      filter === 'completed' ? false : true; // Completed orders are not in eligibleOrders
    
    return matchesSearch && matchesFilter;
  });

  // Pagination for filtered orders (10 items per page)
  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage,
    hasNextPage,
    hasPrevPage,
    startIndex,
    endIndex,
    totalItems,
    resetPage
  } = usePagination(filteredOrders, 10);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    resetPage();
  }, [searchQuery, filter, resetPage]);

  const pendingCount = eligibleOrders.length; // All eligible orders are pending
  const completedCount = orders.filter(o => 
    o.stickerLink && o.stickerLink !== '' && 
    o.consignmentImageUrl && o.consignmentImageUrl !== ''
  ).length; // Orders with sticker AND consignment image

  // For completed filter, we need separate logic
  const completedOrders = filter === 'completed' 
    ? orders
        .filter(o => 
          o.stickerLink && o.stickerLink !== '' &&
          o.consignmentImageUrl && o.consignmentImageUrl !== '' &&
          (o.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           o.orderId?.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
    : [];

  // Pagination for completed orders
  const {
    paginatedItems: paginatedCompletedOrders,
    ...completedPagination
  } = usePagination(completedOrders, 10);

  return (
    <div className="space-y-4">
      {/* Sticky Header with search and filters */}
      <div className="sticky top-0 z-10 bg-white shadow-sm rounded-lg">
        <div className="p-4">
          <h2 className="text-xl font-bold text-gray-800 mb-3">
            📸 Consignment Image Upload
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({filter === 'completed' ? completedOrders.length : filteredOrders.length} orders)
            </span>
          </h2>
          
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Search by customer name or order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              }`}
            >
              All ({eligibleOrders.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'pending' 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              }`}
            >
              📷 Pending Upload ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'completed' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              }`}
            >
              ✓ Uploaded ({completedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-blue-900 font-semibold mb-1">Camera Upload Only</p>
            <p className="text-xs text-blue-800">
              You must use your device camera to capture consignment images. Gallery uploads are not allowed to ensure image authenticity.
            </p>
          </div>
        </div>
      </div>

      {/* Orders list */}
      <div className="space-y-2">
        {filter === 'completed' ? (
          // Show completed orders with pagination
          paginatedCompletedOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No completed consignment uploads found
            </div>
          ) : (
            <>
              {paginatedCompletedOrders.map(order => (
                <CompletedOrderItem key={order.orderId} order={order} />
              ))}
              
              {/* Pagination for completed orders */}
              <Pagination
                currentPage={completedPagination.currentPage}
                totalPages={completedPagination.totalPages}
                onPageChange={completedPagination.goToPage}
                onPrevious={completedPagination.prevPage}
                onNext={completedPagination.nextPage}
                onFirst={completedPagination.goToFirstPage}
                onLast={completedPagination.goToLastPage}
                hasNextPage={completedPagination.hasNextPage}
                hasPrevPage={completedPagination.hasPrevPage}
                startIndex={completedPagination.startIndex}
                endIndex={completedPagination.endIndex}
                totalItems={completedPagination.totalItems}
                className="mt-4 rounded-lg shadow-sm"
              />
            </>
          )
        ) : paginatedItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {eligibleOrders.length === 0 ? (
              <div>
                <div className="text-4xl mb-2">📦</div>
                <p className="font-semibold">No orders ready for consignment upload</p>
                <p className="text-sm mt-1">Complete packing slips first</p>
              </div>
            ) : (
              'No orders found'
            )}
          </div>
        ) : (
          <>
            {paginatedItems.map(order => (
              <OrderListItem 
                key={order.orderId} 
                order={order} 
                onSelect={() => onSelectOrder(order)}
              />
            ))}
            
            {/* Pagination for pending orders */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              onPrevious={prevPage}
              onNext={nextPage}
              onFirst={goToFirstPage}
              onLast={goToLastPage}
              hasNextPage={hasNextPage}
              hasPrevPage={hasPrevPage}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={totalItems}
              className="mt-4 rounded-lg shadow-sm"
            />
          </>
        )}
      </div>
    </div>
  );
}

function OrderListItem({ order, onSelect }) {
  // This is for PENDING uploads only
  return (
    <div 
      onClick={onSelect}
      className="bg-white rounded-lg border-2 border-orange-400 bg-orange-50 p-4 cursor-pointer transition-all hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded flex items-center gap-1">
              📷 UPLOAD PENDING
            </span>
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

          {/* Show packing slip links */}
          <div className="mt-2 flex flex-wrap gap-2">
            {order.invoiceLink && (
              <a 
                href={order.invoiceLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              >
                📋 Invoice
              </a>
            )}
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

function CompletedOrderItem({ order }) {
  // This is for COMPLETED uploads - view only, no click action
  return (
    <div className="bg-white rounded-lg border-2 border-green-200 bg-green-50 p-4 opacity-75">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded">
              ✓ IMAGE UPLOADED
            </span>
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

          {/* Show all document links */}
          <div className="mt-2 flex flex-wrap gap-2">
            {order.invoiceLink && (
              <a 
                href={order.invoiceLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              >
                📋 Invoice
              </a>
            )}
            {order.packingListLink && (
              <a 
                href={order.packingListLink}
                target="_blank"
                rel="noopener noreferrer"
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
                className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
              >
                🏷️ Sticker
              </a>
            )}
          </div>

          {/* Show consignment image */}
          <div className="mt-2">
            <a 
              href={order.consignmentImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors inline-flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              View Consignment Image
            </a>
          </div>
        </div>

        <div className="ml-4">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
