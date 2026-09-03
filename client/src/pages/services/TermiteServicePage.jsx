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
  FileText,
} from 'lucide-react';
import { http } from '../../services/http';
import { ScrollToTopButton } from '../../components/ScrollToTopButton';
import { StorefrontFooter } from '../../components/StorefrontFooter';

export function TermiteServicePage() {
  const [copied, setCopied] = useState(false);
  const [allotment, setAllotment] = useState('2_bhk');
  const [sqft, setSqft] = useState(1000);
  const [packageType, setPackageType] = useState('amc'); // single or amc (3-Year Warranty)
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
    let base = 2699;
    if (allotment === '1_rk') base = 1699;
    if (allotment === '1_bhk') base = 2099;
    if (allotment === '2_bhk') base = 2699;
    if (allotment === '3_bhk') base = 3399;
    if (allotment === '4_bhk') base = 4199;
    if (allotment === '5_bhk') base = 5499;
    if (allotment === 'commercial') base = 6999;

    let subtotal = packageType === 'amc' ? Math.round(base * 2.5) : base;
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
        serviceType: 'Termite Drill-Fill-Seal Barrier',
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
      q: 'What is the Drill-Fill-Seal method for termite treatment?',
      a: 'Technicians drill small 45-degree angle holes at 1-foot intervals along the junction of walls and floors, inject odourless termiticide deep into the foundation to kill subterranean colonies, and seal the holes with color-matched cement plugs.',
    },
    {
      q: 'Does anti-termite treatment harm wooden furniture or tiles?',
      a: 'Not at all. We drill precise micro-holes that preserve structural aesthetics. The non-repellent termiticide binds permanently to soil and masonry without staining or damaging flooring.',
    },
    {
      q: 'What is included in the 3-Year Anti-Termite Warranty?',
      a: 'The 3-Year Structural Warranty provides total property coverage. If any fresh termite activity or mud tubes appear during the 3-year period, our team provides 100% free re-treatment callouts.',
    },
    {
      q: 'How do I know if my property has a termite infestation?',
      a: 'Common warning signs include hollow-sounding wooden doors, discarded translucent wings near windows, papery mud tubes along walls, and fine wood dust beneath furniture.',
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
          <li><a href="#drill-fill-seal" className="sf-nav-link">Drill-Fill-Seal Tech</a></li>
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
            <span>3-Year & 5-Year Structural Termite Warranty</span>
          </div>

          <h1 className="sf-hero-title">
            Drill-Fill-Seal Subterranean Termite Protection
          </h1>

          <p className="sf-hero-sub">
            Stop silent wood destroyers before they ruin your furniture and doors. Our Imidacloprid chemical barrier destroys underground colonies at their source with zero foul odor.
          </p>

          <div className="sf-risk-grid">
            <div className="sf-risk-card">
              <div className="sf-risk-icon"><Zap size={18} /></div>
              <h4>Drill-Fill-Seal</h4>
              <p>Deep foundation injection kills hidden queen colonies.</p>
            </div>

            <div className="sf-risk-card">
              <div className="sf-risk-icon" style={{ background: '#ecfdf5', color: '#10b981' }}><CheckCircle2 size={18} /></div>
              <h4>3-Year Warranty</h4>
              <p>Free re-treatment callouts for the entire 3-year term.</p>
            </div>

            <div className="sf-risk-card">
              <div className="sf-risk-icon" style={{ background: '#eff6ff', color: '#159bd3' }}><Clock size={18} /></div>
              <h4>Bi-Annual Audits</h4>
              <p>Complimentary annual mud tube inspection visits.</p>
            </div>
          </div>
        </div>

        {/* CALCULATOR WIDGET */}
        <div id="calculator" className="sf-calc-card">
          <div className="sf-calc-header">
            <h3>Termite Protection Calculator</h3>
            <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '12px', color: '#9bd51c' }}>
              30% Coupon Applied
            </span>
          </div>

          <span className="sf-label">Select Property Size</span>
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

          <span className="sf-label">Select Warranty Plan</span>
          <div className="sf-plan-grid">
            <div
              className={`sf-plan-card ${packageType === 'single' ? 'active' : ''}`}
              onClick={() => setPackageType('single')}
            >
              <span className="sf-plan-title">1-Year Plan</span>
              <span className="sf-plan-desc">1 Drill-Fill Treatment + 1 Year Cover</span>
            </div>

            <div
              className={`sf-plan-card ${packageType === 'amc' ? 'active' : ''}`}
              onClick={() => setPackageType('amc')}
            >
              <span className="sf-plan-tag">Best Value</span>
              <span className="sf-plan-title">3-Year Warranty Plan</span>
              <span className="sf-plan-desc">3 Years Coverage + Free Audits</span>
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
            <span>BOOK TERMITE TREATMENT NOW</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* DRILL-FILL-SEAL SECTION */}
      <section id="drill-fill-seal" className="sf-section">
        <h2 className="sf-section-title">The 3-Step Drill-Fill-Seal Technology</h2>
        <div className="sf-process-grid">
          <div className="sf-process-card">
            <span className="sf-step-num">01</span>
            <h3>Precision Drilling</h3>
            <p>Technicians drill micro-holes at 45° angles along wall-floor junctions and wooden doorframes without causing structural damage.</p>
          </div>

          <div className="sf-process-card">
            <span className="sf-step-num">02</span>
            <h3>Chemical Injection</h3>
            <p>Pressurized termiticide emulsion is injected deep into walls and subterranean soil layers, establishing a non-repellent lethal barrier.</p>
          </div>

          <div className="sf-process-card">
            <span className="sf-step-num">03</span>
            <h3>Seamless Plug Sealing</h3>
            <p>Holes are sealed with color-matched waterproof cement plugs, leaving your flooring clean, aesthetic, and completely protected.</p>
          </div>
        </div>
      </section>

      {/* FAQS SECTION */}
      <section id="faqs" className="sf-section">
        <h2 className="sf-section-title">Termite Control Frequently Asked Questions</h2>
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
              <h3 style={{ margin: 0 }}>Confirm Termite Service Booking</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowBookingModal(false)}>
                <X size={20} />
              </button>
            </div>

            {bookingSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle2 size={48} style={{ color: '#10b981', marginBottom: '16px' }} />
                <h3>Booking Confirmed Successfully!</h3>
                <p style={{ color: 'var(--sf-text-muted)' }}>
                  Your booking reference code is <strong style={{ color: '#159bd3' }}>{bookingSuccess.bookingId}</strong>. Our termite expert will visit for inspection.
                </p>
                <button className="sf-btn-book" style={{ marginTop: '20px' }} onClick={() => { setShowBookingModal(false); setBookingSuccess(null); }}>
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit}>
                <div style={{ background: '#e9f7fd', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', color: '#063d59' }}>
                  <strong>Selected Order:</strong> Termite Protection ({allotment.toUpperCase().replace('_', ' ')} - {sqft} sqft) | Package: {packageType === 'amc' ? '3-Year Warranty Plan' : '1-Year Plan'} | Total: <strong>₹{prices.grandTotal}</strong>
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
                  {submitting ? 'Processing Booking...' : 'CONFIRM TERMITE INSPECTION & SERVICE'}
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
