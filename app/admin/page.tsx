'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  category: string;
  image_url: string | null;
  buy_url: string | null;
  short_description: string | null;
  psychological_fit: string | null;
  relationship_fit: string | null;
  recipient_traits: string | null;
  recipient_age: string | null;
  occasion_fit: string | null;
  effort_signal: string | null;
  price_tier: string | null;
  is_last_minute: number;
  usage_signal: string | null;
  what_this_says: string | null;
  source: string | null;
  source_store: string | null;
  source_id: string | null;
  enriched: number;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  products: Product[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
  filters: {
    categories: string[];
    price_tiers: string[];
    stores: string[];
  };
}

const ENRICHMENT_FIELDS: { key: keyof Product; label: string }[] = [
  { key: 'short_description', label: 'Description' },
  { key: 'psychological_fit', label: 'Psychological Fit' },
  { key: 'relationship_fit', label: 'Relationship Fit' },
  { key: 'recipient_traits', label: 'Recipient Traits' },
  { key: 'recipient_age', label: 'Recipient Age' },
  { key: 'occasion_fit', label: 'Occasion Fit' },
  { key: 'effort_signal', label: 'Effort Signal' },
  { key: 'usage_signal', label: 'Usage Signal' },
  { key: 'what_this_says', label: 'What This Says' },
  { key: 'is_last_minute', label: 'Last Minute?' },
];

function truncate(s: string | null, max = 40): string {
  if (!s) return '-';
  return s.length > max ? s.slice(0, max) + '...' : s;
}

function tryParseJson(s: string | null): string {
  if (!s) return '-';
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) return parsed.join(', ');
    return String(parsed);
  } catch {
    return s;
  }
}

export default function AdminPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter state
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [priceTier, setPriceTier] = useState('');
  const [store, setStore] = useState('');
  const [enrichedFilter, setEnrichedFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('per_page', '50');
    if (category) params.set('category', category);
    if (priceTier) params.set('price_tier', priceTier);
    if (store) params.set('store', store);
    if (enrichedFilter) params.set('enriched', enrichedFilter);
    if (search) params.set('q', search);

    try {
      const res = await fetch(`/api/admin/products?${params.toString()}`);
      const json: ApiResponse = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [page, category, priceTier, store, enrichedFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset to page 1 when filters change
  const applyFilter = (setter: (v: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  // Stats bar: fetch unfiltered totals once on mount
  // For the overall stats, we do an unfiltered fetch only once
  const [stats, setStats] = useState<{ total: number; enriched: number } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/products?per_page=1');
        const json: ApiResponse = await res.json();
        const total = json.total;
        const res2 = await fetch('/api/admin/products?per_page=1&enriched=1');
        const json2: ApiResponse = await res2.json();
        setStats({ total, enriched: json2.total });
      } catch {
        // ignore
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold">Present Agent &mdash; Product Admin</h1>
          {stats && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{stats.total.toLocaleString()} products</span>
              <span>{stats.enriched.toLocaleString()} enriched</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${stats.total > 0 ? (stats.enriched / stats.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="font-medium text-emerald-700">
                  {stats.total > 0 ? ((stats.enriched / stats.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-4">
        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            value={category}
            onChange={(e) => applyFilter(setCategory, e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {data?.filters.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={priceTier}
            onChange={(e) => applyFilter(setPriceTier, e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Price Tiers</option>
            {data?.filters.price_tiers.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={store}
            onChange={(e) => applyFilter(setStore, e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Stores</option>
            {data?.filters.stores.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={enrichedFilter}
            onChange={(e) => applyFilter(setEnrichedFilter, e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Enrichment</option>
            <option value="1">Enriched</option>
            <option value="0">Not Enriched</option>
          </select>

          <form onSubmit={handleSearch} className="flex items-center gap-2 ml-auto">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, brand, description..."
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-sm bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
                className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Results info */}
        {data && (
          <p className="text-sm text-gray-500 mb-2">
            Showing {((data.page - 1) * data.per_page) + 1}
            &ndash;{Math.min(data.page * data.per_page, data.total)} of {data.total.toLocaleString()} products
            {data.pages > 1 && <> &middot; Page {data.page} of {data.pages}</>}
          </p>
        )}

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  <th className="px-4 py-2.5 font-medium text-gray-600">Name</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">Brand</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">Price</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">Category</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">Price Tier</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">Store</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">Enriched</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">Usage Signal</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td>
                  </tr>
                )}
                {!loading && data?.products.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">No products found.</td>
                  </tr>
                )}
                {!loading && data?.products.map((p) => (
                  <Fragment key={p.id}>
                    <tr
                      className="border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer transition-colors"
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    >
                      <td className="px-4 py-2.5 font-medium max-w-[250px] truncate" title={p.name}>{p.name}</td>
                      <td className="px-4 py-2.5 text-gray-600">{p.brand}</td>
                      <td className="px-4 py-2.5 text-gray-600">${p.price.toFixed(2)} {p.currency}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{p.price_tier ?? '-'}</td>
                      <td className="px-4 py-2.5 text-gray-600">{p.source_store ?? '-'}</td>
                      <td className="px-4 py-2.5">
                        {p.enriched ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">Yes</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">No</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 max-w-[200px] truncate" title={p.usage_signal ?? ''}>
                        {truncate(p.usage_signal)}
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {expandedId === p.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {ENRICHMENT_FIELDS.map(({ key, label }) => (
                              <div key={key}>
                                <span className="font-medium text-gray-700">{label}:</span>{' '}
                                <span className="text-gray-600">
                                  {key === 'is_last_minute'
                                    ? (p[key] ? 'Yes' : 'No')
                                    : tryParseJson(p[key] as string | null)}
                                </span>
                              </div>
                            ))}
                            {p.buy_url && (
                              <div>
                                <span className="font-medium text-gray-700">Buy URL:</span>{' '}
                                <a
                                  href={p.buy_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {truncate(p.buy_url, 60)}
                                </a>
                              </div>
                            )}
                            {p.image_url && (
                              <div>
                                <span className="font-medium text-gray-700">Image:</span>{' '}
                                <a
                                  href={p.image_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View
                                </a>
                              </div>
                            )}
                            <div>
                              <span className="font-medium text-gray-700">Source:</span>{' '}
                              <span className="text-gray-600">{p.source ?? '-'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">ID:</span>{' '}
                              <span className="text-gray-500 font-mono text-xs">{p.id}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Updated:</span>{' '}
                              <span className="text-gray-600">{p.updated_at}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4 pb-8">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              First
            </button>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>

            {/* Page number buttons */}
            {(() => {
              const pages: number[] = [];
              const start = Math.max(1, page - 2);
              const end = Math.min(data.pages, page + 2);
              for (let i = start; i <= end; i++) pages.push(i);
              return pages.map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1.5 text-sm border rounded-md transition-colors ${
                    p === page
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'border-gray-300 bg-white hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ));
            })()}

            <button
              onClick={() => setPage(Math.min(data.pages, page + 1))}
              disabled={page === data.pages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
            <button
              onClick={() => setPage(data.pages)}
              disabled={page === data.pages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Last
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

