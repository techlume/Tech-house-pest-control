import mongoose from 'mongoose';

const siteConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'default_config',
      unique: true,
    },
    promoBanner: {
      enabled: { type: Boolean, default: true },
      code: { type: String, default: 'PROSPERITY30' },
      discountPercent: { type: Number, default: 30 },
      text: { type: String, default: 'FESTIVE OFFER: Get 30% INSTANT OFF on All Pest Control Bookings!' },
      tagline: { type: String, default: 'Auto-applied at checkout | 100% Odourless & Safe' },
    },
    contactInfo: {
      phone: { type: String, default: '+91 1800-212-2125' },
      email: { type: String, default: 'booking@techhousepest.com' },
      address: { type: String, default: 'Tech House Headquarters, Sector 14, Navi Mumbai, Maharashtra' },
      tollFree: { type: String, default: '1800-212-2125' },
      workingHours: { type: String, default: 'Mon - Sun: 8:00 AM - 9:00 PM' },
    },
    pricingRules: {
      minSqft: { type: Number, default: 200 },
      maxSqftInspectionThreshold: { type: Number, default: 1500 },
      extraPricePerSqft: { type: Number, default: 1.5 },
      gstPercent: { type: Number, default: 18 },
    },
    premisesAllotments: [
      {
        id: { type: String, required: true },
        label: { type: String, required: true },
        defaultSqft: { type: Number, required: true },
        basePrice: { type: Number, required: true },
        amcPriceMultiplier: { type: Number, default: 2.2 },
        description: { type: String, default: '' },
      },
    ],
    serviceCategories: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        badge: { type: String, default: 'Blitz Intensive' },
        tagline: { type: String, default: '' },
        basePriceMultiplier: { type: Number, default: 1.0 },
        includedFeatures: [{ type: String }],
      },
    ],
  },
  { timestamps: true },
);

export const SiteConfig = mongoose.model('SiteConfig', siteConfigSchema);
