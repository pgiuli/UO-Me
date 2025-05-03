"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, BellIcon, PlusCircleIcon, UsersIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: HomeIcon,
  },
  {
    name: "Notifications",
    href: "/notifications",
    icon: BellIcon,
  },
  {
    name: "Create",
    href: "/create-payment",
    icon: PlusCircleIcon,
  },
  {
    name: "Social",
    href: "/social",
    icon: UsersIcon,
  },
  {
    name: "Profile",
    href: "/profile",
    icon: UserCircleIcon,
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      {/* Desktop sidebar navbar */}
      <aside className="hidden md:fixed md:flex md:flex-col md:justify-between md:top-0 md:left-0 md:h-screen md:w-56 bg-white shadow-md z-20">
        <div>
          <div className="flex items-center gap-2 px-6 py-6">
            <span className="font-bold text-xl text-blue-600">UO-Me</span>
          </div>
          <ul className="flex flex-col gap-1 px-2">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                      active
                        ? "bg-blue-100 text-blue-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <item.icon className="w-6 h-6" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex flex-col gap-2 px-4 pb-6">
          <span className="text-sm text-gray-600">{user?.username}</span>
          <button
            onClick={logout}
            className="text-sm px-3 py-2 rounded bg-red-50 text-red-600 hover:bg-red-100 w-full text-left"
          >
            Logout
          </button>
        </div>
      </aside>
      {/* Mobile bottom navbar */}
      <nav className="fixed md:hidden bottom-0 left-0 w-full bg-white border-t shadow z-20">
        <ul className="flex justify-between">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={`flex flex-col items-center justify-center py-2 ${
                    active ? "text-blue-600" : "text-gray-500"
                  }`}
                >
                  <item.icon className={`w-6 h-6 mb-0.5 ${active ? "stroke-2" : "stroke-1"}`} />
                  <span className="text-xs">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* Spacer for mobile navbar */}
      <div className="md:hidden h-14" />
      {/* Spacer for desktop sidebar */}
      <div className="hidden md:block md:w-56" />
    </>
  );
}