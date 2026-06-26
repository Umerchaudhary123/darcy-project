import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../../context/authStore';
import { Input, Button } from '../../components/ui';

export const LoginPage: React.FC = () => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/portal';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const { redirectTo } = await login({ 
      username: form.username, 
      password: form.password 
    });
    toast.success('Login successful!');
    window.location.href = redirectTo || '/portal';
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
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-gray-400 text-sm mt-2">Sign in to your contractor portal</p>
        </div>

        <div className="card-base p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Username or Email"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              placeholder="your_username"
              autoComplete="username"
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
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-brand hover:underline">Forgot password?</Link>
            </div>
            <Button type="submit" loading={isLoading} className="w-full text-base py-3">Sign In</Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <Link to="/signup" className="text-brand hover:underline font-medium">Sign up</Link>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link to="/admin/login" className="text-xs text-gray-500 hover:text-gray-300">Admin Portal →</Link>
        </div>
      </div>
    </div>
  );
};
