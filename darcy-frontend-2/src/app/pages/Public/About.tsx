import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PublicNavbar } from '../../components/layout/PublicNavbar';
import { Input, Button } from '../../components/ui';
import { authApi } from '../../../services';

// ─── About ────────────────────────────────────────────────────────────────
export const AboutPage: React.FC = () => (
  <div className="min-h-screen bg-navy">
    <PublicNavbar />
    <div className="pt-24 pb-20 px-4">
      <div className="page-container max-w-4xl">
        <h1 className="text-4xl font-bold text-white mb-6">About Darcy Staffing</h1>
        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <p className="text-gray-400 mb-4">
              Darcy Staffing was built by people who understand the unique challenges FedEx contractors face when it comes to finding and keeping qualified drivers. We're not a general staffing agency — we specialize exclusively in FedEx contractor staffing.
            </p>
            <p className="text-gray-400 mb-4">
              Our team handles every step of the recruiting process: posting on Indeed, running First Advantage background checks, coordinating drug screens, verifying medical cards, and delivering interview-ready candidates directly to your secure portal.
            </p>
            <p className="text-gray-400">
              We work with P&D and Linehaul contractors across the country, helping them maintain full staffing even during high-turnover periods.
            </p>
          </div>
          <div className="space-y-4">
            {[
              ['Our Mission', 'Make driver recruiting effortless for FedEx contractors.'],
              ['Our Approach', 'Full-service vetting from initial application to interview-ready status.'],
              ['Our Technology', 'A custom portal built specifically for FedEx contractor workflows.'],
            ].map(([title, body]) => (
              <div key={title} className="card-base p-5">
                <h3 className="font-semibold text-white mb-1">{title}</h3>
                <p className="text-sm text-gray-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─── Contact ──────────────────────────────────────────────────────────────
export const ContactPage: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    toast.success('Message sent! We\'ll get back to you within 24 hours.');
    setForm({ name: '', email: '', company: '', message: '' });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-navy">
      <PublicNavbar />
      <div className="pt-24 pb-20 px-4">
        <div className="page-container max-w-5xl">
          <h1 className="text-4xl font-bold text-white mb-4">Get In Touch</h1>
          <p className="text-gray-400 mb-10">Have questions about our staffing services? We'd love to hear from you.</p>
          <div className="grid md:grid-cols-2 gap-10">
            <form onSubmit={handleSubmit} className="card-base p-8 space-y-5">
              <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="John Smith" />
              <Input label="Email Address" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="john@company.com" />
              <Input label="Company Name" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="ABC Logistics LLC" />
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Message</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                  rows={5}
                  className="input-field resize-none"
                  placeholder="Tell us about your staffing needs..."
                />
              </div>
              <Button type="submit" loading={loading} className="w-full">Send Message</Button>
            </form>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                <div className="space-y-3">
                  {[
                    ['📧', 'Email', 'info@darcystaffing.com'],
                    ['📞', 'Phone', '(555) 000-0000'],
                    ['🕒', 'Hours', 'Mon–Fri, 8am–6pm EST'],
                  ].map(([icon, label, val]) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xl">{icon}</span>
                      <div>
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="text-sm text-gray-300">{val}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card-base p-5">
                <h4 className="font-semibold text-white mb-2">Ready to get started?</h4>
                <p className="text-sm text-gray-400 mb-4">Create your account and we'll set up your recruiting pipeline within 24 hours.</p>
                <Link to="/signup" className="btn-primary block text-center text-sm">Start Your Free Setup</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Forgot Password ──────────────────────────────────────────────────────
export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">D</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-gray-400 text-sm mt-2">Enter your email to receive a reset link</p>
        </div>
        <div className="card-base p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✉️</div>
              <h3 className="font-semibold text-white mb-2">Check Your Email</h3>
              <p className="text-sm text-gray-400 mb-6">If that email is registered, you'll receive a reset link within a few minutes.</p>
              <Link to="/login" className="btn-secondary text-sm">Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" />
              <Button type="submit" loading={loading} className="w-full">Send Reset Link</Button>
              <p className="text-center text-sm text-gray-400">
                <Link to="/login" className="text-brand hover:underline">Back to Login</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Reset Password ───────────────────────────────────────────────────────
export const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const token = new URLSearchParams(window.location.search).get('token') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      toast.success('Password reset successfully');
    } catch {
      toast.error('Invalid or expired reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">D</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Set New Password</h1>
        </div>
        <div className="card-base p-8">
          {done ? (
            <div className="text-center">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="font-semibold text-white mb-2">Password Updated</h3>
              <Link to="/login" className="btn-primary block mt-4">Go to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input label="New Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min. 8 characters" />
              <Input label="Confirm Password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="Repeat password" />
              <Button type="submit" loading={loading} className="w-full">Reset Password</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
