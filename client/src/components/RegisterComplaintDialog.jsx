import { useState } from 'react';
import { AlertCircle, CheckCircle2, MessageSquareWarning, X } from 'lucide-react';
import { http } from '../services/http';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  category: 'Service Follow-up',
  subject: '',
  description: '',
  priority: 'High',
};

export function RegisterComplaintDialog({ open, onOpenChange }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await http.post('/complaints/public', form);
      if (res.data?.success) {
        setSuccessResult({
          complaintNo: res.data.complaintNo,
          message: res.data.message,
        });
        setForm(emptyForm);
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Could not register complaint');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSuccessResult(null);
    setError('');
    setForm(emptyForm);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? handleClose() : onOpenChange(o))}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareWarning className="h-5 w-5 text-amber-500" />
            Register Customer Complaint / Grievance
          </DialogTitle>
        </DialogHeader>

        {successResult ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">
              Complaint Registered: #{successResult.complaintNo}
            </h4>
            <p className="mt-2 text-sm text-slate-600">
              {successResult.message || 'Our regional operations team has been notified and will address your grievance within 24 hours.'}
            </p>
            <Button className="mt-6" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <form className="grid grid-cols-1 gap-4 px-6 py-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive sm:col-span-2">
                {error}
              </div>
            )}

            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Your Full Name *</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Ramesh Kumar"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Phone Number *</Label>
              <Input
                required
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="e.g. 9876543210"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="e.g. customer@example.com"
              />
            </div>

            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Property / Premise Address</Label>
              <Input
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="Flat / Building, Locality, City"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Complaint Category</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cockroach Reinfestation">Cockroach Reinfestation</SelectItem>
                  <SelectItem value="Termite Follow-up">Termite Follow-up</SelectItem>
                  <SelectItem value="Bed Bug Reappearance">Bed Bug Reappearance</SelectItem>
                  <SelectItem value="Rodent Defense Issue">Rodent Defense Issue</SelectItem>
                  <SelectItem value="Service Delay">Service Delay</SelectItem>
                  <SelectItem value="Technician Conduct">Technician Conduct</SelectItem>
                  <SelectItem value="Billing / Invoice Issue">Billing / Invoice Issue</SelectItem>
                  <SelectItem value="Other Grievance">Other Grievance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Urgency Level</Label>
              <Select value={form.priority} onValueChange={(v) => set('priority', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal (24h resolution)</SelectItem>
                  <SelectItem value="High">High (12h resolution)</SelectItem>
                  <SelectItem value="Critical">Critical (4h escalation)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Subject *</Label>
              <Input
                required
                value={form.subject}
                onChange={(e) => set('subject', e.target.value)}
                placeholder="e.g. Pest activity noticed 3 days after treatment"
              />
            </div>

            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Complaint Details / Message *</Label>
              <Textarea
                required
                rows={3}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Please describe the issue in detail so we can dispatch the technician with the right treatment solution..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Submitting…' : 'Submit Complaint'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
