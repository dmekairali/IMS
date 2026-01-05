// components/common/OrdersSkeleton.jsx - Skeleton loader for orders page
export default function OrdersSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-10 bg-white shadow-sm animate-fade-in">
        <div className="p-4">
          <div className="h-8 w-48 bg-gray-200 rounded-lg mb-3 animate-shimmer" />
          <div className="h-12 w-full bg-gray-200 rounded-lg animate-shimmer" />
        </div>

        {/* Filter buttons skeleton */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto hide-scrollbar">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-24 bg-gray-200 rounded-full animate-shimmer" />
          ))}
        </div>
      </div>

      {/* Order Cards Skeleton */}
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div 
            key={i} 
            className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 animate-fade-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="p-4">
              {/* Header row */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-gray-200 rounded-full animate-shimmer" />
                    <div className="h-6 w-48 bg-gray-200 rounded animate-shimmer" />
                  </div>
                  <div className="h-4 w-32 bg-gray-200 rounded animate-shimmer mb-2" />
                  <div className="h-3 w-24 bg-gray-200 rounded animate-shimmer" />
                </div>
                <div className="h-8 w-20 bg-gray-200 rounded-full animate-shimmer" />
              </div>

              {/* Info box */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-shimmer" />
                  <div className="h-4 w-12 bg-gray-200 rounded animate-shimmer" />
                </div>
                <div className="flex justify-between">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-shimmer" />
                  <div className="h-4 w-16 bg-gray-200 rounded animate-shimmer" />
                </div>
                <div className="flex justify-between">
                  <div className="h-4 w-28 bg-gray-200 rounded animate-shimmer" />
                  <div className="h-4 w-20 bg-gray-200 rounded animate-shimmer" />
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <div className="h-12 bg-gray-200 rounded-lg animate-shimmer" />
                <div className="h-12 bg-gray-200 rounded-lg animate-shimmer" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating button skeleton */}
      <div className="fixed bottom-24 right-4">
        <div className="w-14 h-14 bg-gray-200 rounded-full animate-shimmer" />
      </div>
    </div>
  );
}
