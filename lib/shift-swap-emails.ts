import { resend } from '@/app/lib/resend';
import { format } from 'date-fns';

interface Employee {
  User: {
    name: string;
    email: string;
  };
}

interface Shift {
  startTime: Date;
  endTime: Date;
  location?: {
    name: string;
  } | null;
  notes?: string | null;
  role?: string | null;
}

/**
 * Send shift swap request notification to target employee
 */
export async function sendShiftSwapRequestEmail(
  targetEmployee: Employee,
  requesterEmployee: Employee,
  shift: Shift,
  requestMessage?: string
) {
  try {
    const shiftDate = format(shift.startTime, 'EEEE, MMMM d, yyyy');
    const shiftTimeStart = format(shift.startTime, 'h:mm a');
    const shiftTimeEnd = format(shift.endTime, 'h:mm a');
    const duration = Math.round(
      (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60) * 10
    ) / 10;

    await resend.emails.send({
      from: 'Corenz <noreply@corenz.com>',
      to: targetEmployee.User.email,
      subject: 'New Shift Swap Request',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
              .shift-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
              .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
              .detail-label { font-weight: 600; color: #495057; }
              .detail-value { color: #212529; }
              .message-box { background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0066cc; }
              .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: 600; }
              .footer { text-align: center; color: #6c757d; font-size: 14px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🔄 New Shift Swap Request</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${targetEmployee.User.name}</strong>,</p>
                <p><strong>${requesterEmployee.User.name}</strong> would like to swap a shift with you.</p>
                
                <div class="shift-details">
                  <h3 style="margin-top: 0; color: #667eea;">Shift Details</h3>
                  <div class="detail-row">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">${shiftDate}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Time:</span>
                    <span class="detail-value">${shiftTimeStart} - ${shiftTimeEnd}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Duration:</span>
                    <span class="detail-value">${duration} hours</span>
                  </div>
                  ${shift.role ? `
                  <div class="detail-row">
                    <span class="detail-label">Role:</span>
                    <span class="detail-value">${shift.role}</span>
                  </div>
                  ` : ''}
                  ${shift.location ? `
                  <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${shift.location.name}</span>
                  </div>
                  ` : ''}
                </div>

                ${requestMessage ? `
                <div class="message-box">
                  <strong>Message from ${requesterEmployee.User.name}:</strong>
                  <p style="margin: 10px 0 0 0;">${requestMessage}</p>
                </div>
                ` : ''}

                <p style="margin-top: 25px;">Please log in to your Corenz account to accept or decline this request.</p>
                
                <div class="footer">
                  <p>This is an automated notification from Corenz.</p>
                  <p>If you have any questions, please contact your manager.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('Failed to send shift swap request email:', error);
    // Don't throw - email failures shouldn't break the request
  }
}

/**
 * Send shift swap accepted notification to requester
 */
export async function sendShiftSwapAcceptedEmail(
  requesterEmployee: Employee,
  acceptingEmployee: Employee,
  shift: Shift,
  requiresManagerApproval: boolean
) {
  try {
    const shiftDate = format(shift.startTime, 'EEEE, MMMM d, yyyy');
    const shiftTimeStart = format(shift.startTime, 'h:mm a');
    const shiftTimeEnd = format(shift.endTime, 'h:mm a');

    await resend.emails.send({
      from: 'Corenz <noreply@corenz.com>',
      to: requesterEmployee.User.email,
      subject: requiresManagerApproval 
        ? 'Shift Swap Accepted - Pending Manager Approval'
        : 'Shift Swap Accepted',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
              .shift-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
              .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
              .detail-label { font-weight: 600; color: #495057; }
              .detail-value { color: #212529; }
              .status-box { background: ${requiresManagerApproval ? '#fef3c7' : '#d1fae5'}; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${requiresManagerApproval ? '#f59e0b' : '#10b981'}; }
              .footer { text-align: center; color: #6c757d; font-size: 14px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">✅ Shift Swap ${requiresManagerApproval ? 'Accepted' : 'Confirmed'}</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${requesterEmployee.User.name}</strong>,</p>
                <p>Good news! <strong>${acceptingEmployee.User.name}</strong> has accepted your shift swap request.</p>
                
                <div class="shift-details">
                  <h3 style="margin-top: 0; color: #10b981;">Shift Details</h3>
                  <div class="detail-row">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">${shiftDate}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Time:</span>
                    <span class="detail-value">${shiftTimeStart} - ${shiftTimeEnd}</span>
                  </div>
                  ${shift.location ? `
                  <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${shift.location.name}</span>
                  </div>
                  ` : ''}
                </div>

                <div class="status-box">
                  ${requiresManagerApproval ? `
                    <strong>⏳ Status: Pending Manager Approval</strong>
                    <p style="margin: 10px 0 0 0;">Your manager will review this swap request. You'll receive another notification once it's approved or rejected.</p>
                  ` : `
                    <strong>✅ Status: Confirmed</strong>
                    <p style="margin: 10px 0 0 0;">The shift has been reassigned to ${acceptingEmployee.User.name}. Check your updated schedule in Corenz.</p>
                  `}
                </div>

                <div class="footer">
                  <p>This is an automated notification from Corenz.</p>
                  <p>If you have any questions, please contact your manager.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('Failed to send shift swap accepted email:', error);
  }
}

/**
 * Send shift swap rejected notification to requester
 */
export async function sendShiftSwapRejectedEmail(
  requesterEmployee: Employee,
  rejectingEmployee: Employee,
  shift: Shift,
  reason?: string
) {
  try {
    const shiftDate = format(shift.startTime, 'EEEE, MMMM d, yyyy');
    const shiftTimeStart = format(shift.startTime, 'h:mm a');
    const shiftTimeEnd = format(shift.endTime, 'h:mm a');

    await resend.emails.send({
      from: 'Corenz <noreply@corenz.com>',
      to: requesterEmployee.User.email,
      subject: 'Shift Swap Request Declined',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
              .shift-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
              .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
              .detail-label { font-weight: 600; color: #495057; }
              .detail-value { color: #212529; }
              .reason-box { background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
              .footer { text-align: center; color: #6c757d; font-size: 14px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">❌ Shift Swap Declined</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${requesterEmployee.User.name}</strong>,</p>
                <p><strong>${rejectingEmployee.User.name}</strong> has declined your shift swap request.</p>
                
                <div class="shift-details">
                  <h3 style="margin-top: 0; color: #ef4444;">Shift Details</h3>
                  <div class="detail-row">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">${shiftDate}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Time:</span>
                    <span class="detail-value">${shiftTimeStart} - ${shiftTimeEnd}</span>
                  </div>
                  ${shift.location ? `
                  <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${shift.location.name}</span>
                  </div>
                  ` : ''}
                </div>

                ${reason ? `
                <div class="reason-box">
                  <strong>Reason:</strong>
                  <p style="margin: 10px 0 0 0;">${reason}</p>
                </div>
                ` : ''}

                <p style="margin-top: 25px;">You remain scheduled for this shift. You can try requesting a swap with another colleague.</p>

                <div class="footer">
                  <p>This is an automated notification from Corenz.</p>
                  <p>If you have any questions, please contact your manager.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('Failed to send shift swap rejected email:', error);
  }
}

/**
 * Send manager approval needed notification
 */
export async function sendManagerApprovalNeededEmail(
  managerEmail: string,
  managerName: string,
  requesterEmployee: Employee,
  acceptingEmployee: Employee,
  shift: Shift
) {
  try {
    const shiftDate = format(shift.startTime, 'EEEE, MMMM d, yyyy');
    const shiftTimeStart = format(shift.startTime, 'h:mm a');
    const shiftTimeEnd = format(shift.endTime, 'h:mm a');

    await resend.emails.send({
      from: 'Corenz <noreply@corenz.com>',
      to: managerEmail,
      subject: 'Shift Swap Awaiting Your Approval',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
              .swap-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
              .employee-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e9ecef; }
              .employee-label { font-weight: 600; color: #495057; }
              .employee-value { color: #212529; }
              .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
              .detail-label { font-weight: 600; color: #495057; }
              .detail-value { color: #212529; }
              .footer { text-align: center; color: #6c757d; font-size: 14px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">⏳ Shift Swap Approval Needed</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${managerName}</strong>,</p>
                <p>A shift swap request requires your approval.</p>
                
                <div class="swap-details">
                  <h3 style="margin-top: 0; color: #3b82f6;">Swap Request</h3>
                  <div class="employee-row">
                    <span class="employee-label">From:</span>
                    <span class="employee-value">${requesterEmployee.User.name}</span>
                  </div>
                  <div class="employee-row">
                    <span class="employee-label">To:</span>
                    <span class="employee-value">${acceptingEmployee.User.name}</span>
                  </div>
                  
                  <h4 style="margin-top: 20px; color: #667eea;">Shift Details</h4>
                  <div class="detail-row">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">${shiftDate}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Time:</span>
                    <span class="detail-value">${shiftTimeStart} - ${shiftTimeEnd}</span>
                  </div>
                  ${shift.role ? `
                  <div class="detail-row">
                    <span class="detail-label">Role:</span>
                    <span class="detail-value">${shift.role}</span>
                  </div>
                  ` : ''}
                  ${shift.location ? `
                  <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${shift.location.name}</span>
                  </div>
                  ` : ''}
                </div>

                <p style="margin-top: 25px;">Please log in to Corenz to review and approve or reject this swap request.</p>

                <div class="footer">
                  <p>This is an automated notification from Corenz.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('Failed to send manager approval needed email:', error);
  }
}

/**
 * Send manager approval confirmation to both employees
 */
export async function sendShiftSwapApprovedEmail(
  requesterEmployee: Employee,
  acceptingEmployee: Employee,
  shift: Shift,
  managerName: string
) {
  try {
    const shiftDate = format(shift.startTime, 'EEEE, MMMM d, yyyy');
    const shiftTimeStart = format(shift.startTime, 'h:mm a');
    const shiftTimeEnd = format(shift.endTime, 'h:mm a');

    const htmlTemplate = (recipientName: string, otherPersonName: string) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .shift-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
            .detail-label { font-weight: 600; color: #495057; }
            .detail-value { color: #212529; }
            .success-box { background: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
            .footer { text-align: center; color: #6c757d; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">✅ Shift Swap Approved</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${recipientName}</strong>,</p>
              <p>Your shift swap with <strong>${otherPersonName}</strong> has been approved by ${managerName}.</p>
              
              <div class="shift-details">
                <h3 style="margin-top: 0; color: #10b981;">Shift Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${shiftDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">${shiftTimeStart} - ${shiftTimeEnd}</span>
                </div>
                ${shift.location ? `
                <div class="detail-row">
                  <span class="detail-label">Location:</span>
                  <span class="detail-value">${shift.location.name}</span>
                </div>
                ` : ''}
              </div>

              <div class="success-box">
                <strong>✅ The shift has been reassigned!</strong>
                <p style="margin: 10px 0 0 0;">Please check your updated schedule in Corenz.</p>
              </div>

              <div class="footer">
                <p>This is an automated notification from Corenz.</p>
                <p>If you have any questions, please contact your manager.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send to requester
    await resend.emails.send({
      from: 'Corenz <noreply@corenz.com>',
      to: requesterEmployee.User.email,
      subject: 'Shift Swap Approved',
      html: htmlTemplate(requesterEmployee.User.name, acceptingEmployee.User.name),
    });

    // Send to accepting employee
    await resend.emails.send({
      from: 'Corenz <noreply@corenz.com>',
      to: acceptingEmployee.User.email,
      subject: 'Shift Swap Approved',
      html: htmlTemplate(acceptingEmployee.User.name, requesterEmployee.User.name),
    });
  } catch (error) {
    console.error('Failed to send shift swap approved emails:', error);
  }
}
