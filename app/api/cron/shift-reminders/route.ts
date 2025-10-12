import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendShiftReminder } from '@/lib/push-notifications';

/**
 * Cron job to send shift reminder notifications
 * Run every 15 minutes via Vercel Cron or similar
 * 
 * Vercel cron config (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/shift-reminders",
 *     "schedule": "0,15,30,45 * * * *"
 *   }]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const oneHourFifteenMinFromNow = new Date(now.getTime() + 75 * 60 * 1000);

    // Find shifts starting in the next hour (but not already notified)
    // Note: You'll need to add a ShiftReminder table to track sent reminders
    // For simplicity, we'll just send to shifts starting soon
    
    // This is a placeholder - you'll need to implement shift scheduling first
    // const upcomingShifts = await prisma.shift.findMany({
    //   where: {
    //     startTime: {
    //       gte: oneHourFromNow,
    //       lte: oneHourFifteenMinFromNow,
    //     },
    //     reminderSent: false,
    //   },
    //   include: {
    //     employee: {
    //       include: {
    //         PushNotificationTokens: {
    //           where: {
    //             isActive: true,
    //           },
    //         },
    //       },
    //     },
    //     location: true,
    //   },
    // });

    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      message: 'Shift reminder cron job executed',
      timestamp: now,
      processed: 0,
      // In production, track:
      // - shifts found
      // - notifications sent
      // - failures
    });

    // Production implementation:
    // let sentCount = 0;
    // let errorCount = 0;

    // for (const shift of upcomingShifts) {
    //   try {
    //     const tokens = shift.employee.PushNotificationTokens.map(t => t.token);
        
    //     if (tokens.length > 0) {
    //       await sendShiftReminder(tokens, {
    //         location: shift.location.name,
    //         startTime: shift.startTime.toLocaleTimeString(),
    //         endTime: shift.endTime.toLocaleTimeString(),
    //       });
          
    //       // Mark reminder as sent
    //       await prisma.shift.update({
    //         where: { id: shift.id },
    //         data: { reminderSent: true },
    //       });
          
    //       sentCount++;
    //     }
    //   } catch (error) {
    //     console.error(`Failed to send reminder for shift ${shift.id}:`, error);
    //     errorCount++;
    //   }
    // }

    // return NextResponse.json({
    //   success: true,
    //   message: 'Shift reminders sent',
    //   timestamp: now,
    //   shifts: upcomingShifts.length,
    //   sent: sentCount,
    //   errors: errorCount,
    // });

  } catch (error) {
    console.error('Shift reminder cron error:', error);
    return NextResponse.json(
      { error: 'Failed to process shift reminders' },
      { status: 500 }
    );
  }
}
