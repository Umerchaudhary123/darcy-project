import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarLayout } from '../../components/layout/SidebarLayout';
import {
  LayoutDashboard, Users, Calendar, FileText, MessageSquare, Bell,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Pipeline', href: '/admin/pipeline', icon: <Users className="w-4 h-4" /> },
  { label: 'Calendar', href: '/admin/calendar', icon: <Calendar className="w-4 h-4" /> },
  { label: 'Documents', href: '/admin/documents', icon: <FileText className="w-4 h-4" /> },
  { label: 'Messages', href: '/admin/messages', icon: <MessageSquare className="w-4 h-4" /> },
  { label: 'Notifications', href: '/admin/notifications', icon: <Bell className="w-4 h-4" /> },
];

export const AdminLayout: React.FC = () => (
  <SidebarLayout navItems={navItems} title="Admin Portal">
    <Outlet />
  </SidebarLayout>
);
