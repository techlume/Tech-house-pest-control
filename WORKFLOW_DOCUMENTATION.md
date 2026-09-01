# Tech House Pest Control

Workflow Documentation

Date: August 31, 2026

This document describes the current built workflow of the web application panel by panel, menu by menu, and button by button.

It reflects the app as implemented now, including role-based visibility, form actions, status transitions, and the main end-to-end flow from lead to payment.

## 1) Role-based access summary

The app is built as a single-company, multi-branch system.

- Owner / Admin
  - Can see almost all panels.
  - Can manage branches, users, integrations, inventory approvals, reports, and most finance actions.

- Salesperson
  - Can work in CRM, inspections, quotations, contract creation, and assigned sales follow-up tasks.

- Dispatcher
  - Can manage calendar, visit assignment, job assignment, complaints assignment, and scheduling-related actions.

- Technician
  - Can view assigned work, travel, check-in, complete job cards, capture photos, GPS, and service reports.

- Accountant
  - Can manage billing, receipts, reminders, payroll-related finance actions, and report viewing.

- Storekeeper
  - Can manage inventory, transfers, stock movement, and procurement receiving.

- Customer
  - Can access a reduced set of customer-facing panels such as dashboard, quotations, contracts, calendar, job cards, billing, and complaints, based on the current permission rules.

## 2) Global navigation and layout

### Sidebar menu items

The sidebar shows these panels:

- Dashboard
- CRM & Customers
- Inspections
- Quotations
- Contracts & AMC
- Calendar
- Job Cards
- Inventory
- Purchases & Expenses
- Data Import & Export
- Billing
- Complaints
- HR & Payroll
- Reports
- Notifications
- Branches & Users
- Integrations

Some of these are hidden automatically depending on the logged-in role.

### Common global controls

- Mobile menu button
  - Opens the sidebar on small screens.

- Close sidebar button
  - Closes the mobile drawer.

- Logout button
  - Logs the user out and clears the session.

- Branch chip
  - Indicates the current branch context for the logged-in user.

## 3) Login workflow

### Screen: Sign in

Path: `/login`

#### Fields

- Email address
- Password

#### Buttons and controls

- Eye icon
  - Toggles password visibility.

- Sign in
  - Submits the email and password.
  - If login succeeds, the user enters the app.

- Verify customer email
  - Opens the OTP verification flow for customer accounts.

- Send OTP
  - Sends a six-digit email OTP to the entered email address.

- Verify email
  - Verifies the OTP and marks the email as verified.

#### Validation rules

- Email must be valid.
- Password must be 8 to 64 characters.
- Password must include:
  - uppercase
  - lowercase
  - number
  - special character

#### Login outcome

- If credentials are valid, the user is signed in and redirected to the dashboard.
- If a customer email is not verified, the verification workflow is shown.

## 4) Dashboard workflow

### Screen: Dashboard

Path: `/`

#### Purpose

Shows live business alerts and operational reminders.

#### Main panels

- Sales follow-ups
- Upcoming visits
- Contract renewals
- Payments due
- Complaint SLA
- Low stock

#### Button

- Send reminder
  - Visible for Owner, Admin, and Accountant.
  - Sends a payment reminder email for the selected invoice.
  - Used from the Payments due panel.

#### Dashboard behavior

- Loads business summary and reminder lists automatically.
- If a list is empty, it shows a friendly empty state.

## 5) CRM & Customers workflow

### Screen: CRM & Customers

Path: `/crm`

#### Purpose

This is the main sales entry panel for leads and customers.

#### Tabs

- Leads
- Customers

#### Top controls

- Add lead
- Add customer
- Search field

#### Workflow for Leads tab

1. Open the CRM & Customers panel.
2. Stay on the Leads tab.
3. Click Add lead.
4. Fill:
   - name
   - phone
   - email
   - source
   - property type
   - priority
   - pest types
   - address
   - city
   - branch if the role can assign branches
5. Submit the form.
6. The lead appears in the table.

#### Lead row actions

- Move to…
  - Changes lead status.
  - Available transitions depend on the current lead stage.

- Convert to customer
  - Converts a qualified lead into a customer record.

- Assignment and follow-up
  - Opens a modal to:
    - assign salesperson
    - set next follow-up date/time
    - edit lead notes
  - Also shows the activity timeline for the lead.

#### Workflow for Customers tab

1. Switch to the Customers tab.
2. Click Add customer.
3. Fill:
   - customer name
   - phone
   - email
   - customer type
   - GSTIN
   - primary site name
   - address
   - city
   - state
   - PIN
   - map location
4. Submit the form.
5. The customer and the primary site are created together.

#### Customer row actions

- Add service property
  - Adds another site/property under the same customer.

- Edit customer
  - Updates customer details and the primary site.

## 6) Inspections workflow

### Screen: Site Inspections

Path: `/inspections`

#### Purpose

Used to schedule and manage on-site inspections before quotations are created.

#### Main button

- Schedule inspection

#### Workflow

1. Click Schedule inspection.
2. Select:
   - branch, if visible
   - customer
   - property/site
   - scheduled date and time
   - notes
3. Submit.
4. The inspection appears as a scheduled record.

#### Inspection card actions

- Assign inspector…
  - Sets the technician/inspector for the inspection.

- Start
  - Moves the inspection to In Progress.

- Complete
  - Opens the completion form.

- Cancel
  - Cancels the inspection.

- Create quotation
  - Available only after the inspection is completed.
  - Creates a draft quotation from the findings and recommended services.

#### Completion form fields

- pest type
- area
- severity
- observation
- recommendation
- recommended service
- visits
- estimated rate

## 7) Quotations workflow

### Screen: Quotations

Path: `/quotations`

#### Purpose

Prepare service proposals and move them through approval and sales stages.

#### Main button

- New quotation

#### Workflow

1. Click New quotation.
2. Choose:
   - branch, if required
   - customer
   - property
   - valid until date
   - service name
   - visits
   - rate
   - tax treatment
   - tax type
   - GST rate
   - terms
3. Submit.
4. The quotation is created in Draft status.

#### Quotation row actions

- Move to…
  - Advances the quotation through status transitions such as:
    - Draft
    - Approval Pending
    - Sent
    - Viewed
    - Accepted
    - Rejected
    - Expired

#### Related flow

- Inspections can generate draft quotations automatically from the completed inspection screen.

## 8) Contracts & AMC workflow

### Screen: Contracts & AMC

Path: `/contracts`

#### Purpose

Convert accepted quotations into AMC contracts and manage renewals.

#### Conversion panel

- Quotation rows ready for conversion are shown at the top.

#### Main button in conversion panel

- Create AMC
  - Converts an accepted quotation into a contract.
  - Generates scheduled visits from the quotation.

#### Contract row actions

- Pause
  - Pauses an active contract.

- Resume
  - Resumes a paused contract.

- Renew
  - Opens the renewal form.

- Cancel
  - Cancels the contract.

#### Renewal form fields

- new start date
- new end date
- contract value

#### Renewal result

- Creates a new contract and its service schedule.
- Marks the current contract as renewed.

## 9) Calendar workflow

### Screen: Service Calendar

Path: `/calendar`

#### Purpose

Shows all scheduled visits grouped by date for dispatch planning.

#### Visit card content

- visit number
- time
- customer
- service name
- status
- technician

#### Button

- Reschedule
  - Visible for Owner, Admin, and Dispatcher.
  - Opens a modal to change the visit date and time.

#### Workflow

1. Open the Calendar panel.
2. Review grouped visit load by day.
3. Click Reschedule on a scheduled or assigned visit.
4. Enter the new date/time.
5. Save schedule.

## 10) Job Cards & Service Reports workflow

### Screen: Job Cards & Service Reports

Path: `/jobs`

#### Purpose

This is the field execution workspace for dispatch, technicians, and service completion.

#### Main job tile actions

- Assign
  - Available for dispatch roles when a visit has no technician assigned.

- Start travel
  - Marks travel to the site.

- Check in
  - Captures GPS check-in location.

- Start
  - Marks the job as started on site.

- Complete
  - Opens the completion form and service report capture flow.

#### Completion form fields

- pest found
- area
- severity
- treatment performed
- recommendations
- chemical usage fields
- before-treatment photo
- after-treatment photo
- customer representative
- customer acknowledged completion
- customer signature

#### Evidence workflow

- Photo upload compresses the image before saving.
- Signature pad captures the customer signature.
- GPS check-out is captured at completion time.

#### Service report panel

- Shows completed service reports.

#### Service report action

- View service report
  - Opens the generated report.

- Print / Save PDF
  - Opens the browser print dialog for PDF export.

#### Technician GPS tracking

- If a technician has an active in-progress visit, the browser can send location updates periodically while the page is open.

## 11) Inventory & Chemicals workflow

### Screen: Inventory & Chemicals

Path: `/inventory`

#### Purpose

Track products, batches, movements, transfers, expiries, and stock adjustments.

#### Top actions

- Product
  - Adds a new inventory product with opening batch.

- Stock in/out
  - Records a movement.

- Transfer
  - Transfers stock to another branch.

- Request adjustment
  - Requests a stock correction for approval.

#### Summary cards

- number of products
- total units
- low stock count
- expiring in 60 days

#### Expiry alerts

- Shows batches that are expiring or already expired.

#### Inventory table

- SKU / product
- category
- batch
- expiry
- available quantity
- reorder level

#### Adjustment approval queue

- Owner and Admin can approve or reject pending stock adjustments.

#### Recent stock movements

- Shows recent purchases, returns, issues, and consumption records.

#### Product form fields

- branch, if applicable
- SKU
- product name
- category
- brand
- unit
- HSN/SAC
- reorder level
- opening batch
- expiry date
- opening quantity
- purchase rate

#### Movement form fields

- product
- batch
- movement type
- quantity
- note/reference

#### Transfer form fields

- product
- batch
- destination branch
- quantity
- note

#### Adjustment form fields

- product
- batch
- direction
- quantity
- reason

## 12) Billing & Payments workflow

### Screen: Billing & Payments

Path: `/billing`

#### Purpose

Create invoices, record receipts, view documents, and accept online payments.

#### Tabs

- Invoices
- Receipts

#### Top actions

- New invoice
- Record receipt

#### Invoice workflow

1. Click New invoice.
2. Choose:
   - branch, if visible
   - customer
   - due date
   - GST / non-GST treatment
   - tax type
   - place of supply
   - reverse charge
   - description
   - HSN/SAC
   - quantity
   - rate
   - GST rate
3. Submit.
4. Invoice is created and totals are calculated.

#### Receipt workflow

1. Click Record receipt.
2. Choose:
   - branch, if visible
   - customer
   - amount
   - method
   - reference number
3. Submit.
4. The receipt is stored and allocated.

#### Invoice row actions

- View invoice
  - Opens the invoice document.

- Pay online
  - Starts Razorpay Checkout when the invoice has balance due.

#### Payment flow

1. Click Pay online.
2. Razorpay order is created.
3. Customer completes the payment.
4. The app verifies the payment signature.
5. The receipt is created and invoice balance updates.

#### Invoice document actions

- Print / Save PDF
  - Opens browser print mode.

#### Document output

- The invoice document includes:
  - seller details
  - branch details
  - customer details
  - line items
  - totals
  - GST information
  - balance due

#### Billing-specific behavior

- Supports both GST and non-GST bills.
- Supports place of supply and reverse charge.
- Uses the GST invoice format created inside the site.

## 13) Complaints & SLA workflow

### Screen: Complaints & SLA

Path: `/complaints`

#### Purpose

Track customer complaints, deadlines, assignment, and corrective resolution.

#### Main button

- Register complaint

#### Complaint workflow

1. Click Register complaint.
2. Choose:
   - branch, if visible
   - customer
   - property
   - category
   - priority
   - subject
   - description
3. Submit.
4. The complaint appears in the list with SLA tracking.

#### Complaint row actions

- Move to…
  - Moves complaint through allowed status transitions.

- Assign technician…
  - Assigns ownership to a technician.

#### Resolve workflow

1. When status is changed to Resolved, a resolution modal opens.
2. Enter the corrective action and resolution note.
3. Save the resolution.

#### SLA indicators

- Overdue complaints are visually flagged.
- Due date and current assignee are shown on the card.

## 14) HR, Attendance & Payroll workflow

### Screen: HR, Attendance & Payroll

Path: `/hr`

#### Purpose

Manage employees, attendance, leave requests, payroll generation, and salary payment status.

#### Tabs

- Employees
- Attendance
- Leave
- Payroll

#### Employees tab

##### Main button

- Employee

##### Employee form fields

- branch
- login account
- name
- email
- phone
- designation
- department
- employment type
- joining date
- base salary
- allowances
- deductions

##### Workflow

1. Click Employee.
2. Fill employee details.
3. Optionally link a user account for self-service access.
4. Save employee.

#### Attendance tab

##### Main button

- Attendance

##### Attendance form fields

- employee
- date
- status
- punch in
- punch out

##### Workflow

1. Click Attendance.
2. Choose the employee and date.
3. Fill punch times or status.
4. Save attendance.

##### Punch buttons for non-admin users

- Punch in
- Punch out

These use GPS location capture.

#### Leave tab

##### Main button

- Request leave

##### Leave form fields

- employee, for admin-created requests
- leave type
- from date
- to date
- reason

##### Leave row actions

- Approve
- Reject

#### Payroll tab

##### Main button

- Generate payroll

##### Payroll form fields

- branch
- month
- year
- working days

##### Payroll row actions

- View
  - Opens the payroll document.

- Print payslips
  - Opens browser print mode.

- Approve payroll
  - Moves draft payroll to approved status.

- Mark paid
  - Available on approved payroll lines.
  - Prompts for bank/payment reference.

## 15) Reports & Analytics workflow

### Screen: Reports & Analytics

Path: `/reports`

#### Purpose

Summarizes finance, GST, sales, operations, and technician productivity.

#### Controls

- Branch filter, for Owner/Admin
- From date
- To date
- Apply filters
- PDF / Print
- Invoice CSV
- Visit CSV

#### Workflow

1. Open Reports.
2. Choose date range.
3. Choose branch if needed.
4. Click Apply filters.
5. Review the summary.
6. Use PDF / Print or CSV export buttons when needed.

#### Data shown

- billed
- collected
- outstanding
- GST tax
- visits
- completed jobs
- technician productivity

## 16) Notifications & Audit workflow

### Screen: Notifications & Audit

Path: `/activity`

#### Purpose

Shows user notifications and protected audit records.

#### Tabs

- Notifications
- Audit log

#### Notification actions

- Click a notification row
  - Marks it as read if needed.
  - Navigates to the linked page if a link exists.

- Mark all read
  - Marks every notification as read.

#### Audit log

- Visible to Owner and Admin.
- Shows:
  - time
  - actor
  - action
  - entity
  - branch
  - IP address

## 17) Branches & Users workflow

### Screen: Branches & Users

Path: `/management`

#### Purpose

Manage company profile, branches, users, and branch-level access.

#### Top actions

- Company profile
- Add branch
- Add user

#### Company profile form

Fields include:

- display name
- legal name
- GSTIN
- PAN
- email
- phone
- registered address
- city
- state
- PIN
- default invoice terms

#### Branch form

Fields include:

- name
- code
- phone
- email
- GSTIN
- active branch toggle
- address
- city
- PIN

#### User form

Fields include:

- name
- email
- phone
- temporary password
- role
- branch
- linked customer for customer role

#### User actions

- Activate / Deactivate
- Reset password
- Edit

#### Workflow

1. Open Company profile to update legal business details.
2. Add branches for each location.
3. Add users and assign roles.
4. Link customer users to their customer record when needed.

## 18) Integrations workflow

### Screen: Integrations

Path: `/integrations`

#### Purpose

Show which external services are configured and allow a test email to be sent.

#### Main indicators

- email
- sms
- maps
- payment
- gst

#### Behavior

- The page shows whether each integration is configured.
- Credentials are loaded from server environment variables.
- Nothing is stored in frontend code or MongoDB.

#### Owner-only section

- Send test email

##### Workflow

1. Enter the recipient email.
2. Click Send test email.
3. The SMTP connection is tested and a sample message is sent.

## 19) Purchases & Expenses workflow

### Screen: Suppliers, Purchases & Expenses

Path: `/procurement`

#### Purpose

Manage supplier data, purchase orders, stock receiving, and branch expenses.

#### Tabs

- Purchase orders
- Suppliers
- Expenses

#### Top action

- Add record

#### Purchase orders tab

##### Row actions

- Approve
  - Available for Draft purchase orders for Owner/Admin.

- Receive
  - Available after approval for Owner/Admin/Storekeeper.
  - Moves purchased items into inventory.

#### Suppliers tab

Shows supplier number, contact, GSTIN, payment terms, and status.

#### Expenses tab

Shows:

- expense number
- date
- category
- description
- amount
- status

##### Row action

- Approve
  - Available for recorded expenses for Owner/Admin.

#### Add record form types

- supplier
- purchase
- expense

#### Workflow

1. Create supplier records.
2. Create purchase orders against a supplier and product batch.
3. Approve the purchase order.
4. Receive the stock into inventory.
5. Record and approve expenses as needed.

## 20) Bulk Import & Export workflow

### Screen: Bulk Import & Export

Path: `/data-tools`

#### Purpose

Import and export leads, customers, and products using CSV files.

#### Controls

- Data type selector
- Branch selector
- CSV file picker
- Download template
- Export data
- Import rows

#### Supported entities

- leads
- customers
- products

#### Workflow

1. Choose the data type.
2. Choose a branch or leave it as assigned/all branches.
3. Download a template if needed.
4. Fill the CSV file.
5. Upload the CSV file.
6. Click Import rows.
7. Review imported and failed rows.

#### Export workflow

1. Choose entity.
2. Click Export data.
3. CSV is downloaded with the selected data.

## 21) End-to-end business workflow

This is the main operational chain the app is built to support.

1. Create or receive a lead in CRM.
2. Follow up and qualify the lead.
3. Convert the lead into a customer.
4. Schedule an inspection.
5. Complete the inspection and capture findings.
6. Generate a quotation.
7. Send the quotation to the customer.
8. Convert the accepted quotation into an AMC contract, if applicable.
9. Generate visit schedule.
10. View the visit in the calendar.
11. Assign a technician.
12. Technician travels, checks in, and completes the job.
13. Capture evidence, GPS, photos, and signature.
14. Generate the service report.
15. Create invoice and record receipt or collect online payment.
16. Keep reminders for unpaid invoices, visits, contracts, and complaints.
17. Review reports and audit logs.

## 22) External integrations pending for later activation

These are supported in the code structure but are still dependent on live provider credentials or later go-live decisions.

- SMTP live credentials
- Razorpay live activation
- GST e-invoicing / government integration
- VPS file/image storage strategy

## 23) Notes for the user

- The app is built as a website, not a mobile app.
- The workflow is role-aware and branch-aware.
- The current invoice document supports both GST and non-GST bills.
- Customer-facing access is limited compared with internal staff roles.
- The document can be converted into PDF next if needed.
