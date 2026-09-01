const shell = ({ title, heading, body, hint, footer, actionText, actionUrl }) => {
  const text = [heading, body, actionText && actionUrl ? actionText + ': ' + actionUrl : actionText, hint, footer]
    .filter(Boolean)
    .join('\n\n');
  const html =
    '<div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">' +
    '<div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #d9e2e8;border-radius:16px;overflow:hidden">' +
    '<div style="background:linear-gradient(135deg,#1f7fbf,#86c91f);color:#fff;padding:20px 24px">' +
    '<div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.9">Tech House Pest Control</div>' +
    '<h1 style="margin:8px 0 0;font-size:22px">' + title + '</h1></div>' +
    '<div style="padding:24px">' +
    '<h2 style="margin:0 0 12px;font-size:20px">' + heading + '</h2>' +
    '<p style="margin:0 0 16px;color:#334155">' + body + '</p>' +
    (actionText ? '<p><a href="' + (actionUrl || '#') + '" style="display:inline-block;background:#1f7fbf;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">' + actionText + '</a></p>' : '') +
    (hint ? '<p style="color:#64748b;font-size:13px">' + hint + '</p>' : '') +
    (footer ? '<p style="color:#64748b;font-size:13px">' + footer + '</p>' : '') +
    '</div></div></div>';
  return { text, html };
};

export const emailTemplates = {
  test: ({ companyName, recipientName, senderName }) =>
    shell({
      title: 'SMTP test email',
      heading: 'Your email service is working',
      body: 'This confirms SMTP is configured for ' + (companyName || 'Tech House Pest Control') + '.',
      hint: 'Sent to ' + recipientName + ' by ' + senderName + '.',
      footer: 'If you did not expect this message, ignore it.',
    }),
  verification: ({ companyName, otp }) =>
    shell({
      title: 'Verify your email',
      heading: 'Email verification code',
      body:
        'Use this one-time password to verify your account with ' +
        (companyName || 'Tech House Pest Control') +
        ': ' +
        otp +
        '.',
      hint: 'This code expires in 10 minutes.',
      footer: 'If you did not request this, ignore it.',
    }),
  invoice: ({ companyName, invoiceNo, dueDate, grandTotal, customerName, actionUrl }) =>
    shell({
      title: 'Invoice ' + invoiceNo,
      heading: 'Your invoice is ready',
      body:
        'Hello ' +
        customerName +
        ', your invoice ' +
        invoiceNo +
        ' for Rs. ' +
        Number(grandTotal || 0).toLocaleString('en-IN') +
        ' is ready from ' +
        (companyName || 'Tech House Pest Control') +
        '.',
      actionText: actionUrl ? 'View invoice' : null,
      actionUrl,
      hint: dueDate ? 'Due date: ' + new Date(dueDate).toLocaleDateString('en-IN') + '.' : null,
      footer: 'This is an automatically generated invoice email.',
    }),
  quotation: ({ companyName, quotationNo, customerName, validUntil, actionUrl }) =>
    shell({
      title: 'Quotation ' + quotationNo,
      heading: 'Your quotation is ready',
      body:
        'Hello ' +
        customerName +
        ', your quotation ' +
        quotationNo +
        ' from ' +
        (companyName || 'Tech House Pest Control') +
        ' is ready for review.',
      actionText: actionUrl ? 'View quotation' : null,
      actionUrl,
      hint: validUntil ? 'Valid until: ' + new Date(validUntil).toLocaleDateString('en-IN') + '.' : null,
      footer: 'This is an automatically generated quotation email.',
    }),
  jobReport: ({ companyName, jobCardNo, customerName, actionUrl }) =>
    shell({
      title: 'Job report ' + jobCardNo,
      heading: 'Service report is ready',
      body:
        'Hello ' +
        customerName +
        ', the job report for ' +
        jobCardNo +
        ' from ' +
        (companyName || 'Tech House Pest Control') +
        ' is ready.',
      actionText: actionUrl ? 'View report' : null,
      actionUrl,
      footer: 'This is an automatically generated service report email.',
    }),
  reminder: ({ companyName, subject, message, actionUrl, actionText }) =>
    shell({
      title: subject,
      heading: subject,
      body: message,
      actionText,
      actionUrl,
      footer: 'This is an automated reminder from ' + (companyName || 'Tech House Pest Control') + '.',
    }),
};
