import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Phone,
  Lock,
  Sparkles,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Plus,
  X,
  Copy,
  Check,
  User,
  Calendar,
  Clock,
  MapPin,
  FileText,
  HelpCircle,
  Award,
  ArrowRight,
  Zap,
  Building2,
  CheckSquare,
  Star,
  BookOpen,
  Bug,
  Rat,
  Bird,
  Droplets,
  BedDouble,
  Quote,
  MessageSquareWarning,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { http } from '../services/http';
import { useAuth } from '../context/AuthContext';
import { appAlert } from '../lib/dialog';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { StorefrontFooter } from '../components/StorefrontFooter';
import { RegisterComplaintDialog } from '../components/RegisterComplaintDialog';
import '../storefront.css';

export function StorefrontPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Dynamic Site Config state loaded from backend MongoDB
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [promoBarVisible, setPromoBarVisible] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [manualCoupon, setManualCoupon] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  // Calculator State
  const [selectedService, setSelectedService] = useState('cockroach');
  const [selectedAllotmentId, setSelectedAllotmentId] = useState('2_bhk');
  const [sqft, setSqft] = useState(1000);
  const [packageType, setPackageType] = useState('amc'); // 'single' or 'amc'

  // Diagnostic Quiz State
  const [quizAnswers, setQuizAnswers] = useState({ q1: null, q2: null, q3: null });
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Quick Callback Request Form State
  const [callbackForm, setCallbackForm] = useState({ name: '', phone: '', city: 'Mumbai' });
  const [callbackSubmitted, setCallbackSubmitted] = useState(false);

  // Booking Modal State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Quick Order & Complaint Dialog
  const [quickOrder, setQuickOrder] = useState(null);
  const [complaintDialogOpen, setComplaintDialogOpen] = useState(false);

  const handleQuickBookNow = (order) => {
    setQuickOrder(order);
    setBookingModalOpen(true);
  };

  const [bookingForm, setBookingForm] = useState({
    customerName: '',
    phone: '',
    email: '',
    address: '',
    preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    preferredTimeSlot: 'Morning (9:00 AM - 1:00 PM)',
    notes: '',
  });

  // FAQ Accordion Toggle State
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Service Tabs Slider Navigation
  const serviceTabsRef = useRef(null);
  const scrollServices = (direction) => {
    if (serviceTabsRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      serviceTabsRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Load public site configuration from backend API
  useEffect(() => {
    fetchSiteConfig();
  }, []);

  // Admin-managed hero banner images (with optional overlay quotes)
  const enabledBanners = (config?.heroBanners || []).filter((b) => b.enabled && b.imageUrl);

  useEffect(() => {
    if (enabledBanners.length < 2) return;
    const timer = setInterval(() => {
      setActiveBannerIndex((idx) => (idx + 1) % enabledBanners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [enabledBanners.length]);

  const fetchSiteConfig = async () => {
    try {
      setLoading(true);
      const res = await http.get('/site-config');
      if (res.data?.success && res.data?.data) {
        setConfig(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load site config:', err);
    } finally {
      setLoading(false);
    }
  };

  // Pricing Rules
  const rules = config?.pricingRules || {
    minSqft: 200,
    maxSqftInspectionThreshold: 1500,
    extraPricePerSqft: 1.5,
    gstPercent: 18,
  };

  const promo = config?.promoBanner || {
    enabled: true,
    code: 'PROSPERITY30',
    discountPercent: 30,
    text: 'FESTIVE OFFER: Get 30% INSTANT OFF on All Pest Control Bookings!',
  };

  const services = config?.serviceCategories || [
    { id: 'cockroach', name: 'Cockroach Domino Gel', badge: 'Bayer Gel Tech', basePriceMultiplier: 1.0 },
    { id: 'termite', name: 'Termite Drill-Fill-Seal', badge: '3-Year Warranty', basePriceMultiplier: 1.4 },
    { id: 'rodent', name: 'Rodent & Rat Defense', badge: 'Wire Shield', basePriceMultiplier: 1.1 },
    { id: 'mosquito', name: 'Mosquito Vector Fogging', badge: 'Dengue Shield', basePriceMultiplier: 1.05 },
    { id: 'bedbug', name: 'Bed Bug Thermal Steam', badge: '90-Day Guarantee', basePriceMultiplier: 1.25 },
    { id: 'birds', name: 'Bird Netting & Spikes', badge: 'Garware HDPE', basePriceMultiplier: 1.3 },
    { id: 'ants', name: 'Ant Colony Eradication', badge: 'Queen Kill', basePriceMultiplier: 0.9 },
    { id: 'housefly', name: 'Housefly & Fly Defense', badge: 'Vector Shield', basePriceMultiplier: 0.95 },
    { id: 'silverfish', name: 'Silverfish Document Shield', badge: 'Paper Defense', basePriceMultiplier: 0.9 },
    { id: 'spider', name: 'Spider & Cobweb Removal', badge: 'De-Web Barrier', basePriceMultiplier: 0.85 },
  ];

  const currentService = services.find((s) => s.id === selectedService) || services[0];

  // Dynamic premises allotments: Service-tailored if defined, else global config, else fallback
  const allotments = useMemo(() => {
    if (currentService?.premisesAllotments && currentService.premisesAllotments.length > 0) {
      return currentService.premisesAllotments;
    }
    return config?.premisesAllotments && config.premisesAllotments.length > 0
      ? config.premisesAllotments
      : [
          { id: '1_rk', label: '1 RK', defaultSqft: 350, basePrice: 1199, amcPriceMultiplier: 2.2 },
          { id: '1_bhk', label: '1 BHK', defaultSqft: 600, basePrice: 1499, amcPriceMultiplier: 2.2 },
          { id: '2_bhk', label: '2 BHK', defaultSqft: 1000, basePrice: 1999, amcPriceMultiplier: 2.2 },
          { id: '3_bhk', label: '3 BHK', defaultSqft: 1400, basePrice: 2499, amcPriceMultiplier: 2.2 },
          { id: '4_bhk', label: '4 BHK', defaultSqft: 1800, basePrice: 2999, amcPriceMultiplier: 2.2 },
          { id: '5_bhk', label: '5 BHK', defaultSqft: 2400, basePrice: 3999, amcPriceMultiplier: 2.2 },
          { id: 'commercial', label: 'Commercial', defaultSqft: 3000, basePrice: 4999, amcPriceMultiplier: 2.4 },
        ];
  }, [currentService, config?.premisesAllotments]);

  // Synchronize selected allotment whenever service or allotments change
  useEffect(() => {
    if (allotments && allotments.length > 0) {
      const match = allotments.find((a) => a.id === selectedAllotmentId);
      if (!match) {
        setSelectedAllotmentId(allotments[0].id);
        setSqft(allotments[0].defaultSqft);
      }
    }
  }, [allotments, selectedAllotmentId]);

  const currentAllotment = allotments.find((a) => a.id === selectedAllotmentId) || allotments[0] || {
    id: 'default',
    label: 'Standard Unit',
    defaultSqft: 1000,
    basePrice: 1999,
    amcPriceMultiplier: 2.2,
  };

  const handleSelectAllotment = (allotment) => {
    setSelectedAllotmentId(allotment.id);
    setSqft(allotment.defaultSqft);
  };

  // Calculate Price Breakdown
  const baseRate = currentAllotment.basePrice * (currentService.basePriceMultiplier || 1.0);
  const extraSqft = Math.max(0, sqft - currentAllotment.defaultSqft);
  const extraSqftCost = extraSqft * rules.extraPricePerSqft;

  let packageSubtotal = baseRate + extraSqftCost;
  if (packageType === 'amc') {
    packageSubtotal = packageSubtotal * (currentAllotment.amcPriceMultiplier || 2.2);
  }

  const activeDiscountPercent = appliedCoupon ? appliedCoupon.discountPercent : (promo.enabled ? promo.discountPercent : 0);
  const activeDiscountCode = appliedCoupon ? appliedCoupon.code : promo.code;
  const discountAmount = packageSubtotal * (activeDiscountPercent / 100);
  const netBeforeGst = packageSubtotal - discountAmount;
  const gstAmount = netBeforeGst * (rules.gstPercent / 100);
  const grandTotal = Math.round(netBeforeGst + gstAmount);

  // Copy promo code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(promo.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const applyManualCoupon = async () => {
    const code = manualCoupon.trim();
    if (!code) return;
    setCheckingCoupon(true);
    setCouponMessage('');
    try {
      const { data } = await http.get('/coupons/validate', { params: { code } });
      if (data.valid) {
        setAppliedCoupon({ code: data.code, discountPercent: data.discountPercent });
        setCouponMessage('Coupon applied: ' + data.discountPercent + '% off');
      } else {
        setAppliedCoupon(null);
        setCouponMessage(data.message || 'Invalid coupon code');
      }
    } catch {
      setAppliedCoupon(null);
      setCouponMessage('Could not validate coupon right now');
    } finally {
      setCheckingCoupon(false);
    }
  };

  const handleStaffLoginClick = () => {
    if (user) {
      navigate('/admin');
    } else {
      navigate('/login');
    }
  };

  // Handle Online Customer Booking Submit
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingLoading(true);
    try {
      const payload = quickOrder
        ? {
            ...bookingForm,
            premiseType: quickOrder.sqftLabel,
            sqft,
            serviceCategory: quickOrder.serviceName,
            packageType: quickOrder.serviceType,
            totalAmount: quickOrder.finalPrice || 0,
            discountApplied: quickOrder.discountApplied,
          }
        : {
            ...bookingForm,
            premiseType: currentAllotment.label,
            sqft,
            serviceCategory: currentService.name,
            packageType: packageType === 'amc' ? '1-Year AMC (3 Visits)' : 'Single Service Knockdown',
            totalAmount: grandTotal,
            discountApplied: promo.discountPercent,
          };

      const res = await http.post('/site-config/bookings', payload);
      if (res.data?.success) {
        setBookingSuccess(res.data);
      }
    } catch (err) {
      await appAlert(err?.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Handle Quick Call-Back Request Submit
  const handleCallbackSubmit = async (e) => {
    e.preventDefault();
    try {
      await http.post('/site-config/bookings', {
        name: callbackForm.name,
        phone: callbackForm.phone,
        address: `${callbackForm.city} - Quick Callback Request`,
        serviceType: 'General Callback Inquiry',
        allotment: '1_bhk',
        sqft: 600,
        packageType: 'single',
        totalAmount: 0,
      });
      setCallbackSubmitted(true);
    } catch (err) {
      console.error('Callback error:', err);
    }
  };

  // Infestation Quiz Calculation
  const handleQuizAnswer = (qKey, val) => {
    const updated = { ...quizAnswers, [qKey]: val };
    setQuizAnswers(updated);
    if (updated.q1 !== null && updated.q2 !== null && updated.q3 !== null) {
      setQuizSubmitted(true);
    }
  };

  const getQuizSeverity = () => {
    const yesCount = Object.values(quizAnswers).filter((v) => v === true).length;
    if (yesCount >= 3) return { level: 'HIGH INFESTATION ALERT', color: '#ef4444', rec: '1-Year AMC Protection Plan + Blitz Intensive' };
    if (yesCount === 2) return { level: 'MODERATE INFESTATION RISK', color: '#f59e0b', rec: '1-Year AMC Protection Plan' };
    return { level: 'LOW / PREVENTIVE LEVEL', color: '#10b981', rec: 'Single Service Blitz Knockdown' };
  };

  const faqs = [
    {
      q: 'How much does pest control cost in your service areas?',
      a: 'Pricing depends on the pest type, property size, and whether you choose a single visit or an AMC plan. Use the Instant Quote widget above or our Price Calculator to get an exact, no-obligation figure in seconds.',
    },
    {
      q: 'What is pest control or pest treatment?',
      a: 'Pest control is the scientific process of inspecting, targeting, and eliminating insects, rodents, and other pests using approved chemical, mechanical, or biological methods, followed by preventive measures to stop them returning.',
    },
    {
      q: 'How do I get started with pest control from Tech House?',
      a: 'Simply pick your service and property size in the Instant Quote widget, confirm your booking, and our certified technician will visit on your chosen date and time slot.',
    },
    {
      q: 'What should I do if I have insects in my house?',
      a: 'Avoid using random over-the-counter sprays as they can scatter colonies. Book a professional inspection so we can identify the exact species and apply a targeted, safe treatment.',
    },
    {
      q: 'How often should pest control be done?',
      a: 'For most homes we recommend a treatment every 3 to 4 months, which is exactly what our 1-Year AMC plan covers with 3 scheduled visits and unlimited complaint callouts.',
    },
    {
      q: 'How does pest control work?',
      a: 'Our technicians inspect the property, identify entry points and nesting zones, then apply a mix of gel baiting, spraying, or drill-fill-seal treatment depending on the pest, followed by a preventive barrier.',
    },
    {
      q: 'Are the pest control chemicals safe for my children and pets?',
      a: 'Yes, absolutely. We use 100% odourless, government-approved (CIB certified) Bayer & Syngenta gel baiting formulations. There are no harmful chemical fumes, so children, elderly family members, and pets do not need to leave the house.',
    },
    {
      q: 'Is paying for pest control worth it?',
      a: 'Yes — untreated infestations damage furniture, contaminate food, and pose health risks. A single AMC plan typically costs far less than the repairs or medical costs caused by a prolonged infestation.',
    },
    {
      q: 'Do I need to empty my kitchen cabinets before the treatment?',
      a: 'No! Our Blitz Intensive Gel Treatment requires ZERO kitchen emptying. Our technicians apply precise gel points in cabinet hinges, drawers, and under sinks without disturbing your kitchen items.',
    },
    {
      q: 'How has Tech House Pest Control guaranteed protection?',
      a: 'Every AMC plan comes with a written warranty period. If pests reappear within that window, we send a technician for a free re-treatment at no extra cost — we only guarantee inspection and re-treatment, not refunds.',
    },
    {
      q: 'Which insects are covered under the Tech House service plan?',
      a: 'Our plans cover cockroaches, termites, bed bugs, spiders, mosquitoes, rats, ants, and general household insects. Virus disinfection and fly control are also available as add-on services.',
    },
    {
      q: 'How does the Anti-Termite Drill-Fill-Seal warranty work?',
      a: 'Technicians drill small 45° holes at 1-foot intervals along wall junctions, inject termiticide chemical barriers into subterranean soil layers, and seal the holes with colour-matched cement plugs. If termites re-appear during the warranty period, we provide free callouts.',
    },
  ];

  const col1Faqs = faqs.filter((_, i) => i % 2 === 0);
  const col2Faqs = faqs.filter((_, i) => i % 2 === 1);

  const serviceGrid = [
    {
      title: 'Cockroach Eradication',
      desc: 'Domino cascade gel baiting & zero kitchen cabinet emptying.',
      link: '/services/cockroach',
      badge: 'Bayer Gel Tech',
      icon: Bug,
      tint: '#159bd3',
      image: '/hd_assets/cockroach_hd.jpg',
    },
    {
      title: 'Termite Protection',
      desc: 'Subterranean Drill-Fill-Seal barrier & 3-Year Warranty cover.',
      link: '/services/termite',
      badge: '3-Year Warranty',
      icon: ShieldCheck,
      tint: '#087bad',
      image: '/hd_assets/termite_hd.jpg',
    },
    {
      title: 'Rodent & Rat Defense',
      desc: 'Lockable tamper-proof bait stations & electrical wire shielding.',
      link: '/services/rodent',
      badge: 'Wire Shield',
      icon: Rat,
      tint: '#063d59',
      image: '/hd_assets/rodent_hd.jpg',
    },
    {
      title: 'Mosquito Vector Defense',
      desc: '3-Way ULV thermal cold fogging & anti-larval water granules.',
      link: '/services/mosquito',
      badge: 'Dengue Shield',
      icon: Droplets,
      tint: '#0891b2',
      image: '/hd_assets/mosquito_hd.jpg',
    },
    {
      title: 'Bed Bug Removal',
      desc: '2-session super-heated thermal steam & 90-day guarantee.',
      link: '/services/bed-bug',
      badge: '90-Day Guarantee',
      icon: BedDouble,
      tint: '#7c3aed',
      image: '/hd_assets/bedbug_hd.jpg',
    },
    {
      title: 'Bird Netting & Spikes',
      desc: 'Garware HDPE UV-treated balcony nets & SS304 spikes.',
      link: '/services/bird-control',
      badge: 'Garware HDPE',
      icon: Bird,
      tint: '#9bd51c',
      image: '/hd_assets/bird_netting_hd.jpg',
    },
    {
      title: 'Ant Colony Eradication',
      desc: 'Queen nest destruction with non-repellent transfer chemistry.',
      link: '/services/ants',
      badge: 'Queen Kill',
      icon: Bug,
      tint: '#0891b2',
      image: '/hd_assets/ant_hd.jpg',
    },
    {
      title: 'Housefly Control',
      desc: 'Bio-enzyme drain sanitation and residual contact surface shields.',
      link: '/services/housefly',
      badge: 'Hygiene Shield',
      icon: Zap,
      tint: '#d97706',
      image: '/hd_assets/housefly_hd.jpg',
    },
    {
      title: 'Silverfish Control',
      desc: 'Document and archive protection with inorganic desiccant dust.',
      link: '/services/silverfish',
      badge: 'Paper Defense',
      icon: FileText,
      tint: '#64748b',
      image: '/hd_assets/silverfish_hd.jpg',
    },
    {
      title: 'Spider Web Removal',
      desc: 'Complete ceiling de-webbing & repellent perimeter barriers.',
      link: '/services/spider',
      badge: 'Cobweb Clean',
      icon: Sparkles,
      tint: '#475569',
      image: '/hd_assets/spider_hd.jpg',
    },
  ];

  const industries = [
    'Hospitality',
    'Residential Area',
    'Factory Canteens',
    'Beverage Processing',
    'Pharmaceutical Industries',
    'Packaging Material Industries',
    'Banks',
    'Schools',
    'Corporate Offices',
    'Food Processing Industries',
    'Food Packaging Industries',
  ];

  const sectors = [
    { title: 'Residential & Apartments', desc: 'Customized 1 BHK to 5 BHK & Villa AMC protection packages.' },
    { title: 'Food & Hospitality', desc: 'HACCP compliant pest eradication for restaurants & hotels.' },
    { title: 'Hospitals & Healthcare', desc: 'Sterile, zero-odor insect control for wards & cleanrooms.' },
    { title: 'Warehousing & Logistics', desc: 'Rodent proofing & grain pest fumigation for supply chains.' },
    { title: 'IT Parks & Offices', desc: 'Discreet after-hours commercial pest maintenance schedules.' },
    { title: 'Manufacturing & Plants', desc: 'ISO 9001 audit-ready commercial pest management solutions.' },
  ];

  const testimonials = [
    {
      name: 'Rajesh Sharma',
      city: 'Mumbai',
      stars: 5,
      comment: 'Tech House cockroach gel treatment completely eliminated cockroaches in our 3 BHK kitchen within 2 days! Zero smell and no need to remove utensils.',
      color: '#159bd3',
    },
    {
      name: 'Priya Nair',
      city: 'Bangalore',
      stars: 5,
      comment: 'The 3-Year Termite Drill-Fill-Seal service was executed neatly. The technicians sealed all drilled holes with matching cement plugs. Very professional!',
      color: '#7c3aed',
    },
    {
      name: 'Amitabh Gupta',
      city: 'Delhi NCR',
      stars: 5,
      comment: 'Garware bird netting installed on our 4th floor balcony has kept pigeons away completely. Sturdy quality and quick installation within 3 hours.',
      color: '#9bd51c',
    },
  ];
  const initialsOf = (name) =>
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const cities = ['Mumbai', 'Navi Mumbai', 'Thane', 'Pune', 'Delhi NCR', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Ahmedabad'];

  return (
    <div className="sf-wrapper">
      {/* 1. TOP STICKY PROMO BANNER */}
      {promoBarVisible && promo.enabled && (
        <div className="sf-promo-bar">
          <Sparkles size={16} />
          <span>{promo.text}</span>
          <div className="sf-promo-code-pill" onClick={handleCopyCode} title="Click to Copy Code">
            <span>{promo.code}</span>
            {copiedCode ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
          </div>
          <button
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: 'auto' }}
            onClick={() => setPromoBarVisible(false)}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 2. HEADER NAVBAR */}
      <header className="sf-navbar">
        <a href="/" className="sf-logo">
          <img className="sf-logo-img" src="/tech-house-logo.png" alt="Tech House Pest Control" />
          <div>
            Tech House <span style={{ color: '#38bdf8' }}>Pest Control</span>
          </div>
        </a>

        <ul className="sf-nav-links">
          <li><a href="#calculator" className="sf-nav-link">Price Calculator</a></li>
          <li><a href="#services" className="sf-nav-link">Services</a></li>
          <li><a href="#sectors" className="sf-nav-link">Sectors</a></li>
          <li><a href="/about" className="sf-nav-link">About Us</a></li>
          <li><a href="/contact" className="sf-nav-link">Contact</a></li>
        </ul>

        <div className="sf-header-actions">
          <button
            type="button"
            className="sf-btn-login"
            style={{ background: '#f59e0b', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setComplaintDialogOpen(true)}
          >
            <MessageSquareWarning size={15} />
            <span>Complaint</span>
          </button>

          <a href={`tel:${config?.contactInfo?.phone || '18002122125'}`} className="sf-btn-call">
            <Phone size={16} />
            <span>{config?.contactInfo?.tollFree || '1800-212-2125'}</span>
          </a>

          <button className="sf-btn-login" onClick={handleStaffLoginClick}>
            <Lock size={15} />
            <span>{user ? 'Admin Dashboard' : 'Staff Login'}</span>
          </button>
        </div>
      </header>

      {/* 2B. ADMIN-MANAGED PHOTO BANNER WITH OVERLAY QUOTE */}
      {enabledBanners.length > 0 && (
        <section className="sf-photo-banner">
          {enabledBanners.map((banner, idx) => (
            <div
              key={idx}
              className={`sf-photo-banner-slide ${idx === activeBannerIndex % enabledBanners.length ? 'active' : ''}`}
              style={{ backgroundImage: `url(${banner.imageUrl})` }}
            />
          ))}
          <div className="sf-photo-banner-scrim" />
          {enabledBanners[activeBannerIndex % enabledBanners.length]?.quote && (
            <blockquote className="sf-photo-banner-quote">
              <Quote size={22} />
              <p>{enabledBanners[activeBannerIndex % enabledBanners.length].quote}</p>
              {enabledBanners[activeBannerIndex % enabledBanners.length].quoteAuthor && (
                <cite>{enabledBanners[activeBannerIndex % enabledBanners.length].quoteAuthor}</cite>
              )}
            </blockquote>
          )}
          {enabledBanners.length > 1 && (
            <div className="sf-photo-banner-dots">
              {enabledBanners.map((_, idx) => (
                <button
                  key={idx}
                  className={idx === activeBannerIndex % enabledBanners.length ? 'active' : ''}
                  onClick={() => setActiveBannerIndex(idx)}
                  aria-label={`Show banner ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 3. HERO & DYNAMIC CALCULATOR SECTION */}
      <div className="sf-hero-backdrop" id="calculator">
        <section className="sf-hero sf-reveal">
        <div className="sf-hero-left">
          <div className="sf-hero-tag">
            <ShieldCheck size={15} />
            <span>ISO 9001:2026 Certified Science-Led Platform</span>
          </div>

          <h1 className="sf-hero-title">
            Advanced Residential & Commercial Pest Eradication
          </h1>

          <p className="sf-hero-sub">
            Protect your property from severe disease risks with 100% odourless, child & pet safe Blitz Intensive Gel formulations. Instant online booking with price guarantee.
          </p>

          {/* Health Risk Framing Cards */}
          <div className="sf-risk-grid">
            <div className="sf-risk-card">
              <div className="sf-risk-icon">
                <AlertTriangle size={18} />
              </div>
              <h4>Salmonella & E. coli</h4>
              <p>Cockroaches contaminate open food & prep counters with bacterial pathogens.</p>
            </div>

            <div className="sf-risk-card">
              <div className="sf-risk-icon">
                <AlertTriangle size={18} />
              </div>
              <h4>Asthma Triggers</h4>
              <p>Pest molts and droppings release airborne allergens affecting children.</p>
            </div>

            <div className="sf-risk-card">
              <div className="sf-risk-icon">
                <AlertTriangle size={18} />
              </div>
              <h4>Property Damage</h4>
              <p>Termites & wood borers hollow out furniture, doors, and flooring unnoticed.</p>
            </div>
          </div>

          {/* Science-Led Service Highlights (replaces short duplicate quote card) */}
          <div className="sf-hero-trust-badges">
            <div className="sf-hero-trust-item">
              <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0 }} />
              <div>
                <strong>Bayer &amp; Syngenta Certified Chemistry</strong>
                <span>100% CIB approved, odourless, baby &amp; pet safe formulations</span>
              </div>
            </div>
            <div className="sf-hero-trust-item">
              <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0 }} />
              <div>
                <strong>365-Day Unlimited AMC Warranty</strong>
                <span>Unlimited free re-treatments with zero questions asked on AMC packages</span>
              </div>
            </div>
            <div className="sf-hero-trust-item">
              <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0 }} />
              <div>
                <strong>Verified Expert Entomologists</strong>
                <span>Background-verified technicians with digital work reporting &amp; GPS tracking</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Calculator Widget */}
        <div className="sf-calc-card">
          <div className="sf-calc-header">
            <h3>Instant Pricing Calculator</h3>
            <span className="sf-calc-live-badge">
              <Calculator size={12} />
              Live Rate Engine
            </span>
          </div>

          {/* Service Selector Tabs — Sliding Carousel */}
          <div className="sf-service-slider-wrap">
            <button
              type="button"
              className="sf-slider-nav-btn prev"
              onClick={() => scrollServices('left')}
              aria-label="Previous service"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="sf-service-tabs-slider" ref={serviceTabsRef}>
              {services.map((serv) => (
                <div
                  key={serv.id}
                  className={`sf-service-tab-slide ${selectedService === serv.id ? 'active' : ''}`}
                  onClick={() => setSelectedService(serv.id)}
                >
                  <span className="sf-tab-name">{serv.name}</span>
                  <span className="sf-tab-badge">{serv.badge}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="sf-slider-nav-btn next"
              onClick={() => scrollServices('right')}
              aria-label="Next service"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Premise Allotments Grid */}
          <span className="sf-label">Select Premise Allotment</span>
          <div className="sf-allotments-grid">
            {allotments.map((allot) => (
              <button
                key={allot.id}
                className={`sf-allotment-btn ${selectedAllotmentId === allot.id ? 'active' : ''}`}
                onClick={() => handleSelectAllotment(allot)}
              >
                {allot.label}
              </button>
            ))}
          </div>

          {/* Sqft Input & Slider Controls */}
          <div className="sf-sqft-box">
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Carpet Area:</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <input
                type="number"
                className="sf-sqft-input"
                value={sqft}
                min="200"
                max="5000"
                onChange={(e) => setSqft(Number(e.target.value) || 200)}
              />
              <span style={{ fontSize: '12px', color: '#64748b' }}>sq ft</span>
            </div>
          </div>

          <input
            type="range"
            className="sf-range-slider"
            min="200"
            max="3000"
            step="50"
            value={sqft}
            onChange={(e) => setSqft(Number(e.target.value))}
          />

          {/* Area Threshold Validation Notice */}
          {sqft < rules.minSqft && (
            <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '16px' }}>
              ⚠️ Minimum billable area is {rules.minSqft} sq ft.
            </div>
          )}
          {sqft > rules.maxSqftInspectionThreshold && (
            <div style={{ color: '#f59e0b', fontSize: '12px', marginBottom: '16px' }}>
              ⚠️ Large Property ({sqft} sqft): Includes Complimentary On-Site Inspection.
            </div>
          )}

          {/* Package Type (Single vs 1-Year AMC) */}
          <span className="sf-label">Select Service Package</span>
          <div className="sf-plan-grid">
            <div
              className={`sf-plan-card ${packageType === 'single' ? 'active' : ''}`}
              onClick={() => setPackageType('single')}
            >
              <span className="sf-plan-title">Single Knockdown</span>
              <span className="sf-plan-desc">1 Intensive Service Visit</span>
            </div>

            <div
              className={`sf-plan-card ${packageType === 'amc' ? 'active' : ''}`}
              onClick={() => setPackageType('amc')}
            >
              <span className="sf-plan-tag">365 Days Warranty</span>
              <span className="sf-plan-title">1-Year AMC (3 Visits)</span>
              <span className="sf-plan-desc">Unlimited Free Re-treatments</span>
            </div>
          </div>

          {/* Total Amount Alone (No Calculation Separation) */}
          <div className="sf-price-summary-single">
            <div className="sf-coupon-section">
              <label className="sf-coupon-label">Have a coupon code?</label>
              <div className="sf-coupon-row">
                <input
                  className="sf-coupon-input"
                  value={manualCoupon}
                  onChange={(e) => setManualCoupon(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                />
                <button
                  type="button"
                  className="sf-coupon-apply-btn"
                  onClick={applyManualCoupon}
                  disabled={checkingCoupon || !manualCoupon.trim()}
                >
                  {checkingCoupon ? 'Checking…' : 'Apply'}
                </button>
              </div>
              {couponMessage && (
                <div style={{ color: appliedCoupon ? '#34d399' : '#f87171', fontSize: '12px', marginTop: '6px' }}>
                  {couponMessage}
                </div>
              )}
            </div>

            <div className="sf-single-total-row">
              <div>
                <span className="sf-single-total-title">Total Payable Amount</span>
                <span className="sf-single-total-sub">All Inclusive (Service, Chemicals &amp; GST)</span>
              </div>
              <div className="sf-single-total-val">
                ₹{grandTotal.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <button className="sf-btn-book" onClick={() => setBookingModalOpen(true)}>
            <span>BOOK SERVICE NOW</span>
            <ArrowRight size={17} />
          </button>

          <div className="sf-calc-trust">
            <span className="sf-calc-trust-title">Guaranteed Standards</span>
            <ul>
              <li><CheckCircle2 size={13} /> 100% Odourless Gel</li>
              <li><CheckCircle2 size={13} /> Bayer / Syngenta Safe</li>
              <li><CheckCircle2 size={13} /> Certified Entomologists</li>
              <li><CheckCircle2 size={13} /> 365-Day AMC Warranty</li>
            </ul>
          </div>
        </div>
        </section>
      </div>

      {/* 4. EMERGENCY 24/7 CALL-BACK BANNER */}
      <section className="sf-reveal" style={{ background: 'linear-gradient(135deg, #063d59 0%, #087bad 100%)', padding: '30px 24px', color: '#fff', borderRadius: '24px', maxWidth: '1280px', margin: '20px auto', boxShadow: '0 8px 24px rgba(6,61,89,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <span style={{ background: '#38bdf8', color: '#063d59', fontWeight: 800, fontSize: '11px', padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase' }}>24/7 Emergency Desk</span>
            <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '8px 0 4px 0' }}>Need Urgent Pest Treatment Or Site Inspection?</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#e0f2fe' }}>Speak with our certified entomologist directly or request an instant call-back within 15 minutes.</p>
          </div>

          {callbackSubmitted ? (
            <div style={{ background: '#10b981', padding: '12px 24px', borderRadius: '14px', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={20} /> Request Received! We will call you in 15 mins.
            </div>
          ) : (
            <form onSubmit={handleCallbackSubmit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input type="text" required placeholder="Your Name" value={callbackForm.name} onChange={(e) => setCallbackForm({ ...callbackForm, name: e.target.value })} style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', fontSize: '13px' }} />
              <input type="tel" required placeholder="Phone Number" value={callbackForm.phone} onChange={(e) => setCallbackForm({ ...callbackForm, phone: e.target.value })} style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', fontSize: '13px' }} />
              <button type="submit" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>CALL ME BACK</button>
            </form>
          )}
        </div>
      </section>

      {/* 5. DIAGNOSTIC INFESTATION QUIZ SECTION */}
      <section className="max-w-7xl mx-auto my-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-sm sf-reveal" id="quiz">
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 text-indigo-500 text-xs font-extrabold uppercase tracking-wider mb-2">
            <Sparkles size={16} /> Infestation Diagnostic Assessment
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
            Evaluate Your Infestation Level in 10 Seconds
          </h2>
          <p className="text-sm text-slate-500">
            Answer 3 diagnostic questions to calculate infestation severity and receive a tailored treatment recommendation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center flex flex-col justify-between hover:-translate-y-1 hover:border-sky-500 hover:shadow-md transition-all duration-300">
            <p className="text-sm font-bold text-slate-800 mb-4 leading-snug">1. Do you see pest droppings, egg cases, or dead insects?</p>
            <div className="flex gap-3 justify-center">
              <button className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-bold transition-all duration-200 shadow-xs cursor-pointer ${quizAnswers.q1 === true ? 'bg-red-500 text-white border-red-500 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-sky-500 hover:text-sky-600'}`} onClick={() => handleQuizAnswer('q1', true)}>Yes</button>
              <button className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-bold transition-all duration-200 shadow-xs cursor-pointer ${quizAnswers.q1 === false ? 'bg-sky-500 text-white border-sky-500 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-sky-500 hover:text-sky-600'}`} onClick={() => handleQuizAnswer('q1', false)}>No</button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center flex flex-col justify-between hover:-translate-y-1 hover:border-sky-500 hover:shadow-md transition-all duration-300">
            <p className="text-sm font-bold text-slate-800 mb-4 leading-snug">2. Do you spot pests active during daytime hours?</p>
            <div className="flex gap-3 justify-center">
              <button className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-bold transition-all duration-200 shadow-xs cursor-pointer ${quizAnswers.q2 === true ? 'bg-red-500 text-white border-red-500 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-sky-500 hover:text-sky-600'}`} onClick={() => handleQuizAnswer('q2', true)}>Yes</button>
              <button className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-bold transition-all duration-200 shadow-xs cursor-pointer ${quizAnswers.q2 === false ? 'bg-sky-500 text-white border-sky-500 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-sky-500 hover:text-sky-600'}`} onClick={() => handleQuizAnswer('q2', false)}>No</button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center flex flex-col justify-between hover:-translate-y-1 hover:border-sky-500 hover:shadow-md transition-all duration-300">
            <p className="text-sm font-bold text-slate-800 mb-4 leading-snug">3. Are pests spreading into bedrooms or closets?</p>
            <div className="flex gap-3 justify-center">
              <button className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-bold transition-all duration-200 shadow-xs cursor-pointer ${quizAnswers.q3 === true ? 'bg-red-500 text-white border-red-500 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-sky-500 hover:text-sky-600'}`} onClick={() => handleQuizAnswer('q3', true)}>Yes</button>
              <button className={`flex-1 py-2.5 px-4 rounded-xl border text-sm font-bold transition-all duration-200 shadow-xs cursor-pointer ${quizAnswers.q3 === false ? 'bg-sky-500 text-white border-sky-500 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-sky-500 hover:text-sky-600'}`} onClick={() => handleQuizAnswer('q3', false)}>No</button>
            </div>
          </div>
        </div>

        {quizSubmitted && (
          <div className="mt-6 p-6 rounded-2xl bg-slate-900 border text-center shadow-lg transition-all duration-300" style={{ borderColor: getQuizSeverity().color }}>
            <div className="font-black text-base mb-1 tracking-wide" style={{ color: getQuizSeverity().color }}>
              DIAGNOSTIC RESULT: {getQuizSeverity().level}
            </div>
            <div className="text-sm text-slate-300 mb-4">
              Recommended Plan: <strong className="text-white">{getQuizSeverity().rec}</strong>
            </div>
            <button className="px-6 py-2.5 rounded-xl font-bold text-white shadow-md hover:scale-105 transition-all duration-200 cursor-pointer mx-auto block" style={{ background: getQuizSeverity().color }} onClick={() => { setPackageType('amc'); document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' }); }}>
              Apply Recommended Plan to Calculator
            </button>
          </div>
        )}
      </section>

      {/* 6. COMPLETE 10-PRODUCT SERVICE GRID — Dedicated page on click */}
      <section className="sf-section sf-reveal" id="services">
        <div className="sf-section-title-wrap">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0284c7', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            <Sparkles size={16} /> Specialized Solutions
          </div>
          <h2 className="sf-section-title">Comprehensive 10-Pest Treatment Suite</h2>
          <div className="sf-section-title-underline" />
          <p style={{ color: '#64748b', fontSize: '14.5px', maxWidth: '640px', margin: '10px auto 0 auto' }}>
            Select any pest category below to inspect its biological life cycle, authentic field evidence, and tailored eradication protocol.
          </p>
        </div>
        <div className="sf-service-tiles-grid">
          {serviceGrid.map((item, idx) => (
            <a
              key={idx}
              href={item.link}
              className="sf-service-tile-card"
            >
              <div className="sf-service-tile-img-box">
                <span className="sf-service-tile-badge">{item.badge}</span>
                <img
                  src={item.image}
                  alt={item.title}
                  className="sf-service-tile-img"
                  loading="lazy"
                />
              </div>
              <div className="sf-service-tile-body">
                <h3 className="sf-service-tile-name">{item.title}</h3>
                <span className="sf-service-tile-readmore">
                  Read more
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* 7. WHY CHOOSE TECH HOUSE (6 PILLARS) */}
      <section className="sf-section sf-reveal" style={{ background: '#f8fafc', borderRadius: '24px', padding: '40px' }}>
        <h2 className="sf-section-title">Why Tech House Pest Control?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <Award size={28} style={{ color: '#159bd3', marginBottom: '12px' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#063d59' }}>100% CIB Approved Chemicals</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>We strictly use government registered, low-toxicity formulations from Bayer and Syngenta.</p>
          </div>

          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <ShieldCheck size={28} style={{ color: '#10b981', marginBottom: '12px' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#063d59' }}>Zero Kitchen Cabinet Emptying</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>Advanced odourless gel baiting allows treatment without removing utensils or food items.</p>
          </div>

          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <User size={28} style={{ color: '#38bdf8', marginBottom: '12px' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#063d59' }}>Certified Technicians</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>Field staff undergo 120+ hours of pest biology training and background verification.</p>
          </div>

          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <Calendar size={28} style={{ color: '#818cf8', marginBottom: '12px' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#063d59' }}>365 Days Service Warranty</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>Our AMC plans include unlimited free complaint callouts whenever pests recur.</p>
          </div>
        </div>
      </section>

      {/* 8. INDUSTRIES WE SERVE — PROTECTING EVERY SECTOR (pill grid) */}
      <section className="sf-industries sf-reveal" id="sectors">
        <div className="sf-industries-eyebrow">Industries We Serve</div>
        <h2 className="sf-industries-title">Protecting Every Sector</h2>
        <div className="sf-industries-pills">
          {industries.map((label, idx) => (
            <span key={idx} className="sf-industry-pill">{label}</span>
          ))}
        </div>
      </section>

      {/* 8B. CUSTOMIZED SECTOR SOLUTIONS (detail cards) */}
      <section className="sf-section sf-reveal">
        <h2 className="sf-section-title">Customized Sector Solutions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {sectors.map((sec, idx) => (
            <div key={idx} style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <Building2 size={24} style={{ color: '#159bd3', shrink: 0 }} />
              <div>
                <h4 style={{ margin: '0 0 4px 0', color: '#063d59', fontSize: '15px' }}>{sec.title}</h4>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: '1.5' }}>{sec.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 9. 4-STEP METHODOLOGY */}
      <section className="sf-section sf-reveal">
        <h2 className="sf-section-title">Our 4-Step Scientific Eradication Process</h2>
        <div className="sf-process-grid">
          <div className="sf-process-card">
            <span className="sf-step-num">01</span>
            <h3>Inspect & Diagnose</h3>
            <p>Thermal diagnostics identify pest nesting hotspots and moisture breeding zones.</p>
          </div>
          <div className="sf-process-card">
            <span className="sf-step-num">02</span>
            <h3>Target Knockdown</h3>
            <p>Blitz Intensive spray knocks down active adult pests on contact along baseboards.</p>
          </div>
          <div className="sf-process-card">
            <span className="sf-step-num">03</span>
            <h3>Domino Cascade Gel</h3>
            <p>Odourless gel points destroy hidden queen colonies deep within crevices.</p>
          </div>
          <div className="sf-process-card">
            <span className="sf-step-num">04</span>
            <h3>Shield & Monitor</h3>
            <p>Quarterly re-treatment audits ensure 365 days of complete pest-free protection.</p>
          </div>
        </div>
      </section>

      {/* 10. HERITAGE & SCALE NUMBERS */}
      <section className="sf-reveal" style={{ background: '#063d59', padding: '50px 24px', color: '#fff', borderRadius: '24px', margin: '40px auto', maxWidth: '1280px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', textAlign: 'center' }}>
          <div>
            <span style={{ fontSize: '42px', fontWeight: 900, color: '#38bdf8' }}>25+</span>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#92c4db' }}>Years Industry Experience</p>
          </div>
          <div>
            <span style={{ fontSize: '42px', fontWeight: 900, color: '#38bdf8' }}>250+</span>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#92c4db' }}>Local Branch Hubs</p>
          </div>
          <div>
            <span style={{ fontSize: '42px', fontWeight: 900, color: '#10b981' }}>50L+</span>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#92c4db' }}>Satisfied Homes & Businesses</p>
          </div>
          <div>
            <span style={{ fontSize: '42px', fontWeight: 900, color: '#9bd51c' }}>100%</span>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#92c4db' }}>Satisfaction Guarantee</p>
          </div>
        </div>
      </section>

      {/* 11. VERIFIED CUSTOMER TESTIMONIALS */}
      <section className="sf-section sf-reveal">
        <h2 className="sf-section-title">Verified Customer Reviews</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {testimonials.map((t, idx) => (
            <div key={idx} style={{ background: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', gap: '2px', color: '#f59e0b', marginBottom: '12px' }}>
                {[...Array(t.stars)].map((_, i) => (
                  <Star key={i} size={16} fill="#f59e0b" />
                ))}
              </div>
              <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: '1.6', marginBottom: '18px' }}>"{t.comment}"</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: t.color,
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {initialsOf(t.name)}
                  </span>
                  <div style={{ fontSize: '12.5px' }}>
                    <strong style={{ display: 'block', color: '#063d59' }}>{t.name}</strong>
                    <span style={{ color: '#94a3b8' }}>{t.city}</span>
                  </div>
                </div>
                <span style={{ color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px' }}>
                  <CheckCircle2 size={13} /> Verified
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 12. CITY COVERAGE LOCATOR */}
      <section className="sf-section sf-reveal" style={{ background: '#ffffff', padding: '40px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
        <h2 className="sf-section-title">Pest Control Services Available Across Major Cities</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
          {cities.map((city, idx) => (
            <span key={idx} style={{ background: '#f1f5f9', color: '#063d59', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={13} style={{ color: '#159bd3' }} /> {city}
            </span>
          ))}
        </div>
      </section>

      {/* 13. FAQS — ACCORDION WITHOUT ANIMATION */}
      <section className="sf-section sf-reveal" id="faqs">
        <div className="sf-section-title-wrap">
          <h2>Frequently Asked Questions</h2>
          <div className="sf-section-title-underline" />
        </div>
        <div className="sf-faq-columns-wrapper">
          <div className="sf-faq-col">
            {col1Faqs.map((faq, idx) => {
              const actualIdx = idx * 2;
              const isOpen = openFaqIndex === actualIdx;
              return (
                <div key={actualIdx} className={`sf-faq-card ${isOpen ? 'active' : ''}`}>
                  <button
                    type="button"
                    className="sf-faq-header-btn"
                    onClick={() => setOpenFaqIndex(isOpen ? null : actualIdx)}
                    aria-expanded={isOpen}
                  >
                    <span className="sf-faq-question-text">{faq.q}</span>
                    <span className="sf-faq-indicator">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="sf-faq-body">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="sf-faq-col">
            {col2Faqs.map((faq, idx) => {
              const actualIdx = idx * 2 + 1;
              const isOpen = openFaqIndex === actualIdx;
              return (
                <div key={actualIdx} className={`sf-faq-card ${isOpen ? 'active' : ''}`}>
                  <button
                    type="button"
                    className="sf-faq-header-btn"
                    onClick={() => setOpenFaqIndex(isOpen ? null : actualIdx)}
                    aria-expanded={isOpen}
                  >
                    <span className="sf-faq-question-text">{faq.q}</span>
                    <span className="sf-faq-indicator">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="sf-faq-body">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 14. COMPREHENSIVE FOOTER & LEGAL LINKS */}
      <StorefrontFooter onRegisterComplaint={() => setComplaintDialogOpen(true)} />

      {/* 15. INSTANT BOOKING MODAL */}
      {bookingModalOpen && (
        <div className="sf-modal-overlay">
          <div className="sf-modal-box">
            <div className="sf-modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
                {bookingSuccess ? 'Booking Confirmed!' : 'Confirm Your Instant Service Booking'}
              </h3>
              <button
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                onClick={() => {
                  setBookingModalOpen(false);
                  setBookingSuccess(null);
                  setQuickOrder(null);
                }}
              >
                <X size={20} />
              </button>
            </div>

            {bookingSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                  <CheckCircle2 size={36} />
                </div>
                <h4 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>
                  Booking Reference: {bookingSuccess.bookingRef}
                </h4>
                <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '24px' }}>
                  {bookingSuccess.message} Our regional technician has received your dispatch order.
                </p>
                <button
                  className="sf-btn-book"
                  onClick={() => {
                    setBookingModalOpen(false);
                    setBookingSuccess(null);
                    setQuickOrder(null);
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit}>
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', color: '#38bdf8' }}>
                  {quickOrder ? (
                    <>
                      <strong>Selected Order:</strong> {quickOrder.serviceName} — {quickOrder.serviceType} ({quickOrder.sqftLabel}) | {quickOrder.callBackOnly ? 'Our team will call you with a custom quote.' : <>Total: <strong>₹{quickOrder.finalPrice?.toLocaleString('en-IN')}</strong></>}
                    </>
                  ) : (
                    <>
                      <strong>Selected Order:</strong> {currentService.name} ({currentAllotment.label} - {sqft} sqft) | Package: {packageType === 'amc' ? '1-Year AMC (3 Visits)' : 'Single Service'} | Total: <strong>₹{grandTotal.toLocaleString('en-IN')}</strong>
                    </>
                  )}
                </div>

                <div className="sf-form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    className="sf-form-input"
                    required
                    placeholder="Enter your complete name"
                    value={bookingForm.customerName}
                    onChange={(e) => setBookingForm({ ...bookingForm, customerName: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="sf-form-group">
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      className="sf-form-input"
                      required
                      placeholder="+91 9876543210"
                      value={bookingForm.phone}
                      onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="sf-form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      className="sf-form-input"
                      placeholder="name@gmail.com"
                      value={bookingForm.email}
                      onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="sf-form-group">
                  <label>Complete Property Address *</label>
                  <input
                    type="text"
                    className="sf-form-input"
                    required
                    placeholder="Flat No, Building, Street, Pincode"
                    value={bookingForm.address}
                    onChange={(e) => setBookingForm({ ...bookingForm, address: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="sf-form-group">
                    <label>Preferred Date *</label>
                    <input
                      type="date"
                      className="sf-form-input"
                      required
                      value={bookingForm.preferredDate}
                      onChange={(e) => setBookingForm({ ...bookingForm, preferredDate: e.target.value })}
                    />
                  </div>

                  <div className="sf-form-group">
                    <label>Preferred Time Slot *</label>
                    <select
                      className="sf-form-input"
                      value={bookingForm.preferredTimeSlot}
                      onChange={(e) => setBookingForm({ ...bookingForm, preferredTimeSlot: e.target.value })}
                    >
                      <option value="Morning (9:00 AM - 1:00 PM)">Morning (9:00 AM - 1:00 PM)</option>
                      <option value="Afternoon (1:00 PM - 5:00 PM)">Afternoon (1:00 PM - 5:00 PM)</option>
                      <option value="Evening (5:00 PM - 8:00 PM)">Evening (5:00 PM - 8:00 PM)</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="sf-btn-book" disabled={bookingLoading} style={{ marginTop: '12px' }}>
                  {bookingLoading ? 'Confirming Booking...' : 'CONFIRM BOOKING (PAY ON SERVICE)'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* REGISTER COMPLAINT DIALOG */}
      <RegisterComplaintDialog open={complaintDialogOpen} onOpenChange={setComplaintDialogOpen} />

      {/* FLOATING BACK TO TOP BUTTON */}
      <ScrollToTopButton />
    </div>
  );
}
