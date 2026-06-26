import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../../context/authStore';
import { Input, Button } from '../../components/ui';

export const AdminLoginPage: React.FC = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [superAdmin, setSuperAdmin] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { adminLogin, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const isSuperAdminParam = new URLSearchParams(window.location.search).get('superAdmin') === '1';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { redirectTo } = await adminLogin({
        ...form,
        superAdmin: superAdmin || isSuperAdminParam
      });
      toast.success('Login successful!');
      window.location.href = redirectTo || '/admin/dashboard';
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <span className="text-xl font-bold text-white">Darcy Staffing</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
          <p className="text-gray-400 text-sm mt-2">Internal staff access only</p>
        </div>

        <div className="card-base p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              placeholder="admin@darcystaffing.com"
              autoComplete="email"
            />
            <div className="w-full">
              <label className="block text-sm text-muted-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  placeholder="••••••••"
                  className="input-field pr-10"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs">
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {!isSuperAdminParam && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={superAdmin}
                  onChange={(e) => setSuperAdmin(e.target.checked)}
                  className="w-4 h-4 accent-brand" />
                <span className="text-sm text-gray-400">Super Admin login</span>
              </label>
            )}

            <Button type="submit" loading={isLoading} className="w-full text-base py-3">
              {isSuperAdminParam || superAdmin ? 'Sign In as Super Admin' : 'Sign In as Admin'}
            </Button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-xs text-gray-500 hover:text-gray-300">← Client Portal</Link>
        </div>
      </div>
    </div>
  );
};