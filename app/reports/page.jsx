// app/reports/page.jsx - Complete Inventory Intelligence System
'use client';
import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorMessage from '@/components/common/ErrorMessage';

// Import all dashboard components
import OverviewDashboard from '@/components/reports/OverviewDashboard';
import StockStatusReport from '@/components/reports/StockStatusReport';
import ConsumptionAnalytics from '@/components/reports/ConsumptionAnalytics';
import SalesPerformance from '@/components/reports/SalesPerformance';
import PredictionsAlerts from '@/components/reports/PredictionsAlerts';
import ProductDeepDive from '@/components/reports/ProductDeepDive';

export default function ReportsPage() {
  const [activeSection, setActiveSection] = useState('overview');
  const [activeSubSection, setActiveSubSection] = useState(null);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    setError(null);

    try {
      // Load finished goods inventory data
      const inventoryResponse = await fetch('/api/inventory/finished-goods', {
        cache: 'no-store'
      });
      
      if (!inventoryResponse.ok) {
        throw new Error('Failed to fetch inventory data');
      }
      
      const inventoryData = await inventoryResponse.json();
      setProducts(inventoryData.products || []);
      setMetadata(inventoryData.metadata || null);

      // Load batches data
      const batchesResponse = await fetch('/api/batches/list', {
        cache: 'no-store'
      });
      
      if (!batchesResponse.ok) {
        throw new Error('Failed to fetch batches data');
      }
      
      const batchesData = await batchesResponse.json();
      setBatches(batchesData.batches || []);

      console.log('✅ Data loaded:', {
        products: inventoryData.products?.length || 0,
        batches: batchesData.batches?.length || 0
      });

    } catch (err) {
      console.error('❌ Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Navigation structure
  const navigation = [
    {
      id: 'overview',
      name: 'Overview Dashboard',
      icon: '📊',
      description: 'Executive summary & key insights'
    },
    {
      id: 'inventory',
      name: 'Inventory Analysis',
      icon: '📦',
      children: [
        { id: 'stock-status', name: 'Stock Status', description: 'Current levels & availability' },
        { id: 'batch-management', name: 'Batch Management', description: 'FEFO tracking & expiry' },
        { id: 'value-analysis', name: 'Value Analysis', description: 'Inventory valuation' }
      ]
    },
    {
      id: 'consumption',
      name: 'Consumption & Demand',
      icon: '📈',
      children: [
        { id: 'consumption-trends', name: 'Consumption Trends', description: 'Daily/Monthly patterns' },
        { id: 'consumption-forecast', name: 'Demand Forecast', description: 'Future projections' }
      ]
    },
    {
      id: 'sales',
      name: 'Sales Performance',
      icon: '💰',
      children: [
        { id: 'sales-trends', name: 'Sales Trends', description: 'Historical analysis' },
        { id: 'sales-comparison', name: 'Period Comparison', description: 'Month/Quarter comparison' }
      ]
    },
    {
      id: 'predictions',
      name: 'Predictions & Alerts',
      icon: '🔮',
      description: 'AI-powered insights & warnings'
    },
    {
      id: 'products',
      name: 'Product Deep Dive',
      icon: '🔍',
      description: 'Detailed product analytics'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="max-w-7xl mx-auto p-4">
          <LoadingSpinner size="lg" message="Loading inventory intelligence..." fullScreen={true} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="max-w-7xl mx-auto p-4">
          <ErrorMessage message={error} onRetry={loadAllData} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">📊 Inventory Intelligence System</h1>
              <p className="text-teal-100 text-sm">Real-time analytics, predictions & business insights</p>
            </div>
            {metadata && (
              <div className="hidden md:flex items-center gap-4 bg-white bg-opacity-20 rounded-lg px-4 py-2">
                <div className="text-center">
                  <p className="text-xs text-teal-100">Total Products</p>
                  <p className="text-lg font-bold">{metadata.totalProducts}</p>
                </div>
                <div className="w-px h-8 bg-white bg-opacity-30" />
                <div className="text-center">
                  <p className="text-xs text-teal-100">Stock Value</p>
                  <p className="text-lg font-bold">₹{(metadata.totalStockValue / 100000).toFixed(1)}L</p>
                </div>
                <div className="w-px h-8 bg-white bg-opacity-30" />
                <div className="text-center">
                  <p className="text-xs text-teal-100">Critical Items</p>
                  <p className="text-lg font-bold text-red-200">{metadata.critical || 0}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 bg-white border-r border-gray-200 lg:min-h-screen">
            <nav className="p-4 space-y-1">
              {navigation.map(section => (
                <NavSection
                  key={section.id}
                  section={section}
                  activeSection={activeSection}
                  activeSubSection={activeSubSection}
                  onSelect={(id, subId) => {
                    setActiveSection(id);
                    setActiveSubSection(subId);
                  }}
                />
              ))}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-4 lg:p-6">
            {/* Overview Dashboard */}
            {activeSection === 'overview' && (
              <OverviewDashboard 
                finishedGoods={products}
                batches={batches}
              />
            )}
            
            {/* Inventory Analysis */}
            {activeSection === 'inventory' && (
              <StockStatusReport 
                products={products}
                batches={batches}
                subSection={activeSubSection}
              />
            )}
            
            {/* Consumption & Demand */}
            {activeSection === 'consumption' && (
              <ConsumptionAnalytics 
                products={products}
                subSection={activeSubSection}
              />
            )}
            
            {/* Sales Performance */}
            {activeSection === 'sales' && (
              <SalesPerformance 
                products={products}
                subSection={activeSubSection}
              />
            )}
            
            {/* Predictions & Alerts */}
            {activeSection === 'predictions' && (
              <PredictionsAlerts 
                products={products}
              />
            )}
            
            {/* Product Deep Dive */}
            {activeSection === 'products' && (
              <ProductDeepDive 
                products={products}
                batches={batches}
              />
            )}
          </div>
        </div>

        {/* Floating Refresh Button */}
        <div className="fixed bottom-24 right-4 z-10">
          <button
            onClick={loadAllData}
            disabled={loading}
            className="bg-teal-600 text-white p-4 rounded-full shadow-lg active:scale-95 transition-transform hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh data"
          >
            <svg className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function NavSection({ section, activeSection, activeSubSection, onSelect }) {
  const [expanded, setExpanded] = useState(
    activeSection === section.id || 
    (section.children && section.children.some(child => child.id === activeSection))
  );
  
  const hasChildren = section.children && section.children.length > 0;
  const isActive = activeSection === section.id && !activeSubSection;

  return (
    <div className="mb-2">
      <button
        onClick={() => {
          if (hasChildren) {
            setExpanded(!expanded);
          } else {
            onSelect(section.id, null);
          }
        }}
        className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between ${
          isActive
            ? 'bg-teal-100 text-teal-900 font-semibold'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <span className="flex items-center gap-2.5">
          <span className="text-lg">{section.icon}</span>
          <span className="text-sm">{section.name}</span>
        </span>
        {hasChildren && (
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </button>

      {hasChildren && expanded && (
        <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
          {section.children.map(child => {
            const isChildActive = activeSection === section.id && activeSubSection === child.id;
            
            return (
              <button
                key={child.id}
                onClick={() => onSelect(section.id, child.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                  isChildActive
                    ? 'bg-teal-50 text-teal-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div>
                  <p className="font-medium">{child.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{child.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
