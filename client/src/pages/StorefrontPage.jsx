import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Phone,
  Lock,
  Sparkles,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  Check,
  User,
  Calendar,
  Clock,
  MapPin,
  FileText,
  HelpCircle,
  Award,
  ArrowRight,
  Zap,
  Building2,
  CheckSquare,
  Star,
  BookOpen,
} from 'lucide-react';
import { http } from '../services/http';
import { useAuth } from '../context/AuthContext';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { StorefrontFooter } from '../components/StorefrontFooter';
import '../storefront.css';

export function StorefrontPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Dynamic Site Config state loaded from backend MongoDB
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [promoBarVisible, setPromoBarVisible] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // Calculator State
  const [selectedService, setSelectedService] = useState('cockroach');
  const [selectedAllotmentId, setSelectedAllotmentId] = useState('2_bhk');
  const [sqft, setSqft] = useState(1000);
  const [packageType, setPackageType] = useState('amc'); // 'single' or 'amc'

  // Diagnostic Quiz State
  const [quizAnswers, setQuizAnswers] = useState({ q1: null, q2: null, q3: null });
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Quick Callback Request Form State
  const [callbackForm, setCallbackForm] = useState({ name: '', phone: '', city: 'Mumbai' });
  const [callbackSubmitted, setCallbackSubmitted] = useState(false);

  // Booking Modal State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [bookingForm, setBookingForm] = useState({
    customerName: '',
    phone: '',
    email: '',
    address: '',
    preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    preferredTimeSlot: 'Morning (9:00 AM - 1:00 PM)',
    notes: '',
  });

  // FAQ Accordion Toggle State
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Load public site configuration from backend API
  useEffect(() => {
    fetchSiteConfig();
  }, []);

  const fetchSiteConfig = async () => {
    try {
      setLoading(true);
      const res = await http.get('/site-config');
      if (res.data?.success && res.data?.data) {
        setConfig(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load site config:', err);
    } finally {
      setLoading(false);
    }
  };

  // Premises allotments fallback or dynamic
  const allotments = config?.premisesAllotments || [
    { id: '1_rk', label: '1 RK', defaultSqft: 350, basePrice: 1199, amcPriceMultiplier: 2.2 },
    { id: '1_bhk', label: '1 BHK', defaultSqft: 600, basePrice: 1499, amcPriceMultiplier: 2.2 },
    { id: '2_bhk', label: '2 BHK', defaultSqft: 1000, basePrice: 1999, amcPriceMultiplier: 2.2 },
    { id: '3_bhk', label: '3 BHK', defaultSqft: 1400, basePrice: 2499, amcPriceMultiplier: 2.2 },
    { id: '4_bhk', label: '4 BHK', defaultSqft: 1800, basePrice: 2999, amcPriceMultiplier: 2.2 },
    { id: '5_bhk', label: '5 BHK', defaultSqft: 2400, basePrice: 3999, amcPriceMultiplier: 2.2 },
    { id: 'commercial', label: 'Commercial', defaultSqft: 3000, basePrice: 4999, amcPriceMultiplier: 2.4 },
  ];

  const currentAllotment = allotments.find((a) => a.id === selectedAllotmentId) || allotments[2];

  const handleSelectAllotment = (allotment) => {
    setSelectedAllotmentId(allotment.id);
    setSqft(allotment.defaultSqft);
  };

  // Pricing Rules
  const rules = config?.pricingRules || {
    minSqft: 200,
    maxSqftInspectionThreshold: 1500,
    extraPricePerSqft: 1.5,
    gstPercent: 18,
  };

  const promo = config?.promoBanner || {
    enabled: true,
    code: 'PROSPERITY30',
    discountPercent: 30,
    text: 'FESTIVE OFFER: Get 30% INSTANT OFF on All Pest Control Bookings!',
  };

  const services = config?.serviceCategories || [
    { id: 'cockroach', name: 'Cockroach Residential Blitz', badge: 'Blitz Intensive', basePriceMultiplier: 1.0 },
    { id: 'termite', name: 'Termite Protection Barrier', badge: '5 Year Warranty', basePriceMultiplier: 1.35 },
    { id: 'bedbug', name: 'Bed Bug Thermal & Spray Eradication', badge: '90 Days Guarantee', basePriceMultiplier: 1.25 },
    { id: 'general_pest', name: 'General Pest & Insect Control', badge: 'All-in-One Shield', basePriceMultiplier: 0.9 },
  ];

  const currentService = services.find((s) => s.id === selectedService) || services[0];

  // Calculate Price Breakdown
  const baseRate = currentAllotment.basePrice * (currentService.basePriceMultiplier || 1.0);
  const extraSqft = Math.max(0, sqft - currentAllotment.defaultSqft);
  const extraSqftCost = extraSqft * rules.extraPricePerSqft;

  let packageSubtotal = baseRate + extraSqftCost;
  if (packageType === 'amc') {
    packageSubtotal = packageSubtotal * (currentAllotment.amcPriceMultiplier || 2.2);
  }

  const discountAmount = promo.enabled ? packageSubtotal * (promo.discountPercent / 100) : 0;
  const netBeforeGst = packageSubtotal - discountAmount;
  const gstAmount = netBeforeGst * (rules.gstPercent / 100);
  const grandTotal = Math.round(netBeforeGst + gstAmount);

  // Copy promo code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(promo.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleStaffLoginClick = () => {
    if (user) {
      navigate('/admin');
    } else {
      navigate('/login');
    }
  };

  // Handle Online Customer Booking Submit
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingLoading(true);
    try {
      const payload = {
        ...bookingForm,
        premiseType: currentAllotment.label,
        sqft,
        serviceCategory: currentService.name,
        packageType: packageType === 'amc' ? '1-Year AMC (3 Visits)' : 'Single Service Knockdown',
        totalAmount: grandTotal,
        discountApplied: promo.discountPercent,
      };

      const res = await http.post('/site-config/bookings', payload);
      if (res.data?.success) {
        setBookingSuccess(res.data);
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Handle Quick Call-Back Request Submit
  const handleCallbackSubmit = async (e) => {
    e.preventDefault();
    try {
      await http.post('/site-config/bookings', {
        name: callbackForm.name,
        phone: callbackForm.phone,
        address: `${callbackForm.city} - Quick Callback Request`,
        serviceType: 'General Callback Inquiry',
        allotment: '1_bhk',
        sqft: 600,
        packageType: 'single',
        totalAmount: 0,
      });
      setCallbackSubmitted(true);
    } catch (err) {
      console.error('Callback error:', err);
    }
  };

  // Infestation Quiz Calculation
  const handleQuizAnswer = (qKey, val) => {
    const updated = { ...quizAnswers, [qKey]: val };
    setQuizAnswers(updated);
    if (updated.q1 !== null && updated.q2 !== null && updated.q3 !== null) {
      setQuizSubmitted(true);
    }
  };

  const getQuizSeverity = () => {
    const yesCount = Object.values(quizAnswers).filter((v) => v === true).length;
    if (yesCount >= 3) return { level: 'HIGH INFESTATION ALERT', color: '#ef4444', rec: '1-Year AMC Protection Plan + Blitz Intensive' };
    if (yesCount === 2) return { level: 'MODERATE INFESTATION RISK', color: '#f59e0b', rec: '1-Year AMC Protection Plan' };
    return { level: 'LOW / PREVENTIVE LEVEL', color: '#10b981', rec: 'Single Service Blitz Knockdown' };
  };

  const faqs = [
    {
      q: 'Are the pest control chemicals safe for my children and pets?',
      a: 'Yes, absolutely. We use 100% odourless, government-approved (CIB certified) Bayer & Syngenta gel baiting formulations. There are no harmful chemical fumes, so children, elderly family members, and pets do not need to leave the house.',
    },
    {
      q: 'Do I need to empty my kitchen cabinets before the treatment?',
      a: 'No! Our Blitz Intensive Gel Treatment requires ZERO kitchen emptying. Our technicians apply precise gel points in cabinet hinges, drawers, and under sinks without disturbing your kitchen items.',
    },
    {
      q: 'What is covered under the 1-Year AMC (Annual Maintenance Contract)?',
      a: 'The 1-Year AMC covers 3 scheduled intensive service visits per year (once every 4 months), plus UNLIMITED free complaint re-treatments whenever you spot any pest recurrence during the 365-day contract period.',
    },
    {
      q: 'How quickly does the cockroach gel start working?',
      a: 'The gel formulation acts via domino cascade effect. Pests eat the bait, return to their nests, and eliminate the entire colony within 48 to 72 hours.',
    },
    {
      q: 'How does the 3-Year Anti-Termite Drill-Fill-Seal warranty work?',
      a: 'Technicians drill small 45° holes at 1-foot intervals along wall junctions, inject termiticide chemical barriers into subterranean soil layers, and seal the holes with color-matched cement plugs. If termites re-appear during 3 years, we provide 100% free callouts.',
    },
  ];

  const serviceGrid = [
    {
      title: 'Cockroach Eradication',
      desc: 'Domino cascade gel baiting & zero kitchen cabinet emptying.',
      link: '/services/cockroach',
      badge: 'Bayer Gel Tech',
    },
    {
      title: 'Termite Protection',
      desc: 'Subterranean Drill-Fill-Seal barrier & 3-Year Warranty cover.',
      link: '/services/termite',
      badge: '3-Year Warranty',
    },
    {
      title: 'Rodent & Rat Defense',
      desc: 'Lockable tamper-proof bait stations & electrical wire shielding.',
      link: '/services/rodent',
      badge: 'Wire Shield',
    },
    {
      title: 'Mosquito Vector Defense',
      desc: '3-Way ULV thermal cold fogging & anti-larval water granules.',
      link: '/services/mosquito',
      badge: 'Dengue Shield',
    },
    {
      title: 'Bed Bug Removal',
      desc: '2-session super-heated thermal steam & 90-day guarantee.',
      link: '/services/bed-bug',
      badge: '90-Day Guarantee',
    },
    {
      title: 'Bird Netting & Spikes',
      desc: 'Garware HDPE UV-treated balcony nets & SS304 spikes.',
      link: '/services/bird-control',
      badge: 'Garware HDPE',
    },
  ];

  const sectors = [
    { title: 'Residential & Apartments', desc: 'Customized 1 BHK to 5 BHK & Villa AMC protection packages.' },
    { title: 'Food & Hospitality', desc: 'HACCP compliant pest eradication for restaurants & hotels.' },
    { title: 'Hospitals & Healthcare', desc: 'Sterile, zero-odor insect control for wards & cleanrooms.' },
    { title: 'Warehousing & Logistics', desc: 'Rodent proofing & grain pest fumigation for supply chains.' },
    { title: 'IT Parks & Offices', desc: 'Discreet after-hours commercial pest maintenance schedules.' },
    { title: 'Manufacturing & Plants', desc: 'ISO 9001 audit-ready commercial pest management solutions.' },
  ];

  const testimonials = [
    {
      name: 'Rajesh Sharma',
      city: 'Mumbai',
      stars: 5,
      comment: 'Tech House cockroach gel treatment completely eliminated cockroaches in our 3 BHK kitchen within 2 days! Zero smell and no need to remove utensils.',
    },
    {
      name: 'Priya Nair',
      city: 'Bangalore',
      stars: 5,
      comment: 'The 3-Year Termite Drill-Fill-Seal service was executed neatly. The technicians sealed all drilled holes with matching cement plugs. Very professional!',
    },
    {
      name: 'Amitabh Gupta',
      city: 'Delhi NCR',
      stars: 5,
      comment: 'Garware bird netting installed on our 4th floor balcony has kept pigeons away completely. Sturdy quality and quick installation within 3 hours.',
    },
  ];

  const cities = ['Mumbai', 'Navi Mumbai', 'Thane', 'Pune', 'Delhi NCR', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Ahmedabad'];

  return (
    <div className="sf-wrapper">
      {/* 1. TOP STICKY PROMO BANNER */}
      {promoBarVisible && promo.enabled && (
        <div className="sf-promo-bar">
          <Sparkles size={16} />
          <span>{promo.text}</span>
          <div className="sf-promo-code-pill" onClick={handleCopyCode} title="Click to Copy Code">
            <span>{promo.code}</span>
            {copiedCode ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
          </div>
          <button
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: 'auto' }}
            onClick={() => setPromoBarVisible(false)}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 2. HEADER NAVBAR */}
      <header className="sf-navbar">
        <a href="/" className="sf-logo">
          <img className="sf-logo-img" src="/tech-house-logo.png" alt="Tech House Pest Control" />
          <div>
            Tech House <span style={{ color: '#38bdf8' }}>Pest Control</span>
          </div>
        </a>

        <ul className="sf-nav-links">
          <li><a href="#calculator" className="sf-nav-link">Price Calculator</a></li>
          <li><a href="#services" className="sf-nav-link">Services</a></li>
          <li><a href="#sectors" className="sf-nav-link">Sectors</a></li>
          <li><a href="/about" className="sf-nav-link">About Us</a></li>
          <li><a href="/blog" className="sf-nav-link">Pest Insights</a></li>
          <li><a href="/contact" className="sf-nav-link">Contact</a></li>
        </ul>

        <div className="sf-header-actions">
          <a href={`tel:${config?.contactInfo?.phone || '18002122125'}`} className="sf-btn-call">
            <Phone size={16} />
            <span>{config?.contactInfo?.tollFree || '1800-212-2125'}</span>
          </a>

          <button className="sf-btn-login" onClick={handleStaffLoginClick}>
            <Lock size={15} />
            <span>{user ? 'Admin Dashboard' : 'Staff Login'}</span>
          </button>
        </div>
      </header>

      {/* 3. HERO & DYNAMIC CALCULATOR SECTION */}
      <section className="sf-hero sf-reveal" id="calculator">
        <div>
          <div className="sf-hero-tag">
            <ShieldCheck size={15} />
            <span>ISO 9001:2026 Certified Science-Led Platform</span>
          </div>

          <h1 className="sf-hero-title">
            Advanced Residential & Commercial Pest Eradication
          </h1>

          <p className="sf-hero-sub">
            Protect your property from severe disease risks with 100% odourless, child & pet safe Blitz Intensive Gel formulations. Instant online booking with price guarantee.
          </p>

          {/* Health Risk Framing Cards */}
          <div className="sf-risk-grid">
            <div className="sf-risk-card">
              <div className="sf-risk-icon">
                <AlertTriangle size={18} />
              </div>
              <h4>Salmonella & E. coli</h4>
              <p>Cockroaches contaminate open food & prep counters with bacterial pathogens.</p>
            </div>

            <div className="sf-risk-card">
              <div className="sf-risk-icon">
                <AlertTriangle size={18} />
              </div>
              <h4>Asthma Triggers</h4>
              <p>Pest molts and droppings release airborne allergens affecting children.</p>
            </div>

            <div className="sf-risk-card">
              <div className="sf-risk-icon">
                <AlertTriangle size={18} />
              </div>
              <h4>Property Damage</h4>
              <p>Termites & wood borers hollow out furniture, doors, and flooring unnoticed.</p>
            </div>
          </div>
        </div>

        {/* Dynamic Calculator Widget */}
        <div className="sf-calc-card">
          <div className="sf-calc-header">
            <h3>Instant Pricing Calculator</h3>
            <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700' }}>
              <Calculator size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Live Rate Engine
            </span>
          </div>

          {/* Service Selector Tabs */}
          <div className="sf-service-tabs">
            {services.map((serv) => (
              <div
                key={serv.id}
                className={`sf-service-tab ${selectedService === serv.id ? 'active' : ''}`}
                onClick={() => setSelectedService(serv.id)}
              >
                <span className="sf-tab-name">{serv.name}</span>
                <span className="sf-tab-badge">{serv.badge}</span>
              </div>
            ))}
          </div>

          {/* Premise Allotments Grid */}
          <span className="sf-label">Select Premise Allotment</span>
          <div className="sf-allotments-grid">
            {allotments.map((allot) => (
              <button
                key={allot.id}
                className={`sf-allotment-btn ${selectedAllotmentId === allot.id ? 'active' : ''}`}
                onClick={() => handleSelectAllotment(allot)}
              >
                {allot.label}
              </button>
            ))}
          </div>

          {/* Sqft Input & Slider Controls */}
          <div className="sf-sqft-box">
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>Area Sqft:</span>
            <input
              type="number"
              className="sf-sqft-input"
              value={sqft}
              min="200"
              max="5000"
              onChange={(e) => setSqft(Number(e.target.value) || 200)}
            />
            <span style={{ fontSize: '13px', color: '#64748b' }}>sq ft</span>
          </div>

          <input
            type="range"
            className="sf-range-slider"
            min="200"
            max="3000"
            step="50"
            value={sqft}
            onChange={(e) => setSqft(Number(e.target.value))}
          />

          {/* Area Threshold Validation Notice */}
          {sqft < rules.minSqft && (
            <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '16px' }}>
              ⚠️ Minimum billable area is {rules.minSqft} sq ft.
            </div>
          )}
          {sqft > rules.maxSqftInspectionThreshold && (
            <div style={{ color: '#f59e0b', fontSize: '12px', marginBottom: '16px' }}>
              ⚠️ Large Property ({sqft} sqft): Includes Complimentary On-Site Inspection.
            </div>
          )}

          {/* Package Type (Single vs 1-Year AMC) */}
          <span className="sf-label">Select Service Package</span>
          <div className="sf-plan-grid">
            <div
              className={`sf-plan-card ${packageType === 'single' ? 'active' : ''}`}
              onClick={() => setPackageType('single')}
            >
              <span className="sf-plan-title">Single Knockdown</span>
              <span className="sf-plan-desc">1 Intensive Service Visit</span>
            </div>

            <div
              className={`sf-plan-card ${packageType === 'amc' ? 'active' : ''}`}
              onClick={() => setPackageType('amc')}
            >
              <span className="sf-plan-tag">365 Days Warranty</span>
              <span className="sf-plan-title">1-Year AMC (3 Visits)</span>
              <span className="sf-plan-desc">Unlimited Free Re-treatments</span>
            </div>
          </div>

          {/* Price Summary Box */}
          <div className="sf-price-summary">
            <div className="sf-price-row">
              <span>Subtotal ({currentAllotment.label} - {sqft} sqft):</span>
              <span>₹{Math.round(packageSubtotal).toLocaleString('en-IN')}</span>
            </div>

            {promo.enabled && (
              <div className="sf-price-row discount">
                <span>Promo Discount ({promo.code} -{promo.discountPercent}%):</span>
                <span>-₹{Math.round(discountAmount).toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="sf-price-row">
              <span>Estimated GST ({rules.gstPercent}%):</span>
              <span>₹{Math.round(gstAmount).toLocaleString('en-IN')}</span>
            </div>

            <div className="sf-price-row grand">
              <span>Final Total:</span>
              <span style={{ color: '#10b981' }}>₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <button className="sf-btn-book" onClick={() => setBookingModalOpen(true)}>
            <span>BOOK SERVICE NOW</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* 4. EMERGENCY 24/7 CALL-BACK BANNER */}
      <section className="sf-reveal" style={{ background: 'linear-gradient(135deg, #063d59 0%, #087bad 100%)', padding: '30px 24px', color: '#fff', borderRadius: '24px', maxWidth: '1280px', margin: '20px auto', boxShadow: '0 8px 24px rgba(6,61,89,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <span style={{ background: '#38bdf8', color: '#063d59', fontWeight: 800, fontSize: '11px', padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase' }}>24/7 Emergency Desk</span>
            <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '8px 0 4px 0' }}>Need Urgent Pest Treatment Or Site Inspection?</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#e0f2fe' }}>Speak with our certified entomologist directly or request an instant call-back within 15 minutes.</p>
          </div>

          {callbackSubmitted ? (
            <div style={{ background: '#10b981', padding: '12px 24px', borderRadius: '14px', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={20} /> Request Received! We will call you in 15 mins.
            </div>
          ) : (
            <form onSubmit={handleCallbackSubmit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input type="text" required placeholder="Your Name" value={callbackForm.name} onChange={(e) => setCallbackForm({ ...callbackForm, name: e.target.value })} style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', fontSize: '13px' }} />
              <input type="tel" required placeholder="Phone Number" value={callbackForm.phone} onChange={(e) => setCallbackForm({ ...callbackForm, phone: e.target.value })} style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', fontSize: '13px' }} />
              <button type="submit" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>CALL ME BACK</button>
            </form>
          )}
        </div>
      </section>

      {/* 5. DIAGNOSTIC INFESTATION QUIZ SECTION */}
      <section className="max-w-7xl mx-auto my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-sm sf-reveal" id="quiz">
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 text-indigo-500 text-xs font-extrabold uppercase tracking-wider mb-2">
            <Sparkles size={16} /> Infestation Diagnostic Assessment
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
            Evaluate Your Infestation Level in 10 Seconds
          </h2>
          <p className="text-sm text-slate-500">
            Answer 3 diagnostic questions to calculate infestation severity and receive a tailored treatment recommendation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center flex flex-col justify-between hover:-translate-y-1 hover:border-sky-500 hover:shadow-md transition-all duration-300">
            <p className="text-sm font-bold text-slate-800 mb-4 leading-snug">1. Do you see pest droppings, egg cases, or dead insects?</p>
            <div className="flex gap-3 justify-center">
              <button className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-bold transition-all duration-200 shadow-xs cursor-pointer ${quizAnswers.q1 === true ? 'bg-red-500 text-white border-red-500 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-sky-500 hover:text-sky-600'}`} onClick={() => handleQuizAnswer('q1', true)}>Yes</button>
              <button className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-bold transition-all duration-200 shadow-xs cursor-pointer ${quizAnswers.q1 === false ? 'bg-sky-500 text-white border-sky-500 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-sky-500 hover:text-sky-600'}`} onClick={() => handleQuizAnswer('q1', false)}>No</button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center flex flex-col justify-between hover:-translate-y-1 hover:border-sky-500 hover:shadow-md transition-all duration-300">
            <p className="text-sm font-bold text-slate-800 mb-4 leading-snug">2. Do you spot pests active during daytime hours?</p>
            <div className="flex gap-3 justify-center">
              <button className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-bold transition-all duration-200 shadow-xs cursor-pointer ${quizAnswers.q2 === true ? 'bg-red-500 text-white border-red-500 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-sky-500 hover:text-sky-600'}`} onClick={() => handleQuizAnswer('q2', true)}>Yes</button>
              <button className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-bold transition-all duration-200 shadow-xs cursor-pointer ${quizAnswers.q2 === false ? 'bg-sky-500 text-white border-sky-500 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-sky-500 hover:text-sky-600'}`} onClick={() => handleQuizAnswer('q2', false)}>No</button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center flex flex-col justify-between hover:-translate-y-1 hover:border-sky-500 hover:shadow-md transition-all duration-300">
            <p className="text-sm font-bold text-slate-800 mb-4 leading-snug">3. Are pests spreading into bedrooms or closets?</p>
            <div className="flex gap-3 justify-center">
              <button className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-bold transition-all duration-200 shadow-xs cursor-pointer ${quizAnswers.q3 === true ? 'bg-red-500 text-white border-red-500 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-sky-500 hover:text-sky-600'}`} onClick={() => handleQuizAnswer('q3', true)}>Yes</button>
              <button className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-bold transition-all duration-200 shadow-xs cursor-pointer ${quizAnswers.q3 === false ? 'bg-sky-500 text-white border-sky-500 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-sky-500 hover:text-sky-600'}`} onClick={() => handleQuizAnswer('q3', false)}>No</button>
            </div>
          </div>
        </div>

        {quizSubmitted && (
          <div className="mt-6 p-6 rounded-2xl bg-slate-900 border text-center shadow-lg transition-all duration-300" style={{ borderColor: getQuizSeverity().color }}>
            <div className="font-black text-base mb-1 tracking-wide" style={{ color: getQuizSeverity().color }}>
              DIAGNOSTIC RESULT: {getQuizSeverity().level}
            </div>
            <div className="text-sm text-slate-300 mb-4">
              Recommended Plan: <strong className="text-white">{getQuizSeverity().rec}</strong>
            </div>
            <button className="px-6 py-2.5 rounded-xl font-bold text-white shadow-md hover:scale-105 transition-all duration-200 cursor-pointer mx-auto block" style={{ background: getQuizSeverity().color }} onClick={() => { setPackageType('amc'); document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' }); }}>
              Apply Recommended Plan to Calculator
            </button>
          </div>
        )}
      </section>

      {/* 6. COMPLETE 6-PRODUCT SERVICE GRID */}
      <section className="sf-section sf-reveal" id="services">
        <h2 className="sf-section-title">Comprehensive Pest Treatment Suite</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {serviceGrid.map((item, idx) => (
            <div key={idx} style={{ background: '#ffffff', borderRadius: '20px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ background: '#e9f7fd', color: '#159bd3', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase' }}>{item.badge}</span>
                  <Zap size={16} style={{ color: '#159bd3' }} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#063d59', marginBottom: '8px' }}>{item.title}</h3>
                <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.6', margin: 0 }}>{item.desc}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                <a href={item.link} style={{ color: '#159bd3', fontWeight: 700, fontSize: '13.5px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  View Full Details <ArrowRight size={14} />
                </a>
                <button onClick={() => setBookingModalOpen(true)} style={{ background: '#063d59', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                  Book Treatment
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. WHY CHOOSE TECH HOUSE (6 PILLARS) */}
      <section className="sf-section sf-reveal" style={{ background: '#f8fafc', borderRadius: '24px', padding: '40px' }}>
        <h2 className="sf-section-title">Why Tech House Pest Control?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <Award size={28} style={{ color: '#159bd3', marginBottom: '12px' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#063d59' }}>100% CIB Approved Chemicals</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>We strictly use government registered, low-toxicity formulations from Bayer and Syngenta.</p>
          </div>

          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <ShieldCheck size={28} style={{ color: '#10b981', marginBottom: '12px' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#063d59' }}>Zero Kitchen Cabinet Emptying</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>Advanced odourless gel baiting allows treatment without removing utensils or food items.</p>
          </div>

          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <User size={28} style={{ color: '#38bdf8', marginBottom: '12px' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#063d59' }}>Certified Technicians</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>Field staff undergo 120+ hours of pest biology training and background verification.</p>
          </div>

          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <Calendar size={28} style={{ color: '#818cf8', marginBottom: '12px' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#063d59' }}>365 Days Service Warranty</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>Our AMC plans include unlimited free complaint callouts whenever pests recur.</p>
          </div>
        </div>
      </section>

      {/* 8. COMMERCIAL VS RESIDENTIAL SECTORS */}
      <section className="sf-section sf-reveal" id="sectors">
        <h2 className="sf-section-title">Customized Sector Solutions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {sectors.map((sec, idx) => (
            <div key={idx} style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <Building2 size={24} style={{ color: '#159bd3', shrink: 0 }} />
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: '#063d59', fontSize: '15px' }}>{sec.title}</h4>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: '1.5' }}>{sec.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 9. 4-STEP METHODOLOGY */}
      <section className="sf-section sf-reveal">
        <h2 className="sf-section-title">Our 4-Step Scientific Eradication Process</h2>
        <div className="sf-process-grid">
          <div className="sf-process-card">
            <span className="sf-step-num">01</span>
            <h3>Inspect & Diagnose</h3>
            <p>Thermal diagnostics identify pest nesting hotspots and moisture breeding zones.</p>
          </div>
          <div className="sf-process-card">
            <span className="sf-step-num">02</span>
            <h3>Target Knockdown</h3>
            <p>Blitz Intensive spray knocks down active adult pests on contact along baseboards.</p>
          </div>
          <div className="sf-process-card">
            <span className="sf-step-num">03</span>
            <h3>Domino Cascade Gel</h3>
            <p>Odourless gel points destroy hidden queen colonies deep within crevices.</p>
          </div>
          <div className="sf-process-card">
            <span className="sf-step-num">04</span>
            <h3>Shield & Monitor</h3>
            <p>Quarterly re-treatment audits ensure 365 days of complete pest-free protection.</p>
          </div>
        </div>
      </section>

      {/* 10. HERITAGE & SCALE NUMBERS */}
      <section className="sf-reveal" style={{ background: '#063d59', padding: '50px 24px', color: '#fff', borderRadius: '24px', margin: '40px auto', maxWidth: '1280px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', textAlign: 'center' }}>
          <div>
            <span style={{ fontSize: '42px', fontWeight: 900, color: '#38bdf8' }}>25+</span>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#92c4db' }}>Years Industry Experience</p>
          </div>
          <div>
            <span style={{ fontSize: '42px', fontWeight: 900, color: '#38bdf8' }}>250+</span>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#92c4db' }}>Local Branch Hubs</p>
          </div>
          <div>
            <span style={{ fontSize: '42px', fontWeight: 900, color: '#10b981' }}>50L+</span>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#92c4db' }}>Satisfied Homes & Businesses</p>
          </div>
          <div>
            <span style={{ fontSize: '42px', fontWeight: 900, color: '#9bd51c' }}>100%</span>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#92c4db' }}>Satisfaction Guarantee</p>
          </div>
        </div>
      </section>

      {/* 11. VERIFIED CUSTOMER TESTIMONIALS */}
      <section className="sf-section sf-reveal">
        <h2 className="sf-section-title">Verified Customer Reviews</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {testimonials.map((t, idx) => (
            <div key={idx} style={{ background: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', gap: '2px', color: '#f59e0b', marginBottom: '12px' }}>
                {[...Array(t.stars)].map((_, i) => (
                  <Star key={i} size={16} fill="#f59e0b" />
                ))}
              </div>
              <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: '1.6', marginBottom: '16px' }}>"{t.comment}"</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                <strong style={{ color: '#063d59' }}>{t.name} ({t.city})</strong>
                <span style={{ color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={13} /> Verified Booking
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 12. CITY COVERAGE LOCATOR */}
      <section className="sf-section sf-reveal" style={{ background: '#ffffff', padding: '40px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
        <h2 className="sf-section-title">Pest Control Services Available Across Major Cities</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
          {cities.map((city, idx) => (
            <span key={idx} style={{ background: '#f1f5f9', color: '#063d59', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={13} style={{ color: '#159bd3' }} /> {city}
            </span>
          ))}
        </div>
      </section>

      {/* 13. FAQS ACCORDION */}
      <section className="sf-section sf-reveal" id="faqs">
        <h2 className="sf-section-title">Frequently Asked Questions</h2>
        <div className="sf-faq-list">
          {faqs.map((faq, idx) => (
            <div key={idx} className="sf-faq-item">
              <div className="sf-faq-q" onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}>
                <span>{faq.q}</span>
                {openFaqIndex === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
              {openFaqIndex === idx && <div className="sf-faq-a">{faq.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* 14. COMPREHENSIVE FOOTER & LEGAL LINKS */}
      <StorefrontFooter />

      {/* 15. INSTANT BOOKING MODAL */}
      {bookingModalOpen && (
        <div className="sf-modal-overlay">
          <div className="sf-modal-box">
            <div className="sf-modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
                {bookingSuccess ? 'Booking Confirmed!' : 'Confirm Your Instant Service Booking'}
              </h3>
              <button
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                onClick={() => {
                  setBookingModalOpen(false);
                  setBookingSuccess(null);
                }}
              >
                <X size={20} />
              </button>
            </div>

            {bookingSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                  <CheckCircle2 size={36} />
                </div>
                <h4 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>
                  Booking Reference: {bookingSuccess.bookingRef}
                </h4>
                <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '24px' }}>
                  {bookingSuccess.message} Our regional technician has received your dispatch order.
                </p>
                <button
                  className="sf-btn-book"
                  onClick={() => {
                    setBookingModalOpen(false);
                    setBookingSuccess(null);
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit}>
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', color: '#38bdf8' }}>
                  <strong>Selected Order:</strong> {currentService.name} ({currentAllotment.label} - {sqft} sqft) | Package: {packageType === 'amc' ? '1-Year AMC (3 Visits)' : 'Single Service'} | Total: <strong>₹{grandTotal.toLocaleString('en-IN')}</strong>
                </div>

                <div className="sf-form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    className="sf-form-input"
                    required
                    placeholder="Enter your complete name"
                    value={bookingForm.customerName}
                    onChange={(e) => setBookingForm({ ...bookingForm, customerName: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="sf-form-group">
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      className="sf-form-input"
                      required
                      placeholder="+91 9876543210"
                      value={bookingForm.phone}
                      onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="sf-form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      className="sf-form-input"
                      placeholder="name@gmail.com"
                      value={bookingForm.email}
                      onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="sf-form-group">
                  <label>Complete Property Address *</label>
                  <input
                    type="text"
                    className="sf-form-input"
                    required
                    placeholder="Flat No, Building, Street, Pincode"
                    value={bookingForm.address}
                    onChange={(e) => setBookingForm({ ...bookingForm, address: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="sf-form-group">
                    <label>Preferred Date *</label>
                    <input
                      type="date"
                      className="sf-form-input"
                      required
                      value={bookingForm.preferredDate}
                      onChange={(e) => setBookingForm({ ...bookingForm, preferredDate: e.target.value })}
                    />
                  </div>

                  <div className="sf-form-group">
                    <label>Preferred Time Slot *</label>
                    <select
                      className="sf-form-input"
                      value={bookingForm.preferredTimeSlot}
                      onChange={(e) => setBookingForm({ ...bookingForm, preferredTimeSlot: e.target.value })}
                    >
                      <option value="Morning (9:00 AM - 1:00 PM)">Morning (9:00 AM - 1:00 PM)</option>
                      <option value="Afternoon (1:00 PM - 5:00 PM)">Afternoon (1:00 PM - 5:00 PM)</option>
                      <option value="Evening (5:00 PM - 8:00 PM)">Evening (5:00 PM - 8:00 PM)</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="sf-btn-book" disabled={bookingLoading} style={{ marginTop: '12px' }}>
                  {bookingLoading ? 'Confirming Booking...' : 'CONFIRM BOOKING (PAY ON SERVICE)'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* FLOATING BACK TO TOP BUTTON */}
      <ScrollToTopButton />
    </div>
  );
}
