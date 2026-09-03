import { ShieldCheck, Phone, Award, Users, Globe, Building2, CheckCircle2 } from 'lucide-react';

export function AboutPage() {
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
          <li><a href="/about" className="sf-nav-link" style={{ color: '#159bd3', fontWeight: 700 }}>About Us</a></li>
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

      {/* HERO BANNER */}
      <section className="sf-hero" style={{ paddingTop: '40px', minHeight: 'auto', paddingBottom: '40px' }}>
        <div>
          <div className="sf-hero-tag">
            <ShieldCheck size={14} style={{ color: '#159bd3' }} />
            <span>India's Leading Science-Led Pest Management Partner</span>
          </div>
          <h1 className="sf-hero-title">Protecting Spaces, Enriching Lives</h1>
          <p className="sf-hero-sub">
            Tech House Pest Control combines 25+ years of operational excellence, research-driven pest management formulations, and an expansive network of 250+ certified local service hubs across India.
          </p>
        </div>
      </section>

      {/* STATS GRID */}
      <section className="sf-section" style={{ background: '#ffffff', borderRadius: '24px', margin: '20px auto', padding: '40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', textAlign: 'center' }}>
          <div>
            <span style={{ fontSize: '42px', fontWeight: 900, color: '#063d59' }}>25+</span>
            <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#64748b' }}>Years of Excellence</p>
          </div>
          <div>
            <span style={{ fontSize: '42px', fontWeight: 900, color: '#159bd3' }}>90+</span>
            <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#64748b' }}>Service Regions</p>
          </div>
          <div>
            <span style={{ fontSize: '42px', fontWeight: 900, color: '#10b981' }}>50L+</span>
            <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#64748b' }}>Happy Customers</p>
          </div>
          <div>
            <span style={{ fontSize: '42px', fontWeight: 900, color: '#38bdf8' }}>250+</span>
            <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#64748b' }}>Local Hubs</p>
          </div>
        </div>
      </section>

      {/* CORE VALUES */}
      <section className="sf-section">
        <h2 className="sf-section-title">Our Uncompromising Standards</h2>
        <div className="sf-process-grid">
          <div className="sf-process-card">
            <Award size={32} style={{ color: '#159bd3', marginBottom: '12px' }} />
            <h3>ISO 9001:2026 Certified Quality</h3>
            <p>Every treatment protocol adheres to internationally audited quality standards, ensuring consistent efficacy and safety compliance.</p>
          </div>
          <div className="sf-process-card">
            <ShieldCheck size={32} style={{ color: '#10b981', marginBottom: '12px' }} />
            <h3>100% CIB Approved Chemicals</h3>
            <p>We strictly utilize Central Insecticides Board (CIB) registered, low-toxicity formulations that are safe for infants, pets, and food surfaces.</p>
          </div>
          <div className="sf-process-card">
            <Users size={32} style={{ color: '#38bdf8', marginBottom: '12px' }} />
            <h3>Certified Professional Technicians</h3>
            <p>Our field specialists undergo 120+ hours of rigorous technical training in pest biology, safety protocols, and modern application gear.</p>
          </div>
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
