import { useState } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { appAlert, appConfirm } from '../lib/dialog';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';

const supplierBlank = { branchId: '', name: '', phone: '', email: '', gstin: '', paymentTerms: '' };
const purchaseBlank = { branchId: '', supplierId: '', productId: '', batchNo: '', expiryDate: '', quantity: '', rate: '', taxRate: 18, note: '' };
const expenseBlank = { branchId: '', date: new Date().toISOString().slice(0, 10), category: 'Travel', description: '', vendor: '', amount: '', taxAmount: 0, paymentMode: 'Cash', reference: '' };

export function ProcurementPage() {
  const suppliers = useApiList('/procurement/suppliers'),
    purchases = useApiList('/procurement/purchases'),
    expenses = useApiList('/procurement/expenses'),
    products = useApiList('/inventory/products'),
    branches = useApiList('/branches'),
    { user } = useAuth();
  const [tab, setTab] = useState('purchases'),
    [modal, setModal] = useState(null),
    [form, setForm] = useState({}),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false);
  const admin = user?.role === 'ADMIN';
  const save = async (e, url, payload, reload) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await http.post(url, payload);
      setModal(null);
      await reload();
    } catch (x) {
      setError(x.response?.data?.error?.message || 'Could not save record');
    } finally {
      setSaving(false);
    }
  };
  const act = async (url, reload) => {
    try {
      await http.patch(url);
      await reload();
    } catch (x) {
      await appAlert(x.response?.data?.error?.message || 'Action failed');
    }
  };
  const receive = async (item) => {
    if (!(await appConfirm('Receive all items in ' + item.purchaseNo + ' into inventory?', { title: 'Receive purchase order' }))) return;
    try {
      await http.post('/procurement/purchases/' + item._id + '/receive');
      await Promise.all([purchases.reload(), products.reload()]);
    } catch (x) {
      await appAlert(x.response?.data?.error?.message || 'Receiving failed');
    }
  };
  const open = (type) => {
    setError('');
    setForm(type === 'supplier' ? supplierBlank : type === 'purchase' ? purchaseBlank : expenseBlank);
    setModal(type);
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow">Procurement & spending</span>
          <h2 className="text-2xl font-extrabold tracking-tight">Suppliers, Purchases & Expenses</h2>
          <p className="text-sm text-muted-foreground">Approve purchases, receive batches and maintain branch expense records.</p>
        </div>
        <Button
          onClick={() => open(tab === 'suppliers' ? 'supplier' : tab === 'purchases' ? 'purchase' : 'expense')}
          className="w-full sm:w-auto"
        >
          <Plus size={16} /> Add record
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-5">
        <TabsList>
          <TabsTrigger value="purchases">Purchase orders</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'purchases' && (
        <RecordTable
          heads={['PO', 'Supplier', 'Date', 'Value', 'Status', 'Actions']}
          loading={purchases.loading}
          rows={purchases.data.map((x) => [
            x.purchaseNo,
            x.supplierId?.name,
            new Date(x.orderDate).toLocaleDateString('en-IN'),
            '₹' + x.grandTotal.toLocaleString('en-IN'),
            <StatusBadge value={x.status} />,
            <div className="flex flex-wrap gap-2">
              {admin && x.status === 'Draft' && (
                <Button size="sm" variant="outline" onClick={() => act('/procurement/purchases/' + x._id + '/approve', purchases.reload)}>
                  Approve
                </Button>
              )}
              {admin && x.status === 'Approved' && (
                <Button size="sm" variant="outline" onClick={() => receive(x)}>
                  Receive
                </Button>
              )}
            </div>,
          ])}
        />
      )}
      {tab === 'suppliers' && (
        <RecordTable
          heads={['Supplier', 'Contact', 'GSTIN', 'Terms', 'Status']}
          loading={suppliers.loading}
          rows={suppliers.data.map((x) => [
            <>
              <strong className="block font-semibold">{x.supplierNo}</strong>
              <small className="text-muted-foreground">{x.name}</small>
            </>,
            x.phone || x.email || '—',
            x.gstin || '—',
            x.paymentTerms || '—',
            <StatusBadge value={x.active ? 'Active' : 'Inactive'} />,
          ])}
        />
      )}
      {tab === 'expenses' && (
        <RecordTable
          heads={['Expense', 'Date', 'Category', 'Description', 'Amount', 'Status', 'Actions']}
          loading={expenses.loading}
          rows={expenses.data.map((x) => [
            x.expenseNo,
            new Date(x.date).toLocaleDateString('en-IN'),
            x.category,
            x.description,
            '₹' + x.amount.toLocaleString('en-IN'),
            <StatusBadge value={x.status} />,
            admin && x.status === 'Recorded' ? (
              <Button size="sm" variant="outline" onClick={() => act('/procurement/expenses/' + x._id + '/approve', expenses.reload)}>
                Approve
              </Button>
            ) : (
              '—'
            ),
          ])}
        />
      )}

      <Dialog open={Boolean(modal)} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {modal}</DialogTitle>
          </DialogHeader>
          {modal && (
            <RecordForm
              type={modal}
              value={form}
              setValue={setForm}
              branches={branches.data}
              suppliers={suppliers.data}
              products={products.data}
              showBranch={admin}
              error={error}
              saving={saving}
              submit={(e) =>
                modal === 'supplier'
                  ? save(e, '/procurement/suppliers', { ...form, branchId: form.branchId || undefined }, suppliers.reload)
                  : modal === 'purchase'
                    ? save(
                        e,
                        '/procurement/purchases',
                        {
                          branchId: form.branchId || undefined,
                          supplierId: form.supplierId,
                          note: form.note,
                          lines: [
                            {
                              productId: form.productId,
                              batchNo: form.batchNo,
                              expiryDate: form.expiryDate || undefined,
                              quantity: Number(form.quantity),
                              rate: Number(form.rate),
                              taxRate: Number(form.taxRate),
                            },
                          ],
                        },
                        purchases.reload,
                      )
                    : save(
                        e,
                        '/procurement/expenses',
                        { ...form, branchId: form.branchId || undefined, amount: Number(form.amount), taxAmount: Number(form.taxAmount) },
                        expenses.reload,
                      )
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function RecordTable({ heads, rows, loading }) {
  return (
    <Card className="mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            {heads.map((head) => (
              <TableHead key={head}>{head}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index}>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!rows.length && (
        <div className="p-10 text-center text-sm text-muted-foreground">{loading ? 'Loading…' : 'No records available'}</div>
      )}
    </Card>
  );
}

function RecordForm({ type, value, setValue, branches, suppliers, products, showBranch, error, saving, submit }) {
  const set = (key, next) => setValue({ ...value, [key]: next });
  const field = (label, key, kind = 'text') => (
    <div className="grid gap-1.5" key={key}>
      <Label>{label}</Label>
      <Input
        required={['name', 'description', 'amount', 'batchNo', 'quantity', 'rate'].includes(key)}
        type={kind}
        value={value[key] ?? ''}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  );
  return (
    <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={submit}>
      {error && <div className="form-error sm:col-span-2">{error}</div>}
      {showBranch && (
        <div className="grid gap-1.5 sm:col-span-2">
          <Label>Branch</Label>
          <Select required value={value.branchId || ''} onValueChange={(v) => set('branchId', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b._id} value={b._id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {type === 'supplier' && (
        <>
          {field('Name', 'name')}
          {field('Phone', 'phone')}
          {field('Email', 'email', 'email')}
          {field('GSTIN', 'gstin')}
          {field('Payment terms', 'paymentTerms')}
        </>
      )}
      {type === 'purchase' && (
        <>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Supplier</Label>
            <Select required value={value.supplierId} onValueChange={(v) => set('supplierId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((x) => (
                  <SelectItem key={x._id} value={x._id}>
                    {x.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Product</Label>
            <Select required value={value.productId} onValueChange={(v) => set('productId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((x) => (
                  <SelectItem key={x._id} value={x._id}>
                    {x.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {field('Batch number', 'batchNo')}
          {field('Expiry date', 'expiryDate', 'date')}
          {field('Quantity', 'quantity', 'number')}
          {field('Rate', 'rate', 'number')}
          {field('Tax %', 'taxRate', 'number')}
          {field('Note', 'note')}
        </>
      )}
      {type === 'expense' && (
        <>
          {field('Date', 'date', 'date')}
          {field('Category', 'category')}
          {field('Description', 'description')}
          {field('Vendor', 'vendor')}
          {field('Amount', 'amount', 'number')}
          {field('Tax amount', 'taxAmount', 'number')}
          <div className="grid gap-1.5">
            <Label>Payment mode</Label>
            <Select value={value.paymentMode} onValueChange={(v) => set('paymentMode', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['Cash', 'Bank', 'UPI', 'Card', 'Other'].map((x) => (
                  <SelectItem key={x} value={x}>
                    {x}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {field('Reference', 'reference')}
        </>
      )}
      <div className="flex justify-end sm:col-span-2">
        <Button disabled={saving}>{saving ? 'Saving…' : 'Save record'}</Button>
      </div>
    </form>
  );
}
