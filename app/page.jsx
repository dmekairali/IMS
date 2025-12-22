// app/page.jsx - SIMPLIFIED VERSION
export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          Ayur Inventory System
        </h1>
        <p className="text-gray-700 mb-4">
          If you see blue text and proper spacing, Tailwind CSS is working.
        </p>
        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
          Test Button
        </button>
      </div>
    </main>
  );
}
