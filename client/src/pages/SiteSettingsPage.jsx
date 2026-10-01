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
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';

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
    legalContent: { privacyPolicy: '', legalStatement: '', cookiePolicy: '' },
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

  // Premise Allotment Handlers (Supports Global Fallback and Service-Specific Allotments)
  const [selectedServiceForAllotment, setSelectedServiceForAllotment] = useState('global');

  const getActiveAllotments = () => {
    if (selectedServiceForAllotment === 'global') {
      return config.premisesAllotments || [];
    }
    const serv = (config.serviceCategories || []).find((s) => s.id === selectedServiceForAllotment);
    if (!serv) return [];
    if (!serv.premisesAllotments || serv.premisesAllotments.length === 0) {
      return config.premisesAllotments || [];
    }
    return serv.premisesAllotments;
  };

  const handleAllotmentChange = (index, field, val) => {
    if (selectedServiceForAllotment === 'global') {
      const updated = [...(config.premisesAllotments || [])];
      updated[index] = { ...updated[index], [field]: val };
      setConfig({ ...config, premisesAllotments: updated });
    } else {
      const servIndex = (config.serviceCategories || []).findIndex((s) => s.id === selectedServiceForAllotment);
      if (servIndex === -1) return;
      const updatedCategories = [...(config.serviceCategories || [])];
      const targetServ = { ...updatedCategories[servIndex] };
      const currentList = targetServ.premisesAllotments && targetServ.premisesAllotments.length > 0
        ? [...targetServ.premisesAllotments]
        : [...(config.premisesAllotments || [])];
      currentList[index] = { ...currentList[index], [field]: val };
      targetServ.premisesAllotments = currentList;
      updatedCategories[servIndex] = targetServ;
      setConfig({ ...config, serviceCategories: updatedCategories });
    }
  };

  const handleAddAllotment = () => {
    const newId = `custom_${Date.now()}`;
    const newAllotment = { id: newId, label: 'New Allotment', defaultSqft: 1000, basePrice: 1999, amcPriceMultiplier: 2.2, description: '' };
    if (selectedServiceForAllotment === 'global') {
      setConfig({
        ...config,
        premisesAllotments: [...(config.premisesAllotments || []), newAllotment],
      });
    } else {
      const servIndex = (config.serviceCategories || []).findIndex((s) => s.id === selectedServiceForAllotment);
      if (servIndex === -1) return;
      const updatedCategories = [...(config.serviceCategories || [])];
      const targetServ = { ...updatedCategories[servIndex] };
      const currentList = targetServ.premisesAllotments && targetServ.premisesAllotments.length > 0
        ? [...targetServ.premisesAllotments]
        : [...(config.premisesAllotments || [])];
      targetServ.premisesAllotments = [...currentList, newAllotment];
      updatedCategories[servIndex] = targetServ;
      setConfig({ ...config, serviceCategories: updatedCategories });
    }
  };

  const handleRemoveAllotment = (index) => {
    const currentList = getActiveAllotments();
    if (currentList.length <= 1) {
      showToast('error', 'Minimum 1 premise allotment is required.');
      return;
    }
    if (selectedServiceForAllotment === 'global') {
      const updated = currentList.filter((_, i) => i !== index);
      setConfig({ ...config, premisesAllotments: updated });
    } else {
      const servIndex = (config.serviceCategories || []).findIndex((s) => s.id === selectedServiceForAllotment);
      if (servIndex === -1) return;
      const updatedCategories = [...(config.serviceCategories || [])];
      const targetServ = { ...updatedCategories[servIndex] };
      targetServ.premisesAllotments = currentList.filter((_, i) => i !== index);
      updatedCategories[servIndex] = targetServ;
      setConfig({ ...config, serviceCategories: updatedCategories });
    }
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
      <div className="page flex flex-col items-center justify-center gap-3 py-16 text-center">
        <RefreshCw size={32} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading Storefront Site Configurations...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Site Changes & Storefront Management</h2>
          <p className="text-sm text-muted-foreground">
            Configure dynamic pricing rates (1 BHK, 2 BHK, etc.), promotional coupon banners, and public contact info live on your homepage storefront.
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          <span>{saving ? 'Publishing Changes...' : 'Publish Live Site Changes'}</span>
        </Button>
      </div>

      {toast.msg && (
        <div
          className={
            'mb-5 flex items-center gap-2.5 rounded-xl border px-4.5 py-3 text-sm font-semibold ' +
            (toast.type === 'success'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-destructive/30 bg-destructive/10 text-destructive')
          }
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* 1. PROMOTIONAL BANNER & COUPON CODE MANAGER */}
        <Card>
          <CardHeader className="flex-row items-center gap-2.5 space-y-0">
            <Tag size={20} className="text-primary" />
            <CardTitle>Promotional Banner & Instant Coupon Settings</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch
                checked={Boolean(config.promoBanner?.enabled)}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    promoBanner: { ...config.promoBanner, enabled: checked },
                  })
                }
              />
              <Label className="text-sm font-semibold text-foreground">Enable Top Promotional Banner on Homepage</Label>
            </div>

            <div className="grid gap-1.5">
              <Label>Promo Coupon Code</Label>
              <Input
                type="text"
                value={config.promoBanner?.code || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    promoBanner: { ...config.promoBanner, code: e.target.value.toUpperCase() },
                  })
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Discount Percentage (%)</Label>
              <Input
                type="number"
                value={config.promoBanner?.discountPercent || 0}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    promoBanner: { ...config.promoBanner, discountPercent: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Banner Promotional Headline</Label>
              <Input
                type="text"
                value={config.promoBanner?.text || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    promoBanner: { ...config.promoBanner, text: e.target.value },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* 1B. HOMEPAGE HERO BANNER IMAGES & QUOTES */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2.5">
              <ImageIcon size={20} className="text-primary" />
              <CardTitle>Homepage Hero Banner Images &amp; Quotes</CardTitle>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddBanner}
              disabled={(config.heroBanners || []).length >= MAX_BANNERS}
            >
              <Plus size={16} />
              <span>Add Banner</span>
            </Button>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-[13px] text-muted-foreground">
              Upload photos (JPEG/PNG/WebP, under 1.8MB each) with an optional overlay quote for the homepage hero. When
              more than one banner is enabled they rotate automatically; leave empty to keep the default background.
            </p>

            {bannerError && (
              <div className="mb-3.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-[13px] text-destructive">
                {bannerError}
              </div>
            )}

            <div className="grid gap-4">
              {(config.heroBanners || []).map((banner, idx) => (
                <div key={idx} className="grid grid-cols-1 gap-4 rounded-2xl border border-border p-3.5 sm:grid-cols-[160px_1fr]">
                  <div>
                    <div className="mb-2 flex h-[110px] w-full items-center justify-center overflow-hidden rounded-[10px] border border-dashed border-border bg-muted text-muted-foreground">
                      {banner.imageUrl ? (
                        <img src={banner.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon size={22} />
                      )}
                    </div>
                    <Label
                      htmlFor={`banner-upload-${idx}`}
                      className="flex cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-semibold shadow-sm hover:bg-muted"
                    >
                      {banner.imageUrl ? 'Replace' : 'Upload'}
                    </Label>
                    <input
                      id={`banner-upload-${idx}`}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleBannerImage(idx, e.target.files?.[0])}
                    />
                  </div>

                  <div className="grid gap-2.5">
                    <div className="grid gap-1.5">
                      <Label className="flex items-center gap-1.5">
                        <Quote size={13} /> Overlay quote
                      </Label>
                      <Input
                        type="text"
                        placeholder='e.g. "A pest-free home is a promise, not a privilege."'
                        value={banner.quote}
                        onChange={(e) => handleBannerField(idx, 'quote', e.target.value)}
                      />
                    </div>
                    <div className="flex items-end gap-2.5">
                      <div className="grid flex-1 gap-1.5">
                        <Label>Quote attribution (optional)</Label>
                        <Input
                          type="text"
                          placeholder="— The Tech House Promise"
                          value={banner.quoteAuthor}
                          onChange={(e) => handleBannerField(idx, 'quoteAuthor', e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2 pb-2.5">
                        <Switch
                          checked={Boolean(banner.enabled)}
                          onCheckedChange={(checked) => handleBannerField(idx, 'enabled', checked)}
                        />
                        <Label className="text-sm">Live</Label>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Remove banner"
                        onClick={() => handleRemoveBanner(idx)}
                      >
                        <Trash2 size={18} className="text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {!(config.heroBanners || []).length && (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
                  No banners yet — the homepage will use its default background until you add one.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 1C. HOMEPAGE INSTANT QUOTE WIDGET */}
        <Card>
          <CardHeader className="flex-row items-center gap-2.5 space-y-0">
            <Sliders size={20} className="text-primary" />
            <CardTitle>Homepage "Get Your Instant Quote" Widget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-[13px] text-muted-foreground">
              Controls the service list, property-size brackets and pricing shown in the instant quote card on the
              homepage hero. Prices are per service at its base sqft bracket, scaled by the sqft multiplier and the
              selected service type multiplier.
            </p>

            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label>Flat Discount (₹)</Label>
                <Input
                  type="number"
                  value={instantQuote.discountFlat}
                  onChange={(e) => setInstantQuote({ discountFlat: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Promo Strip Title</Label>
                <Input
                  type="text"
                  value={instantQuote.promoTitle}
                  onChange={(e) => setInstantQuote({ promoTitle: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Promo Strip Subtitle</Label>
                <Input
                  type="text"
                  value={instantQuote.promoSubtitle}
                  onChange={(e) => setInstantQuote({ promoSubtitle: e.target.value })}
                />
              </div>
            </div>

            {/* Sqft Brackets */}
            <div className="mb-2.5 flex items-center justify-between">
              <strong className="text-[13.5px]">Property Size Brackets</strong>
              <Button type="button" variant="outline" size="sm" onClick={handleAddBracket}>
                <Plus size={16} />
                <span>Add Range</span>
              </Button>
            </div>
            <Card className="mb-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Price Multiplier</TableHead>
                    <TableHead>Call For Quote Only</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instantQuote.sqftBrackets.map((b, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          type="text"
                          className="w-44"
                          value={b.label}
                          onChange={(e) => handleBracketChange(idx, 'label', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          disabled={b.callOnly}
                          className="w-24"
                          value={b.multiplier ?? ''}
                          onChange={(e) => handleBracketChange(idx, 'multiplier', Number(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={Boolean(b.callOnly)}
                          onCheckedChange={(checked) => handleBracketChange(idx, 'callOnly', checked)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveBracket(idx)}>
                          <Trash2 size={18} className="text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Services & Types */}
            <div className="mb-2.5 flex items-center justify-between">
              <strong className="text-[13.5px]">Services</strong>
              <Button type="button" variant="outline" size="sm" onClick={handleAddService}>
                <Plus size={16} />
                <span>Add Service</span>
              </Button>
            </div>

            <div className="grid gap-3.5">
              {instantQuote.services.map((s, sIdx) => (
                <div key={sIdx} className="rounded-xl border border-border p-3.5">
                  <div className="mb-3 flex items-end gap-2.5">
                    <div className="grid flex-[2] gap-1.5">
                      <Label>Service Name</Label>
                      <Input
                        type="text"
                        value={s.label}
                        onChange={(e) => handleServiceMetaChange(sIdx, 'label', e.target.value)}
                      />
                    </div>
                    <div className="grid flex-1 gap-1.5">
                      <Label>Base Price at first bracket (₹)</Label>
                      <Input
                        type="number"
                        value={s.basePrice}
                        onChange={(e) => handleServiceMetaChange(sIdx, 'basePrice', Number(e.target.value))}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Remove service"
                      onClick={() => handleRemoveService(sIdx)}
                    >
                      <Trash2 size={18} className="text-destructive" />
                    </Button>
                  </div>

                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-muted-foreground">Service Types</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-primary"
                      onClick={() => handleAddType(sIdx)}
                    >
                      <Plus size={14} /> Add Type
                    </Button>
                  </div>

                  <div className="grid gap-2">
                    {s.types.map((t, tIdx) => (
                      <div key={tIdx} className="flex items-center gap-2">
                        <Input
                          type="text"
                          placeholder="Type label (e.g. Single Service)"
                          className="flex-[2]"
                          value={t.label}
                          onChange={(e) => handleTypeChange(sIdx, tIdx, 'label', e.target.value)}
                        />
                        <Input
                          type="number"
                          step="0.1"
                          title="Price multiplier"
                          className="w-24"
                          value={t.multiplier}
                          onChange={(e) => handleTypeChange(sIdx, tIdx, 'multiplier', Number(e.target.value))}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveType(sIdx, tIdx)}>
                          <Trash2 size={16} className="text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 2. DYNAMIC PREMISES ALLOTMENT & PRICING TABLE */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2.5">
              <Globe size={20} className="text-primary" />
              <CardTitle>Premises Allotments &amp; Base Pricing Rates</CardTitle>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddAllotment}>
              <Plus size={16} />
              <span>Add Allotment Option</span>
            </Button>
          </CardHeader>
          <CardContent>
            {/* Service Filter / Target Selector */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="allotment-service-select" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Target Service:
                </Label>
                <select
                  id="allotment-service-select"
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-semibold shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={selectedServiceForAllotment}
                  onChange={(e) => setSelectedServiceForAllotment(e.target.value)}
                >
                  <option value="global">🌐 Global Fallback Allotments (Standard BHKs)</option>
                  {(config.serviceCategories || []).map((serv) => (
                    <option key={serv.id} value={serv.id}>
                      {serv.name} ({serv.id})
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-xs text-muted-foreground">
                {selectedServiceForAllotment === 'global'
                  ? 'Configuring standard fallback premises (1 RK, 1 BHK, 2 BHK, etc.)'
                  : `Configuring dynamic premises specifically for ${config.serviceCategories?.find((s) => s.id === selectedServiceForAllotment)?.name || selectedServiceForAllotment}`}
              </span>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Allotment Label</TableHead>
                  <TableHead>Default Sqft</TableHead>
                  <TableHead>Base Rate (₹)</TableHead>
                  <TableHead>AMC Multiplier</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getActiveAllotments().map((item, idx) => (
                  <TableRow key={item.id || idx}>
                    <TableCell>
                      <Input
                        type="text"
                        className="w-36"
                        value={item.label}
                        onChange={(e) => handleAllotmentChange(idx, 'label', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-24"
                        value={item.defaultSqft}
                        onChange={(e) => handleAllotmentChange(idx, 'defaultSqft', Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-28"
                        value={item.basePrice}
                        onChange={(e) => handleAllotmentChange(idx, 'basePrice', Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        className="w-24"
                        value={item.amcPriceMultiplier}
                        onChange={(e) => handleAllotmentChange(idx, 'amcPriceMultiplier', Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveAllotment(idx)}>
                        <Trash2 size={18} className="text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 3. PRICING RULES & GST CONFIGURATION */}
        <Card>
          <CardHeader className="flex-row items-center gap-2.5 space-y-0">
            <Sliders size={20} className="text-primary" />
            <CardTitle>Calculation Rules & Tax Configuration</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-1.5">
              <Label>Minimum Area Sqft</Label>
              <Input
                type="number"
                value={config.pricingRules?.minSqft || 200}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    pricingRules: { ...config.pricingRules, minSqft: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Extra Sqft Cost Rate (₹/sqft)</Label>
              <Input
                type="number"
                step="0.1"
                value={config.pricingRules?.extraPricePerSqft || 1.5}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    pricingRules: { ...config.pricingRules, extraPricePerSqft: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Inspection Threshold (sqft)</Label>
              <Input
                type="number"
                value={config.pricingRules?.maxSqftInspectionThreshold || 1500}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    pricingRules: { ...config.pricingRules, maxSqftInspectionThreshold: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>GST Tax Percent (%)</Label>
              <Input
                type="number"
                value={config.pricingRules?.gstPercent || 18}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    pricingRules: { ...config.pricingRules, gstPercent: Number(e.target.value) },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* 4. PUBLIC CONTACT INFORMATION */}
        <Card>
          <CardHeader className="flex-row items-center gap-2.5 space-y-0">
            <Phone size={20} className="text-primary" />
            <CardTitle>Public Contact & Hotline Display</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Display Toll-Free Hotline</Label>
              <Input
                type="text"
                value={config.contactInfo?.tollFree || '1800-212-2125'}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    contactInfo: { ...config.contactInfo, tollFree: e.target.value },
                  })
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Direct Phone Dial URI</Label>
              <Input
                type="text"
                value={config.contactInfo?.phone || '18002122125'}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    contactInfo: { ...config.contactInfo, phone: e.target.value },
                  })
                }
              />
            </div>

            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Support Email Address</Label>
              <Input
                type="email"
                value={config.contactInfo?.email || 'support@techhousepest.com'}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    contactInfo: { ...config.contactInfo, email: e.target.value },
                  })
                }
              />
            </div>

            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Office Address</Label>
              <Input
                type="text"
                value={config.contactInfo?.address || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    contactInfo: { ...config.contactInfo, address: e.target.value },
                  })
                }
              />
            </div>

            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Working Hours</Label>
              <Input
                type="text"
                value={config.contactInfo?.workingHours || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    contactInfo: { ...config.contactInfo, workingHours: e.target.value },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        <CouponManager />

        <Card>
          <CardHeader className="flex-row items-center gap-2.5 space-y-0">
            <Globe size={20} className="text-primary" />
            <CardTitle>Legal Pages (Privacy, Terms, Cookies)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-[13px] text-muted-foreground">
              Leave a field blank to keep showing the default page content. Basic HTML (headings, paragraphs, links) is supported.
            </p>
            <div className="grid gap-1.5">
              <Label>Privacy Policy content (HTML)</Label>
              <Textarea
                rows={6}
                className="font-mono text-xs"
                value={config.legalContent?.privacyPolicy || ''}
                onChange={(e) => setConfig({ ...config, legalContent: { ...config.legalContent, privacyPolicy: e.target.value } })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Legal Statement / Terms content (HTML)</Label>
              <Textarea
                rows={6}
                className="font-mono text-xs"
                value={config.legalContent?.legalStatement || ''}
                onChange={(e) => setConfig({ ...config, legalContent: { ...config.legalContent, legalStatement: e.target.value } })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Cookie Policy content (HTML)</Label>
              <Textarea
                rows={6}
                className="font-mono text-xs"
                value={config.legalContent?.cookiePolicy || ''}
                onChange={(e) => setConfig({ ...config, legalContent: { ...config.legalContent, cookiePolicy: e.target.value } })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} size="lg">
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{saving ? 'Publishing Changes...' : 'Publish Live Site Changes'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

const emptyCoupon = { code: '', description: '', discountPercent: 10, expiresAt: '', usageLimit: '' };

function CouponManager() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyCoupon);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => http.get('/coupons').then(({ data }) => setCoupons(data.items)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await http.post('/coupons', {
        ...form,
        discountPercent: Number(form.discountPercent),
        expiresAt: form.expiresAt || undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      });
      setForm(emptyCoupon);
      await load();
    } catch (x) {
      setError(x.response?.data?.error?.message || 'Could not create coupon');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon) => {
    await http.patch('/coupons/' + coupon._id, { active: !coupon.active });
    await load();
  };

  const remove = async (coupon) => {
    if (!window.confirm('Delete coupon ' + coupon.code + '?')) return;
    await http.delete('/coupons/' + coupon._id);
    await load();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2.5 space-y-0">
        <Tag size={20} className="text-primary" />
        <CardTitle>Coupon Codes</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={create} className="mb-5 grid grid-cols-1 items-end gap-3 sm:grid-cols-5">
          {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-[13px] text-destructive sm:col-span-5">{error}</div>}
          <div className="grid gap-1.5">
            <Label>Code</Label>
            <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Discount %</Label>
            <Input required type="number" min="1" max="100" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Expires (optional)</Label>
            <Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Usage limit (optional)</Label>
            <Input type="number" min="1" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
          </div>
          <Button type="submit" disabled={saving} className="sm:col-span-5 sm:w-fit">
            <Plus size={16} /> Add coupon
          </Button>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((c) => (
              <TableRow key={c._id}>
                <TableCell>
                  <strong className="font-semibold">{c.code}</strong>
                  {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
                </TableCell>
                <TableCell>{c.discountPercent}%</TableCell>
                <TableCell>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-IN') : 'No expiry'}</TableCell>
                <TableCell>{c.usageCount}{c.usageLimit ? ' / ' + c.usageLimit : ''}</TableCell>
                <TableCell>
                  <Button type="button" variant="outline" size="sm" onClick={() => toggleActive(c)}>
                    {c.active ? 'Active' : 'Inactive'}
                  </Button>
                </TableCell>
                <TableCell className="text-center">
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(c)}>
                    <Trash2 size={16} className="text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!loading && !coupons.length && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
            No coupon codes yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
