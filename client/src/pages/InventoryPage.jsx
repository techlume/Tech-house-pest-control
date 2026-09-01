import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, Boxes, Plus, ShieldCheck } from 'lucide-react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

const emptyProduct = { branchId: '', sku: '', name: '', category: 'Chemical', brand: '', unit: 'Litre', hsnSac: '', reorderLevel: 5, batchNo: '', expiryDate: '', quantity: '', purchaseRate: '' };
const emptyMovement = { productId: '', batchId: '', type: 'PURCHASE', quantity: '', note: '' };
const emptyTransfer = { productId: '', batchId: '', toBranchId: '', quantity: '', note: '' };
const emptyAdjustment = { productId: '', batchId: '', direction: 'OUT', quantity: '', reason: '' };

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
  const canEdit = ['OWNER', 'ADMIN', 'STOREKEEPER'].includes(user?.role);
  const canApprove = ['OWNER', 'ADMIN'].includes(user?.role);
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
    const reviewNote = prompt(status + ' note (optional)') || '';
    try {
      await http.patch('/inventory/adjustments/' + record._id + '/review', { status, reviewNote });
      await reloadAll();
    } catch (requestError) {
      alert(requestError.response?.data?.error?.message || 'Review failed');
    }
  };
  return (
    <>
      <div className='page-heading actions'>
        <div>
          <span className='eyebrow'>Stock control</span>
          <h2>Inventory & Chemicals</h2>
          <p>Trace purchases, batches, transfers, expiry and approved adjustments.</p>
        </div>
        {canEdit && (
          <div className='action-group'>
            <button className='secondary-button' onClick={() => setModal('adjustment')}>Request adjustment</button>
            <button className='secondary-button' onClick={() => setModal('transfer')}><ArrowRightLeft size={16} /> Transfer</button>
            <button className='secondary-button' onClick={() => setModal('movement')}>Stock in/out</button>
            <button className='primary-button compact' onClick={() => setModal('product')}><Plus size={17} /> Product</button>
          </div>
        )}
      </div>
      <div className='summary-grid'>
        <article><Boxes /><div><strong>{products.data.length}</strong><span>Products</span></div></article>
        <article><ShieldCheck /><div><strong>{totalUnits.toLocaleString('en-IN')}</strong><span>Units in stock</span></div></article>
        <article className={alerts.lowStock.length ? 'warning' : ''}><AlertTriangle /><div><strong>{alerts.lowStock.length}</strong><span>Low stock</span></div></article>
        <article className={alerts.expiring.length ? 'warning' : ''}><AlertTriangle /><div><strong>{alerts.expiring.length}</strong><span>Expiring in 60 days</span></div></article>
      </div>
      {alerts.expiring.length > 0 && (
        <section className='panel'>
          <h3>Expiry alerts</h3>
          {alerts.expiring.map((item) => (
            <div className='movement-row' key={item.batchId}>
              <StatusBadge value={item.expired ? 'Expired' : 'Expiring'} />
              <strong>{item.name}</strong>
              <span>Batch {item.batchNo} · {item.quantity} {item.unit}</span>
              <small>{new Date(item.expiryDate).toLocaleDateString('en-IN')}</small>
            </div>
          ))}
        </section>
      )}
      <div className='table-card'>
        <table>
          <thead><tr><th>SKU / Product</th><th>Category</th><th>Batch</th><th>Expiry</th><th>Available</th><th>Reorder at</th></tr></thead>
          <tbody>
            {products.data.flatMap((item) => item.batches.map((batch) => (
              <tr key={batch._id}>
                <td><strong>{item.sku}</strong><small>{item.name} · {item.brand}</small></td>
                <td>{item.category}</td><td>{batch.batchNo}</td>
                <td>{batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString('en-IN') : '—'}</td>
                <td><strong>{batch.quantity} {item.unit}</strong></td><td>{item.reorderLevel} {item.unit}</td>
              </tr>
            )))}
          </tbody>
        </table>
        {!products.data.length && <div className='empty-table'>No inventory products</div>}
      </div>
      <section className='panel movement-panel'>
        <h3>Adjustment approval queue</h3>
        {adjustments.data.slice(0, 20).map((item) => (
          <div className='movement-row' key={item._id}>
            <StatusBadge value={item.status} />
            <strong>{item.productId?.name}</strong>
            <span>{item.direction} {item.quantity} {item.productId?.unit} · {item.reason}</span>
            <small>{item.requestedBy?.name}</small>
            {canApprove && item.status === 'Pending' && (
              <span className='action-group'>
                <button onClick={() => review(item, 'Approved')}>Approve</button>
                <button className='danger-button' onClick={() => review(item, 'Rejected')}>Reject</button>
              </span>
            )}
          </div>
        ))}
        {!adjustments.data.length && <p className='muted'>No stock adjustments.</p>}
      </section>
      <section className='panel movement-panel'>
        <h3>Recent stock movements</h3>
        {movements.data.slice(0, 15).map((item) => (
          <div className='movement-row' key={item._id}>
            <span className={'movement-type ' + (item.type.includes('OUT') || item.type === 'ISSUE' || item.type === 'CONSUMPTION' ? 'out' : 'in')}>{item.type}</span>
            <strong>{item.productId?.name}</strong><span>{item.quantity} {item.productId?.unit}</span>
            <small>{new Date(item.occurredAt).toLocaleString('en-IN')}</small>
          </div>
        ))}
      </section>
      {modal === 'product' && <Modal title='Add inventory product' onClose={() => setModal(null)}><ProductForm value={product} setValue={setProduct} branches={branches.data} showBranch={canApprove} error={error} saving={saving} submit={(event) => submit(event, '/inventory/products', { branchId: product.branchId || undefined, sku: product.sku, name: product.name, category: product.category, brand: product.brand, unit: product.unit, hsnSac: product.hsnSac, reorderLevel: Number(product.reorderLevel), batches: [{ batchNo: product.batchNo, expiryDate: product.expiryDate || undefined, quantity: Number(product.quantity), purchaseRate: Number(product.purchaseRate || 0) }] }, () => setProduct(emptyProduct))} /></Modal>}
      {modal === 'movement' && <Modal title='Record stock movement' onClose={() => setModal(null)}><StockForm error={error} saving={saving} products={products.data} selected={selectedMovement} value={movement} setValue={setMovement} types={['PURCHASE', 'RETURN', 'ISSUE']} submit={(event) => submit(event, '/inventory/movements', { ...movement, quantity: Number(movement.quantity) }, () => setMovement(emptyMovement))} /></Modal>}
      {modal === 'transfer' && <Modal title='Transfer stock to branch' onClose={() => setModal(null)}><TransferForm error={error} saving={saving} products={products.data} branches={branches.data} selected={selectedTransfer} value={transfer} setValue={setTransfer} submit={(event) => submit(event, '/inventory/transfers', { ...transfer, quantity: Number(transfer.quantity) }, () => setTransfer(emptyTransfer))} /></Modal>}
      {modal === 'adjustment' && <Modal title='Request stock adjustment' onClose={() => setModal(null)}><AdjustmentForm error={error} saving={saving} products={products.data} selected={selectedAdjustment} value={adjustment} setValue={setAdjustment} submit={(event) => submit(event, '/inventory/adjustments', { ...adjustment, quantity: Number(adjustment.quantity) }, () => setAdjustment(emptyAdjustment))} /></Modal>}
    </>
  );
}

function StockForm({ error, saving, products, selected, value, setValue, types, submit }) {
  return <form className='form-grid' onSubmit={submit}>{error && <div className='form-error wide'>{error}</div>}<ProductBatchFields products={products} selected={selected} value={value} setValue={setValue} /><label><span>Movement</span><select value={value.type} onChange={(event) => setValue({ ...value, type: event.target.value })}>{types.map((type) => <option key={type}>{type}</option>)}</select></label><Quantity value={value.quantity} set={(quantity) => setValue({ ...value, quantity })} /><label className='wide'><span>Reference / note</span><input value={value.note} onChange={(event) => setValue({ ...value, note: event.target.value })} /></label><Submit saving={saving} label='Record movement' /></form>;
}
function TransferForm({ error, saving, products, branches, selected, value, setValue, submit }) {
  return <form className='form-grid' onSubmit={submit}>{error && <div className='form-error wide'>{error}</div>}<ProductBatchFields products={products} selected={selected} value={value} setValue={setValue} /><label><span>Destination branch</span><select required value={value.toBranchId} onChange={(event) => setValue({ ...value, toBranchId: event.target.value })}><option value=''>Select branch</option>{branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}</select></label><Quantity value={value.quantity} set={(quantity) => setValue({ ...value, quantity })} /><label className='wide'><span>Transfer note</span><input value={value.note} onChange={(event) => setValue({ ...value, note: event.target.value })} /></label><Submit saving={saving} label='Transfer stock' /></form>;
}
function AdjustmentForm({ error, saving, products, selected, value, setValue, submit }) {
  return <form className='form-grid' onSubmit={submit}>{error && <div className='form-error wide'>{error}</div>}<ProductBatchFields products={products} selected={selected} value={value} setValue={setValue} /><label><span>Direction</span><select value={value.direction} onChange={(event) => setValue({ ...value, direction: event.target.value })}><option value='OUT'>Reduce stock</option><option value='IN'>Increase stock</option></select></label><Quantity value={value.quantity} set={(quantity) => setValue({ ...value, quantity })} /><label className='wide'><span>Reason</span><input required value={value.reason} onChange={(event) => setValue({ ...value, reason: event.target.value })} /></label><Submit saving={saving} label='Submit for approval' /></form>;
}
function ProductBatchFields({ products, selected, value, setValue }) {
  return <><label><span>Product</span><select required value={value.productId} onChange={(event) => setValue({ ...value, productId: event.target.value, batchId: '' })}><option value=''>Select product</option>{products.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label><label><span>Batch</span><select required value={value.batchId} onChange={(event) => setValue({ ...value, batchId: event.target.value })}><option value=''>Select batch</option>{selected?.batches.map((batch) => <option key={batch._id} value={batch._id}>{batch.batchNo} ({batch.quantity} available)</option>)}</select></label></>;
}
function Quantity({ value, set }) { return <label><span>Quantity</span><input required type='number' min='0.001' step='0.001' value={value} onChange={(event) => set(event.target.value)} /></label>; }
function Submit({ saving, label }) { return <div className='form-actions wide'><button className='primary-button' disabled={saving}>{saving ? 'Saving…' : label}</button></div>; }
function ProductForm({ value, setValue, branches, showBranch, error, saving, submit }) {
  const set = (key, next) => setValue({ ...value, [key]: next });
  return <form className='form-grid' onSubmit={submit}>{error && <div className='form-error wide'>{error}</div>}{showBranch && <label><span>Branch</span><select required value={value.branchId} onChange={(event) => set('branchId', event.target.value)}><option value=''>Select branch</option>{branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}</select></label>}<label><span>SKU</span><input required value={value.sku} onChange={(event) => set('sku', event.target.value)} /></label><label><span>Product name</span><input required value={value.name} onChange={(event) => set('name', event.target.value)} /></label><label><span>Category</span><input required value={value.category} onChange={(event) => set('category', event.target.value)} /></label><label><span>Brand</span><input value={value.brand} onChange={(event) => set('brand', event.target.value)} /></label><label><span>Unit</span><select value={value.unit} onChange={(event) => set('unit', event.target.value)}>{['Litre', 'Millilitre', 'Kilogram', 'Gram', 'Piece', 'Tube'].map((unit) => <option key={unit}>{unit}</option>)}</select></label><label><span>HSN/SAC</span><input value={value.hsnSac} onChange={(event) => set('hsnSac', event.target.value)} /></label><label><span>Reorder level</span><input type='number' min='0' value={value.reorderLevel} onChange={(event) => set('reorderLevel', event.target.value)} /></label><label><span>Opening batch</span><input required value={value.batchNo} onChange={(event) => set('batchNo', event.target.value)} /></label><label><span>Expiry date</span><input type='date' value={value.expiryDate} onChange={(event) => set('expiryDate', event.target.value)} /></label><label><span>Opening quantity</span><input required type='number' min='0' step='0.001' value={value.quantity} onChange={(event) => set('quantity', event.target.value)} /></label><label><span>Purchase rate</span><input type='number' min='0' value={value.purchaseRate} onChange={(event) => set('purchaseRate', event.target.value)} /></label><Submit saving={saving} label='Add product' /></form>;
}
