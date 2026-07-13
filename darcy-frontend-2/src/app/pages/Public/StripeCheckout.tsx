import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Input, Button, Spinner } from '../../components/ui';
import { paymentsApi, clientApi } from '../../../services';

// ─── Stripe Checkout redirect page ───────────────────────────────────────
export const StripeCheckoutPage: React.FC = () => (
  <div className="min-h-screen bg-navy flex items-center justify-center">
    <div className="text-center">
      <Spinner size="lg" className="mx-auto mb-4" />
      <p className="text-white font-medium">Redirecting to secure payment…</p>
    </div>
  </div>
);

// ─── Account Setup page (post-Stripe success) ────────────────────────────
export const AccountSetupPage: React.FC = () => {
  const [form, setForm] = useState({ username: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(window.location.search);
  const stripeSessionId = searchParams.get('session_id');

  useEffect(() => {
    const verify = async () => {
      if (!stripeSessionId) {
        toast.error('Invalid session. Please complete payment first.');
        navigate('/signup');
        return;
      }
      try {
        const res = await paymentsApi.getCheckoutSession(stripeSessionId);
        const { userId: uid, email: em } = res.data.data;
        setUserId(uid);
        setEmail(em);
      } catch {
        toast.error('Could not verify payment. Please contact support.');
      } finally {
        setVerifying(false);
      }
    };
    verify();
  }, [navigate, stripeSessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!userId) { toast.error('User ID not found. Contact support.'); return; }

    setLoading(true);
    try {
      await clientApi.completeSetup({ userId, username: form.username, password: form.password });
      toast.success('Account created! You can now log in.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-white">Verifying your payment…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-white">Payment Successful!</h1>
          <p className="text-gray-400 text-sm mt-2">Create your login credentials to access your portal.</p>
          {email && <p className="text-xs text-gray-500 mt-1">Account: {email}</p>}
        </div>
        <div className="card-base p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Choose a Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="your_username"
              autoComplete="username"
            />
            <Input
              label="Create Password *"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
            <Input
              label="Confirm Password *"
              type="password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required
              placeholder="Repeat password"
              autoComplete="new-password"
            />
            <Button type="submit" loading={loading} className="w-full py-3">
              Create My Account →
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
