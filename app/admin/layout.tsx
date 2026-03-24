import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav className="bg-white border-b border-gray-200 px-6 py-2">
        <div className="max-w-5xl mx-auto flex items-center gap-6 text-sm">
          <Link href="/admin" className="font-semibold text-gray-900 hover:text-black">
            Products
          </Link>
          <Link href="/admin/analytics" className="text-gray-500 hover:text-gray-900">
            Analytics
          </Link>
          <Link href="/admin/sessions" className="text-gray-500 hover:text-gray-900">
            Sessions
          </Link>
          <div className="ml-auto">
            <Link href="/" className="text-gray-400 hover:text-gray-600 text-xs">
              Back to app
            </Link>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
