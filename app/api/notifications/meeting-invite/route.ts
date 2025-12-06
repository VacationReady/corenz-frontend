import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendMeetingInvites } from '@/lib/email/meeting-invites';

const inviteSchema = z.object({
  meetingId: z.string().min(1, 'Meeting ID is required'),
  participantIds: z.array(z.string()).min(1, 'At least one participant required'),
});

function isManagerOrAdmin(role?: string | null) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER' || role === 'HR';
}

export async function POST(req: NextRequest) {
  try {
    // 1. Validate session
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'You must be logged in to send meeting invites' },
        { status: 401 }
      );
    }

    // 2. Ensure organizer has manager/admin roles
    if (!isManagerOrAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden', details: 'Only managers and admins can send meeting invitations' },
        { status: 403 }
      );
    }

    // 3. Validate request body
    const body = await req.json();
    const validated = inviteSchema.parse(body);

    // 4. Load meeting details with tenant scoping
    const meeting = await prisma.performanceMeeting.findFirst({
      where: {
        id: validated.meetingId,
        companyId: session.user.companyId, // Tenant scoping
      },
      include: {
        Organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!meeting) {
      console.error('[meeting-invite] Meeting not found or unauthorized', {
        meetingId: validated.meetingId,
        companyId: session.user.companyId,
        userId: session.user.id,
      });
      return NextResponse.json(
        { error: 'Not Found', details: 'Meeting not found or you do not have access to it' },
        { status: 404 }
      );
    }

    // Verify the current user is the organizer
    if (meeting.organizerId !== session.user.id) {
      console.error('[meeting-invite] User is not the meeting organizer', {
        meetingId: validated.meetingId,
        organizerId: meeting.organizerId,
        userId: session.user.id,
      });
      return NextResponse.json(
        { error: 'Forbidden', details: 'Only the meeting organizer can send invitations' },
        { status: 403 }
      );
    }

    // 5. Load participants with tenant scoping
    const participants = await prisma.user.findMany({
      where: {
        id: { in: validated.participantIds },
        companyId: session.user.companyId, // Ensure participants belong to same company
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    // Check if all requested participants were found
    if (participants.length !== validated.participantIds.length) {
      const foundIds = participants.map(p => p.id);
      const missingIds = validated.participantIds.filter(id => !foundIds.includes(id));
      
      console.error('[meeting-invite] Some participants not found or unauthorized', {
        meetingId: validated.meetingId,
        companyId: session.user.companyId,
        requestedIds: validated.participantIds,
        foundIds,
        missingIds,
      });

      return NextResponse.json(
        {
          error: 'Validation Error',
          details: 'Some participants could not be found or do not belong to your organization',
          missingParticipantIds: missingIds,
        },
        { status: 400 }
      );
    }

    // 6. Send email invitations
    const organizerName = `${meeting.Organizer.firstName || ''} ${meeting.Organizer.lastName || ''}`.trim();

    const normalizedParticipants = participants.map((participant) => {
      const displayName = `${participant.firstName || ''} ${participant.lastName || ''}`.trim();
      return {
        id: participant.id,
        firstName:
          participant.firstName || displayName || participant.email || 'Participant',
        lastName: participant.lastName || '',
        email: participant.email || 'no-email@example.com',
      };
    });

    const results = await sendMeetingInvites(
      {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        scheduledAt: meeting.scheduledAt,
        duration: meeting.duration,
        location: meeting.location,
        meetingUrl: meeting.meetingUrl,
        organizer: {
          firstName:
            meeting.Organizer.firstName ||
            organizerName ||
            meeting.Organizer.email ||
            'Organizer',
          lastName: meeting.Organizer.lastName || '',
          email: meeting.Organizer.email || 'no-reply@example.com',
        },
      },
      normalizedParticipants
    );

    // 7. Log results for observability
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log('[meeting-invite] Email dispatch results', {
      meetingId: validated.meetingId,
      totalParticipants: results.length,
      successful: successful.length,
      failed: failed.length,
      failedDetails: failed.map(f => ({
        participantId: f.participantId,
        email: f.email,
        error: f.error,
      })),
    });

    // 8. Return granular results
    const allSuccessful = failed.length === 0;
    
    if (allSuccessful) {
      return NextResponse.json({
        success: true,
        message: `Meeting invitations sent successfully to ${successful.length} participant${successful.length !== 1 ? 's' : ''}`,
        results,
      });
    } else {
      // Partial success - some emails failed
      return NextResponse.json({
        success: false,
        message: `Sent ${successful.length} of ${results.length} invitations. ${failed.length} failed.`,
        results,
        errors: failed.map(f => ({
          participantId: f.participantId,
          email: f.email,
          error: f.error || 'Failed to send invitation',
        })),
      }, { status: 207 }); // 207 Multi-Status for partial success
    }
  } catch (error) {
    console.error('[meeting-invite] Unexpected error', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          details: 'Invalid request data',
          validationErrors: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: 'Failed to send meeting invitations',
      },
      { status: 500 }
    );
  }
}
