import React from 'react';
import { Link } from 'react-router-dom';
import { PublicNavbar } from '../../components/layout/PublicNavbar';

const features = [
  { icon: '🎯', title: 'Targeted Recruiting', desc: 'We post on Indeed and source qualified FedEx driver candidates specifically for your routes.' },
  { icon: '🔍', title: 'Full Vetting', desc: 'Background checks via First Advantage, drug screens, and medical card verification included.' },
  { icon: '📋', title: 'Ready-to-Hire', desc: 'Candidates land in your portal pre-screened and interview-ready — you just pick the best fit.' },
  { icon: '⚡', title: 'Fast Turnaround', desc: 'Our dedicated team keeps your pipeline moving so you never run short on qualified drivers.' },
  { icon: '💬', title: 'Direct Communication', desc: 'Message our team, share documents, and schedule interviews all within one secure portal.' },
  { icon: '📊', title: 'Transparent Reporting', desc: 'Track every applicant\'s vetting stage in real time with full visibility into your pipeline.' },
];

const plans = [
  { name: 'P&D', price: 'Contact Us', desc: 'Perfect for Pickup & Delivery FedEx contractors.', features: ['Indeed job postings', 'Background checks', 'Drug screening', 'Med card verification', 'Secure portal access', 'Dedicated support'] },
  { name: 'Linehaul', price: 'Contact Us', desc: 'Optimized for Linehaul route contractors.', features: ['Everything in P&D', 'Linehaul-specific screening', 'Extended route drivers', 'Priority pipeline', 'Bulk hiring support'] },
];

export const LandingPage: React.FC = () => (
  <div className="min-h-screen bg-navy">
    <PublicNavbar />

    {/* Hero */}
    <section className="pt-24 pb-20 px-4">
      <div className="page-container text-center">
        <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/30 text-brand rounded-full px-4 py-1.5 text-sm mb-6">
          <span className="w-2 h-2 bg-brand rounded-full animate-pulse" />
          Specialized FedEx Contractor Staffing
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          Find Qualified Drivers <br />
          <span className="text-brand">Faster Than Ever</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
          Darcy Staffing handles the entire recruiting and vetting process — from Indeed postings to background checks — so you get interview-ready FedEx drivers delivered straight to your portal.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/signup" className="btn-primary text-base px-8 py-3">Start Hiring Drivers</Link>
          <Link to="/contact" className="btn-secondary text-base px-8 py-3">Talk to Our Team</Link>
        </div>
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
          {[['500+', 'Drivers Placed'], ['98%', 'Client Retention'], ['48hr', 'Avg. Turnaround'], ['100%', 'Background Checked']].map(([val, label]) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold text-brand">{val}</div>
              <div className="text-xs text-gray-400 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Features */}
    <section className="py-20 px-4 bg-navy-light">
      <div className="page-container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Everything You Need to Staff Up</h2>
          <p className="text-gray-400">A complete recruiting operation built for FedEx contractors.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card-base p-6 hover:border-brand/40 transition-colors">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* How it works */}
    <section className="py-20 px-4">
      <div className="page-container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">How It Works</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 relative">
          {[
            { step: '1', title: 'Sign Up', desc: 'Create your account and choose your service plan.' },
            { step: '2', title: 'We Recruit', desc: 'Our team posts jobs and screens all incoming applicants.' },
            { step: '3', title: 'Review Pipeline', desc: 'See verified candidates in your secure portal.' },
            { step: '4', title: 'Interview & Hire', desc: 'Schedule interviews and bring on your new drivers.' },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-12 h-12 bg-brand rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">{s.step}</div>
              <h3 className="font-semibold text-white mb-2">{s.title}</h3>
              <p className="text-sm text-gray-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Plans */}
    <section className="py-20 px-4 bg-navy-light">
      <div className="page-container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Choose Your Plan</h2>
          <p className="text-gray-400">Tailored for your specific FedEx contractor type.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((p, i) => (
            <div key={p.name} className={`card-base p-8 ${i === 1 ? 'border-brand/50' : ''}`}>
              {i === 1 && <div className="text-xs text-brand font-medium mb-3">MOST POPULAR</div>}
              <h3 className="text-2xl font-bold text-white mb-1">{p.name}</h3>
              <p className="text-sm text-gray-400 mb-6">{p.desc}</p>
              <ul className="space-y-2.5 mb-8">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="btn-primary w-full text-center block">Get Started</Link>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-20 px-4">
      <div className="page-container text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to Build Your Driver Team?</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">Join hundreds of FedEx contractors who rely on Darcy Staffing to keep their operations running.</p>
        <Link to="/signup" className="btn-primary text-base px-10 py-3">Start Today — Free Setup</Link>
      </div>
    </section>

    {/* Footer */}
    <footer className="border-t border-border py-8 px-4">
      <div className="page-container flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-brand rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">D</span>
          </div>
          <span className="text-sm font-semibold">Darcy Staffing</span>
        </div>
        <div className="flex gap-6 text-sm text-gray-400">
          <Link to="/about" className="hover:text-white">About</Link>
          <Link to="/contact" className="hover:text-white">Contact</Link>
          <Link to="/login" className="hover:text-white">Client Login</Link>
        </div>
        <p className="text-xs text-gray-500">© 2026 Darcy Staffing. All rights reserved.</p>
      </div>
    </footer>
  </div>
);
