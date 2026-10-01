import { useEffect, useState } from 'react';
import { Phone, Mail, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { http } from '../services/http';
import { appAlert } from '../lib/dialog';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { StorefrontFooter } from '../components/StorefrontFooter';

const DEFAULT_CONTACT = {
  phone: '+91 1800-212-2125',
  tollFree: '1800-212-2125',
  email: 'booking@techhousepest.com',
  address: 'Tech House Headquarters, Sector 14, Navi Mumbai, Maharashtra',
  workingHours: 'Mon - Sun: 8:00 AM - 9:00 PM',
};

const infoCards = [
  { icon: Phone, iconClass: 'text-primary', label: 'Toll-Free Hotline (24/7)', key: 'tollFree' },
  { icon: Mail, iconClass: 'text-success', label: 'Customer Support Email', key: 'email' },
  { icon: MapPin, iconClass: 'text-primary', label: 'Corporate Headquarters', key: 'address' },
  { icon: Clock, iconClass: 'text-warning', label: 'Working Hours', key: 'workingHours' },
];

export function ContactPage() {
  const [contact, setContact] = useState(DEFAULT_CONTACT);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    http.get('/site-config').then((res) => {
      if (res.data?.data?.contactInfo) setContact(res.data.data.contactInfo);
    }).catch(() => {});
  }, []);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    city: 'Mumbai',
    service: 'Cockroach Control',
    message: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await http.post('/site-config/bookings', {
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: `${form.city} - Inquiry`,
        serviceType: form.service,
        allotment: '1_bhk',
        sqft: 600,
        packageType: 'single',
        totalAmount: 0,
        notes: `[Contact Form Message]: ${form.message}`,
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      await appAlert('Failed to send message. Please call ' + (contact.tollFree || contact.phone) + ' directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted">
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-6 py-3 backdrop-blur">
        <a href="/" className="flex items-center gap-2 text-lg font-extrabold">
          <img className="h-9 w-9 rounded-lg object-contain" src="/tech-house-logo.png" alt="Tech House Pest Control" />
          <span>Tech House <span className="text-primary">Pest Control</span></span>
        </a>

        <ul className="hidden items-center gap-6 text-sm font-semibold md:flex">
          <li><a href="/" className="hover:text-primary">Home</a></li>
          <li><a href="/#services" className="hover:text-primary">Services</a></li>
          <li><a href="/about" className="hover:text-primary">About Us</a></li>
          <li><a href="/contact" className="text-primary">Contact</a></li>
        </ul>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <a href={'tel:' + (contact.tollFree || contact.phone).replace(/\D/g, '')}>
              <Phone size={15} /> {contact.tollFree || contact.phone}
            </a>
          </Button>
          <Button asChild size="sm">
            <a href="/login">Staff Login</a>
          </Button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-2 lg:items-start">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Get In Touch With Our Pest Experts</h1>
          <p className="mt-3 text-muted-foreground">
            Have a question about pest control or need an urgent home inspection? Our 24/7 service desk is ready to help you protect your premises.
          </p>

          <div className="mt-6 grid gap-4">
            {infoCards.map(({ icon: Icon, iconClass, label, key }) => (
              <Card key={key}>
                <CardContent className="flex items-center gap-3 p-4">
                  <Icon size={24} className={iconClass} />
                  <div>
                    <strong className="block text-sm font-bold">{label}</strong>
                    <div className="text-sm font-semibold text-foreground">{contact[key]}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* INQUIRY FORM */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-xl font-bold">Request a Free Call-Back</h3>

            {submitted ? (
              <div className="py-10 text-center">
                <CheckCircle2 size={48} className="mx-auto mb-4 text-success" />
                <h3 className="text-lg font-bold">Message Sent Successfully!</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Thank you for contacting Tech House. Our local branch officer will call you back within 15 minutes.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label>Your Full Name *</Label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Phone Number *</Label>
                    <Input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Email Address</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>City *</Label>
                    <Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Interested Service</Label>
                    <Select value={form.service} onValueChange={(v) => setForm({ ...form, service: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cockroach Control">Cockroach Control</SelectItem>
                        <SelectItem value="Termite Protection">Termite Protection</SelectItem>
                        <SelectItem value="Rodent Control">Rodent Control</SelectItem>
                        <SelectItem value="Mosquito Control">Mosquito Control</SelectItem>
                        <SelectItem value="Bed Bug Eradication">Bed Bug Eradication</SelectItem>
                        <SelectItem value="Bird Netting & Spikes">Bird Netting & Spikes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label>How can we help you?</Label>
                  <Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Describe your pest issue..." />
                </div>

                <Button type="submit" disabled={submitting} className="mt-1">
                  {submitting ? 'Sending Request...' : 'SEND CALL-BACK REQUEST'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </section>

      <StorefrontFooter />
    </div>
  );
}
