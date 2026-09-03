import { Phone } from 'lucide-react';

export function CookiePolicyPage() {
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
        <h1 style={{ fontSize: '28px', color: '#063d59', marginBottom: '8px' }}>Cookie Policy</h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Last Updated: January 2026</p>

        <section style={{ display: 'grid', gap: '20px', color: '#334155', lineHeight: '1.7' }}>
          <div>
            <h3 style={{ color: '#063d59', marginBottom: '8px' }}>1. What Are Cookies?</h3>
            <p>Cookies are small text files stored on your browser to enhance website navigation, remember rate calculator selections, and maintain secure staff authentication sessions.</p>
          </div>

          <div>
            <h3 style={{ color: '#063d59', marginBottom: '8px' }}>2. Types of Cookies We Use</h3>
            <p><strong>Essential Cookies:</strong> Required for booking form submissions and authentication.<br /><strong>Analytical Cookies:</strong> Help us measure site traffic and optimize service calculator response times.</p>
          </div>

          <div>
            <h3 style={{ color: '#063d59', marginBottom: '8px' }}>3. Managing Preferences</h3>
            <p>You can choose to disable non-essential cookies via your browser settings. However, disabling essential cookies may impact instant rate calculation and booking features.</p>
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
