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

export function BedBugServicePage() {
  const [copied, setCopied] = useState(false);
  const [allotment, setAllotment] = useState('2_bhk');
  const [sqft, setSqft] = useState(1000);
  const [packageType, setPackageType] = useState('amc'); // single or amc (2-Session 90-Day Guarantee)
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
    let base = 2199;
    if (allotment === '1_rk') base = 1399;
    if (allotment === '1_bhk') base = 1799;
    if (allotment === '2_bhk') base = 2199;
    if (allotment === '3_bhk') base = 2799;
    if (allotment === '4_bhk') base = 3499;
    if (allotment === '5_bhk') base = 4499;
    if (allotment === 'commercial') base = 5799;

    let subtotal = packageType === 'amc' ? Math.round(base * 1.8) : base;
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
        serviceType: 'Bed Bug Thermal & Spray Eradication',
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
      q: 'Why does bed bug control require a 2-session treatment protocol?',
      a: 'Bed bug eggs are shielded by a hard chitin shell that resists initial spray treatments. A second targeted session conducted 15 days later destroys newly hatched nymphs before they reach reproductive maturity, guaranteeing 100% eradication.',
    },
    {
      q: 'Do I need to throw away my mattresses or bedsheets?',
      a: 'No! Throwing away mattresses is unnecessary and expensive. Our specialized thermal steam treatment and synthetic pyrethroids penetrate mattress seams, bedframes, and headboards safely without damaging fabrics.',
    },
    {
      q: 'How should I prepare my home before the bed bug service?',
      a: 'Strip bedsheets, pillowcases, and duvet covers and wash them in hot water. Clear clutter from around beds and wardrobes to allow technicians complete access to skirting boards and bed frames.',
    },
    {
      q: 'What is covered under the 90-Day Bed Bug Guarantee?',
      a: 'If any bed bug activity or bites persist after the 2-session protocol during the 90-day guarantee period, our team provides 100% free re-treatment visits until your home is completely bug-free.',
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
          <li><a href="#thermal-tech" className="sf-nav-link">Thermal & Spray Tech</a></li>
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
            <span>90-Day Eradication Guarantee & 2-Session Cycle</span>
          </div>

          <h1 className="sf-hero-title">
            Intensive Bed Bug Thermal & Spray Eradication
          </h1>

          <p className="sf-hero-sub">
            Say goodbye to sleepless nights and painful bites. Our 2-session thermal steam and synthetic pyrethroid treatment destroys bed bugs, nymphs, and egg clusters deep inside mattresses and bedframes.
          </p>

          <div className="sf-risk-grid">
            <div className="sf-risk-card">
              <div className="sf-risk-icon"><Zap size={18} /></div>
              <h4>2-Session Protocol</h4>
              <p>Destroys adult bugs and newly hatched egg nymphs.</p>
            </div>

            <div className="sf-risk-card">
              <div className="sf-risk-icon" style={{ background: '#ecfdf5', color: '#10b981' }}><CheckCircle2 size={18} /></div>
              <h4>90-Day Guarantee</h4>
              <p>Free re-treatment callouts for total peace of mind.</p>
            </div>

            <div className="sf-risk-card">
              <div className="sf-risk-icon" style={{ background: '#eff6ff', color: '#159bd3' }}><Clock size={18} /></div>
              <h4>No Furniture Loss</h4>
              <p>Mattress & furniture fabric safe formula.</p>
            </div>
          </div>
        </div>

        {/* CALCULATOR WIDGET */}
        <div id="calculator" className="sf-calc-card">
          <div className="sf-calc-header">
            <h3>Bed Bug Removal Calculator</h3>
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

          <span className="sf-label">Select Service Guarantee</span>
          <div className="sf-plan-grid">
            <div
              className={`sf-plan-card ${packageType === 'single' ? 'active' : ''}`}
              onClick={() => setPackageType('single')}
            >
              <span className="sf-plan-title">Single Session</span>
              <span className="sf-plan-desc">1 Intensive Thermal & Spray Knockdown</span>
            </div>

            <div
              className={`sf-plan-card ${packageType === 'amc' ? 'active' : ''}`}
              onClick={() => setPackageType('amc')}
            >
              <span className="sf-plan-tag">Recommended</span>
              <span className="sf-plan-title">2-Session 90-Day Plan</span>
              <span className="sf-plan-desc">2 Visits (15 Days Apart) + 90 Day Warranty</span>
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
            <span>BOOK BED BUG TREATMENT NOW</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* THERMAL TECH SECTION */}
      <section id="thermal-tech" className="sf-section">
        <h2 className="sf-section-title">Comprehensive 2-Session Eradication Process</h2>
        <div className="sf-process-grid">
          <div className="sf-process-card">
            <span className="sf-step-num">01</span>
            <h3>Deep Mattress & Frame Injection</h3>
            <p>Technicians inspect mattress tufts, headboard seams, electrical outlets, and wardrobe crevices, injecting high-penetration odourless formulations.</p>
          </div>

          <div className="sf-process-card">
            <span className="sf-step-num">02</span>
            <h3>Super-Heated Steam Treatment</h3>
            <p>Deploying 180°C thermal dry steam along bedsprings and carpet perimeters to instantly kill heat-sensitive adult bed bugs and egg pods.</p>
          </div>

          <div className="sf-process-card">
            <span className="sf-step-num">03</span>
            <h3>15-Day Follow-Up Knockdown</h3>
            <p>Session 2 is conducted 15 days later to eliminate newly hatched nymphs, breaking the breeding cycle and guaranteeing 90 days of complete relief.</p>
          </div>
        </div>
      </section>

      {/* FAQS SECTION */}
      <section id="faqs" className="sf-section">
        <h2 className="sf-section-title">Bed Bug Removal Frequently Asked Questions</h2>
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
              <h3 style={{ margin: 0 }}>Confirm Bed Bug Service Booking</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowBookingModal(false)}>
                <X size={20} />
              </button>
            </div>

            {bookingSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle2 size={48} style={{ color: '#10b981', marginBottom: '16px' }} />
                <h3>Booking Confirmed Successfully!</h3>
                <p style={{ color: 'var(--sf-text-muted)' }}>
                  Your booking reference code is <strong style={{ color: '#159bd3' }}>{bookingSuccess.bookingId}</strong>. Our bed bug specialist will contact you shortly.
                </p>
                <button className="sf-btn-book" style={{ marginTop: '20px' }} onClick={() => { setShowBookingModal(false); setBookingSuccess(null); }}>
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit}>
                <div style={{ background: '#e9f7fd', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', color: '#063d59' }}>
                  <strong>Selected Order:</strong> Bed Bug Eradication ({allotment.toUpperCase().replace('_', ' ')} - {sqft} sqft) | Package: {packageType === 'amc' ? '2-Session 90-Day Guarantee' : 'Single Session'} | Total: <strong>₹{prices.grandTotal}</strong>
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
                  {submitting ? 'Processing Booking...' : 'CONFIRM BED BUG SERVICE BOOKING'}
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
