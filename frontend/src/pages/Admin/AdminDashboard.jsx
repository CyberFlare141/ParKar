import { Link } from "react-router-dom";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <h1 className="text-lg font-semibold text-gray-900">Admin Dashboard</h1>
          <a
            href="/logout"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Logout
          </a>
        </div>
      </header>

      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-lg border bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            Connected
          </p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="mt-2 text-sm text-gray-600">
            Demo view loaded successfully.
          </p>
          <div className="mt-5">
            <Link
              to="/admin/review"
              className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Application
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
