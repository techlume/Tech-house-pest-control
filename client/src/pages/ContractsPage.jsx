import { useState } from 'react';
import { ArrowRight, IndianRupee, RefreshCw } from 'lucide-react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { appAlert, appConfirm } from '../lib/dialog';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function ContractsPage() {
  const contracts = useApiList('/contracts?limit=100'),
    quotes = useApiList('/quotations?limit=100');
  const [busy, setBusy] = useState('');
  const [renewing, setRenewing] = useState(null);
  const [renewal, setRenewal] = useState({
    startDate: '',
    endDate: '',
    contractValue: '',
  });
  const { user } = useAuth();
  const canConvert = ['OWNER', 'ADMIN', 'SALESPERSON'].includes(user?.role);
  const canManage = canConvert;
  const eligible = quotes.data.filter(
    (q) => canConvert && q.status === 'Accepted',
  );
  const convert = async (q) => {
    const ok = await appConfirm(`Create an AMC and scheduled visits from ${q.quotationNo}?`, { title: 'Create AMC contract' });
    if (!ok) return;
    setBusy(q._id);
    try {
      const { data } = await http.post(`/contracts/from-quotation/${q._id}`, {
        contractType: 'AMC',
        billingFrequency: 'Per Visit',
      });
      await appAlert(`Contract created with ${data.visitsCreated} visit(s).`);
      await Promise.all([contracts.reload(), quotes.reload()]);
    } catch (x) {
      await appAlert(x.response?.data?.error?.message || 'Could not create contract');
    } finally {
      setBusy('');
    }
  };
  const changeStatus = async (contract, status) => {
    const action = status === 'Active' ? 'resume' : status.toLowerCase();
    const ok = await appConfirm('Are you sure you want to ' + action + ' ' + contract.contractNo + '?', {
      title: 'Confirm ' + action,
      destructive: status === 'Cancelled',
    });
    if (!ok) return;
    setBusy(contract._id);
    try {
      await http.patch('/contracts/' + contract._id + '/status', { status });
      await contracts.reload();
    } catch (x) {
      await appAlert(x.response?.data?.error?.message || 'Could not update contract');
    } finally {
      setBusy('');
    }
  };
  const openRenewal = (contract) => {
    const start = new Date(contract.endDate);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);
    setRenewing(contract);
    setRenewal({
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      contractValue: contract.contractValue,
    });
  };
  const renew = async (event) => {
    event.preventDefault();
    setBusy(renewing._id);
    try {
      const { data } = await http.post('/contracts/' + renewing._id + '/renew', {
        ...renewal,
        contractValue: Number(renewal.contractValue),
      });
      await appAlert('Renewal created with ' + data.visitsCreated + ' scheduled visit(s).');
      setRenewing(null);
      await contracts.reload();
    } catch (x) {
      await appAlert(x.response?.data?.error?.message || 'Could not renew contract');
    } finally {
      setBusy('');
    }
  };
  return (
    <>
      <div>
        <span className="eyebrow">Recurring revenue</span>
        <h2 className="text-2xl font-extrabold tracking-tight">Contracts & AMC</h2>
        <p className="text-sm text-muted-foreground">
          Activate accepted proposals and automatically create their service schedule.
        </p>
      </div>

      {eligible.length > 0 && (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="text-base">Quotations ready for conversion</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0">
            {eligible.map((q) => (
              <div
                key={q._id}
                className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <strong className="block font-semibold">
                    {q.quotationNo} · {q.customerId?.name}
                  </strong>
                  <small className="inline-flex items-center gap-1 text-muted-foreground">
                    <IndianRupee size={12} />
                    {Number(q.grandTotal).toLocaleString('en-IN')} · {q.status}
                  </small>
                </div>
                <Button disabled={busy === q._id} onClick={() => convert(q)} className="w-full sm:w-auto">
                  Create AMC <ArrowRight size={16} />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {contracts.data.map((c) => (
          <Card key={c._id}>
            <CardContent className="flex flex-col gap-2 p-5">
              <div className="flex items-center justify-between">
                <strong className="font-semibold">{c.contractNo}</strong>
                <StatusBadge value={c.status} />
              </div>
              <h3 className="text-base font-bold">{c.customerId?.name}</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(c.startDate).toLocaleDateString('en-IN')} — {new Date(c.endDate).toLocaleDateString('en-IN')}
              </p>
              <small className="text-muted-foreground">
                {c.services.length} service(s) · {c.billingFrequency}
              </small>
              <strong className="inline-flex items-center gap-1 text-lg font-extrabold text-primary">
                <IndianRupee size={16} />
                {Number(c.contractValue).toLocaleString('en-IN')}
              </strong>
              {canManage && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {c.status === 'Active' && (
                    <Button size="sm" variant="secondary" disabled={busy === c._id} onClick={() => changeStatus(c, 'Paused')}>
                      Pause
                    </Button>
                  )}
                  {c.status === 'Paused' && (
                    <Button size="sm" variant="secondary" disabled={busy === c._id} onClick={() => changeStatus(c, 'Active')}>
                      Resume
                    </Button>
                  )}
                  {['Active', 'Paused', 'Expired'].includes(c.status) && (
                    <Button size="sm" variant="outline" disabled={busy === c._id} onClick={() => openRenewal(c)}>
                      <RefreshCw size={15} /> Renew
                    </Button>
                  )}
                  {['Active', 'Paused', 'Expired'].includes(c.status) && (
                    <Button size="sm" variant="destructive" disabled={busy === c._id} onClick={() => changeStatus(c, 'Cancelled')}>
                      Cancel
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {!contracts.data.length && !eligible.length && (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No contracts yet. Create a quotation first.
        </div>
      )}

      <Dialog open={Boolean(renewing)} onOpenChange={(o) => !o && setRenewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew {renewing?.contractNo}</DialogTitle>
          </DialogHeader>
          <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={renew}>
            <div className="grid gap-1.5">
              <Label>New start date</Label>
              <Input type="date" required value={renewal.startDate} onChange={(e) => setRenewal({ ...renewal, startDate: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>New end date</Label>
              <Input type="date" required min={renewal.startDate} value={renewal.endDate} onChange={(e) => setRenewal({ ...renewal, endDate: e.target.value })} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Contract value</Label>
              <Input type="number" min="0" step="0.01" required value={renewal.contractValue} onChange={(e) => setRenewal({ ...renewal, contractValue: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              A new contract and service schedule will be created. The current contract will be marked Renewed.
            </p>
            <div className="flex justify-end sm:col-span-2">
              <Button disabled={busy === renewing?._id}>
                {busy === renewing?._id ? 'Creating renewal…' : 'Create renewal'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
