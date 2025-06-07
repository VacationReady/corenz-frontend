'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  Home,
  Users,
  Calendar,
  FileText,
  BarChart2,
  Settings,
  Menu,
  ChevronLeft,
  User,
  LogOut
} from 'lucide-react';

function SidebarLink({
  href,
  label,
  icon: Icon,
  isCollapsed
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  isCollapsed: boolean;
}) {
  const [pathname, setPathname] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPathname(window.location.pathname);
    }
  }, []);

  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center px-3 py-2 rounded hover:bg-blue-100 ${
        isActive ? 'bg-blue-200 text-blue-800 font-semibold' : 'text-gray-700'
      }`}
    >
      <Icon className="w-5 h-5 mr-2" />
      {!isCollapsed && label}
    </Link>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const user = session?.user;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handl
