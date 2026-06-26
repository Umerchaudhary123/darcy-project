import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Input, Button, Select } from '../../components/ui';
import { onboardingApi, paymentsApi } from '../../../services';
import { PublicNavbar } from '../../components/layout/PublicNavbar';

const STEPS = ['Plan', 'Business Info', 'Agreement', 'Review'];

const US_STATES = [
  { value: '', label: 'Select State' },
  ...['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(s => ({ value: s, label: s }))
];

export const SignupPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [step1, setStep1] = useState({ contractorType: 'P&D' });
  const [step2, setStep2] = useState({
    businessName: '', contactName: '', email: '', phone: '',
    address: '', city: '', state: '', zip: '',
    indeedUsername: '', firstAdvantageUsername: '',
  });
  const [agreed, setAgreed] = useState(false);

  const saveAndNext = async (stepNum: number, data: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await onboardingApi.saveStep(stepNum, sessionId, data);
      setSessionId(res.data.data.sessionId);
      setStep(stepNum + 1);
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await paymentsApi.createCheckout({
        sessionId,
        plan: step1.contractorType,
        email: step2.email,
        businessName: step2.businessName,
      });
      window.location.href = res.data.data.url;
    } catch {
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy">
      <PublicNavbar />
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-10 justify-center">
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                    step > i + 1 ? 'bg-green-500 border-green-500 text-white' :
                    step === i + 1 ? 'bg-brand border-brand text-white' :
                    'border-border text-muted-foreground'
                  }`}>
                    {step > i + 1 ? '✓' : i + 1}
                  </div>
                  <span className={`text-sm hidden sm:block ${step === i + 1 ? 'text-white font-medium' : 'text-muted-foreground'}`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 max-w-12 ${step > i + 1 ? 'bg-green-500' : 'bg-border'}`} />}
              </React.Fragment>
            ))}
          </div>

          <div className="card-base p-8">
            {/* Step 1: Plan */}
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
                <p className="text-muted-foreground text-sm mb-8">Select the type of FedEx contractor routes you operate.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {['P&D', 'Linehaul', 'Both'].map((type) => (
                    <button key={type} onClick={() => setStep1({ contractorType: type })}
                      className={`p-5 rounded-lg border-2 text-left transition-colors ${
                        step1.contractorType === type ? 'border-brand bg-brand/10' : 'border-border hover:border-brand/50'
                      }`}>
                      <div className="font-semibold mb-1">{type}</div>
                      <div className="text-xs text-muted-foreground">
                        {type === 'P&D' ? 'Pickup & Delivery routes' : type === 'Linehaul' ? 'Long-haul routes' : 'Both route types'}
                      </div>
                    </button>
                  ))}
                </div>
                <Button onClick={() => saveAndNext(1, step1)} loading={loading} className="w-full py-3">
                  Continue →
                </Button>
              </div>
            )}

            {/* Step 2: Business Info */}
            {step === 2 && (
              <div>
                <h2 className="text-2xl font-bold mb-2">Business Information</h2>
                <p className="text-muted-foreground text-sm mb-8">Tell us about your operation.</p>
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input label="Business Name *" value={step2.businessName} onChange={(e) => setStep2({ ...step2, businessName: e.target.value })} required placeholder="ABC Logistics LLC" />
                    <Input label="Contact Name *" value={step2.contactName} onChange={(e) => setStep2({ ...step2, contactName: e.target.value })} required placeholder="John Smith" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input label="Email Address *" type="email" value={step2.email} onChange={(e) => setStep2({ ...step2, email: e.target.value })} required placeholder="john@company.com" />
                    <Input label="Phone Number *" type="tel" value={step2.phone} onChange={(e) => setStep2({ ...step2, phone: e.target.value })} required placeholder="(555) 000-0000" />
                  </div>
                  <Input label="Street Address" value={step2.address} onChange={(e) => setStep2({ ...step2, address: e.target.value })} placeholder="123 Main St" />
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Input label="City" value={step2.city} onChange={(e) => setStep2({ ...step2, city: e.target.value })} placeholder="Memphis" />
                    <Select label="State" value={step2.state} onChange={(e) => setStep2({ ...step2, state: e.target.value })} options={US_STATES} />
                    <Input label="ZIP Code" value={step2.zip} onChange={(e) => setStep2({ ...step2, zip: e.target.value })} placeholder="38103" />
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm font-medium mb-3">Optional: External Service Credentials</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input label="Indeed Username" value={step2.indeedUsername} onChange={(e) => setStep2({ ...step2, indeedUsername: e.target.value })} placeholder="indeed_username" />
                      <Input label="First Advantage Username" value={step2.firstAdvantageUsername} onChange={(e) => setStep2({ ...step2, firstAdvantageUsername: e.target.value })} placeholder="fa_username" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <Button variant="secondary" onClick={() => setStep(1)} className="px-6">← Back</Button>
                  <Button
                    onClick={() => {
                      if (!step2.businessName || !step2.email || !step2.phone || !step2.contactName) {
                        toast.error('Please fill in all required fields.');
                        return;
                      }
                      saveAndNext(2, step2);
                    }}
                    loading={loading}
                    className="flex-1 py-3"
                  >
                    Continue →
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Agreement */}
            {step === 3 && (
              <div>
                <h2 className="text-2xl font-bold mb-2">Service Agreement</h2>
                <p className="text-muted-foreground text-sm mb-6">Please review and accept our service agreement.</p>
                <div className="bg-secondary rounded-lg p-5 h-48 overflow-y-auto text-sm text-gray-400 space-y-3 mb-6">
                  <p className="font-semibold text-white">Darcy Staffing Service Agreement</p>
                  <p>This Service Agreement ("Agreement") is entered into between Darcy Staffing ("Company") and the subscribing FedEx contractor ("Client").</p>
                  <p><strong className="text-gray-300">1. Services.</strong> Company agrees to provide recruiting and vetting services for FedEx drivers including: job postings on Indeed, background checks via First Advantage, drug screening coordination, medical card verification, and candidate management through the Darcy Staffing portal.</p>
                  <p><strong className="text-gray-300">2. Payment.</strong> Client agrees to pay the monthly subscription fee for their selected plan. Fees are billed monthly and non-refundable.</p>
                  <p><strong className="text-gray-300">3. Confidentiality.</strong> Both parties agree to maintain the confidentiality of sensitive business information shared during the engagement.</p>
                  <p><strong className="text-gray-300">4. Termination.</strong> Either party may terminate this agreement with 30 days written notice.</p>
                  <p><strong className="text-gray-300">5. Limitation of Liability.</strong> Company's liability is limited to the monthly subscription fees paid in the prior 3 months.</p>
                  <p>By proceeding, you agree to these terms and conditions.</p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer mb-8">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-brand" />
                  <span className="text-sm text-gray-300">I have read and agree to the Darcy Staffing Service Agreement</span>
                </label>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setStep(2)} className="px-6">← Back</Button>
                  <Button
                    onClick={() => {
                      if (!agreed) { toast.error('You must accept the agreement to continue.'); return; }
                      saveAndNext(3, { agreementSigned: true });
                    }}
                    loading={loading}
                    disabled={!agreed}
                    className="flex-1 py-3"
                  >
                    Accept & Continue →
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Review & Pay */}
            {step === 4 && (
              <div>
                <h2 className="text-2xl font-bold mb-2">Review & Subscribe</h2>
                <p className="text-muted-foreground text-sm mb-6">Confirm your details and complete payment.</p>
                <div className="bg-secondary rounded-lg p-5 space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-medium">{step1.contractorType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Business</span>
                    <span className="font-medium">{step2.businessName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{step2.email}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Agreement</span>
                    <span className="text-green-400 font-medium">✓ Signed</span>
                  </div>
                </div>
                <div className="card-base p-4 mb-6 border-brand/30 bg-brand/5">
                  <p className="text-sm text-gray-300">You'll be redirected to Stripe to complete your subscription payment securely.</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setStep(3)} className="px-6">← Back</Button>
                  <Button onClick={handleCheckout} loading={loading} className="flex-1 py-3">
                    Proceed to Payment →
                  </Button>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account? <Link to="/login" className="text-brand hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
