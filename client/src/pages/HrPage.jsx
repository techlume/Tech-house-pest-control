import { useState } from 'react';
import { CalendarCheck, Eye, Plus, Printer, Users, Wallet } from 'lucide-react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

const today = new Date().toISOString().slice(0, 10);
const employeeInitial = { branchId: '', userId: '', name: '', email: '', phone: '', designation: 'Technician', department: 'Operations', employmentType: 'Permanent', joiningDate: today, baseSalary: '', allowances: 0, deductions: 0 };
const attendanceInitial = { employeeId: '', date: today, status: 'Present', punchIn: '', punchOut: '', note: '' };
const leaveInitial = { employeeId: '', leaveType: 'Casual', fromDate: today, toDate: today, reason: '' };
const payrollInitial = { branchId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), workingDays: 26 };
const position = () => new Promise((resolve, reject) => navigator.geolocation ? navigator.geolocation.getCurrentPosition(({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }), reject, { enableHighAccuracy: true, timeout: 10000 }) : reject(new Error('GPS unavailable')));

export function HrPage() {
  const employees = useApiList('/hr/employees');
  const attendance = useApiList('/hr/attendance');
  const leaves = useApiList('/hr/leaves');
  const payroll = useApiList('/hr/payroll');
  const branches = useApiList('/branches');
  const users = useApiList('/users');
  const { user } = useAuth();
  const [tab, setTab] = useState('employees');
  const [modal, setModal] = useState(null);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [employee, setEmployee] = useState(employeeInitial);
  const [att, setAtt] = useState(attendanceInitial);
  const [leave, setLeave] = useState(leaveInitial);
  const [pay, setPay] = useState(payrollInitial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const admin = ['OWNER', 'ADMIN'].includes(user?.role);
  const payrollAccess = [...(admin ? ['OWNER', 'ADMIN'] : []), 'ACCOUNTANT'].includes(user?.role);
  const request = async (work, reload) => {
    setSaving(true);
    setError('');
    try {
      await work();
      setModal(null);
      if (reload) await reload();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || requestError.message || 'Could not save record');
    } finally {
      setSaving(false);
    }
  };
  const punch = async (action) => request(async () => {
    await http.post('/hr/attendance/punch', { action, gps: await position() });
  }, attendance.reload);
  const reviewLeave = async (record, status) => {
    const reviewNote = prompt('Review note (optional)') || '';
    await http.patch('/hr/leaves/' + record._id + '/review', { status, reviewNote });
    await Promise.all([leaves.reload(), attendance.reload()]);
  };
  const payrollStatus = async (record, status) => {
    await http.patch('/hr/payroll/' + record._id + '/status', { status });
    await payroll.reload();
    setSelectedPayroll(null);
  };
  const markPaid = async (line) => {
    const paymentReference = prompt('Enter bank/payment reference');
    if (!paymentReference) return;
    const { data } = await http.patch('/hr/payroll/' + selectedPayroll._id + '/lines/' + line._id + '/pay', { paymentReference });
    setSelectedPayroll(data.payroll);
    await payroll.reload();
  };
  const tabs = [['employees', 'Employees', Users], ['attendance', 'Attendance', CalendarCheck], ['leaves', 'Leave', CalendarCheck], ...(payrollAccess ? [['payroll', 'Payroll', Wallet]] : [])];
  return (
    <>
      <div className='page-heading actions'>
        <div><span className='eyebrow'>People operations</span><h2>HR, Attendance & Payroll</h2><p>Employees, attendance, leave approvals and monthly salary processing.</p></div>
        <div className='action-group'>
          {tab === 'attendance' && !admin && <><button onClick={() => punch('IN')}>Punch in</button><button onClick={() => punch('OUT')}>Punch out</button></>}
          {tab === 'leaves' && <button className='primary-button compact' onClick={() => setModal('leave')}><Plus size={17} /> Request leave</button>}
          {admin && tab === 'employees' && <button className='primary-button compact' onClick={() => setModal('employee')}><Plus size={17} /> Employee</button>}
          {admin && tab === 'attendance' && <button className='primary-button compact' onClick={() => setModal('attendance')}><Plus size={17} /> Attendance</button>}
          {admin && tab === 'payroll' && <button className='primary-button compact' onClick={() => setModal('payroll')}><Plus size={17} /> Generate payroll</button>}
        </div>
      </div>
      <div className='tabs hr-tabs'>{tabs.map(([key, label, Icon]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}><Icon size={15} />{label}</button>)}</div>
      {error && !modal && <div className='form-error'>{error}</div>}
      {tab === 'employees' && <Table heads={['Employee', 'Designation', 'Department', 'Joining', 'Salary', 'Status']} rows={employees.data.map((item) => [<><strong>{item.employeeNo}</strong><small>{item.name}</small></>, item.designation, item.department, new Date(item.joiningDate).toLocaleDateString('en-IN'), '₹' + item.baseSalary.toLocaleString('en-IN'), <StatusBadge value={item.status} />])} />}
      {tab === 'attendance' && <Table heads={['Date', 'Employee', 'Status', 'Punch in', 'Punch out', 'Hours']} rows={attendance.data.map((item) => [new Date(item.date).toLocaleDateString('en-IN'), item.employeeId?.name, <StatusBadge value={item.status} />, item.punchIn ? new Date(item.punchIn).toLocaleTimeString('en-IN') : '—', item.punchOut ? new Date(item.punchOut).toLocaleTimeString('en-IN') : '—', (item.workedMinutes / 60).toFixed(1)])} />}
      {tab === 'leaves' && <Table heads={['Employee', 'Type', 'Period', 'Days', 'Status', 'Actions']} rows={leaves.data.map((item) => [item.employeeId?.name, item.leaveType, new Date(item.fromDate).toLocaleDateString('en-IN') + ' – ' + new Date(item.toDate).toLocaleDateString('en-IN'), item.days, <StatusBadge value={item.status} />, admin && item.status === 'Pending' ? <span className='action-group'><button onClick={() => reviewLeave(item, 'Approved')}>Approve</button><button className='danger-button' onClick={() => reviewLeave(item, 'Rejected')}>Reject</button></span> : item.reason || '—'])} />}
      {tab === 'payroll' && <Table heads={['Payroll', 'Period', 'Employees', 'Gross', 'Net', 'Status', 'View']} rows={payroll.data.map((item) => [item.payrollNo, String(item.month).padStart(2, '0') + '/' + item.year, item.lines.length, '₹' + item.grossTotal.toLocaleString('en-IN'), '₹' + item.netTotal.toLocaleString('en-IN'), <StatusBadge value={item.status} />, <button className='icon-action' onClick={() => setSelectedPayroll(item)}><Eye size={17} /></button>])} />}
      {modal === 'employee' && <Modal title='Add employee' onClose={() => setModal(null)}><EmployeeForm value={employee} setValue={setEmployee} branches={branches.data} users={users.data} error={error} saving={saving} submit={(event) => { event.preventDefault(); request(async () => http.post('/hr/employees', { ...employee, branchId: employee.branchId || undefined, userId: employee.userId || undefined, baseSalary: Number(employee.baseSalary), allowances: Number(employee.allowances), deductions: Number(employee.deductions) }), employees.reload); }} /></Modal>}
      {modal === 'attendance' && <Modal title='Record attendance' onClose={() => setModal(null)}><AttendanceForm value={att} setValue={setAtt} employees={employees.data} error={error} saving={saving} submit={(event) => { event.preventDefault(); request(async () => http.post('/hr/attendance', { ...att, punchIn: att.punchIn ? att.date + 'T' + att.punchIn : undefined, punchOut: att.punchOut ? att.date + 'T' + att.punchOut : undefined }), attendance.reload); }} /></Modal>}
      {modal === 'leave' && <Modal title='Request leave' onClose={() => setModal(null)}><LeaveForm value={leave} setValue={setLeave} employees={employees.data} admin={admin} error={error} saving={saving} submit={(event) => { event.preventDefault(); request(async () => http.post('/hr/leaves', leave), leaves.reload); }} /></Modal>}
      {modal === 'payroll' && <Modal title='Generate monthly payroll' onClose={() => setModal(null)}><PayrollForm value={pay} setValue={setPay} branches={branches.data} error={error} saving={saving} submit={(event) => { event.preventDefault(); request(async () => http.post('/hr/payroll/generate', { ...pay, month: Number(pay.month), year: Number(pay.year), workingDays: Number(pay.workingDays) }), payroll.reload); }} /></Modal>}
      {selectedPayroll && <Modal title={'Payroll · ' + selectedPayroll.payrollNo} onClose={() => setSelectedPayroll(null)}><PayrollDocument payroll={selectedPayroll} markPaid={markPaid} /><div className='form-actions'><button onClick={() => window.print()}><Printer size={16} /> Print payslips</button>{selectedPayroll.status === 'Draft' && <button className='primary-button' onClick={() => payrollStatus(selectedPayroll, 'Approved')}>Approve payroll</button>}</div></Modal>}
    </>
  );
}

function Table({ heads, rows }) { return <div className='table-card'><table><thead><tr>{heads.map((head) => <th key={head}>{head}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table>{!rows.length && <div className='empty-table'>No records available</div>}</div>; }
const Field = ({ label, children, wide }) => <label className={wide ? 'wide' : ''}><span>{label}</span>{children}</label>;
const Submit = ({ saving, label }) => <div className='form-actions wide'><button className='primary-button' disabled={saving}>{saving ? 'Saving…' : label}</button></div>;
function EmployeeForm({ value, setValue, branches, users, error, saving, submit }) { const set = (key, next) => setValue({ ...value, [key]: next }); return <form className='form-grid' onSubmit={submit}>{error && <div className='form-error wide'>{error}</div>}<Field label='Branch'><select required value={value.branchId} onChange={(event) => set('branchId', event.target.value)}><option value=''>Select branch</option>{branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}</select></Field><Field label='Login account'><select value={value.userId} onChange={(event) => set('userId', event.target.value)}><option value=''>No self-service login</option>{users.filter((item) => item.role !== 'CUSTOMER').map((item) => <option key={item._id} value={item._id}>{item.name} · {item.role}</option>)}</select></Field>{[['Name', 'name'], ['Email', 'email'], ['Phone', 'phone'], ['Designation', 'designation'], ['Department', 'department']].map(([label, key]) => <Field key={key} label={label}><input required={['name', 'designation'].includes(key)} value={value[key]} onChange={(event) => set(key, event.target.value)} /></Field>)}<Field label='Employment type'><select value={value.employmentType} onChange={(event) => set('employmentType', event.target.value)}><option>Permanent</option><option>Contract</option><option>Part-time</option></select></Field><Field label='Joining date'><input required type='date' value={value.joiningDate} onChange={(event) => set('joiningDate', event.target.value)} /></Field>{[['Base salary', 'baseSalary'], ['Allowances', 'allowances'], ['Deductions', 'deductions']].map(([label, key]) => <Field key={key} label={label}><input required type='number' min='0' value={value[key]} onChange={(event) => set(key, event.target.value)} /></Field>)}<Submit saving={saving} label='Add employee' /></form>; }
function AttendanceForm({ value, setValue, employees, error, saving, submit }) { const set = (key, next) => setValue({ ...value, [key]: next }); return <form className='form-grid' onSubmit={submit}>{error && <div className='form-error wide'>{error}</div>}<Field label='Employee'><select required value={value.employeeId} onChange={(event) => set('employeeId', event.target.value)}><option value=''>Select employee</option>{employees.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></Field><Field label='Date'><input required type='date' value={value.date} onChange={(event) => set('date', event.target.value)} /></Field><Field label='Status'><select value={value.status} onChange={(event) => set('status', event.target.value)}>{['Present', 'Absent', 'Half Day', 'Leave', 'Holiday'].map((status) => <option key={status}>{status}</option>)}</select></Field><Field label='Punch in'><input type='time' value={value.punchIn} onChange={(event) => set('punchIn', event.target.value)} /></Field><Field label='Punch out'><input type='time' value={value.punchOut} onChange={(event) => set('punchOut', event.target.value)} /></Field><Submit saving={saving} label='Save attendance' /></form>; }
function LeaveForm({ value, setValue, employees, admin, error, saving, submit }) { const set = (key, next) => setValue({ ...value, [key]: next }); return <form className='form-grid' onSubmit={submit}>{error && <div className='form-error wide'>{error}</div>}{admin && <Field label='Employee'><select required value={value.employeeId} onChange={(event) => set('employeeId', event.target.value)}><option value=''>Select employee</option>{employees.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></Field>}<Field label='Leave type'><select value={value.leaveType} onChange={(event) => set('leaveType', event.target.value)}>{['Casual', 'Sick', 'Earned', 'Unpaid', 'Other'].map((type) => <option key={type}>{type}</option>)}</select></Field><Field label='From'><input required type='date' value={value.fromDate} onChange={(event) => set('fromDate', event.target.value)} /></Field><Field label='To'><input required type='date' min={value.fromDate} value={value.toDate} onChange={(event) => set('toDate', event.target.value)} /></Field><Field label='Reason' wide><textarea required rows='3' value={value.reason} onChange={(event) => set('reason', event.target.value)} /></Field><Submit saving={saving} label='Submit leave request' /></form>; }
function PayrollForm({ value, setValue, branches, error, saving, submit }) { const set = (key, next) => setValue({ ...value, [key]: next }); return <form className='form-grid' onSubmit={submit}>{error && <div className='form-error wide'>{error}</div>}<Field label='Branch'><select required value={value.branchId} onChange={(event) => set('branchId', event.target.value)}><option value=''>Select branch</option>{branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}</select></Field><Field label='Month'><input required type='number' min='1' max='12' value={value.month} onChange={(event) => set('month', event.target.value)} /></Field><Field label='Year'><input required type='number' min='2020' value={value.year} onChange={(event) => set('year', event.target.value)} /></Field><Field label='Working days'><input required type='number' min='1' max='31' value={value.workingDays} onChange={(event) => set('workingDays', event.target.value)} /></Field><Submit saving={saving} label='Generate draft payroll' /></form>; }
function PayrollDocument({ payroll, markPaid }) { return <div className='payroll-document'><header><h2>Tech House Pest Control</h2><strong>{payroll.payrollNo} · {String(payroll.month).padStart(2, '0')}/{payroll.year}</strong><StatusBadge value={payroll.status} /></header>{payroll.lines.map((line) => <article className='payslip' key={line._id}><div><h3>{line.employeeName}</h3><small>{line.employeeNo}</small></div><div><span>Present: {line.presentDays}</span><span>Paid leave: {line.paidLeaveDays}</span><span>Unpaid: {line.unpaidDays}</span></div><div><span>Prorated salary: ₹{line.proratedSalary.toLocaleString('en-IN')}</span><span>Allowances: ₹{line.allowances.toLocaleString('en-IN')}</span><span>Deductions: ₹{line.deductions.toLocaleString('en-IN')}</span><strong>Net: ₹{line.netSalary.toLocaleString('en-IN')}</strong></div><StatusBadge value={line.status} />{payroll.status === 'Approved' && line.status !== 'Paid' && <button onClick={() => markPaid(line)}>Mark paid</button>}{line.paymentReference && <small>Reference: {line.paymentReference}</small>}</article>)}</div>; }
