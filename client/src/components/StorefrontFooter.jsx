export function StorefrontFooter() {
  return (
    <footer className="sf-reveal" style={{ background: '#041724', color: '#cbd5e1', padding: '60px 24px 30px 24px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '40px', marginBottom: '50px' }}>
        <div>
          <div style={{ fontWeight: '800', fontSize: '20px', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/tech-house-logo.png" alt="Tech House Logo" style={{ height: '32px' }} />
            Tech House Pest Control
          </div>
          <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#94a3b8' }}>
            ISO 9001:2026 Certified science-led pest management platform. Delivering safe, odourless, and guaranteed pest eradication across residential and commercial properties.
          </p>
        </div>

        <div>
          <h4 style={{ color: '#fff', fontSize: '16px', marginBottom: '16px' }}>Pest Eradication Suite</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px', fontSize: '13.5px' }}>
            <li><a href="/services/cockroach" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Cockroach Control</a></li>
            <li><a href="/services/termite" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Termite Drill-Fill-Seal</a></li>
            <li><a href="/services/rodent" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Rodent & Rat Control</a></li>
            <li><a href="/services/mosquito" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Mosquito Fogging & Larvicide</a></li>
            <li><a href="/services/bed-bug" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Bed Bug Eradication</a></li>
            <li><a href="/services/bird-control" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Bird Netting & Spikes</a></li>
          </ul>
        </div>

        <div>
          <h4 style={{ color: '#fff', fontSize: '16px', marginBottom: '16px' }}>Corporate & Insights</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px', fontSize: '13.5px' }}>
            <li><a href="/about" style={{ color: '#cbd5e1', textDecoration: 'none' }}>About Tech House</a></li>
            <li><a href="/blog" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Knowledge Hub & Blog</a></li>
            <li><a href="/contact" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Contact & Regional Hubs</a></li>
            <li><a href="/login" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Staff ERP Portal</a></li>
          </ul>
        </div>

        <div>
          <h4 style={{ color: '#fff', fontSize: '16px', marginBottom: '16px' }}>Legal & Policies</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px', fontSize: '13.5px' }}>
            <li><a href="/privacy-policy" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Privacy Policy</a></li>
            <li><a href="/legal-statement" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Legal Statement & Terms</a></li>
            <li><a href="/cookie-policy" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Cookie Policy</a></li>
          </ul>
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '24px', maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '12.5px', color: '#64748b' }}>
        <div>© 2026 Tech House Ltd. All rights reserved. | ISO 9001:2026 Certified Pest Eradication.</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="tel:18002122125" style={{ color: '#38bdf8', textDecoration: 'none' }}>Toll-Free: 1800-212-2125</a>
          <span>•</span>
          <span>care@techhousepest.com</span>
        </div>
      </div>
    </footer>
  );
}
