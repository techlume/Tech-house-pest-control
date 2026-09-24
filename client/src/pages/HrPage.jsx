import { useState } from 'react';
import { CalendarCheck, Eye, Plus, Printer, Users, Wallet } from 'lucide-react';
import { http } from '../services/http';
import { useApiList } from '../hooks/useApiList';
import { appPrompt } from '../lib/dialog';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';

const today = new Date().toISOString().slice(0, 10);
const employeeInitial = { branchId: '', userId: '', name: '', email: '', phone: '', designation: 'Technician', department: 'Operations', employmentType: 'Permanent', joiningDate: today, baseSalary: '', allowances: 0, deductions: 0 };
const attendanceInitial = { employeeId: '', date: today, status: 'Present', punchIn: '', punchOut: '', note: '' };
const leaveInitial = { employeeId: '', leaveType: 'Casual', fromDate: today, toDate: today, reason: '' };
const payrollInitial = { branchId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), workingDays: 26 };
const position = () =>
  new Promise((resolve, reject) =>
    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(
          ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
          reject,
          { enableHighAccuracy: true, timeout: 10000 },
        )
      : reject(new Error('GPS unavailable')),
  );
const NO_LOGIN = 'none';

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
  const admin = user?.role === 'ADMIN';
  const payrollAccess = admin;

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
  const punch = async (action) =>
    request(async () => {
      await http.post('/hr/attendance/punch', { action, gps: await position() });
    }, attendance.reload);
  const reviewLeave = async (record, status) => {
    const reviewNote = (await appPrompt('Review note (optional)', { title: 'Review leave request', required: false })) || '';
    await http.patch('/hr/leaves/' + record._id + '/review', { status, reviewNote });
    await Promise.all([leaves.reload(), attendance.reload()]);
  };
  const payrollStatus = async (record, status) => {
    await http.patch('/hr/payroll/' + record._id + '/status', { status });
    await payroll.reload();
    setSelectedPayroll(null);
  };
  const markPaid = async (line) => {
    const paymentReference = await appPrompt('Enter bank/payment reference', { title: 'Mark payroll line as paid' });
    if (!paymentReference) return;
    const { data } = await http.patch('/hr/payroll/' + selectedPayroll._id + '/lines/' + line._id + '/pay', { paymentReference });
    setSelectedPayroll(data.payroll);
    await payroll.reload();
  };
  const tabs = [
    ['employees', 'Employees', Users],
    ['attendance', 'Attendance', CalendarCheck],
    ['leaves', 'Leave', CalendarCheck],
    ...(payrollAccess ? [['payroll', 'Payroll', Wallet]] : []),
  ];

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow">People operations</span>
          <h2 className="text-2xl font-extrabold tracking-tight">HR, Attendance & Payroll</h2>
          <p className="text-sm text-muted-foreground">Employees, attendance, leave approvals and monthly salary processing.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tab === 'attendance' && !admin && (
            <>
              <Button variant="outline" onClick={() => punch('IN')}>
                Punch in
              </Button>
              <Button variant="outline" onClick={() => punch('OUT')}>
                Punch out
              </Button>
            </>
          )}
          {tab === 'leaves' && (
            <Button onClick={() => setModal('leave')}>
              <Plus size={17} /> Request leave
            </Button>
          )}
          {admin && tab === 'employees' && (
            <Button onClick={() => setModal('employee')}>
              <Plus size={17} /> Employee
            </Button>
          )}
          {admin && tab === 'attendance' && (
            <Button onClick={() => setModal('attendance')}>
              <Plus size={17} /> Attendance
            </Button>
          )}
          {admin && tab === 'payroll' && (
            <Button onClick={() => setModal('payroll')}>
              <Plus size={17} /> Generate payroll
            </Button>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-5">
        <TabsList>
          {tabs.map(([key, label, Icon]) => (
            <TabsTrigger key={key} value={key}>
              <Icon size={15} /> {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error && !modal && <div className="form-error">{error}</div>}

      {tab === 'employees' && (
        <RecordTable
          heads={['Employee', 'Designation', 'Department', 'Joining', 'Salary', 'Status']}
          loading={employees.loading}
          rows={employees.data.map((item) => [
            <>
              <strong className="block font-semibold">{item.employeeNo}</strong>
              <small className="text-muted-foreground">{item.name}</small>
            </>,
            item.designation,
            item.department,
            new Date(item.joiningDate).toLocaleDateString('en-IN'),
            '₹' + item.baseSalary.toLocaleString('en-IN'),
            <StatusBadge value={item.status} />,
          ])}
        />
      )}
      {tab === 'attendance' && (
        <RecordTable
          heads={['Date', 'Employee', 'Status', 'Punch in', 'Punch out', 'Hours']}
          loading={attendance.loading}
          rows={attendance.data.map((item) => [
            new Date(item.date).toLocaleDateString('en-IN'),
            item.employeeId?.name,
            <StatusBadge value={item.status} />,
            item.punchIn ? new Date(item.punchIn).toLocaleTimeString('en-IN') : '—',
            item.punchOut ? new Date(item.punchOut).toLocaleTimeString('en-IN') : '—',
            (item.workedMinutes / 60).toFixed(1),
          ])}
        />
      )}
      {tab === 'leaves' && (
        <RecordTable
          heads={['Employee', 'Type', 'Period', 'Days', 'Status', 'Actions']}
          loading={leaves.loading}
          rows={leaves.data.map((item) => [
            item.employeeId?.name,
            item.leaveType,
            new Date(item.fromDate).toLocaleDateString('en-IN') + ' – ' + new Date(item.toDate).toLocaleDateString('en-IN'),
            item.days,
            <StatusBadge value={item.status} />,
            admin && item.status === 'Pending' ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => reviewLeave(item, 'Approved')}>
                  Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => reviewLeave(item, 'Rejected')}>
                  Reject
                </Button>
              </div>
            ) : (
              item.reason || '—'
            ),
          ])}
        />
      )}
      {tab === 'payroll' && (
        <RecordTable
          heads={['Payroll', 'Period', 'Employees', 'Gross', 'Net', 'Status', 'View']}
          loading={payroll.loading}
          rows={payroll.data.map((item) => [
            item.payrollNo,
            String(item.month).padStart(2, '0') + '/' + item.year,
            item.lines.length,
            '₹' + item.grossTotal.toLocaleString('en-IN'),
            '₹' + item.netTotal.toLocaleString('en-IN'),
            <StatusBadge value={item.status} />,
            <Button variant="ghost" size="icon" onClick={() => setSelectedPayroll(item)}>
              <Eye size={17} />
            </Button>,
          ])}
        />
      )}

      <Dialog open={modal === 'employee'} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add employee</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            value={employee}
            setValue={setEmployee}
            branches={branches.data}
            users={users.data}
            error={error}
            saving={saving}
            submit={(event) => {
              event.preventDefault();
              request(
                async () =>
                  http.post('/hr/employees', {
                    ...employee,
                    branchId: employee.branchId || undefined,
                    userId: employee.userId || undefined,
                    baseSalary: Number(employee.baseSalary),
                    allowances: Number(employee.allowances),
                    deductions: Number(employee.deductions),
                  }),
                employees.reload,
              );
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'attendance'} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record attendance</DialogTitle>
          </DialogHeader>
          <AttendanceForm
            value={att}
            setValue={setAtt}
            employees={employees.data}
            error={error}
            saving={saving}
            submit={(event) => {
              event.preventDefault();
              request(
                async () =>
                  http.post('/hr/attendance', {
                    ...att,
                    punchIn: att.punchIn ? att.date + 'T' + att.punchIn : undefined,
                    punchOut: att.punchOut ? att.date + 'T' + att.punchOut : undefined,
                  }),
                attendance.reload,
              );
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'leave'} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request leave</DialogTitle>
          </DialogHeader>
          <LeaveForm
            value={leave}
            setValue={setLeave}
            employees={employees.data}
            admin={admin}
            error={error}
            saving={saving}
            submit={(event) => {
              event.preventDefault();
              request(async () => http.post('/hr/leaves', leave), leaves.reload);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'payroll'} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate monthly payroll</DialogTitle>
          </DialogHeader>
          <PayrollForm
            value={pay}
            setValue={setPay}
            branches={branches.data}
            error={error}
            saving={saving}
            submit={(event) => {
              event.preventDefault();
              request(
                async () =>
                  http.post('/hr/payroll/generate', {
                    ...pay,
                    month: Number(pay.month),
                    year: Number(pay.year),
                    workingDays: Number(pay.workingDays),
                  }),
                payroll.reload,
              );
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedPayroll)} onOpenChange={(open) => !open && setSelectedPayroll(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payroll · {selectedPayroll?.payrollNo}</DialogTitle>
          </DialogHeader>
          {selectedPayroll && (
            <>
              <div className="max-h-[60vh] overflow-y-auto px-6">
                <PayrollDocument payroll={selectedPayroll} markPaid={markPaid} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer size={16} /> Print payslips
                </Button>
                {selectedPayroll.status === 'Draft' && (
                  <Button onClick={() => payrollStatus(selectedPayroll, 'Approved')}>Approve payroll</Button>
                )}
              </DialogFooter>
            </>
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

function EmployeeForm({ value, setValue, branches, users, error, saving, submit }) {
  const set = (key, next) => setValue({ ...value, [key]: next });
  return (
    <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={submit}>
      {error && <div className="form-error sm:col-span-2">{error}</div>}
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
      <div className="grid gap-1.5">
        <Label>Login account</Label>
        <Select value={value.userId || NO_LOGIN} onValueChange={(v) => set('userId', v === NO_LOGIN ? '' : v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_LOGIN}>No self-service login</SelectItem>
            {users.map((item) => (
              <SelectItem key={item._id} value={item._id}>
                {item.name} · {item.role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {[
        ['Name', 'name'],
        ['Email', 'email'],
        ['Phone', 'phone'],
        ['Designation', 'designation'],
        ['Department', 'department'],
      ].map(([label, key]) => (
        <div className="grid gap-1.5" key={key}>
          <Label>{label}</Label>
          <Input required={['name', 'designation'].includes(key)} value={value[key]} onChange={(event) => set(key, event.target.value)} />
        </div>
      ))}
      <div className="grid gap-1.5">
        <Label>Employment type</Label>
        <Select value={value.employmentType} onValueChange={(v) => set('employmentType', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Permanent">Permanent</SelectItem>
            <SelectItem value="Contract">Contract</SelectItem>
            <SelectItem value="Part-time">Part-time</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Joining date</Label>
        <Input required type="date" value={value.joiningDate} onChange={(event) => set('joiningDate', event.target.value)} />
      </div>
      {[
        ['Base salary', 'baseSalary'],
        ['Allowances', 'allowances'],
        ['Deductions', 'deductions'],
      ].map(([label, key]) => (
        <div className="grid gap-1.5" key={key}>
          <Label>{label}</Label>
          <Input required type="number" min="0" value={value[key]} onChange={(event) => set(key, event.target.value)} />
        </div>
      ))}
      <div className="flex justify-end sm:col-span-2">
        <Button disabled={saving}>{saving ? 'Saving…' : 'Add employee'}</Button>
      </div>
    </form>
  );
}

function AttendanceForm({ value, setValue, employees, error, saving, submit }) {
  const set = (key, next) => setValue({ ...value, [key]: next });
  return (
    <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={submit}>
      {error && <div className="form-error sm:col-span-2">{error}</div>}
      <div className="grid gap-1.5 sm:col-span-2">
        <Label>Employee</Label>
        <Select required value={value.employeeId} onValueChange={(v) => set('employeeId', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select employee" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((item) => (
              <SelectItem key={item._id} value={item._id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Date</Label>
        <Input required type="date" value={value.date} onChange={(event) => set('date', event.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>Status</Label>
        <Select value={value.status} onValueChange={(v) => set('status', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['Present', 'Absent', 'Half Day', 'Leave', 'Holiday'].map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Punch in</Label>
        <Input type="time" value={value.punchIn} onChange={(event) => set('punchIn', event.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>Punch out</Label>
        <Input type="time" value={value.punchOut} onChange={(event) => set('punchOut', event.target.value)} />
      </div>
      <div className="flex justify-end sm:col-span-2">
        <Button disabled={saving}>{saving ? 'Saving…' : 'Save attendance'}</Button>
      </div>
    </form>
  );
}

function LeaveForm({ value, setValue, employees, admin, error, saving, submit }) {
  const set = (key, next) => setValue({ ...value, [key]: next });
  return (
    <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={submit}>
      {error && <div className="form-error sm:col-span-2">{error}</div>}
      {admin && (
        <div className="grid gap-1.5 sm:col-span-2">
          <Label>Employee</Label>
          <Select required value={value.employeeId} onValueChange={(v) => set('employeeId', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((item) => (
                <SelectItem key={item._id} value={item._id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid gap-1.5">
        <Label>Leave type</Label>
        <Select value={value.leaveType} onValueChange={(v) => set('leaveType', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['Casual', 'Sick', 'Earned', 'Unpaid', 'Other'].map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>From</Label>
        <Input required type="date" value={value.fromDate} onChange={(event) => set('fromDate', event.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>To</Label>
        <Input required type="date" min={value.fromDate} value={value.toDate} onChange={(event) => set('toDate', event.target.value)} />
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label>Reason</Label>
        <Textarea required rows="3" value={value.reason} onChange={(event) => set('reason', event.target.value)} />
      </div>
      <div className="flex justify-end sm:col-span-2">
        <Button disabled={saving}>{saving ? 'Saving…' : 'Submit leave request'}</Button>
      </div>
    </form>
  );
}

function PayrollForm({ value, setValue, branches, error, saving, submit }) {
  const set = (key, next) => setValue({ ...value, [key]: next });
  return (
    <form className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2" onSubmit={submit}>
      {error && <div className="form-error sm:col-span-2">{error}</div>}
      <div className="grid gap-1.5 sm:col-span-2">
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
      <div className="grid gap-1.5">
        <Label>Month</Label>
        <Input required type="number" min="1" max="12" value={value.month} onChange={(event) => set('month', event.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>Year</Label>
        <Input required type="number" min="2020" value={value.year} onChange={(event) => set('year', event.target.value)} />
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label>Working days</Label>
        <Input required type="number" min="1" max="31" value={value.workingDays} onChange={(event) => set('workingDays', event.target.value)} />
      </div>
      <div className="flex justify-end sm:col-span-2">
        <Button disabled={saving}>{saving ? 'Saving…' : 'Generate draft payroll'}</Button>
      </div>
    </form>
  );
}

function PayrollDocument({ payroll, markPaid }) {
  return (
    <div className="grid gap-4 px-6 py-5">
      <header className="flex flex-col items-center gap-1 border-b border-border pb-4 text-center">
        <h2 className="text-lg font-extrabold">Tech House Pest Control</h2>
        <strong className="text-sm">
          {payroll.payrollNo} · {String(payroll.month).padStart(2, '0')}/{payroll.year}
        </strong>
        <StatusBadge value={payroll.status} />
      </header>
      <div className="grid gap-3">
        {payroll.lines.map((line) => (
          <article key={line._id} className="grid gap-2 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{line.employeeName}</h3>
                <small className="text-muted-foreground">{line.employeeNo}</small>
              </div>
              <StatusBadge value={line.status} />
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>Present: {line.presentDays}</span>
              <span>Paid leave: {line.paidLeaveDays}</span>
              <span>Unpaid: {line.unpaidDays}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span>Prorated salary: ₹{line.proratedSalary.toLocaleString('en-IN')}</span>
              <span>Allowances: ₹{line.allowances.toLocaleString('en-IN')}</span>
              <span>Deductions: ₹{line.deductions.toLocaleString('en-IN')}</span>
              <strong className="font-semibold">Net: ₹{line.netSalary.toLocaleString('en-IN')}</strong>
            </div>
            {payroll.status === 'Approved' && line.status !== 'Paid' && (
              <Button size="sm" variant="outline" className="w-fit" onClick={() => markPaid(line)}>
                Mark paid
              </Button>
            )}
            {line.paymentReference && <small className="text-muted-foreground">Reference: {line.paymentReference}</small>}
          </article>
        ))}
      </div>
    </div>
  );
}
