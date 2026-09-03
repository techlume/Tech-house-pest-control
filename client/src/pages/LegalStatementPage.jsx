import { Phone } from 'lucide-react';

export function LegalStatementPage() {
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
        <h1 style={{ fontSize: '28px', color: '#063d59', marginBottom: '8px' }}>Legal Statement & Terms of Service</h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Last Updated: January 2026</p>

        <section style={{ display: 'grid', gap: '20px', color: '#334155', lineHeight: '1.7' }}>
          <div>
            <h3 style={{ color: '#063d59', marginBottom: '8px' }}>1. Intellectual Property & Branding</h3>
            <p>All trademarks, brand logos, service calculator engines, and website design elements contained within Tech House Pest Control are protected by intellectual property laws. Reproduction without prior written authorization is strictly prohibited.</p>
          </div>

          <div>
            <h3 style={{ color: '#063d59', marginBottom: '8px' }}>2. Service Guarantees & Contract Terms</h3>
            <p>Pest eradication service guarantees, AMC warranties, and inspection commitments are governed by the terms specified in signed customer Jobbing and Contract Agreements issued at the time of service execution.</p>
          </div>

          <div>
            <h3 style={{ color: '#063d59', marginBottom: '8px' }}>3. Limitation of Liability</h3>
            <p>Tech House Pest Control shall not be liable for pre-existing structural damage caused by undisclosed termite colonies, water leaks, or unauthorized alterations performed prior to service commencement.</p>
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
