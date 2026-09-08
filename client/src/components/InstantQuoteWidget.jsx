import { useEffect, useMemo, useState } from 'react';
import { Bug, Home, ShieldCheck, Zap } from 'lucide-react';

const DEFAULT_SQFT_BRACKETS = [
  { label: '0 - 250 sqft', multiplier: 0.35 },
  { label: '250 - 500 sqft', multiplier: 0.5 },
  { label: '500 - 750 sqft', multiplier: 0.65 },
  { label: '750 - 1000 sqft', multiplier: 1 },
  { label: '1000 - 1250 sqft', multiplier: 1.18 },
  { label: '1250 - 1500 sqft', multiplier: 1.35 },
  { label: '1500 - 1750 sqft', multiplier: 1.55 },
  { label: '1750 - 2000 sqft', multiplier: 1.75 },
  { label: '> 2000 sqft - Book For Call', multiplier: null },
];

// Base price at the 750-1000 sqft bracket for the "Single Visit" service type.
const DEFAULT_SERVICES = [
  {
    label: 'Termite Service',
    basePrice: 8400,
    types: [
      { label: 'Initial Service & 2 Year Warranty', multiplier: 1 },
      { label: 'Initial Service & 5 Year Warranty', multiplier: 1.4 },
    ],
  },
  {
    label: 'Cockroach Service',
    basePrice: 2400,
    types: [
      { label: 'Single Service', multiplier: 1 },
      { label: 'AMC - 3 Visits / Year', multiplier: 2.3 },
    ],
  },
  {
    label: 'Bed Bug Service',
    basePrice: 3600,
    types: [
      { label: 'Single Service', multiplier: 1 },
      { label: '2 Session Thermal Treatment', multiplier: 1.6 },
    ],
  },
  { label: 'Spider Service', basePrice: 1800, types: [{ label: 'Single Service', multiplier: 1 }] },
  {
    label: 'Mosquito Service',
    basePrice: 2200,
    types: [
      { label: 'Single Service', multiplier: 1 },
      { label: 'AMC - Quarterly Fogging', multiplier: 2.1 },
    ],
  },
  { label: 'Rat Home Service', basePrice: 2600, types: [{ label: 'Single Service', multiplier: 1 }] },
  { label: 'Ant Service', basePrice: 1600, types: [{ label: 'Single Service', multiplier: 1 }] },
  { label: 'Virus Disinfection Service', basePrice: 3200, types: [{ label: 'Single Service', multiplier: 1 }] },
  { label: 'Fly Service', basePrice: 1800, types: [{ label: 'Single Service', multiplier: 1 }] },
];

const DEFAULT_DISCOUNT_FLAT = 500;
const DEFAULT_PROMO_TITLE = 'Here, One Stop Pest Solution';
const DEFAULT_PROMO_SUBTITLE = '#terms & conditions apply';

function roundTo100(n) {
  return Math.round(n / 100) * 100;
}

/**
 * `config` mirrors SiteConfig.instantQuote from the admin panel (Site Settings):
 * { discountFlat, promoTitle, promoSubtitle, sqftBrackets: [{label, multiplier, callOnly}], services: [{label, basePrice, types: [{label, multiplier}]}] }
 * Falls back to sensible built-in defaults when the admin hasn't configured anything yet.
 */
export function InstantQuoteWidget({ onBookNow, config }) {
  const services = config?.services?.length ? config.services : DEFAULT_SERVICES;
  const sqftBrackets = config?.sqftBrackets?.length ? config.sqftBrackets : DEFAULT_SQFT_BRACKETS;
  const discountFlat = Number.isFinite(config?.discountFlat) ? config.discountFlat : DEFAULT_DISCOUNT_FLAT;
  const promoTitle = config?.promoTitle || DEFAULT_PROMO_TITLE;
  const promoSubtitle = config?.promoSubtitle || DEFAULT_PROMO_SUBTITLE;

  const [serviceIdx, setServiceIdx] = useState(0);
  const [typeIdx, setTypeIdx] = useState(0);
  const [bracketIdx, setBracketIdx] = useState(() => {
    const mid = sqftBrackets.findIndex((b) => b.label.includes('750'));
    return mid >= 0 ? mid : 0;
  });
  const [applyDiscount, setApplyDiscount] = useState(true);

  // Keep selections valid if the admin-configured lists change size underneath us.
  useEffect(() => {
    if (serviceIdx >= services.length) setServiceIdx(0);
  }, [services, serviceIdx]);
  useEffect(() => {
    if (bracketIdx >= sqftBrackets.length) setBracketIdx(0);
  }, [sqftBrackets, bracketIdx]);

  const service = services[serviceIdx] || services[0];
  const serviceType = service.types[typeIdx] || service.types[0];
  const bracket = sqftBrackets[bracketIdx] || sqftBrackets[0];

  const { originalPrice, finalPrice, isCallRequired } = useMemo(() => {
    if (bracket.multiplier === null || bracket.multiplier === undefined || bracket.callOnly) {
      return { originalPrice: null, finalPrice: null, isCallRequired: true };
    }
    const price = roundTo100(service.basePrice * bracket.multiplier * (serviceType?.multiplier ?? 1));
    const discounted = applyDiscount ? Math.max(price - discountFlat, 0) : price;
    return { originalPrice: price, finalPrice: discounted, isCallRequired: false };
  }, [service, serviceType, bracket, applyDiscount, discountFlat]);

  const handleServiceChange = (idx) => {
    setServiceIdx(idx);
    setTypeIdx(0);
  };

  const handleBookNow = () => {
    onBookNow?.({
      serviceName: service.label,
      serviceType: serviceType?.label || '',
      sqftLabel: bracket.label,
      originalPrice,
      finalPrice,
      discountApplied: applyDiscount && !isCallRequired ? discountFlat : 0,
      callBackOnly: isCallRequired,
    });
  };

  return (
    <div className="iqw-card">
      <div className="iqw-heading">
        <Zap size={18} className="iqw-heading-icon" />
        <h3>Get Your Instant Quote</h3>
      </div>
      <p className="iqw-subtitle">Choose the service and get your instant quote.</p>

      <div className="iqw-promo-strip">
        <ShieldCheck size={22} />
        <div>
          <strong>{promoTitle}</strong>
          <span>{promoSubtitle}</span>
        </div>
      </div>

      <span className="iqw-label">Book Your Service</span>

      <div className="iqw-field">
        <Bug size={16} className="iqw-field-icon" />
        <select value={serviceIdx} onChange={(e) => handleServiceChange(Number(e.target.value))}>
          {services.map((s, idx) => (
            <option key={idx} value={idx}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="iqw-field">
        <ShieldCheck size={16} className="iqw-field-icon" />
        <select value={typeIdx} onChange={(e) => setTypeIdx(Number(e.target.value))}>
          {service.types.map((t, idx) => (
            <option key={idx} value={idx}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="iqw-field">
        <Home size={16} className="iqw-field-icon" />
        <select value={bracketIdx} onChange={(e) => setBracketIdx(Number(e.target.value))}>
          {sqftBrackets.map((b, idx) => (
            <option key={idx} value={idx}>{b.label}</option>
          ))}
        </select>
      </div>

      {isCallRequired ? (
        <div className="iqw-call-notice">
          For properties above this range, our team will call you with a custom quote.
        </div>
      ) : (
        <>
          <div className="iqw-price-box">
            {applyDiscount && <span className="iqw-price-strike">₹{originalPrice.toLocaleString('en-IN')}</span>}
            <span className="iqw-price-final">₹{finalPrice.toLocaleString('en-IN')}</span>
          </div>
          <label className="iqw-discount-toggle">
            <input type="checkbox" checked={applyDiscount} onChange={(e) => setApplyDiscount(e.target.checked)} />
            ₹{discountFlat} OFF Applied
          </label>
        </>
      )}

      <button className="iqw-book-btn" onClick={handleBookNow}>
        {isCallRequired ? 'Request A Call Back' : `Book Now & Save ₹${discountFlat}`}
      </button>
    </div>
  );
}
