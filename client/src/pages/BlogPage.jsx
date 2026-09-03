import { Phone, Calendar, ArrowRight, BookOpen } from 'lucide-react';

export function BlogPage() {
  const articles = [
    {
      title: '5 Warning Signs of Hidden Subterranean Termites in Wooden Doors',
      date: 'Jan 15, 2026',
      category: 'Termite Care',
      snippet: 'Learn how to detect papery mud tubes, hollow-sounding doors, and discarded wings before termites cause permanent structural damage to your furniture.',
      link: '/services/termite',
    },
    {
      title: 'Monsoon Cockroach Surge: Why Gel Baiting Outperforms Sprays',
      date: 'Jan 10, 2026',
      category: 'Kitchen Hygiene',
      snippet: 'Discover how 48-hour domino effect gel technology targets hidden cockroach nests behind kitchen cabinets without requiring utensil removal.',
      link: '/services/cockroach',
    },
    {
      title: 'How to Prevent Mosquito Breeding During Heavy Rainfall',
      date: 'Jan 05, 2026',
      category: 'Vector Safety',
      snippet: 'Essential anti-larval tips for flowerpots, balcony drains, and open water tanks to shield your family from Dengue and Chikungunya vectors.',
      link: '/services/mosquito',
    },
  ];

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
          <li><a href="/blog" className="sf-nav-link" style={{ color: '#159bd3', fontWeight: 700 }}>Blog</a></li>
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

      <section className="sf-hero" style={{ paddingTop: '36px', minHeight: 'auto', paddingBottom: '36px' }}>
        <div>
          <div className="sf-hero-tag">
            <BookOpen size={14} style={{ color: '#159bd3' }} />
            <span>Expert Pest Control Insights & Hygiene Guides</span>
          </div>
          <h1 className="sf-hero-title">Tech House Knowledge Hub</h1>
          <p className="sf-hero-sub">Stay informed with research-led advice on seasonal pest prevention, home sanitation, and family safety.</p>
        </div>
      </section>

      <section className="sf-section" style={{ maxWidth: '1100px', margin: '0 auto 40px auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {articles.map((art, idx) => (
            <div key={idx} style={{ background: '#fff', borderRadius: '20px', padding: '28px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ background: '#e9f7fd', color: '#159bd3', fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '12px' }}>{art.category}</span>
                  <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {art.date}</span>
                </div>
                <h3 style={{ fontSize: '18px', color: '#063d59', marginBottom: '12px', lineHeight: '1.4' }}>{art.title}</h3>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>{art.snippet}</p>
              </div>
              <a href={art.link} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#159bd3', fontWeight: 700, fontSize: '14px', textDecoration: 'none', marginTop: '16px' }}>
                Read Full Service Guide <ArrowRight size={14} />
              </a>
            </div>
          ))}
        </div>
      </section>

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
