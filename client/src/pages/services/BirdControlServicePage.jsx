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

export function BirdControlServicePage() {
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
    let base = 2499;
    if (allotment === '1_rk') base = 1499;
    if (allotment === '1_bhk') base = 1999;
    if (allotment === '2_bhk') base = 2499;
    if (allotment === '3_bhk') base = 3199;
    if (allotment === '4_bhk') base = 3999;
    if (allotment === '5_bhk') base = 4999;
    if (allotment === 'commercial') base = 6499;

    let subtotal = packageType === 'amc' ? Math.round(base * 1.9) : base;
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
        serviceType: 'Bird Netting & Spike Installation',
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
      q: 'Why should I install Garware HDPE bird netting on my balcony?',
      a: 'Pigeons carry over 60 transferable pathogens including Histoplasmosis and Salmonella in dry droppings. Our high-tensile Garware HDPE nets block pigeons completely without hurting birds or blocking natural light and ventilation.',
    },
    {
      q: 'Are the bird nets visible from outside or will they ruin building aesthetics?',
      a: 'Our translucent white and dark black 1mm monofilament nets are virtually invisible from ground level, preserving exterior building architecture while keeping balconies 100% pigeon-free.',
    },
    {
      q: 'How are stainless steel bird spikes installed on window ledges and AC units?',
      a: 'We use SS304 grade stainless steel spikes mounted on UV-resistant polycarbonate bases. They are fixed permanently using weatherproof outdoor silicone adhesive and wire ties, preventing birds from landing or nesting.',
    },
    {
      q: 'What is covered under the 3-Year Anti-Bird Netting Warranty?',
      a: 'Our 3-Year Netting Warranty guarantees net tension, UV degradation resistance, and stainless steel anchor hook stability. If any net sags or tears due to natural weathering, we replace it free of charge.',
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
          <li><a href="#netting-tech" className="sf-nav-link">Garware Net Tech</a></li>
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
            <span>3-Year Garware Netting & SS304 Spike Warranty</span>
          </div>

          <h1 className="sf-hero-title">
            Humane Pigeon & Bird Netting Balcony Protection
          </h1>

          <p className="sf-hero-sub">
            Keep balconies, window ledges, and AC units clean and hygienic. High-tensile UV-stabilized Garware HDPE netting and stainless steel anti-roosting spikes installed with zero structural damage.
          </p>

          <div className="sf-risk-grid">
            <div className="sf-risk-card">
              <div className="sf-risk-icon"><Zap size={18} /></div>
              <h4>Garware HDPE Netting</h4>
              <p>UV-stabilized high-tensile translucent netting.</p>
            </div>

            <div className="sf-risk-card">
              <div className="sf-risk-icon" style={{ background: '#ecfdf5', color: '#10b981' }}><CheckCircle2 size={18} /></div>
              <h4>SS304 Bird Spikes</h4>
              <p>Non-harmful spikes prevent landing on AC ledges.</p>
            </div>

            <div className="sf-risk-card">
              <div className="sf-risk-icon" style={{ background: '#eff6ff', color: '#159bd3' }}><Clock size={18} /></div>
              <h4>3-Year Warranty</h4>
              <p>Free net tensioning and replacement coverage.</p>
            </div>
          </div>
        </div>

        {/* CALCULATOR WIDGET */}
        <div id="calculator" className="sf-calc-card">
          <div className="sf-calc-header">
            <h3>Bird Netting Calculator</h3>
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

          <span className="sf-label">Select Netting Option</span>
          <div className="sf-plan-grid">
            <div
              className={`sf-plan-card ${packageType === 'single' ? 'active' : ''}`}
              onClick={() => setPackageType('single')}
            >
              <span className="sf-plan-title">Balcony Netting</span>
              <span className="sf-plan-desc">Garware Net Installation for 1 Main Balcony</span>
            </div>

            <div
              className={`sf-plan-card ${packageType === 'amc' ? 'active' : ''}`}
              onClick={() => setPackageType('amc')}
            >
              <span className="sf-plan-tag">Recommended</span>
              <span className="sf-plan-title">Full Home & Duct Cover</span>
              <span className="sf-plan-desc">All Balconies + Window Spikes + 3-Year Warranty</span>
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
            <span>BOOK BIRD NETTING NOW</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* NETTING TECH SECTION */}
      <section id="netting-tech" className="sf-section">
        <h2 className="sf-section-title">Garware Quality & Precision Installation</h2>
        <div className="sf-process-grid">
          <div className="sf-process-card">
            <span className="sf-step-num">01</span>
            <h3>SS304 Anchor Hook Framing</h3>
            <p>Technicians secure stainless steel SS304 corner hooks along balcony walls using weatherproof rawl plugs to create a rigid border wire frame.</p>
          </div>

          <div className="sf-process-card">
            <span className="sf-step-num">02</span>
            <h3>Garware High-Tensile Netting</h3>
            <p>1mm UV-treated Garware HDPE monofilament netting is stretched taut across the wire frame, fastened with stainless steel hog-ring staples.</p>
          </div>

          <div className="sf-process-card">
            <span className="sf-step-num">03</span>
            <h3>SS Anti-Roosting Spikes</h3>
            <p>Installing polycarbonate base SS304 spikes on AC outdoor compressors, parapets, and window ledges to prevent pigeon roosting and bird droppings.</p>
          </div>
        </div>
      </section>

      {/* FAQS SECTION */}
      <section id="faqs" className="sf-section">
        <h2 className="sf-section-title">Bird Control Frequently Asked Questions</h2>
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
              <h3 style={{ margin: 0 }}>Confirm Bird Control Service Booking</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowBookingModal(false)}>
                <X size={20} />
              </button>
            </div>

            {bookingSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle2 size={48} style={{ color: '#10b981', marginBottom: '16px' }} />
                <h3>Booking Confirmed Successfully!</h3>
                <p style={{ color: 'var(--sf-text-muted)' }}>
                  Your booking reference code is <strong style={{ color: '#159bd3' }}>{bookingSuccess.bookingId}</strong>. Our bird netting technician will visit for measurement and installation.
                </p>
                <button className="sf-btn-book" style={{ marginTop: '20px' }} onClick={() => { setShowBookingModal(false); setBookingSuccess(null); }}>
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit}>
                <div style={{ background: '#e9f7fd', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', color: '#063d59' }}>
                  <strong>Selected Order:</strong> Bird Netting & Spikes ({allotment.toUpperCase().replace('_', ' ')} - {sqft} sqft) | Package: {packageType === 'amc' ? 'Full Home & Duct Cover + 3-Yr Warranty' : 'Balcony Netting'} | Total: <strong>₹{prices.grandTotal}</strong>
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
                  {submitting ? 'Processing Booking...' : 'CONFIRM BIRD NETTING INSTALLATION'}
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
