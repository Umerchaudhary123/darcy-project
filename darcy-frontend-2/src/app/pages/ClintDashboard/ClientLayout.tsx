import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarLayout } from '../../components/layout/SidebarLayout';
import {
  LayoutDashboard, Users, Calendar, FileText, MessageSquare,
  Bell, CreditCard, Shield,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/portal', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Applicant Pipeline', href: '/pipeline', icon: <Users className="w-4 h-4" /> },
  { label: 'Calendar', href: '/calendar', icon: <Calendar className="w-4 h-4" /> },
  { label: 'Documents', href: '/documents', icon: <FileText className="w-4 h-4" /> },
  { label: 'Messages', href: '/messages', icon: <MessageSquare className="w-4 h-4" /> },
  { label: 'Notifications', href: '/notifications', icon: <Bell className="w-4 h-4" /> },
  { label: 'Subscription', href: '/subscription', icon: <CreditCard className="w-4 h-4" /> },
  { label: 'Security', href: '/portal/security', icon: <Shield className="w-4 h-4" /> },
];

interface Props { children?: React.ReactNode }

export const ClientLayout: React.FC<Props> = ({ children }) => (
  <SidebarLayout navItems={navItems} title="Client Portal">
    {children || <Outlet />}
  </SidebarLayout>
);
