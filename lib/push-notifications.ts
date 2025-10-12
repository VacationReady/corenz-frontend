import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

// Create a new Expo SDK client
const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true, // Use FCM V1 API
});

export interface SendPushNotificationsParams {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

export interface SendPushNotificationsResult {
  sent: number;
  failed: number;
  tickets: ExpoPushTicket[];
  errors: Array<{ token: string; error: string }>;
}

/**
 * Send push notifications to multiple devices using Expo Push Notification Service
 */
export async function sendPushNotifications(
  params: SendPushNotificationsParams
): Promise<SendPushNotificationsResult> {
  const { tokens, title, body, data, sound = 'default', badge, channelId, priority = 'high' } = params;

  // Validate tokens
  const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));
  const invalidTokens = tokens.filter((token) => !Expo.isExpoPushToken(token));

  const errors: Array<{ token: string; error: string }> = invalidTokens.map((token) => ({
    token,
    error: 'Invalid Expo push token',
  }));

  if (validTokens.length === 0) {
    return {
      sent: 0,
      failed: tokens.length,
      tickets: [],
      errors,
    };
  }

  // Create the messages
  const messages: ExpoPushMessage[] = validTokens.map((token) => ({
    to: token,
    sound: sound,
    title: title,
    body: body,
    data: data || {},
    badge: badge,
    channelId: channelId,
    priority: priority,
  }));

  // Send notifications in chunks (Expo recommends chunks of 100)
  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error('Error sending push notification chunk:', error);
      errors.push({
        token: 'batch',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Count successes and failures
  let sent = 0;
  let failed = 0;

  tickets.forEach((ticket, index) => {
    if (ticket.status === 'ok') {
      sent++;
    } else {
      failed++;
      errors.push({
        token: validTokens[index],
        error: ticket.status === 'error' ? ticket.message : 'Unknown error',
      });
    }
  });

  return {
    sent,
    failed: failed + invalidTokens.length,
    tickets,
    errors,
  };
}

/**
 * Send a push notification to a single device
 */
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> {
  const result = await sendPushNotifications({
    tokens: [token],
    title,
    body,
    data,
  });

  return result.sent > 0;
}

/**
 * Send shift reminder notifications
 */
export async function sendShiftReminder(
  employeeTokens: string[],
  shiftDetails: {
    location: string;
    startTime: string;
    endTime: string;
  }
): Promise<SendPushNotificationsResult> {
  return sendPushNotifications({
    tokens: employeeTokens,
    title: 'Upcoming Shift',
    body: `You have a shift starting at ${shiftDetails.startTime} at ${shiftDetails.location}`,
    data: {
      type: 'SHIFT_REMINDER',
      ...shiftDetails,
    },
    channelId: 'shift-reminders',
  });
}

/**
 * Send timesheet approval notification
 */
export async function sendTimesheetApprovalNotification(
  employeeToken: string,
  status: 'APPROVED' | 'DECLINED',
  approverName: string,
  comments?: string
): Promise<boolean> {
  const title = status === 'APPROVED' ? 'Timesheet Approved' : 'Timesheet Declined';
  const body =
    status === 'APPROVED'
      ? `Your timesheet has been approved by ${approverName}`
      : `Your timesheet was declined by ${approverName}${comments ? `: ${comments}` : ''}`;

  return sendPushNotification(employeeToken, title, body, {
    type: 'TIMESHEET_APPROVAL',
    status,
    approverName,
    comments,
  });
}

/**
 * Send clock out reminder
 */
export async function sendClockOutReminder(
  employeeToken: string,
  hoursWorked: number
): Promise<boolean> {
  return sendPushNotification(
    employeeToken,
    'Clock Out Reminder',
    `You've been clocked in for ${hoursWorked} hours. Don't forget to clock out!`,
    {
      type: 'CLOCK_OUT_REMINDER',
      hoursWorked,
    }
  );
}

/**
 * Send shift swap notification
 */
export async function sendShiftSwapNotification(
  employeeToken: string,
  requesterName: string,
  shiftDetails: {
    date: string;
    startTime: string;
    endTime: string;
    location: string;
  }
): Promise<boolean> {
  return sendPushNotification(
    employeeToken,
    'Shift Swap Request',
    `${requesterName} wants to swap a shift on ${shiftDetails.date} at ${shiftDetails.location}`,
    {
      type: 'SHIFT_SWAP',
      requesterName,
      ...shiftDetails,
    }
  );
}
