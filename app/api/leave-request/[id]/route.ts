import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { status } = await req.json();
  if (!['APPROVED', 'DECLINED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: params.id },
    include: { user: true },
    data: { status },
  });

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: updated.user.email,
      subject: `Your leave request has been ${status}`,
      html: `
        <p>Hi ${updated.user.firstName},</p>
        <p>Your leave request from <strong>${new Date(updated.startDate).toLocaleDateString()}</strong> to <strong>${new Date(updated.endDate).toLocaleDateString()}</strong> has been <strong>${status}</strong>.</p>
        <p>Thanks,<br />HR Team</p>
      `,
    });
  } catch (err) {
    console.error('Resend email error:', err);
  }

  return NextResponse.json(updated);
}
