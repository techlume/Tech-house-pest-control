import { useState } from 'react';
import { ArrowRight, IndianRupee, RefreshCw } from 'lucide-react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
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
    if (!confirm(`Create an AMC and scheduled visits from ${q.quotationNo}?`))
      return;
    setBusy(q._id);
    try {
      const { data } = await http.post(`/contracts/from-quotation/${q._id}`, {
        contractType: 'AMC',
        billingFrequency: 'Per Visit',
      });
      alert(`Contract created with ${data.visitsCreated} visit(s).`);
      await Promise.all([contracts.reload(), quotes.reload()]);
    } catch (x) {
      alert(x.response?.data?.error?.message || 'Could not create contract');
    } finally {
      setBusy('');
    }
  };
  const changeStatus = async (contract, status) => {
    const action = status === 'Active' ? 'resume' : status.toLowerCase();
    if (!confirm('Are you sure you want to ' + action + ' ' + contract.contractNo + '?'))
      return;
    setBusy(contract._id);
    try {
      await http.patch('/contracts/' + contract._id + '/status', { status });
      await contracts.reload();
    } catch (x) {
      alert(x.response?.data?.error?.message || 'Could not update contract');
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
      alert('Renewal created with ' + data.visitsCreated + ' scheduled visit(s).');
      setRenewing(null);
      await contracts.reload();
    } catch (x) {
      alert(x.response?.data?.error?.message || 'Could not renew contract');
    } finally {
      setBusy('');
    }
  };
  return (
    <>
      <div className='page-heading'>
        <span className='eyebrow'>Recurring revenue</span>
        <h2>Contracts & AMC</h2>
        <p>
          Activate accepted proposals and automatically create their service
          schedule.
        </p>
      </div>
      {eligible.length > 0 && (
        <section className='panel conversion-panel'>
          <h3>Quotations ready for conversion</h3>
          {eligible.map((q) => (
            <div className='convert-row' key={q._id}>
              <div>
                <strong>
                  {q.quotationNo} · {q.customerId?.name}
                </strong>
                <small>
                  <IndianRupee size={12} />
                  {Number(q.grandTotal).toLocaleString('en-IN')} · {q.status}
                </small>
              </div>
              <button disabled={busy === q._id} onClick={() => convert(q)}>
                Create AMC <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </section>
      )}
      <div className='card-list contract-list'>
        {contracts.data.map((c) => (
          <article className='record-card' key={c._id}>
            <div>
              <strong>{c.contractNo}</strong>
              <StatusBadge value={c.status} />
            </div>
            <h3>{c.customerId?.name}</h3>
            <p>
              {new Date(c.startDate).toLocaleDateString('en-IN')} —{' '}
              {new Date(c.endDate).toLocaleDateString('en-IN')}
            </p>
            <small>
              {c.services.length} service(s) · {c.billingFrequency}
            </small>
            <strong className='contract-total'>
              <IndianRupee size={14} />
              {Number(c.contractValue).toLocaleString('en-IN')}
            </strong>
            {canManage && (
              <div className='record-actions'>
                {c.status === 'Active' && (
                  <button disabled={busy === c._id} onClick={() => changeStatus(c, 'Paused')}>
                    Pause
                  </button>
                )}
                {c.status === 'Paused' && (
                  <button disabled={busy === c._id} onClick={() => changeStatus(c, 'Active')}>
                    Resume
                  </button>
                )}
                {['Active', 'Paused', 'Expired'].includes(c.status) && (
                  <button className='secondary-button' disabled={busy === c._id} onClick={() => openRenewal(c)}>
                    <RefreshCw size={15} /> Renew
                  </button>
                )}
                {['Active', 'Paused', 'Expired'].includes(c.status) && (
                  <button className='danger-button' disabled={busy === c._id} onClick={() => changeStatus(c, 'Cancelled')}>
                    Cancel
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
      {!contracts.data.length && !eligible.length && (
        <div className='empty-table'>
          No contracts yet. Create a quotation first.
        </div>
      )}
      {renewing && (
        <Modal title={'Renew ' + renewing.contractNo} onClose={() => setRenewing(null)}>
          <form className='form-grid' onSubmit={renew}>
            <label>
              <span>New start date</span>
              <input type='date' required value={renewal.startDate} onChange={(e) => setRenewal({...renewal, startDate:e.target.value})} />
            </label>
            <label>
              <span>New end date</span>
              <input type='date' required min={renewal.startDate} value={renewal.endDate} onChange={(e) => setRenewal({...renewal, endDate:e.target.value})} />
            </label>
            <label className='wide'>
              <span>Contract value</span>
              <input type='number' min='0' step='0.01' required value={renewal.contractValue} onChange={(e) => setRenewal({...renewal, contractValue:e.target.value})} />
            </label>
            <p className='wide'>A new contract and service schedule will be created. The current contract will be marked Renewed.</p>
            <div className='form-actions wide'>
              <button className='primary-button' disabled={busy === renewing._id}>
                {busy === renewing._id ? 'Creating renewal…' : 'Create renewal'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
