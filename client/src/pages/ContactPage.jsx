import { useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle2 } from 'lucide-react';
import { http } from '../services/http';

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    city: 'Mumbai',
    service: 'Cockroach Control',
    message: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await http.post('/site-config/bookings', {
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: `${form.city} - Inquiry`,
        serviceType: form.service,
        allotment: '1_bhk',
        sqft: 600,
        packageType: 'single',
        totalAmount: 0,
        notes: `[Contact Form Message]: ${form.message}`,
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('Failed to send message. Please call 1800-212-2125 directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sf-wrapper">
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
          <li><a href="/#services" className="sf-nav-link">Services</a></li>
          <li><a href="/about" className="sf-nav-link">About Us</a></li>
          <li><a href="/contact" className="sf-nav-link" style={{ color: '#159bd3', fontWeight: 700 }}>Contact</a></li>
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
          <h1 className="sf-hero-title">Get In Touch With Our Pest Experts</h1>
          <p className="sf-hero-sub">
            Have a question about pest control or need an urgent home inspection? Our 24/7 service desk is ready to help you protect your premises.
          </p>

          <div style={{ display: 'grid', gap: '16px', marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#ffffff', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
              <Phone size={24} style={{ color: '#159bd3' }} />
              <div>
                <strong>Toll-Free Hotline (24/7)</strong>
                <div style={{ color: '#063d59', fontWeight: 700 }}>1800-212-2125</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#ffffff', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
              <Mail size={24} style={{ color: '#10b981' }} />
              <div>
                <strong>Customer Support Email</strong>
                <div style={{ color: '#063d59', fontWeight: 700 }}>care@techhousepest.com</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#ffffff', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
              <MapPin size={24} style={{ color: '#38bdf8' }} />
              <div>
                <strong>Corporate Headquarters</strong>
                <div style={{ color: '#063d59', fontSize: '13px' }}>Tech House Tower, Sector 14, Navi Mumbai, Maharashtra 400703</div>
              </div>
            </div>
          </div>
        </div>

        {/* INQUIRY FORM */}
        <div className="sf-calc-card">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>Request a Free Call-Back</h3>

          {submitted ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <CheckCircle2 size={48} style={{ color: '#10b981', marginBottom: '16px' }} />
              <h3>Message Sent Successfully!</h3>
              <p style={{ color: 'var(--sf-text-muted)', fontSize: '14px' }}>
                Thank you for contacting Tech House. Our local branch officer will call you back within 15 minutes.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="sf-form-group">
                <label>Your Full Name *</label>
                <input type="text" required className="sf-form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="sf-form-group">
                  <label>Phone Number *</label>
                  <input type="tel" required className="sf-form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" />
                </div>
                <div className="sf-form-group">
                  <label>Email Address</label>
                  <input type="email" className="sf-form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="sf-form-group">
                  <label>City *</label>
                  <input type="text" required className="sf-form-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="sf-form-group">
                  <label>Interested Service</label>
                  <select className="sf-form-input" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
                    <option>Cockroach Control</option>
                    <option>Termite Protection</option>
                    <option>Rodent Control</option>
                    <option>Mosquito Control</option>
                    <option>Bed Bug Eradication</option>
                    <option>Bird Netting & Spikes</option>
                  </select>
                </div>
              </div>

              <div className="sf-form-group">
                <label>How can we help you?</label>
                <textarea rows="3" className="sf-form-input" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Describe your pest issue..." />
              </div>

              <button type="submit" disabled={submitting} className="sf-btn-book" style={{ marginTop: '12px' }}>
                {submitting ? 'Sending Request...' : 'SEND CALL-BACK REQUEST'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: '18px' }}>Tech House Pest Control</span>
            <p style={{ fontSize: '13px', color: '#92c4db', margin: '4px 0 0 0' }}>ISO 9001:2026 Certified Pest Eradication Services Across India.</p>
          </div>
          <div style={{ fontSize: '13px', color: '#92c4db' }}>
            © 2026 Tech House Pest Control. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
