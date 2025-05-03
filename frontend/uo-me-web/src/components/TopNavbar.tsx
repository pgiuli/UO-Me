import Link from "next/link";

export default function TopNavbar() {
  return (
    <nav className="w-full flex items-center justify-between px-6 py-4 bg-white shadow">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="UO-Me Logo" className="h-10 w-10" />
        <Link href="/" className="text-2xl font-bold text-blue-600 hover:underline">
          UO-Me
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/login"
          className="px-6 py-2 bg-blue-600 text-white text-lg rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Log In
        </Link>
        <Link
          href="/register"
          className="text-blue-600 text-lg font-semibold hover:underline"
        >
          Register
        </Link>
      </div>
    </nav>
  );
}