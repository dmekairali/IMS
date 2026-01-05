// components/common/PackingConsignmentSkeleton.jsx - Skeleton for packing/consignment pages
export default function PackingConsignmentSkeleton({ type = 'packing' }) {
  const color = type === 'packing' ? 'teal' : 'purple';
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header Skeleton */}
        <div className="sticky top-0 z-10 bg-white shadow-sm rounded-lg mb-4 animate-fade-in">
          <div className="p-4">
            <div className="h-8 w-64 bg-gray-200 rounded-lg mb-3 animate-shimmer" />
            <div className="h-12 w-full bg-gray-200 rounded-lg mb-3 animate-shimmer" />
            
            {/* Filter buttons */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 w-32 bg-gray-200 rounded-full animate-shimmer" />
              ))}
            </div>
          </div>
        </div>

        {/* Info Banner Skeleton */}
        <div className={`bg-${color}-50 border-2 border-${color}-200 rounded-lg p-4 mb-4 animate-fade-in`}
             style={{ animationDelay: '100ms' }}>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-gray-300 rounded-full animate-shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-gray-300 rounded animate-shimmer" />
              <div className="h-3 w-full bg-gray-300 rounded animate-shimmer" />
            </div>
          </div>
        </div>

        {/* Order Cards Skeleton */}
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i}
              className="bg-white rounded-lg border-2 border-gray-300 p-4 animate-fade-in"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Status badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-32 bg-orange-200 rounded animate-shimmer" />
                    <div className="h-5 w-40 bg-gray-200 rounded animate-shimmer" />
                  </div>
                  
                  {/* Order details grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="flex items-center gap-2">
                        <div className="h-3 w-20 bg-gray-200 rounded animate-shimmer" />
                        <div className="h-3 w-24 bg-gray-200 rounded animate-shimmer" />
                      </div>
                    ))}
                  </div>

                  {/* Links skeleton */}
                  <div className="mt-2 flex gap-2">
                    <div className="h-6 w-24 bg-blue-100 rounded animate-shimmer" />
                    <div className="h-6 w-24 bg-purple-100 rounded animate-shimmer" />
                  </div>
                </div>

                {/* Arrow icon */}
                <div className="ml-4">
                  <div className="w-6 h-6 bg-gray-200 rounded animate-shimmer" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Floating refresh button skeleton */}
        <div className="fixed bottom-24 right-4 z-10">
          <div className={`w-16 h-16 bg-${color}-200 rounded-full animate-shimmer`} />
        </div>
      </div>
    </div>
  );
}
