import { useState } from 'react';
import {
  ShieldCheck,
  Phone,
  CheckCircle2,
  Clock,
  Zap,
  Sparkles,
  ChevronDown,
  ArrowRight,
  User,
  MapPin,
  Calendar,
  X,
} from 'lucide-react';
import { http } from '../../services/http';
import { ScrollToTopButton } from '../../components/ScrollToTopButton';
import { StorefrontFooter } from '../../components/StorefrontFooter';

export function MosquitoServicePage() {
  const [copied, setCopied] = useState(false);
  const [allotment, setAllotment] = useState('2_bhk');
  const [sqft, setSqft] = useState(1000);
  const [packageType, setPackageType] = useState('amc'); // single or amc
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [bookingForm, setBookingForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    timeSlot: 'Morning (9:00 AM - 1:00 PM)',
  });

  const [openFaq, setOpenFaq] = useState(0);

  const copyPromo = () => {
    navigator.clipboard.writeText('PROSPERITY30');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getPrice = () => {
    let base = 1599;
    if (allotment === '1_rk') base = 999;
    if (allotment === '1_bhk') base = 1299;
    if (allotment === '2_bhk') base = 1599;
    if (allotment === '3_bhk') base = 1999;
    if (allotment === '4_bhk') base = 2499;
    if (allotment === '5_bhk') base = 3199;
    if (allotment === 'commercial') base = 4299;

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
        serviceType: 'Mosquito Fogging & Larvicide Barrier',
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
      }
    } catch (err) {
      console.error('Booking failed:', err);
      alert(err.response?.data?.message || 'Failed to submit booking. Please call 1800-212-2125.');
    } finally {
      setSubmitting(false);
    }
  };

  const faqs = [
    {
      q: 'How does 3-way mosquito elimination protect against Dengue and Chikungunya?',
      a: 'We target mosquitoes at all life stages: (1) Thermal cold fogging destroys adult flying mosquitoes instantly, (2) Indoor micro-encapsulated wall spray creates a 30-day repellent landing barrier, and (3) Anti-larval granules neutralize larvae in standing water drains.',
    },
    {
      q: 'Is cold thermal fogging safe for indoor residential spaces?',
      a: 'Yes. Our WHO-recommended water-based cold fogging emits micro-droplets that settle without heavy petrol fumes or oily residues, making it completely safe for indoors after a brief 30-minute ventilation period.',
    },
    {
      q: 'How often should mosquito treatment be conducted during monsoon season?',
      a: 'During monsoon peak breeding months (July to November), we recommend monthly treatments or enrolling in our 1-Year AMC Protection Plan which covers 12 scheduled monthly services.',
    },
    {
      q: 'Does mosquito treatment cover balconies and garden areas?',
      a: 'Yes, our treatment extends to all outdoor perimeter areas including balcony planters, garden foliage, window ledges, and open drain outlets.',
    },
  ];

  return (
    <div className="sf-wrapper">
      {/* STICKY PROMO BAR */}
      <div className="sf-promo-bar">
        <span>Enjoy 30% INSTANT OFF! Your coupon <strong>PROSPERITY30</strong> is automatically applied.</span>
        <button className="sf-promo-code-pill" onClick={copyPromo}>
          <Sparkles size={14} />
          <span>{copied ? 'Copied!' : 'PROSPERITY30'}</span>
        </button>
      </div>

      {/* HEADER NAVBAR */}
      <header className="sf-navbar">
        <a href="/" className="sf-logo">
          <img className="sf-logo-img" src="/tech-house-logo.png" alt="Tech House Pest Control" />
          <div>
            Tech House <span style={{ color: '#38bdf8' }}>Pest Control</span>
          </div>
        </a>

        <ul className="sf-nav-links">
          <li><a href="/" className="sf-nav-link">Home</a></li>
          <li><a href="/#services" className="sf-nav-link">All Services</a></li>
          <li><a href="#fogging-tech" className="sf-nav-link">3-Way Technology</a></li>
          <li><a href="#faqs" className="sf-nav-link">FAQs</a></li>
        </ul>

        <div className="sf-header-actions">
          <a href="tel:18002122125" className="sf-btn-call">
            <Phone size={16} />
            <span>1800-212-2125</span>
          </a>

          <a href="/login" className="sf-btn-login">
            <span>Staff Login</span>
          </a>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="sf-hero" style={{ paddingTop: '36px' }}>
        <div>
          <div className="sf-hero-tag">
            <ShieldCheck size={14} style={{ color: '#159bd3' }} />
            <span>Dengue & Chikungunya Vector Protection</span>
          </div>

          <h1 className="sf-hero-title">
            3-Way Mosquito Cold Fogging & Larvicide Defense
          </h1>

          <p className="sf-hero-sub">
            Protect your family from Aedes and Anopheles mosquitoes with WHO-certified cold fogging, long-lasting indoor wall sprays, and anti-larval water granule treatment.
          </p>

          <div className="sf-risk-grid">
            <div className="sf-risk-card">
              <div className="sf-risk-icon"><Zap size={18} /></div>
              <h4>Cold Thermal Fogging</h4>
              <p>Instant knockdown of adult flying mosquitoes.</p>
            </div>

            <div className="sf-risk-card">
              <div className="sf-risk-icon" style={{ background: '#ecfdf5', color: '#10b981' }}><CheckCircle2 size={18} /></div>
              <h4>30-Day Wall Shield</h4>
              <p>Micro-encapsulated spray prevents indoor landing.</p>
            </div>

            <div className="sf-risk-card">
              <div className="sf-risk-icon" style={{ background: '#eff6ff', color: '#159bd3' }}><Clock size={18} /></div>
              <h4>Anti-Larval Granules</h4>
              <p>Destroys mosquito larvae in stagnant water points.</p>
            </div>
          </div>
        </div>

        {/* CALCULATOR WIDGET */}
        <div id="calculator" className="sf-calc-card">
          <div className="sf-calc-header">
            <h3>Mosquito Defense Calculator</h3>
            <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '12px', color: '#9bd51c' }}>
              30% Coupon Applied
            </span>
          </div>

          <span className="sf-label">Select Premise Allotment</span>
          <div className="sf-allotments-grid">
            {[
              { id: '1_rk', label: '1 RK' },
              { id: '1_bhk', label: '1 BHK' },
              { id: '2_bhk', label: '2 BHK' },
              { id: '3_bhk', label: '3 BHK' },
              { id: '4_bhk', label: '4 BHK' },
              { id: '5_bhk', label: '5 BHK' },
              { id: 'commercial', label: 'Commercial' },
            ].map((btn) => (
              <button
                key={btn.id}
                className={`sf-allotment-btn ${allotment === btn.id ? 'active' : ''}`}
                onClick={() => setAllotment(btn.id)}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <span className="sf-label">Property Area (Sq. Ft.)</span>
          <div className="sf-sqft-box">
            <span className="sf-sqft-input">{sqft} Sq. Ft.</span>
          </div>
          <input
            type="range"
            min="200"
            max="2500"
            step="50"
            value={sqft}
            onChange={(e) => setSqft(Number(e.target.value))}
            className="sf-range-slider"
          />

          <span className="sf-label">Select Treatment Plan</span>
          <div className="sf-plan-grid">
            <div
              className={`sf-plan-card ${packageType === 'single' ? 'active' : ''}`}
              onClick={() => setPackageType('single')}
            >
              <span className="sf-plan-title">Single Fogging Visit</span>
              <span className="sf-plan-desc">1 Intensive Fogging & Spray Service</span>
            </div>

            <div
              className={`sf-plan-card ${packageType === 'amc' ? 'active' : ''}`}
              onClick={() => setPackageType('amc')}
            >
              <span className="sf-plan-tag">Recommended</span>
              <span className="sf-plan-title">1-Year Monsoon AMC</span>
              <span className="sf-plan-desc">12 Monthly Visits + Anti-Larval Cover</span>
            </div>
          </div>

          <div className="sf-price-summary">
            <div className="sf-price-row">
              <span>Standard Base Rate</span>
              <span>₹{prices.subtotal}</span>
            </div>
            <div className="sf-price-row discount">
              <span>Festive Discount (-30%)</span>
              <span>-₹{prices.discount}</span>
            </div>
            <div className="sf-price-row">
              <span>GST Tax (18%)</span>
              <span>+₹{prices.gst}</span>
            </div>
            <div className="sf-price-row grand">
              <span>Final Total Price</span>
              <span style={{ color: '#9bd51c' }}>₹{prices.grandTotal}</span>
            </div>
          </div>

          <button className="sf-btn-book" onClick={() => setShowBookingModal(true)}>
            <span>BOOK MOSQUITO CONTROL NOW</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* 3-WAY FOGGING TECH SECTION */}
      <section id="fogging-tech" className="sf-section">
        <h2 className="sf-section-title">The 3-Way Vector Eradication System</h2>
        <div className="sf-process-grid">
          <div className="sf-process-card">
            <span className="sf-step-num">01</span>
            <h3>ULV Cold Thermal Fogging</h3>
            <p>Emitting high-density micro-fog droplets that penetrate foliage, curtain folds, and dark corners to knock down adult mosquitoes instantly.</p>
          </div>

          <div className="sf-process-card">
            <span className="sf-step-num">02</span>
            <h3>Residual Wall Barrier Spray</h3>
            <p>Applying odourless micro-encapsulated synthetic pyrethroids to walls and balcony ledges, creating a repellent shield that kills mosquitoes on contact.</p>
          </div>

          <div className="sf-process-card">
            <span className="sf-step-num">03</span>
            <h3>Anti-Larval Granule Dosing</h3>
            <p>Treating stagnant water points, flower pot trays, and floor drains with eco-friendly bio-larvicides to halt egg hatching and pupal growth.</p>
          </div>
        </div>
      </section>

      {/* FAQS SECTION */}
      <section id="faqs" className="sf-section">
        <h2 className="sf-section-title">Mosquito Control Frequently Asked Questions</h2>
        <div className="sf-faq-list">
          {faqs.map((faq, idx) => (
            <div key={idx} className="sf-faq-item">
              <div className="sf-faq-q" onClick={() => setOpenFaq(openFaq === idx ? null : idx)}>
                <span>{faq.q}</span>
                <ChevronDown size={18} style={{ transform: openFaq === idx ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
              </div>
              {openFaq === idx && <div className="sf-faq-a">{faq.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* BOOKING MODAL */}
      {showBookingModal && (
        <div className="sf-modal-overlay">
          <div className="sf-modal-box">
            <div className="sf-modal-header">
              <h3 style={{ margin: 0 }}>Confirm Mosquito Service Booking</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowBookingModal(false)}>
                <X size={20} />
              </button>
            </div>

            {bookingSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle2 size={48} style={{ color: '#10b981', marginBottom: '16px' }} />
                <h3>Booking Confirmed Successfully!</h3>
                <p style={{ color: 'var(--sf-text-muted)' }}>
                  Your booking reference code is <strong style={{ color: '#159bd3' }}>{bookingSuccess.bookingId}</strong>. Our technician will visit at your scheduled time.
                </p>
                <button className="sf-btn-book" style={{ marginTop: '20px' }} onClick={() => { setShowBookingModal(false); setBookingSuccess(null); }}>
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit}>
                <div style={{ background: '#e9f7fd', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', color: '#063d59' }}>
                  <strong>Selected Order:</strong> Mosquito Defense ({allotment.toUpperCase().replace('_', ' ')} - {sqft} sqft) | Package: {packageType === 'amc' ? '1-Year Monsoon AMC (12 Visits)' : 'Single Service'} | Total: <strong>₹{prices.grandTotal}</strong>
                </div>

                <div className="sf-form-group">
                  <label>Full Name *</label>
                  <input type="text" required className="sf-form-input" value={bookingForm.name} onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })} placeholder="John Doe" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="sf-form-group">
                    <label>Phone Number *</label>
                    <input type="tel" required className="sf-form-input" value={bookingForm.phone} onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })} placeholder="9876543210" />
                  </div>

                  <div className="sf-form-group">
                    <label>Email Address</label>
                    <input type="email" className="sf-form-input" value={bookingForm.email} onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })} placeholder="name@gmail.com" />
                  </div>
                </div>

                <div className="sf-form-group">
                  <label>Complete Property Address *</label>
                  <input type="text" required className="sf-form-input" value={bookingForm.address} onChange={(e) => setBookingForm({ ...bookingForm, address: e.target.value })} placeholder="Flat 402, Building A..." />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="sf-form-group">
                    <label>Preferred Date *</label>
                    <input type="date" required className="sf-form-input" value={bookingForm.date} onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })} />
                  </div>

                  <div className="sf-form-group">
                    <label>Preferred Time Slot *</label>
                    <select className="sf-form-input" value={bookingForm.timeSlot} onChange={(e) => setBookingForm({ ...bookingForm, timeSlot: e.target.value })}>
                      <option>Morning (9:00 AM - 1:00 PM)</option>
                      <option>Afternoon (1:00 PM - 5:00 PM)</option>
                      <option>Evening (5:00 PM - 8:00 PM)</option>
                    </select>
                  </div>
                </div>

                <button type="submit" disabled={submitting} className="sf-btn-book" style={{ marginTop: '12px' }}>
                  {submitting ? 'Processing Booking...' : 'CONFIRM MOSQUITO CONTROL BOOKING'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <StorefrontFooter />

      {/* FLOATING BACK TO TOP BUTTON */}
      <ScrollToTopButton />
    </div>
  );
}
