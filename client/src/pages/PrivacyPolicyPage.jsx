import { Phone, ShieldCheck } from 'lucide-react';

export function PrivacyPolicyPage() {
  return (
    <div className="sf-wrapper">
      <header className="sf-navbar">
        <a href="/" className="sf-logo">
          <img className="sf-logo-img" src="/tech-house-logo.png" alt="Tech House Pest Control" />
          <div>
            Tech House <span style={{ color: '#38bdf8' }}>Pest Control</span>
          </div>
        </a>
        <ul className="sf-nav-links">
          <li><a href="/" className="sf-nav-link">Home</a></li>
          <li><a href="/about" className="sf-nav-link">About Us</a></li>
          <li><a href="/contact" className="sf-nav-link">Contact</a></li>
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

      <div style={{ maxWidth: '900px', margin: '40px auto', background: '#fff', padding: '40px', borderRadius: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
        <h1 style={{ fontSize: '28px', color: '#063d59', marginBottom: '8px' }}>Privacy Policy</h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Last Updated: January 2026</p>

        <section style={{ display: 'grid', gap: '20px', color: '#334155', lineHeight: '1.7' }}>
          <div>
            <h3 style={{ color: '#063d59', marginBottom: '8px' }}>1. Collection of Customer Information</h3>
            <p>Tech House Pest Control collects customer contact information (Name, Phone Number, Email Address, and Property Address) solely to process pest control bookings, conduct site inspections, and deliver service notifications.</p>
          </div>

          <div>
            <h3 style={{ color: '#063d59', marginBottom: '8px' }}>2. Use of Data & Service Communications</h3>
            <p>Your data is strictly utilized for operational service dispatch, technician scheduling, invoice generation, and customer support. We do not sell or rent customer data to third-party advertising brokers.</p>
          </div>

          <div>
            <h3 style={{ color: '#063d59', marginBottom: '8px' }}>3. Data Security & Storage</h3>
            <p>All online transaction information and customer lead data are encrypted using 256-bit SSL encryption and stored securely within MongoDB database clusters complying with ISO 27001 data security standards.</p>
          </div>

          <div>
            <h3 style={{ color: '#063d59', marginBottom: '8px' }}>4. Customer Rights & Inquiries</h3>
            <p>Customers may request to inspect, update, or delete their profile information from our database at any time by contacting our Privacy Desk at <a href="mailto:privacy@techhousepest.com" style={{ color: '#159bd3' }}>privacy@techhousepest.com</a>.</p>
          </div>
        </section>
      </div>

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
