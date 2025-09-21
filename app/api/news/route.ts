export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) throw new Error("User not authenticated");
    const userId = session.user.id;
    const companyId = session.user.companyId;

    const body = await req.json();

    const {
      title,
      content,
      coverImage,
      videoEmbedUrl,
      attachments,
      sendEmail,
      audience,
    } = body;

    console.log("📝 Incoming news POST:", { title, sendEmail, audience });

    const newsPost = await prisma.newsPost.create({
      data: {
        id: crypto.randomUUID(),
        title,
        slug: generateSlug(title),
        content,
        coverImageUrl: coverImage ?? null,
        videoEmbedUrl,
        attachments,
        sendEmail,
        audience,
        publishedAt: new Date(),
        updatedAt: new Date(),
        authorId: userId,
        companyId,
      },
    });

    if (sendEmail) {
      await sendNewsEmails(audience, title, content, companyId);
    }

    return NextResponse.json(mapNewsPost(newsPost));
  } catch (error) {
    console.error("Error creating news post:", error);
    return NextResponse.json(
      { error: "Failed to create news post" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "5", 10);

  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const posts = await prisma.newsPost.findMany({
    where: { User: { is: { companyId: session.user.companyId } } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      createdAt: true,
      coverImageUrl: true,
      content: true, // ✅ Needed for preview tooltip
    },
  });

  // Resolve signed cover URLs and extract a preview for both legacy and TipTap content
  const postsWithPreview = await Promise.all(
    posts.map(async (post) => {
      let coverUrl: string | null = post.coverImageUrl ?? null;
      if (coverUrl && !/^https?:\/\//i.test(coverUrl)) {
        try {
          const { data, error } = await supabase.storage
            .from("documents")
            .createSignedUrl(coverUrl, 60 * 10);
          if (!error) coverUrl = data?.signedUrl ?? null;
        } catch {}
      }

      const preview = extractPreview(post.content);

      return {
        ...mapNewsPost({ ...post, coverImageUrl: coverUrl }),
        preview,
      };
    }),
  );

  return NextResponse.json(postsWithPreview);

  return NextResponse.json(posts);
}

type NewsPostRecord = {
  coverImageUrl: string | null;
} & Record<string, any>;

function mapNewsPost<T extends NewsPostRecord>(post: T) {
  const { coverImageUrl, ...rest } = post;
  return {
    ...rest,
    coverImage: coverImageUrl ?? null,
  } as Omit<T, "coverImageUrl"> & { coverImage: string | null };
}

function extractPreview(content: any): string {
  // Legacy array-of-blocks format
  if (Array.isArray(content)) {
    const para = content.find((b: any) => b && b.type === "paragraph");
    return (para && (para.text || "")) || "";
  }
  // TipTap JSON format: { type: 'doc', content: [...] }
  if (content && typeof content === "object" && content.type && content.content) {
    try {
      const firstParagraph = (content.content as any[]).find(
        (node: any) => node?.type === "paragraph" && Array.isArray(node.content),
      );
      if (!firstParagraph) return "";
      return (firstParagraph.content as any[])
        .filter((n: any) => n?.type === "text" && typeof n.text === "string")
        .map((n: any) => n.text)
        .join("")
        .slice(0, 240);
    } catch {
      return "";
    }
  }
  return "";
}

// ✅ Resend Email Handler with Batch Sending and Logging
async function sendNewsEmails(audience: any, title: string, content: any, companyId: string) {
  try {
    console.log(
      "🚀 sendNewsEmails called with audience:",
      JSON.stringify(audience),
    );

    let filters: any = {};

    if (audience.departments?.length) {
      filters.departmentId = {
        in: await getDepartmentIdsByName(audience.departments, companyId),
      };
    }
    if (audience.roles?.length) {
      filters.jobRoleId = { in: await getJobRoleIdsByName(audience.roles, companyId) };
    }
    if (audience.locations?.length) {
      filters.locationId = {
        in: await getLocationIdsByName(audience.locations, companyId),
      };
    }

    const users =
      audience?.type === "all"
        ? await prisma.user.findMany({
            where: {
              companyId,
              email: { not: "" },
            },
            select: { email: true, firstName: true },
          })
        : await prisma.user.findMany({
            where: {
              ...filters,
              companyId,
              email: { not: "" },
            },
            select: { email: true, firstName: true },
          });

    console.log(
      "👥 Found users:",
      users.map((u) => u.email),
    );

    if (!users.length) {
      console.log("⚠️ No users matched the audience filter. No emails sent.");
      return;
    }

    // ✅ Batch send logic
    const batchRecipients = users.map((user) => ({
      from: "noreply@peoplecore.co.nz",
      to: user.email,
      subject: `New News Post: ${title}`,
      html: `
        <p>Hi ${user.firstName || "there"},</p>
        <p>There's a new news post on your portal.</p>
        <p><strong>${title}</strong></p>
        <p>${renderContentPreview(content)}</p>
        <p>Log in to view the full post.</p>
      `,
    }));

    console.log("📨 Sending batch of", batchRecipients.length, "emails");

    for (const emailData of batchRecipients) {
      await resend.emails
        .send(emailData)
        .then((result) => console.log("✅ Resend success:", result))
        .catch((err) => console.error("❌ Resend failed:", err));
    }

    // ✅ If you want to switch back to single send, uncomment below:
    /*
    for (const user of users) {
      console.log(`📨 Sending Resend email to ${user.email}`)
      await resend.emails.send({
        from: 'noreply@peoplecore.co.nz',
        to: user.email,
        subject: `New News Post: ${title}`,
        html: `
          <p>Hi ${user.firstName || 'there'},</p>
          <p>There's a new news post on your portal.</p>
          <p><strong>${title}</strong></p>
          <p>${renderContentPreview(content)}</p>
          <p>Log in to view the full post.</p>
        `,
      }).catch(err => console.error('❌ Error sending email:', err))
    }
    */
  } catch (err) {
    console.error("Error sending emails via Resend:", err);
  }
}

// ✅ Content Preview Helper — unchanged
function renderContentPreview(content: any) {
  if (!Array.isArray(content)) return "";
  const firstParagraph = content.find(
    (block: any) => block.type === "paragraph",
  );
  return firstParagraph ? firstParagraph.text : "";
}

// ✅ Helper Functions — unchanged
async function getDepartmentIdsByName(names: string[], companyId: string) {
  const deps = await prisma.department.findMany({
    where: { name: { in: names }, companyId },
    select: { id: true },
  });
  return deps.map((d) => d.id);
}

async function getJobRoleIdsByName(names: string[], companyId: string) {
  const roles = await prisma.jobRole.findMany({
    where: { name: { in: names }, companyId },
    select: { id: true },
  });
  return roles.map((r) => r.id);
}

async function getLocationIdsByName(names: string[], companyId: string) {
  const locs = await prisma.location.findMany({
    where: { name: { in: names }, companyId },
    select: { id: true },
  });
  return locs.map((l) => l.id);
}

// ✅ Slug Generator — unchanged
function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .slice(0, 50);
}

