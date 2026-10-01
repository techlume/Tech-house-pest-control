import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, Boxes, Plus, ShieldCheck } from 'lucide-react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { appAlert, appPrompt } from '../lib/dialog';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';

const emptyProduct = { branchId: '', sku: '', name: '', category: 'Chemical', brand: '', unit: 'Litre', hsnSac: '', reorderLevel: 5, batchNo: '', expiryDate: '', quantity: '', purchaseRate: '' };
const emptyMovement = { productId: '', batchId: '', type: 'PURCHASE', quantity: '', note: '' };
const emptyTransfer = { productId: '', batchId: '', toBranchId: '', quantity: '', note: '' };
const emptyAdjustment = { productId: '', batchId: '', direction: 'OUT', quantity: '', reason: '' };
const unitOptions = ['Litre', 'Millilitre', 'Kilogram', 'Gram', 'Piece', 'Tube'];

export function InventoryPage() {
  const products = useApiList('/inventory/products');
  const movements = useApiList('/inventory/movements');
  const adjustments = useApiList('/inventory/adjustments');
  const branches = useApiList('/branches');
  const { user } = useAuth();
  const [alerts, setAlerts] = useState({ lowStock: [], expiring: [] });
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [product, setProduct] = useState(emptyProduct);
  const [movement, setMovement] = useState(emptyMovement);
  const [transfer, setTransfer] = useState(emptyTransfer);
  const [adjustment, setAdjustment] = useState(emptyAdjustment);
  const canEdit = user?.role === 'ADMIN';
  const canApprove = user?.role === 'ADMIN';
  const totalUnits = useMemo(
    () => products.data.reduce((sum, item) => sum + item.batches.reduce((batchSum, batch) => batchSum + batch.quantity, 0), 0),
    [products.data],
  );
  const selectedMovement = products.data.find((item) => item._id === movement.productId);
  const selectedTransfer = products.data.find((item) => item._id === transfer.productId);
  const selectedAdjustment = products.data.find((item) => item._id === adjustment.productId);
  const loadAlerts = async () => {
    const { data } = await http.get('/inventory/alerts');
    setAlerts(data);
  };
  useEffect(() => {
    loadAlerts().catch(() => {});
  }, []);
  const reloadAll = async () => {
    await Promise.all([products.reload(), movements.reload(), adjustments.reload(), loadAlerts()]);
  };
  const submit = async (event, url, payload, reset) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await http.post(url, payload);
      setModal(null);
      reset();
      await reloadAll();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Inventory action failed');
    } finally {
      setSaving(false);
    }
  };
  const review = async (record, status) => {
    const reviewNote = (await appPrompt(status + ' note (optional)', { title: 'Review adjustment', required: false })) || '';
    try {
      await http.patch('/inventory/adjustments/' + record._id + '/review', { status, reviewNote });
      await reloadAll();
    } catch (requestError) {
      await appAlert(requestError.response?.data?.error?.message || 'Review failed');
    }
  };
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow">Stock control</span>
          <h2 className="text-2xl font-extrabold tracking-tight">Inventory & Chemicals</h2>
          <p className="text-sm text-muted-foreground">
            Trace purchases, batches, transfers, expiry and approved adjustments.
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setModal('adjustment')}>
              Request adjustment
            </Button>
            <Button variant="outline" onClick={() => setModal('transfer')}>
              <ArrowRightLeft size={16} /> Transfer
            </Button>
            <Button variant="outline" onClick={() => setModal('movement')}>
              Stock in/out
            </Button>
            <Button onClick={() => setModal('product')}>
              <Plus size={17} /> Product
            </Button>
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Boxes size={18} />
            </span>
            <div>
              <strong className="block text-lg font-extrabold">{products.data.length}</strong>
              <span className="text-xs text-muted-foreground">Products</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/10 text-success">
              <ShieldCheck size={18} />
            </span>
            <div>
              <strong className="block text-lg font-extrabold">{totalUnits.toLocaleString('en-IN')}</strong>
              <span className="text-xs text-muted-foreground">Units in stock</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span
              className={cn(
                'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
                alerts.lowStock.length ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground',
              )}
            >
              <AlertTriangle size={18} />
            </span>
            <div>
              <strong className="block text-lg font-extrabold">{alerts.lowStock.length}</strong>
              <span className="text-xs text-muted-foreground">Low stock</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span
              className={cn(
                'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
                alerts.expiring.length ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground',
              )}
            >
              <AlertTriangle size={18} />
            </span>
            <div>
              <strong className="block text-lg font-extrabold">{alerts.expiring.length}</strong>
              <span className="text-xs text-muted-foreground">Expiring in 60 days</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {alerts.expiring.length > 0 && (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle>Expiry alerts</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            {alerts.expiring.map((item) => (
              <div className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm" key={item.batchId}>
                <StatusBadge value={item.expired ? 'Expired' : 'Expiring'} />
                <strong className="font-semibold">{item.name}</strong>
                <span className="text-muted-foreground">
                  Batch {item.batchNo} · {item.quantity} {item.unit}
                </span>
                <small className="ml-auto text-xs text-muted-foreground">
                  {new Date(item.expiryDate).toLocaleDateString('en-IN')}
                </small>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mt-5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU / Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Available</TableHead>
              <TableHead>Reorder at</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.data.flatMap((item) =>
              item.batches.map((batch) => (
                <TableRow key={batch._id}>
                  <TableCell>
                    <strong className="block font-semibold">{item.sku}</strong>
                    <small className="text-muted-foreground">
                      {item.name} · {item.brand}
                    </small>
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{batch.batchNo}</TableCell>
                  <TableCell>{batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                  <TableCell>
                    <strong className="font-semibold">
                      {batch.quantity} {item.unit}
                    </strong>
                  </TableCell>
                  <TableCell>
                    {item.reorderLevel} {item.unit}
                  </TableCell>
                </TableRow>
              )),
            )}
          </TableBody>
        </Table>
        {!products.data.length && (
          <div className="p-10 text-center text-sm text-muted-foreground">No inventory products</div>
        )}
      </Card>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Adjustment approval queue</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border p-0">
          {adjustments.data.slice(0, 20).map((item) => (
            <div className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm" key={item._id}>
              <StatusBadge value={item.status} />
              <strong className="font-semibold">{item.productId?.name}</strong>
              <span className="text-muted-foreground">
                {item.direction} {item.quantity} {item.productId?.unit} · {item.reason}
              </span>
              <small className="text-xs text-muted-foreground">{item.requestedBy?.name}</small>
              {canApprove && item.status === 'Pending' && (
                <span className="ml-auto flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => review(item, 'Approved')}>
                    Approve
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => review(item, 'Rejected')}>
                    Reject
                  </Button>
                </span>
              )}
            </div>
          ))}
          {!adjustments.data.length && (
            <div className="px-5 py-6 text-sm text-muted-foreground">No stock adjustments.</div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Recent stock movements</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border p-0">
          {movements.data.slice(0, 15).map((item) => {
            const isOut = item.type.includes('OUT') || item.type === 'ISSUE' || item.type === 'CONSUMPTION';
            return (
              <div className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm" key={item._id}>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    isOut ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success',
                  )}
                >
                  {item.type}
                </span>
                <strong className="font-semibold">{item.productId?.name}</strong>
                <span className="text-muted-foreground">
                  {item.quantity} {item.productId?.unit}
                </span>
                <small className="ml-auto text-xs text-muted-foreground">
                  {new Date(item.occurredAt).toLocaleString('en-IN')}
                </small>
              </div>
            );
          })}
          {!movements.data.length && (
            <div className="px-5 py-6 text-sm text-muted-foreground">No stock movements yet.</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modal === 'product'} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add inventory product</DialogTitle>
          </DialogHeader>
          <ProductForm
            value={product}
            setValue={setProduct}
            branches={branches.data}
            showBranch={canApprove}
            error={error}
            saving={saving}
            submit={(event) =>
              submit(
                event,
                '/inventory/products',
                {
                  branchId: product.branchId || undefined,
                  sku: product.sku,
                  name: product.name,
                  category: product.category,
                  brand: product.brand,
                  unit: product.unit,
                  hsnSac: product.hsnSac,
                  reorderLevel: Number(product.reorderLevel),
                  batches: [
                    {
                      batchNo: product.batchNo,
                      expiryDate: product.expiryDate || undefined,
                      quantity: Number(product.quantity),
                      purchaseRate: Number(product.purchaseRate || 0),
                    },
                  ],
                },
                () => setProduct(emptyProduct),
              )
            }
          />
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'movement'} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record stock movement</DialogTitle>
          </DialogHeader>
          <StockForm
            error={error}
            saving={saving}
            products={products.data}
            selected={selectedMovement}
            value={movement}
            setValue={setMovement}
            types={['PURCHASE', 'RETURN', 'ISSUE']}
            submit={(event) =>
              submit(event, '/inventory/movements', { ...movement, quantity: Number(movement.quantity) }, () =>
                setMovement(emptyMovement),
              )
            }
          />
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'transfer'} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer stock to branch</DialogTitle>
          </DialogHeader>
          <TransferForm
            error={error}
            saving={saving}
            products={products.data}
            branches={branches.data}
            selected={selectedTransfer}
            value={transfer}
            setValue={setTransfer}
            submit={(event) =>
              submit(event, '/inventory/transfers', { ...transfer, quantity: Number(transfer.quantity) }, () =>
                setTransfer(emptyTransfer),
              )
            }
          />
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'adjustment'} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request stock adjustment</DialogTitle>
          </DialogHeader>
          <AdjustmentForm
            error={error}
            saving={saving}
            products={products.data}
            selected={selectedAdjustment}
            value={adjustment}
            setValue={setAdjustment}
            submit={(event) =>
              submit(event, '/inventory/adjustments', { ...adjustment, quantity: Number(adjustment.quantity) }, () =>
                setAdjustment(emptyAdjustment),
              )
            }
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function StockForm({ error, saving, products, selected, value, setValue, types, submit }) {
  return (
    <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={submit}>
      {error && <div className="form-error sm:col-span-2">{error}</div>}
      <ProductBatchFields products={products} selected={selected} value={value} setValue={setValue} />
      <div className="grid gap-1.5">
        <Label>Movement</Label>
        <Select value={value.type} onValueChange={(v) => setValue({ ...value, type: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {types.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Quantity value={value.quantity} set={(quantity) => setValue({ ...value, quantity })} />
      <div className="grid gap-1.5 sm:col-span-2">
        <Label>Reference / note</Label>
        <Input value={value.note} onChange={(event) => setValue({ ...value, note: event.target.value })} />
      </div>
      <Submit saving={saving} label="Record movement" />
    </form>
  );
}
function TransferForm({ error, saving, products, branches, selected, value, setValue, submit }) {
  return (
    <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={submit}>
      {error && <div className="form-error sm:col-span-2">{error}</div>}
      <ProductBatchFields products={products} selected={selected} value={value} setValue={setValue} />
      <div className="grid gap-1.5">
        <Label>Destination branch</Label>
        <Select required value={value.toBranchId} onValueChange={(v) => setValue({ ...value, toBranchId: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => (
              <SelectItem key={branch._id} value={branch._id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Quantity value={value.quantity} set={(quantity) => setValue({ ...value, quantity })} />
      <div className="grid gap-1.5 sm:col-span-2">
        <Label>Transfer note</Label>
        <Input value={value.note} onChange={(event) => setValue({ ...value, note: event.target.value })} />
      </div>
      <Submit saving={saving} label="Transfer stock" />
    </form>
  );
}
function AdjustmentForm({ error, saving, products, selected, value, setValue, submit }) {
  return (
    <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={submit}>
      {error && <div className="form-error sm:col-span-2">{error}</div>}
      <ProductBatchFields products={products} selected={selected} value={value} setValue={setValue} />
      <div className="grid gap-1.5">
        <Label>Direction</Label>
        <Select value={value.direction} onValueChange={(v) => setValue({ ...value, direction: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OUT">Reduce stock</SelectItem>
            <SelectItem value="IN">Increase stock</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Quantity value={value.quantity} set={(quantity) => setValue({ ...value, quantity })} />
      <div className="grid gap-1.5 sm:col-span-2">
        <Label>Reason</Label>
        <Input required value={value.reason} onChange={(event) => setValue({ ...value, reason: event.target.value })} />
      </div>
      <Submit saving={saving} label="Submit for approval" />
    </form>
  );
}
function ProductBatchFields({ products, selected, value, setValue }) {
  return (
    <>
      <div className="grid gap-1.5">
        <Label>Product</Label>
        <Select
          required
          value={value.productId}
          onValueChange={(v) => setValue({ ...value, productId: v, batchId: '' })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {products.map((item) => (
              <SelectItem key={item._id} value={item._id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Batch</Label>
        <Select required value={value.batchId} onValueChange={(v) => setValue({ ...value, batchId: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select batch" />
          </SelectTrigger>
          <SelectContent>
            {selected?.batches.map((batch) => (
              <SelectItem key={batch._id} value={batch._id}>
                {batch.batchNo} ({batch.quantity} available)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
function Quantity({ value, set }) {
  return (
    <div className="grid gap-1.5">
      <Label>Quantity</Label>
      <Input required type="number" min="0.001" step="0.001" value={value} onChange={(event) => set(event.target.value)} />
    </div>
  );
}
function Submit({ saving, label }) {
  return (
    <div className="flex justify-end sm:col-span-2">
      <Button disabled={saving}>{saving ? 'Saving…' : label}</Button>
    </div>
  );
}
function ProductForm({ value, setValue, branches, showBranch, error, saving, submit }) {
  const set = (key, next) => setValue({ ...value, [key]: next });
  return (
    <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={submit}>
      {error && <div className="form-error sm:col-span-2">{error}</div>}
      {showBranch && (
        <div className="grid gap-1.5">
          <Label>Branch</Label>
          <Select required value={value.branchId} onValueChange={(v) => set('branchId', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch._id} value={branch._id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid gap-1.5">
        <Label>SKU</Label>
        <Input required value={value.sku} onChange={(event) => set('sku', event.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>Product name</Label>
        <Input required value={value.name} onChange={(event) => set('name', event.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>Category</Label>
        <Input required value={value.category} onChange={(event) => set('category', event.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>Brand</Label>
        <Input value={value.brand} onChange={(event) => set('brand', event.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>Unit</Label>
        <Select value={value.unit} onValueChange={(v) => set('unit', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {unitOptions.map((unit) => (
              <SelectItem key={unit} value={unit}>
                {unit}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>HSN/SAC</Label>
        <Input value={value.hsnSac} onChange={(event) => set('hsnSac', event.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>Reorder level</Label>
        <Input type="number" min="0" value={value.reorderLevel} onChange={(event) => set('reorderLevel', event.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>Opening batch</Label>
        <Input required value={value.batchNo} onChange={(event) => set('batchNo', event.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>Expiry date</Label>
        <Input type="date" value={value.expiryDate} onChange={(event) => set('expiryDate', event.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>Opening quantity</Label>
        <Input
          required
          type="number"
          min="0"
          step="0.001"
          value={value.quantity}
          onChange={(event) => set('quantity', event.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Purchase rate</Label>
        <Input type="number" min="0" value={value.purchaseRate} onChange={(event) => set('purchaseRate', event.target.value)} />
      </div>
      <Submit saving={saving} label="Add product" />
    </form>
  );
}
