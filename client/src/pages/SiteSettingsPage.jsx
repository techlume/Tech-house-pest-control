import { useState, useEffect } from 'react';
import {
  Globe,
  Tag,
  Sliders,
  Phone,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Quote,
} from 'lucide-react';
import { http } from '../services/http';

const MAX_BANNER_BYTES = 1_800_000;
const MAX_BANNERS = 8;

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SiteSettingsPage() {
  const [config, setConfig] = useState({
    heroTitle: 'Advanced Residential & Commercial Pest Eradication',
    heroSubtitle: 'Protect your property from severe disease risks with 100% odourless, child & pet safe Blitz Intensive Gel formulations.',
    promoBanner: {
      enabled: true,
      text: 'FESTIVE OFFER: Get 30% INSTANT OFF on All Pest Control Bookings!',
      code: 'PROSPERITY30',
      discountPercent: 30,
    },
    contactInfo: {
      phone: '18002122125',
      tollFree: '1800-212-2125',
      email: 'support@techhousepest.com',
      address: 'Tech House Headquarters, Industrial Zone',
    },
    pricingRules: {
      minSqft: 200,
      maxSqftInspectionThreshold: 1500,
      extraPricePerSqft: 1.5,
      gstPercent: 18,
    },
    premisesAllotments: [
      { id: '1_rk', label: '1 RK', defaultSqft: 350, basePrice: 1199, amcPriceMultiplier: 2.2 },
      { id: '1_bhk', label: '1 BHK', defaultSqft: 600, basePrice: 1499, amcPriceMultiplier: 2.2 },
      { id: '2_bhk', label: '2 BHK', defaultSqft: 1000, basePrice: 1999, amcPriceMultiplier: 2.2 },
      { id: '3_bhk', label: '3 BHK', defaultSqft: 1400, basePrice: 2499, amcPriceMultiplier: 2.2 },
      { id: '4_bhk', label: '4 BHK', defaultSqft: 1800, basePrice: 2999, amcPriceMultiplier: 2.2 },
      { id: '5_bhk', label: '5 BHK', defaultSqft: 2400, basePrice: 3999, amcPriceMultiplier: 2.2 },
      { id: 'commercial', label: 'Commercial', defaultSqft: 3000, basePrice: 4999, amcPriceMultiplier: 2.4 },
    ],
    heroBanners: [],
    instantQuote: {
      discountFlat: 500,
      promoTitle: 'Here, One Stop Pest Solution',
      promoSubtitle: '#terms & conditions apply',
      sqftBrackets: [{ label: '750 - 1000 sqft', multiplier: 1, callOnly: false }],
      services: [{ label: 'Termite Service', basePrice: 8400, types: [{ label: 'Single Service', multiplier: 1 }] }],
    },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ type: '', msg: '' });
  const [bannerError, setBannerError] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await http.get('/site-config');
      if (res.data?.success && res.data?.data) {
        setConfig(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch site config:', err);
      showToast('error', 'Failed to load live site configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await http.put('/site-config', config);
      if (res.data?.success) {
        setConfig(res.data.data);
        showToast('success', 'Site Storefront Settings updated live!');
      }
    } catch (err) {
      console.error('Save failed:', err);
      showToast('error', err?.response?.data?.message || 'Failed to save site configuration');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast({ type: '', msg: '' }), 4000);
  };

  // Premise Allotment Handlers
  const handleAllotmentChange = (index, field, val) => {
    const updated = [...config.premisesAllotments];
    updated[index] = { ...updated[index], [field]: val };
    setConfig({ ...config, premisesAllotments: updated });
  };

  const handleAddAllotment = () => {
    const newId = `custom_${Date.now()}`;
    setConfig({
      ...config,
      premisesAllotments: [
        ...config.premisesAllotments,
        { id: newId, label: 'New Allotment', defaultSqft: 1200, basePrice: 2200, amcPriceMultiplier: 2.2 },
      ],
    });
  };

  const handleRemoveAllotment = (index) => {
    if (config.premisesAllotments.length <= 1) {
      showToast('error', 'Minimum 1 premise allotment is required.');
      return;
    }
    const updated = config.premisesAllotments.filter((_, i) => i !== index);
    setConfig({ ...config, premisesAllotments: updated });
  };

  // Hero Banner Handlers
  const handleAddBanner = () => {
    const banners = config.heroBanners || [];
    if (banners.length >= MAX_BANNERS) {
      setBannerError(`You can add up to ${MAX_BANNERS} banners.`);
      return;
    }
    setBannerError('');
    setConfig({
      ...config,
      heroBanners: [...banners, { imageUrl: '', quote: '', quoteAuthor: '', enabled: true }],
    });
  };

  const handleBannerField = (index, field, value) => {
    const updated = [...(config.heroBanners || [])];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({ ...config, heroBanners: updated });
  };

  const handleBannerImage = async (index, file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setBannerError('Banner images must be JPEG, PNG or WebP.');
      return;
    }
    if (file.size > MAX_BANNER_BYTES) {
      setBannerError(`"${file.name}" is too large — banner images must be under 1.8MB.`);
      return;
    }
    setBannerError('');
    const dataUrl = await fileToDataUrl(file);
    handleBannerField(index, 'imageUrl', dataUrl);
  };

  const handleRemoveBanner = (index) => {
    const updated = (config.heroBanners || []).filter((_, i) => i !== index);
    setConfig({ ...config, heroBanners: updated });
  };

  // Instant Quote Widget Handlers (homepage "Get Your Instant Quote" card)
  const instantQuote = config.instantQuote || { discountFlat: 500, promoTitle: '', promoSubtitle: '', sqftBrackets: [], services: [] };

  const setInstantQuote = (patch) => setConfig({ ...config, instantQuote: { ...instantQuote, ...patch } });

  const handleBracketChange = (idx, field, value) => {
    const updated = [...instantQuote.sqftBrackets];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'callOnly') updated[idx].multiplier = value ? null : updated[idx].multiplier || 1;
    setInstantQuote({ sqftBrackets: updated });
  };

  const handleAddBracket = () => {
    setInstantQuote({ sqftBrackets: [...instantQuote.sqftBrackets, { label: 'New sqft range', multiplier: 1, callOnly: false }] });
  };

  const handleRemoveBracket = (idx) => {
    if (instantQuote.sqftBrackets.length <= 1) {
      showToast('error', 'Keep at least 1 sqft range.');
      return;
    }
    setInstantQuote({ sqftBrackets: instantQuote.sqftBrackets.filter((_, i) => i !== idx) });
  };

  const handleServiceMetaChange = (sIdx, field, value) => {
    const updated = [...instantQuote.services];
    updated[sIdx] = { ...updated[sIdx], [field]: value };
    setInstantQuote({ services: updated });
  };

  const handleAddService = () => {
    setInstantQuote({
      services: [...instantQuote.services, { label: 'New Service', basePrice: 2000, types: [{ label: 'Single Service', multiplier: 1 }] }],
    });
  };

  const handleRemoveService = (sIdx) => {
    if (instantQuote.services.length <= 1) {
      showToast('error', 'Keep at least 1 service.');
      return;
    }
    setInstantQuote({ services: instantQuote.services.filter((_, i) => i !== sIdx) });
  };

  const handleTypeChange = (sIdx, tIdx, field, value) => {
    const updated = [...instantQuote.services];
    const types = [...updated[sIdx].types];
    types[tIdx] = { ...types[tIdx], [field]: value };
    updated[sIdx] = { ...updated[sIdx], types };
    setInstantQuote({ services: updated });
  };

  const handleAddType = (sIdx) => {
    const updated = [...instantQuote.services];
    updated[sIdx] = { ...updated[sIdx], types: [...updated[sIdx].types, { label: 'New Type', multiplier: 1 }] };
    setInstantQuote({ services: updated });
  };

  const handleRemoveType = (sIdx, tIdx) => {
    const updated = [...instantQuote.services];
    if (updated[sIdx].types.length <= 1) {
      showToast('error', 'Each service needs at least 1 type.');
      return;
    }
    updated[sIdx] = { ...updated[sIdx], types: updated[sIdx].types.filter((_, i) => i !== tIdx) };
    setInstantQuote({ services: updated });
  };

  if (loading) {
    return (
      <div className="page" style={{ textAlign: 'center', padding: '60px' }}>
        <RefreshCw size={32} className="spin" style={{ color: 'var(--primary)' }} />
        <p style={{ marginTop: '12px', color: 'var(--muted)' }}>Loading Storefront Site Configurations...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-heading actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2>Site Changes & Storefront Management</h2>
          <p>Configure dynamic pricing rates (1 BHK, 2 BHK, etc.), promotional coupon banners, and public contact info live on your homepage storefront.</p>
        </div>

        <button className="primary-button" onClick={handleSave} disabled={saving}>
          {saving ? <RefreshCw size={18} className="spin" /> : <Save size={18} />}
          <span>{saving ? 'Publishing Changes...' : 'Publish Live Site Changes'}</span>
        </button>
      </div>

      {toast.msg && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '12px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: '600',
            fontSize: '14px',
            background: toast.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: toast.type === 'success' ? '#047857' : '#b91c1c',
            border: `1px solid ${toast.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* 1. PROMOTIONAL BANNER & COUPON CODE MANAGER */}
        <section className="panel" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Tag size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ margin: 0 }}>Promotional Banner & Instant Coupon Settings</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.promoBanner?.enabled}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      promoBanner: { ...config.promoBanner, enabled: e.target.checked },
                    })
                  }
                />
                <strong>Enable Top Promotional Banner on Homepage</strong>
              </label>
            </div>

            <div className="form-group">
              <label>Promo Coupon Code</label>
              <input
                type="text"
                className="input-wrap"
                style={{ width: '100%', padding: '10px 14px' }}
                value={config.promoBanner?.code || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    promoBanner: { ...config.promoBanner, code: e.target.value.toUpperCase() },
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>Discount Percentage (%)</label>
              <input
                type="number"
                className="input-wrap"
                style={{ width: '100%', padding: '10px 14px' }}
                value={config.promoBanner?.discountPercent || 0}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    promoBanner: { ...config.promoBanner, discountPercent: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Banner Promotional Headline</label>
              <input
                type="text"
                className="input-wrap"
                style={{ width: '100%', padding: '10px 14px' }}
                value={config.promoBanner?.text || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    promoBanner: { ...config.promoBanner, text: e.target.value },
                  })
                }
              />
            </div>
          </div>
        </section>

        {/* 1B. HOMEPAGE HERO BANNER IMAGES & QUOTES */}
        <section className="panel" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ImageIcon size={20} style={{ color: 'var(--primary)' }} />
              <h3 style={{ margin: 0 }}>Homepage Hero Banner Images &amp; Quotes</h3>
            </div>
            <button
              type="button"
              className="location-actions button"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              onClick={handleAddBanner}
              disabled={(config.heroBanners || []).length >= MAX_BANNERS}
            >
              <Plus size={16} />
              <span>Add Banner</span>
            </button>
          </div>

          <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>
            Upload photos (JPEG/PNG/WebP, under 1.8MB each) with an optional overlay quote for the homepage hero. When
            more than one banner is enabled they rotate automatically; leave empty to keep the default background.
          </p>

          {bannerError && (
            <div style={{ padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontSize: '13px' }}>
              {bannerError}
            </div>
          )}

          <div style={{ display: 'grid', gap: '16px' }}>
            {(config.heroBanners || []).map((banner, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '16px', border: '1px solid var(--line)', borderRadius: '14px', padding: '14px' }}>
                <div>
                  <div
                    style={{
                      width: '100%',
                      height: '110px',
                      borderRadius: '10px',
                      background: banner.imageUrl ? `url(${banner.imageUrl}) center/cover no-repeat` : '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--muted)',
                      marginBottom: '8px',
                      border: '1px dashed var(--line)',
                    }}
                  >
                    {!banner.imageUrl && <ImageIcon size={22} />}
                  </div>
                  <label className="location-actions button" style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer', fontSize: '12px', padding: '6px' }}>
                    {banner.imageUrl ? 'Replace' : 'Upload'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => handleBannerImage(idx, e.target.files?.[0])}
                    />
                  </label>
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Quote size={13} /> Overlay quote
                    </label>
                    <input
                      type="text"
                      className="input-wrap"
                      style={{ width: '100%', padding: '10px 14px' }}
                      placeholder='e.g. "A pest-free home is a promise, not a privilege."'
                      value={banner.quote}
                      onChange={(e) => handleBannerField(idx, 'quote', e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Quote attribution (optional)</label>
                      <input
                        type="text"
                        className="input-wrap"
                        style={{ width: '100%', padding: '10px 14px' }}
                        placeholder="— The Tech House Promise"
                        value={banner.quoteAuthor}
                        onChange={(e) => handleBannerField(idx, 'quoteAuthor', e.target.value)}
                      />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', paddingBottom: '10px' }}>
                      <input
                        type="checkbox"
                        checked={banner.enabled}
                        onChange={(e) => handleBannerField(idx, 'enabled', e.target.checked)}
                      />
                      Live
                    </label>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', paddingBottom: '10px' }}
                      onClick={() => handleRemoveBanner(idx)}
                      title="Remove banner"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!(config.heroBanners || []).length && (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: '13px' }}>
                No banners yet — the homepage will use its default background until you add one.
              </div>
            )}
          </div>
        </section>

        {/* 1C. HOMEPAGE INSTANT QUOTE WIDGET */}
        <section className="panel" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Sliders size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ margin: 0 }}>Homepage "Get Your Instant Quote" Widget</h3>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>
            Controls the service list, property-size brackets and pricing shown in the instant quote card on the
            homepage hero. Prices are per service at its base sqft bracket, scaled by the sqft multiplier and the
            selected service type multiplier.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div className="form-group">
              <label>Flat Discount (₹)</label>
              <input
                type="number"
                className="input-wrap"
                style={{ width: '100%', padding: '10px 14px' }}
                value={instantQuote.discountFlat}
                onChange={(e) => setInstantQuote({ discountFlat: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label>Promo Strip Title</label>
              <input
                type="text"
                className="input-wrap"
                style={{ width: '100%', padding: '10px 14px' }}
                value={instantQuote.promoTitle}
                onChange={(e) => setInstantQuote({ promoTitle: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Promo Strip Subtitle</label>
              <input
                type="text"
                className="input-wrap"
                style={{ width: '100%', padding: '10px 14px' }}
                value={instantQuote.promoSubtitle}
                onChange={(e) => setInstantQuote({ promoSubtitle: e.target.value })}
              />
            </div>
          </div>

          {/* Sqft Brackets */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '13.5px' }}>Property Size Brackets</strong>
            <button
              type="button"
              className="location-actions button"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              onClick={handleAddBracket}
            >
              <Plus size={16} />
              <span>Add Range</span>
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--line)', textTransform: 'uppercase', fontSize: '12px', color: 'var(--muted)' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Label</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Price Multiplier</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Call For Quote Only</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {instantQuote.sqftBrackets.map((b, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '10px' }}>
                    <input
                      type="text"
                      style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)', width: '180px' }}
                      value={b.label}
                      onChange={(e) => handleBracketChange(idx, 'label', e.target.value)}
                    />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input
                      type="number"
                      step="0.01"
                      disabled={b.callOnly}
                      style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)', width: '100px' }}
                      value={b.multiplier ?? ''}
                      onChange={(e) => handleBracketChange(idx, 'multiplier', Number(e.target.value))}
                    />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(b.callOnly)}
                      onChange={(e) => handleBracketChange(idx, 'callOnly', e.target.checked)}
                    />
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      onClick={() => handleRemoveBracket(idx)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Services & Types */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '13.5px' }}>Services</strong>
            <button
              type="button"
              className="location-actions button"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              onClick={handleAddService}
            >
              <Plus size={16} />
              <span>Add Service</span>
            </button>
          </div>

          <div style={{ display: 'grid', gap: '14px' }}>
            {instantQuote.services.map((s, sIdx) => (
              <div key={sIdx} style={{ border: '1px solid var(--line)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '12px' }}>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>Service Name</label>
                    <input
                      type="text"
                      className="input-wrap"
                      style={{ width: '100%', padding: '8px 12px' }}
                      value={s.label}
                      onChange={(e) => handleServiceMetaChange(sIdx, 'label', e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Base Price at first bracket (₹)</label>
                    <input
                      type="number"
                      className="input-wrap"
                      style={{ width: '100%', padding: '8px 12px' }}
                      value={s.basePrice}
                      onChange={(e) => handleServiceMetaChange(sIdx, 'basePrice', Number(e.target.value))}
                    />
                  </div>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', paddingBottom: '8px' }}
                    onClick={() => handleRemoveService(sIdx)}
                    title="Remove service"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Service Types</span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', fontWeight: 700 }}
                    onClick={() => handleAddType(sIdx)}
                  >
                    <Plus size={14} /> Add Type
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '8px' }}>
                  {s.types.map((t, tIdx) => (
                    <div key={tIdx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Type label (e.g. Single Service)"
                        style={{ flex: 2, padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                        value={t.label}
                        onChange={(e) => handleTypeChange(sIdx, tIdx, 'label', e.target.value)}
                      />
                      <input
                        type="number"
                        step="0.1"
                        title="Price multiplier"
                        style={{ width: '90px', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)' }}
                        value={t.multiplier}
                        onChange={(e) => handleTypeChange(sIdx, tIdx, 'multiplier', Number(e.target.value))}
                      />
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        onClick={() => handleRemoveType(sIdx, tIdx)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. DYNAMIC PREMISES ALLOTMENT & PRICING TABLE */}
        <section className="panel" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Globe size={20} style={{ color: 'var(--primary)' }} />
              <h3 style={{ margin: 0 }}>Premises Allotments & Base Pricing Rates</h3>
            </div>
            <button
              type="button"
              className="location-actions button"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              onClick={handleAddAllotment}
            >
              <Plus size={16} />
              <span>Add Allotment Option</span>
            </button>
          </div>

          <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>
            Configure base prices for 1 RK, 1 BHK, 2 BHK, 3 BHK, 4 BHK, 5 BHK, and Commercial properties. These prices directly feed the storefront rate engine.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--line)', textTransform: 'uppercase', fontSize: '12px', color: 'var(--muted)' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Allotment Label</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Default Sqft</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Base Rate (₹)</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>AMC Multiplier</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {config.premisesAllotments?.map((item, idx) => (
                <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '10px' }}>
                    <input
                      type="text"
                      style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)', width: '120px' }}
                      value={item.label}
                      onChange={(e) => handleAllotmentChange(idx, 'label', e.target.value)}
                    />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input
                      type="number"
                      style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)', width: '100px' }}
                      value={item.defaultSqft}
                      onChange={(e) => handleAllotmentChange(idx, 'defaultSqft', Number(e.target.value))}
                    />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input
                      type="number"
                      style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)', width: '110px' }}
                      value={item.basePrice}
                      onChange={(e) => handleAllotmentChange(idx, 'basePrice', Number(e.target.value))}
                    />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input
                      type="number"
                      step="0.1"
                      style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)', width: '90px' }}
                      value={item.amcPriceMultiplier}
                      onChange={(e) => handleAllotmentChange(idx, 'amcPriceMultiplier', Number(e.target.value))}
                    />
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      onClick={() => handleRemoveAllotment(idx)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 3. PRICING RULES & GST CONFIGURATION */}
        <section className="panel" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Sliders size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ margin: 0 }}>Calculation Rules & Tax Configuration</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div className="form-group">
              <label>Minimum Area Sqft</label>
              <input
                type="number"
                className="input-wrap"
                style={{ width: '100%', padding: '10px 14px' }}
                value={config.pricingRules?.minSqft || 200}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    pricingRules: { ...config.pricingRules, minSqft: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>Extra Sqft Cost Rate (₹/sqft)</label>
              <input
                type="number"
                step="0.1"
                className="input-wrap"
                style={{ width: '100%', padding: '10px 14px' }}
                value={config.pricingRules?.extraPricePerSqft || 1.5}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    pricingRules: { ...config.pricingRules, extraPricePerSqft: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>Inspection Threshold (sqft)</label>
              <input
                type="number"
                className="input-wrap"
                style={{ width: '100%', padding: '10px 14px' }}
                value={config.pricingRules?.maxSqftInspectionThreshold || 1500}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    pricingRules: { ...config.pricingRules, maxSqftInspectionThreshold: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>GST Tax Percent (%)</label>
              <input
                type="number"
                className="input-wrap"
                style={{ width: '100%', padding: '10px 14px' }}
                value={config.pricingRules?.gstPercent || 18}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    pricingRules: { ...config.pricingRules, gstPercent: Number(e.target.value) },
                  })
                }
              />
            </div>
          </div>
        </section>

        {/* 4. PUBLIC CONTACT INFORMATION */}
        <section className="panel" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Phone size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ margin: 0 }}>Public Contact & Hotline Display</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Display Toll-Free Hotline</label>
              <input
                type="text"
                className="input-wrap"
                style={{ width: '100%', padding: '10px 14px' }}
                value={config.contactInfo?.tollFree || '1800-212-2125'}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    contactInfo: { ...config.contactInfo, tollFree: e.target.value },
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>Direct Phone Dial URI</label>
              <input
                type="text"
                className="input-wrap"
                style={{ width: '100%', padding: '10px 14px' }}
                value={config.contactInfo?.phone || '18002122125'}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    contactInfo: { ...config.contactInfo, phone: e.target.value },
                  })
                }
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Support Email Address</label>
              <input
                type="email"
                className="input-wrap"
                style={{ width: '100%', padding: '10px 14px' }}
                value={config.contactInfo?.email || 'support@techhousepest.com'}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    contactInfo: { ...config.contactInfo, email: e.target.value },
                  })
                }
              />
            </div>
          </div>
        </section>

        <div style={{ textAlign: 'right', marginTop: '24px' }}>
          <button className="primary-button" type="submit" disabled={saving} style={{ padding: '14px 28px', fontSize: '15px' }}>
            {saving ? <RefreshCw size={18} className="spin" /> : <Save size={18} />}
            <span>{saving ? 'Publishing Changes...' : 'Publish Live Site Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
