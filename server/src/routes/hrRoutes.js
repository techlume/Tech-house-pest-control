import { Router } from 'express';
import { Employee } from '../models/Employee.js';
import { Attendance } from '../models/Attendance.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { PayrollRun } from '../models/PayrollRun.js';
import { authenticate, allowRoles, branchScope } from '../middleware/auth.js';
import { ROLES, STAFF_ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { writeBranch } from '../utils/scope.js';
import { nextReference } from '../services/sequenceService.js';
import { AppError } from '../utils/AppError.js';
import { User } from '../models/User.js';
const r = Router(),
  admins = allowRoles(ROLES.OWNER, ROLES.ADMIN),
  payrollRoles = allowRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.ACCOUNTANT);
r.use(authenticate, allowRoles(...STAFF_ROLES));
r.get(
  '/employees',
  asyncHandler(async (req, res) =>
    res.json({
      items: await Employee.find(branchScope(req, req.query.branchId)).sort({
        name: 1,
      }),
    }),
  ),
);
r.post(
  '/employees',
  admins,
  asyncHandler(async (req, res) => {
    const branchId = writeBranch(req, req.body.branchId),
      scope = { companyId: req.auth.companyId, branchId };
    if (req.body.userId) {
      const linkedUser = await User.findOne({
        _id: req.body.userId,
        companyId: req.auth.companyId,
        branchId,
        role: { $ne: ROLES.CUSTOMER },
        active: true,
      });
      if (!linkedUser)
        throw new AppError(422, 'Select an active staff login from the employee branch');
    }
    const employee = await Employee.create({
      ...req.body,
      ...scope,
      employeeNo: await nextReference(Employee, scope, 'employeeNo', 'EMP'),
      createdBy: req.auth.userId,
      updatedBy: req.auth.userId,
    });
    res.status(201).json({ employee });
  }),
);
r.get(
  '/attendance',
  asyncHandler(async (req, res) => {
    const filter = { ...branchScope(req, req.query.branchId) };
    if (req.query.from || req.query.to)
      filter.date = {
        ...(req.query.from ? { $gte: new Date(req.query.from) } : {}),
        ...(req.query.to ? { $lte: new Date(req.query.to) } : {}),
      };
    res.json({
      items: await Attendance.find(filter)
        .populate('employeeId', 'name employeeNo designation')
        .sort({ date: -1 }),
    });
  }),
);
r.post(
  '/attendance',
  admins,
  asyncHandler(async (req, res) => {
    const employee = await Employee.findOne({
      ...branchScope(req),
      _id: req.body.employeeId,
    });
    if (!employee) throw new AppError(404, 'Employee not found');
    const date = new Date(req.body.date);
    date.setHours(0, 0, 0, 0);
    const punchIn = req.body.punchIn ? new Date(req.body.punchIn) : undefined,
      punchOut = req.body.punchOut ? new Date(req.body.punchOut) : undefined,
      workedMinutes =
        punchIn && punchOut
          ? Math.max(0, Math.round((punchOut - punchIn) / 60000))
          : 0;
    const attendance = await Attendance.findOneAndUpdate(
      { companyId: employee.companyId, employeeId: employee._id, date },
      {
        $set: {
          ...req.body,
          companyId: employee.companyId,
          branchId: employee.branchId,
          date,
          punchIn,
          punchOut,
          workedMinutes,
          approvedBy: req.auth.userId,
          updatedBy: req.auth.userId,
        },
        $setOnInsert: { createdBy: req.auth.userId },
      },
      { new: true, upsert: true, runValidators: true },
    );
    res.status(201).json({ attendance });
  }),
);
r.post(
  '/attendance/punch',
  asyncHandler(async (req, res) => {
    const employee = await Employee.findOne({
      companyId: req.auth.companyId,
      branchId: req.auth.branchId,
      userId: req.auth.userId,
      status: { $in: ['Active', 'On Leave'] },
    });
    if (!employee) throw new AppError(404, 'Your login is not linked to an active employee');
    const now = new Date();
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    let attendance = await Attendance.findOne({
      companyId: employee.companyId,
      employeeId: employee._id,
      date,
    });
    if (req.body.action === 'IN') {
      if (attendance?.punchIn) throw new AppError(409, 'Already punched in today');
      attendance = await Attendance.findOneAndUpdate(
        { companyId: employee.companyId, employeeId: employee._id, date },
        {
          $set: { branchId: employee.branchId, status: 'Present', punchIn: now, 'gps.punchIn': req.body.gps, updatedBy: req.auth.userId },
          $setOnInsert: { createdBy: req.auth.userId },
        },
        { new: true, upsert: true, runValidators: true },
      );
    } else if (req.body.action === 'OUT') {
      if (!attendance?.punchIn) throw new AppError(409, 'Punch in before punching out');
      if (attendance.punchOut) throw new AppError(409, 'Already punched out today');
      attendance.punchOut = now;
      attendance.gps.punchOut = req.body.gps;
      attendance.workedMinutes = Math.max(0, Math.round((now - attendance.punchIn) / 60000));
      attendance.updatedBy = req.auth.userId;
      await attendance.save();
    } else throw new AppError(422, 'Punch action must be IN or OUT');
    res.json({ attendance });
  }),
);
r.get(
  '/leaves',
  asyncHandler(async (req, res) =>
    res.json({
      items: await LeaveRequest.find(branchScope(req, req.query.branchId))
        .populate('employeeId', 'name employeeNo')
        .sort({ createdAt: -1 }),
    }),
  ),
);
r.post(
  '/leaves',
  asyncHandler(async (req, res) => {
    const isAdmin = [ROLES.OWNER, ROLES.ADMIN].includes(req.auth.role);
    const employee = await Employee.findOne(
      isAdmin
        ? { ...branchScope(req), _id: req.body.employeeId }
        : {
            companyId: req.auth.companyId,
            branchId: req.auth.branchId,
            userId: req.auth.userId,
          },
    );
    if (!employee) throw new AppError(404, 'Employee not found');
    const from = new Date(req.body.fromDate),
      to = new Date(req.body.toDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
      throw new AppError(422, 'Valid leave dates are required');
    if (to < from)
      throw new AppError(422, 'Leave end date cannot be before start date');
    const days = Math.floor((to - from) / 86400000) + 1;
    const leave = await LeaveRequest.create({
      ...req.body,
      employeeId: employee._id,
      companyId: employee.companyId,
      branchId: employee.branchId,
      days,
      createdBy: req.auth.userId,
      updatedBy: req.auth.userId,
    });
    res.status(201).json({ leave });
  }),
);
r.patch(
  '/leaves/:id/review',
  admins,
  asyncHandler(async (req, res) => {
    const leave = await LeaveRequest.findOne({
      ...branchScope(req),
      _id: req.params.id,
    });
    if (!leave) throw new AppError(404, 'Leave request not found');
    if (leave.status !== 'Pending')
      throw new AppError(409, 'Only pending leave can be reviewed');
    if (!['Approved', 'Rejected'].includes(req.body.status))
      throw new AppError(422, 'Review must be Approved or Rejected');
    leave.status = req.body.status;
    leave.reviewNote = req.body.reviewNote;
    leave.reviewedBy = req.auth.userId;
    leave.reviewedAt = new Date();
    leave.updatedBy = req.auth.userId;
    await leave.save();
    if (leave.status === 'Approved') {
      const operations = [];
      for (
        let date = new Date(leave.fromDate);
        date <= leave.toDate;
        date.setDate(date.getDate() + 1)
      ) {
        const day = new Date(date);
        day.setHours(0, 0, 0, 0);
        operations.push({
          updateOne: {
            filter: { companyId: leave.companyId, employeeId: leave.employeeId, date: day },
            update: {
              $set: {
                branchId: leave.branchId,
                status: leave.leaveType === 'Unpaid' ? 'Absent' : 'Leave',
                note: leave.leaveType + ' leave',
                approvedBy: req.auth.userId,
                updatedBy: req.auth.userId,
              },
              $setOnInsert: { createdBy: req.auth.userId },
            },
            upsert: true,
          },
        });
      }
      if (operations.length) await Attendance.bulkWrite(operations);
    }
    res.json({ leave });
  }),
);
r.get(
  '/payroll',
  payrollRoles,
  asyncHandler(async (req, res) =>
    res.json({
      items: await PayrollRun.find(branchScope(req, req.query.branchId)).sort({
        year: -1,
        month: -1,
      }),
    }),
  ),
);
r.post(
  '/payroll/generate',
  admins,
  asyncHandler(async (req, res) => {
    const branchId = writeBranch(req, req.body.branchId),
      scope = { companyId: req.auth.companyId, branchId },
      month = Number(req.body.month),
      year = Number(req.body.year),
      workingDays = Number(req.body.workingDays);
    if (!Number.isInteger(month) || month < 1 || month > 12)
      throw new AppError(422, 'Payroll month must be between 1 and 12');
    if (!Number.isInteger(year) || year < 2020 || year > 2100)
      throw new AppError(422, 'Enter a valid payroll year');
    if (!Number.isFinite(workingDays) || workingDays < 1 || workingDays > 31)
      throw new AppError(422, 'Working days must be between 1 and 31');
    if (await PayrollRun.exists({ ...scope, month, year }))
      throw new AppError(409, 'Payroll already exists for this month');
    const start = new Date(year, month - 1, 1),
      end = new Date(year, month, 1);
    const employees = await Employee.find({
      ...scope,
      status: { $in: ['Active', 'On Leave'] },
    });
    const lines = [];
    for (const emp of employees) {
      const attendance = await Attendance.find({
        employeeId: emp._id,
        date: { $gte: start, $lt: end },
      });
      const present = attendance.reduce(
        (n, a) =>
          n + (a.status === 'Present' ? 1 : a.status === 'Half Day' ? 0.5 : 0),
        0,
      );
      const paidLeave = attendance.filter((a) => a.status === 'Leave').length;
      const unpaid = Math.max(workingDays - present - paidLeave, 0);
      const prorated =
        (emp.baseSalary * Math.max(workingDays - unpaid, 0)) / workingDays;
      lines.push({
        employeeId: emp._id,
        employeeNo: emp.employeeNo,
        employeeName: emp.name,
        presentDays: present,
        paidLeaveDays: paidLeave,
        unpaidDays: unpaid,
        baseSalary: emp.baseSalary,
        proratedSalary: prorated,
        allowances: emp.allowances,
        deductions: emp.deductions,
        netSalary: Math.max(0, prorated + emp.allowances - emp.deductions),
      });
    }
    const grossTotal = lines.reduce(
        (n, x) => n + x.proratedSalary + x.allowances,
        0,
      ),
      deductionTotal = lines.reduce((n, x) => n + x.deductions, 0);
    const payroll = await PayrollRun.create({
      ...scope,
      payrollNo: await nextReference(PayrollRun, scope, 'payrollNo', 'PAY'),
      month,
      year,
      workingDays,
      lines,
      grossTotal,
      deductionTotal,
      netTotal: grossTotal - deductionTotal,
      createdBy: req.auth.userId,
      updatedBy: req.auth.userId,
    });
    res.status(201).json({ payroll });
  }),
);
r.patch(
  '/payroll/:id/status',
  payrollRoles,
  asyncHandler(async (req, res) => {
    const payroll = await PayrollRun.findOne({
      ...branchScope(req),
      _id: req.params.id,
    });
    if (!payroll) throw new AppError(404, 'Payroll run not found');
    if (req.body.status === 'Approved') {
      if (payroll.status !== 'Draft')
        throw new AppError(409, 'Only draft payroll can be approved');
      payroll.status = 'Approved';
      payroll.approvedBy = req.auth.userId;
      payroll.approvedAt = new Date();
    } else if (req.body.status === 'Cancelled') {
      if (!['Draft', 'Approved'].includes(payroll.status))
        throw new AppError(409, 'This payroll cannot be cancelled');
      payroll.status = 'Cancelled';
    } else throw new AppError(422, 'Status must be Approved or Cancelled');
    payroll.updatedBy = req.auth.userId;
    await payroll.save();
    res.json({ payroll });
  }),
);
r.patch(
  '/payroll/:id/lines/:lineId/pay',
  payrollRoles,
  asyncHandler(async (req, res) => {
    const payroll = await PayrollRun.findOne({
      ...branchScope(req),
      _id: req.params.id,
      status: { $in: ['Approved', 'Paid'] },
    });
    if (!payroll) throw new AppError(404, 'Approved payroll run not found');
    const line = payroll.lines.id(req.params.lineId);
    if (!line) throw new AppError(404, 'Payroll employee line not found');
    if (line.status === 'Paid') throw new AppError(409, 'Salary is already marked paid');
    if (!String(req.body.paymentReference || '').trim())
      throw new AppError(422, 'Payment reference is required');
    line.status = 'Paid';
    line.paidAt = new Date();
    line.paymentReference = req.body.paymentReference.trim();
    if (payroll.lines.every((item) => item.status === 'Paid'))
      payroll.status = 'Paid';
    payroll.updatedBy = req.auth.userId;
    await payroll.save();
    res.json({ payroll, line });
  }),
);
export default r;
