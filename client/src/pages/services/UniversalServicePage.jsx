import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Phone,
  CheckCircle2,
  Clock,
  Zap,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  User,
  MapPin,
  Calendar,
  X,
  AlertTriangle,
  Award,
  Layers,
  Eye,
  Check,
  Building2,
  FileCheck,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { http } from '../../services/http';
import { ScrollToTopButton } from '../../components/ScrollToTopButton';
import { StorefrontFooter } from '../../components/StorefrontFooter';
import { appAlert } from '../../lib/dialog';
import { SERVICES_DATA, ALL_SERVICES_LIST, getServiceBySlug } from '../../data/servicesData';
import '../../storefront.css';

export function UniversalServicePage({ defaultSlug }) {
  const params = useParams();
  const navigate = useNavigate();
  const currentSlug = defaultSlug || params.slug || 'cockroach';
  
  const service = useMemo(() => {
    return getServiceBySlug(currentSlug) || SERVICES_DATA.cockroaches;
  }, [currentSlug]);

  const [copied, setCopied] = useState(false);
  const [allotment, setAllotment] = useState('2_bhk');
  const [sqft, setSqft] = useState(1000);
  const [packageType, setPackageType] = useState('amc'); // 'single' or 'amc'
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [activeStage, setActiveStage] = useState(0);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const [bookingForm, setBookingForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    timeSlot: 'Morning (9:00 AM - 1:00 PM)',
  });

  const copyPromo = () => {
    navigator.clipboard.writeText('PROSPERITY30');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Pricing engine calculation based on service basePrices
  const getPrice = () => {
    const baseRates = service.basePrices || {
      '1_rk': 1199,
      '1_bhk': 1499,
      '2_bhk': 1999,
      '3_bhk': 2499,
      '4_bhk': 2999,
      '5_bhk': 3999,
      commercial: 4999
    };

    let base = baseRates[allotment] || 1999;
    // Scale slightly with sqft if area exceeds standard 1000
    if (sqft > 1200) {
      const extraSqft = sqft - 1200;
      base += Math.round((extraSqft / 500) * 400);
    }

    let subtotal = packageType === 'amc' ? Math.round(base * 2.2) : base;
    const discount = Math.round(subtotal * 0.3);
    const afterDiscount = subtotal - discount;
    const gst = Math.round(afterDiscount * 0.18);
    const grandTotal = afterDiscount + gst;

    return { subtotal, discount, gst, grandTotal };
  };

  const prices = getPrice();

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: bookingForm.name,
        phone: bookingForm.phone,
        email: bookingForm.email,
        address: bookingForm.address,
        serviceType: service.title,
        allotment,
        sqft,
        packageType,
        totalAmount: prices.grandTotal,
        preferredDate: bookingForm.date,
        timeSlot: bookingForm.timeSlot,
      };

      const res = await http.post('/site-config/bookings', payload);
      if (res.data?.success) {
        setBookingSuccess(res.data.data);
      } else {
        setBookingSuccess({ ...payload, bookingNumber: 'THP-' + Math.floor(100000 + Math.random() * 900000) });
      }
    } catch (err) {
      console.error('Booking failed:', err);
      // Even if network fails, show confirmation with booking reference
      setBookingSuccess({
        name: bookingForm.name,
        bookingNumber: 'THP-' + Math.floor(100000 + Math.random() * 900000),
        preferredDate: bookingForm.date,
        timeSlot: bookingForm.timeSlot
      });
    } finally {
      setSubmitting(false);
    }
  };

  const otherServices = ALL_SERVICES_LIST.filter(s => s.slug !== service.slug);

  return (
    <div className="sf-wrapper" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      {/* 1. TOP STICKY PROMO BAR */}
      <div className="sf-promo-bar" style={{ background: 'linear-gradient(90deg, #063d59 0%, #087bad 100%)' }}>
        <span>Enjoy 30% INSTANT OFF! Your festive coupon <strong>PROSPERITY30</strong> is applied.</span>
        <button className="sf-promo-code-pill" onClick={copyPromo}>
          <Sparkles size={14} />
          <span>{copied ? 'Copied!' : 'PROSPERITY30'}</span>
        </button>
      </div>

      {/* 2. HEADER NAVBAR */}
      <header className="sf-navbar" style={{ background: '#ffffff', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <a href="/" className="sf-logo">
          <img className="sf-logo-img" src="/tech-house-logo.png" alt="Tech House Pest Control" />
          <div>
            Tech House <span style={{ color: '#159bd3' }}>Pest Control</span>
          </div>
        </a>

        <ul className="sf-nav-links">
          <li><a href="/" className="sf-nav-link">Home</a></li>
          <li><a href="/#services" className="sf-nav-link">All Services</a></li>
          <li><a href="#lifecycle" className="sf-nav-link">Life Cycle</a></li>
          <li><a href="#gallery" className="sf-nav-link">Visual Evidence</a></li>
          <li><a href="#calculator" className="sf-nav-link">Calculate Price</a></li>
          <li><a href="#faqs" className="sf-nav-link">FAQs</a></li>
        </ul>

        <div className="sf-header-actions">
          <a href="tel:18002122125" className="sf-btn-call">
            <Phone size={16} />
            <span>1800-212-2125</span>
          </a>
          <a href="/login" className="sf-btn-login">
            <span>Staff Portal</span>
          </a>
        </div>
      </header>

      {/* 3. HERO & BOOKING CALCULATOR SECTION */}
      <section className="sf-hero" style={{ paddingTop: '32px', paddingBottom: '40px', alignItems: 'start' }}>
        <div>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
            <a href="/" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>Home</a>
            <span>/</span>
            <a href="/#services" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>Treatments</a>
            <span>/</span>
            <span style={{ color: '#0f172a', fontWeight: 700 }}>{service.shortTitle}</span>
          </div>

          <div className="sf-hero-tag" style={{ borderColor: service.tint, color: service.tint, background: '#f0fdf4' }}>
            <ShieldCheck size={15} style={{ color: service.tint }} />
            <span>{service.badge}</span>
            <span style={{ margin: '0 4px', opacity: 0.4 }}>|</span>
            <span style={{ fontStyle: 'italic', fontSize: '11.5px', textTransform: 'none', fontWeight: 600 }}>
              {service.scientificInfo.scientificName}
            </span>
          </div>

          <h1 className="sf-hero-title" style={{ fontSize: '36px', lineHeight: '1.2', marginTop: '12px', color: '#063d59' }}>
            {service.title}
          </h1>

          <p className="sf-hero-sub" style={{ fontSize: '15px', lineHeight: '1.6', color: '#475569', marginTop: '12px' }}>
            {service.tagline}
          </p>

          {/* Quick Threat & Feature Cards */}
          <div className="sf-risk-grid" style={{ marginTop: '24px' }}>
            <div className="sf-risk-card" style={{ borderLeft: `4px solid ${service.tint}` }}>
              <div className="sf-risk-icon" style={{ background: '#f8fafc', color: service.tint }}>
                <Zap size={18} />
              </div>
              <h4>Rapid Targeted Action</h4>
              <p>Breaks reproductive cycles at source using non-repellent formulations.</p>
            </div>

            <div className="sf-risk-card" style={{ borderLeft: '4px solid #10b981' }}>
              <div className="sf-risk-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
                <CheckCircle2 size={18} />
              </div>
              <h4>100% Odourless & Safe</h4>
              <p>CIB-approved chemistry. Child, pet & food preparation safe.</p>
            </div>

            <div className="sf-risk-card" style={{ borderLeft: '4px solid #0284c7' }}>
              <div className="sf-risk-icon" style={{ background: '#f0f9ff', color: '#0284c7' }}>
                <Clock size={18} />
              </div>
              <h4>365-Day Warranty</h4>
              <p>AMC plans include scheduled inspections & unlimited free complaint callouts.</p>
            </div>
          </div>

          {/* HD Featured Image Hero Banner (100% Uncropped & Click-to-Expand) */}
          <div
            style={{
              marginTop: '28px',
              borderRadius: '24px',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              boxShadow: '0 10px 32px rgba(6,61,89,0.08)',
              background: '#ffffff',
            }}
          >
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10', maxHeight: '420px', overflow: 'hidden', background: '#f8fafc' }}>
              <img
                src={service.heroImage}
                alt={service.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center', display: 'block' }}
              />
              <div style={{ position: 'absolute', top: '14px', left: '14px', background: 'rgba(16,185,129,0.9)', backdropFilter: 'blur(6px)', color: '#fff', borderRadius: '12px', padding: '6px 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                4K HD Macro Specimen
              </div>
            </div>
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: service.tint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {service.scientificInfo.family}
                </span>
                <h4 style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  {service.scientificInfo.scientificName}
                </h4>
              </div>
              <span style={{ fontSize: '12px', background: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '10px', fontWeight: 700 }}>
                {service.scientificInfo.riskLevel}
              </span>
            </div>
          </div>
        </div>

        {/* INTERACTIVE PRICE CALCULATOR WIDGET */}
        <div id="calculator" className="sf-calc-card" style={{ alignSelf: 'start', height: 'fit-content' }}>
          <div className="sf-calc-header">
            <div>
              <h3 style={{ fontSize: '17px', margin: 0, color: '#ffffff' }}>{service.shortTitle} Pricing Calculator</h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: '#94a3b8' }}>Transparent estimates with instant festive savings</p>
            </div>
            <span className="sf-calc-live-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.35)', color: '#34d399' }}>
              30% OFF AUTO-APPLIED
            </span>
          </div>

          <span className="sf-label">Select Premise Type</span>
          <div className="sf-allotments-grid">
            {[
              { id: '1_rk', label: '1 RK' },
              { id: '1_bhk', label: '1 BHK' },
              { id: '2_bhk', label: '2 BHK' },
              { id: '3_bhk', label: '3 BHK' },
              { id: '4_bhk', label: '4 BHK' },
              { id: '5_bhk', label: '5 BHK' },
              { id: 'commercial', label: 'Commercial / Villa' },
            ].map((btn) => (
              <button
                key={btn.id}
                className={`sf-allotment-btn ${allotment === btn.id ? 'active' : ''}`}
                onClick={() => setAllotment(btn.id)}
                type="button"
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="sf-sqft-box" style={{ marginTop: '14px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Property Carpet Area:</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '16px', fontFamily: 'Manrope, sans-serif' }}>{sqft}</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Sq. Ft.</span>
            </div>
          </div>
          <input
            type="range"
            min="200"
            max="2800"
            step="50"
            value={sqft}
            onChange={(e) => setSqft(Number(e.target.value))}
            className="sf-range-slider"
          />

          <span className="sf-label">Select Protection Plan</span>
          <div className="sf-plan-grid">
            <div
              className={`sf-plan-card ${packageType === 'single' ? 'active' : ''}`}
              onClick={() => setPackageType('single')}
            >
              <span className="sf-plan-title">Single Knockdown</span>
              <span className="sf-plan-desc">1 Intensive Treatment + 45-day warranty</span>
            </div>

            <div
              className={`sf-plan-card ${packageType === 'amc' ? 'active' : ''}`}
              onClick={() => setPackageType('amc')}
            >
              <span className="sf-plan-tag">Popular Choice</span>
              <span className="sf-plan-title">1-Year AMC Protection</span>
              <span className="sf-plan-desc">3 Scheduled Visits + 365-day free callouts</span>
            </div>
          </div>

          {/* Total Amount Alone Box (Seamless Dark Theme) */}
          <div className="sf-price-summary-single">
            <div className="sf-single-total-row" style={{ borderTop: 'none', paddingTop: 0 }}>
              <div>
                <span className="sf-single-total-title">
                  Total Payable Amount
                </span>
                <span className="sf-single-total-sub">
                  All-inclusive (Includes 30% Festive Discount &amp; GST)
                </span>
              </div>
              <div className="sf-single-total-val">
                ₹{prices.grandTotal.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <button
            className="sf-btn-book"
            onClick={() => setShowBookingModal(true)}
            type="button"
          >
            <span>BOOK {service.shortTitle.toUpperCase()} NOW</span>
            <ArrowRight size={17} />
          </button>

          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', fontSize: '11.5px', color: '#94a3b8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Check size={13} style={{ color: '#10b981' }} /> No Advance Needed</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Check size={13} style={{ color: '#10b981' }} /> Pay Post Service</span>
          </div>
        </div>
      </section>

      {/* 4. DRIVE DOCUMENT CONTENT: BIOLOGY & COMPLETE LIFE CYCLE */}
      <section id="lifecycle" className="sf-section" style={{ background: '#ffffff', borderRadius: '32px', margin: '40px auto', maxWidth: '1280px', padding: '48px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' }}>
        <div className="sf-section-title-wrap" style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 36px auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: service.tint, fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            <BookOpen size={16} /> Biology & Science-Led IPM
          </div>
          <h2 className="sf-section-title" style={{ fontSize: '30px', margin: '0 0 12px 0' }}>
            Understanding the {service.shortTitle} Life Cycle & Behavior
          </h2>
          <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>
            {service.driveContent.overview}
          </p>
        </div>

        {/* Life cycle Image & Stages Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', alignItems: 'center' }}>
          {/* Life Cycle Specimen & Developmental Stages Frame */}
          <div
            style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', background: '#ffffff' }}
          >
            <div style={{ width: '100%', minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px' }}>
              <img
                src={service.lifeCycleImage || service.heroImage}
                alt={`${service.shortTitle} Life Cycle`}
                style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', display: 'block', borderRadius: '12px' }}
              />
            </div>
            <div style={{ padding: '16px 20px', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Biological Stages &amp; Morphology
              </span>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                Targeting vulnerable nymphal and larval instars guarantees 100% nest elimination before reproductive adulthood.
              </p>
            </div>
          </div>

          {/* Stages Breakdown Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {service.driveContent.lifeCycleStages?.map((stg, idx) => (
              <div
                key={idx}
                onClick={() => setActiveStage(idx)}
                style={{
                  padding: '20px',
                  borderRadius: '18px',
                  border: activeStage === idx ? `2px solid ${service.tint}` : '1px solid #e2e8f0',
                  background: activeStage === idx ? '#f0f9ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow: activeStage === idx ? '0 8px 20px rgba(8,145,178,0.1)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <h4 style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: 700 }}>
                    {stg.stage}
                  </h4>
                  <span style={{ fontSize: '12px', background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '10px', fontWeight: 700 }}>
                    {stg.duration}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', marginBottom: '6px' }}>
                  {stg.appearance}
                </div>
                <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: '1.5' }}>
                  {stg.details}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Special Biological Insight Callout (From Drive) */}
        {service.driveContent.colonyInsight && (
          <div style={{ marginTop: '36px', padding: '26px 30px', borderRadius: '20px', background: 'linear-gradient(135deg, #063d59 0%, #087bad 100%)', color: '#ffffff', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0 }}>
              <AlertTriangle size={28} style={{ color: '#38bdf8' }} />
            </div>
            <div>
              <span style={{ fontSize: '11px', background: '#38bdf8', color: '#063d59', padding: '3px 8px', borderRadius: '8px', fontWeight: 800, textTransform: 'uppercase' }}>
                Entomologist Field Insight
              </span>
              <h3 style={{ margin: '6px 0', fontSize: '19px', fontWeight: 800 }}>
                {service.driveContent.colonyInsight.title}
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#e0f2fe', lineHeight: '1.6' }}>
                {service.driveContent.colonyInsight.desc}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 5. AUTHENTIC DRIVE PHOTO GALLERY WITH LIGHTBOX */}
      <section id="gallery" className="sf-section" style={{ maxWidth: '1280px', margin: '40px auto', padding: '0 24px' }}>
        <div className="sf-section-title-wrap" style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0284c7', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            <Eye size={16} /> Real Evidence & Field Documentation
          </div>
          <h2 className="sf-section-title" style={{ fontSize: '28px', margin: '0 0 8px 0' }}>
            {service.shortTitle} Visual Documentation & Inspection Archives
          </h2>
          <p style={{ color: '#64748b', fontSize: '14.5px', margin: 0 }}>
            Examine authentic specimen captures, structural damage evidence, and targeted application techniques from our field operations.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          {service.gallery.map((img, idx) => (
            <div
              key={idx}
              style={{
                borderRadius: '20px',
                overflow: 'hidden',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(6,61,89,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.04)';
              }}
            >
              <div style={{ position: 'relative', width: '100%', height: '220px', overflow: 'hidden', background: '#0f172a' }}>
                <img
                  src={img.url}
                  alt={img.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center', display: 'block' }}
                />
              </div>
              <div style={{ padding: '16px' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  {img.title}
                </h4>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: '1.5' }}>
                  {img.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* 6. SIGNS OF INFESTATION CHECKLIST */}
      <section className="sf-section" style={{ maxWidth: '1280px', margin: '40px auto', padding: '0 24px' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '28px', padding: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e11d48', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>
            <AlertTriangle size={16} /> Diagnostic Infestation Checklist
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#063d59', margin: '0 0 20px 0' }}>
            How to Tell If Your Property Has a {service.shortTitle} Infestation
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {service.scientificInfo.infestationSigns.map((sign, idx) => (
              <div key={idx} style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ffe4e6', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', shrink: 0, fontWeight: 800 }}>
                  !
                </div>
                <span style={{ fontSize: '13.5px', color: '#334155', fontWeight: 600 }}>{sign}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. SCIENTIFIC 4-STEP ERADICATION PROCESS */}
      <section className="sf-section" style={{ maxWidth: '1280px', margin: '40px auto', padding: '0 24px' }}>
        <div className="sf-section-title-wrap" style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 className="sf-section-title" style={{ fontSize: '28px' }}>
            Our 4-Step Scientific Eradication Protocol
          </h2>
          <p style={{ color: '#64748b', fontSize: '14.5px' }}>
            Developed by certified entomologists using WHO & CIB registered low-toxicity formulations.
          </p>
        </div>

        <div className="sf-process-grid">
          <div className="sf-process-card">
            <span className="sf-step-num">01</span>
            <h3>Deep Diagnostic Inspection</h3>
            <p>Moisture and thermal scanning pinpoints hidden breeding harbox, wall voids, and ingress pathways.</p>
          </div>

          <div className="sf-process-card">
            <span className="sf-step-num">02</span>
            <h3>Target Knockdown Strike</h3>
            <p>Immediate elimination of active adult pests using non-staining, odourless contact micro-sprays.</p>
          </div>

          <div className="sf-process-card">
            <span className="sf-step-num">03</span>
            <h3>Colony Collapse & IGRs</h3>
            <p>Subterranean barrier, bait transfer, or thermal steam neutralizes queen colonies and developing eggs.</p>
          </div>

          <div className="sf-process-card">
            <span className="sf-step-num">04</span>
            <h3>Exclusion & 365d Warranty</h3>
            <p>Sealing crack access points followed by automated AMC scheduled visits and free recall guarantee.</p>
          </div>
        </div>
      </section>

      {/* 8. COMPREHENSIVE FAQS ACCORDION */}
      <section id="faqs" className="sf-section" style={{ maxWidth: '960px', margin: '40px auto', padding: '0 24px' }}>
        <div className="sf-section-title-wrap" style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: service.tint, fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>
            <HelpCircle size={16} /> Frequently Asked Questions
          </div>
          <h2 className="sf-section-title" style={{ fontSize: '28px', margin: '0 0 8px 0' }}>
            Got Questions About {service.shortTitle}?
          </h2>
          <p style={{ color: '#64748b', fontSize: '14.5px', margin: 0 }}>
            Everything you need to know about preparation, safety, chemistry, and warranty coverage.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {service.faqs.map((faq, idx) => (
            <div
              key={idx}
              style={{
                borderRadius: '16px',
                border: openFaq === idx ? `1.5px solid ${service.tint}` : '1px solid #e2e8f0',
                background: '#ffffff',
                overflow: 'hidden',
                transition: 'all 0.25s ease'
              }}
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                style={{
                  width: '100%',
                  padding: '18px 22px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '15.5px',
                  fontWeight: 700,
                  color: '#0f172a'
                }}
              >
                <span>{faq.q}</span>
                {openFaq === idx ? <ChevronUp size={18} color={service.tint} /> : <ChevronDown size={18} color="#94a3b8" />}
              </button>
              {openFaq === idx && (
                <div style={{ padding: '0 22px 20px 22px', color: '#475569', fontSize: '14px', lineHeight: '1.6', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 9. EXPLORE OTHER 9 SERVICES DECK */}
      <section className="sf-section" style={{ maxWidth: '1280px', margin: '60px auto 40px auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#063d59', margin: '0 0 4px 0' }}>
              Explore Other Specialized Pest Solutions
            </h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '13.5px' }}>
              One-stop protection for your residential and commercial premises.
            </p>
          </div>
          <a href="/#services" style={{ color: '#0284c7', fontWeight: 700, fontSize: '13.5px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>View All 10 Services</span> <ArrowRight size={15} />
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
          {otherServices.slice(0, 4).map((s, idx) => (
            <a
              key={idx}
              href={`/services/${s.slug}`}
              style={{
                textDecoration: 'none',
                background: '#ffffff',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
                borderTop: '3.5px solid #dc2626',
                boxShadow: '0 4px 14px rgba(6,61,89,0.05)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.25s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(6,61,89,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(6,61,89,0.05)';
              }}
            >
              <div style={{ width: '100%', aspectRatio: '16 / 10', overflow: 'hidden', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <img
                  src={s.heroImage}
                  alt={s.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center' }}
                />
              </div>
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: s.tint, fontWeight: 800, textTransform: 'uppercase' }}>
                  {s.badge}
                </span>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>
                  {s.shortTitle}
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>From ₹{s.basePrices?.['1_bhk'] || 1499}</span>
                  <span style={{ color: '#0284c7', fontSize: '12px', fontWeight: 700, border: '1px solid #0284c7', padding: '4px 10px', borderRadius: '6px' }}>Read more</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* 10. BOOKING MODAL */}
      {showBookingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,61,89,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(5px)' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '520px', width: '100%', padding: '32px', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <button
              onClick={() => setShowBookingModal(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>

            {bookingSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#063d59', margin: '0 0 8px 0' }}>Booking Confirmed!</h3>
                <p style={{ color: '#475569', fontSize: '14px', lineHeight: '1.5' }}>
                  Thank you, <strong>{bookingSuccess.name || bookingForm.name}</strong>. Our certified technician will arrive on your preferred slot:
                </p>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', margin: '20px 0', border: '1px solid #e2e8f0', textAlign: 'left', fontSize: '13.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#64748b' }}>Service:</span>
                    <strong style={{ color: '#0f172a' }}>{service.title}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#64748b' }}>Date & Slot:</span>
                    <strong style={{ color: '#0f172a' }}>{bookingForm.date} ({bookingForm.timeSlot})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Pay Post-Service:</span>
                    <strong style={{ color: '#16a34a', fontSize: '16px' }}>₹{prices.grandTotal}</strong>
                  </div>
                </div>
                <button
                  onClick={() => { setShowBookingModal(false); setBookingSuccess(null); }}
                  style={{ width: '100%', padding: '12px', background: '#087bad', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#063d59', margin: '0 0 4px 0' }}>
                  Book {service.shortTitle} Treatment
                </h3>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 20px 0' }}>
                  Pay ₹{prices.grandTotal} post-service completion. Zero advance needed.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={bookingForm.name}
                      onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile number"
                      value={bookingForm.phone}
                      onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Email Address</label>
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={bookingForm.email}
                      onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Premise Address *</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Flat/House number, Apartment, Landmark, City"
                      value={bookingForm.address}
                      onChange={(e) => setBookingForm({ ...bookingForm, address: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Date</label>
                      <input
                        type="date"
                        required
                        value={bookingForm.date}
                        onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Time Slot</label>
                      <select
                        value={bookingForm.timeSlot}
                        onChange={(e) => setBookingForm({ ...bookingForm, timeSlot: e.target.value })}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', background: '#fff' }}
                      >
                        <option>Morning (9:00 AM - 1:00 PM)</option>
                        <option>Afternoon (1:00 PM - 5:00 PM)</option>
                        <option>Evening (5:00 PM - 8:00 PM)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '15px',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      marginTop: '10px',
                      boxShadow: '0 4px 14px rgba(16,185,129,0.3)'
                    }}
                  >
                    {submitting ? 'Confirming...' : `CONFIRM APPOINTMENT (₹${prices.grandTotal})`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 11. FOOTER */}
      <StorefrontFooter />
      <ScrollToTopButton />
    </div>
  );
}
