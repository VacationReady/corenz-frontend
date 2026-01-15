export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { auth } from "@/lib/auth-options";
import { hasPermission } from "@/lib/permissions";
import supabase from "@/lib/supabase-admin";
import { renderPeopleCoreEmail, getAppBaseUrl } from "@/lib/email/template";
import { withFeatureGuard } from "@/lib/feature-toggles/api-guard";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";

async function postHandler(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
      publishedAt,
      tags,
      pinned,
      featured,
    } = body;

    const normalizedSendEmail = Boolean(sendEmail);
    const normalizedAudience = audience || { type: "all" };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        PermissionProfile: true,
      },
    });

    if (!user || !hasPermission(user as any, "news", "edit")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    if (normalizedSendEmail && !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    console.log("📝 Incoming news POST:", {
      title,
      sendEmail: normalizedSendEmail,
      audience: normalizedAudience,
    });

    const slug = await generateUniqueSlug(title, companyId);

    // If publishedAt is explicitly null, this is a draft; otherwise publish now
    const resolvedPublishedAt = publishedAt === null ? null : (publishedAt ? new Date(publishedAt) : new Date());

    const newsPost = await prisma.newsPost.create({
      data: {
        id: crypto.randomUUID(),
        title,
        slug,
        content,
        coverImageUrl: coverImage ?? null,
        videoEmbedUrl,
        attachments: Array.isArray(attachments)
          ? attachments.map((att: any) => 
              typeof att === 'string' ? att : att.url || att.path || ''
            ).filter(Boolean)
          : [],
        sendEmail: normalizedSendEmail,
        audience: normalizedAudience,
        publishedAt: resolvedPublishedAt,
        updatedAt: new Date(),
        authorId: userId,
        companyId,
        tags: Array.isArray(tags) ? tags : [],
        pinned: Boolean(pinned),
      },
    });

    // Only create email job if post is published (not a draft) and sendEmail is true
    if (normalizedSendEmail && resolvedPublishedAt !== null) {
      await (prisma as any).newsEmailJob.upsert({
        where: {
          postId: newsPost.id,
        },
        update: {
          status: "PENDING",
          scheduledAt: new Date(),
          startedAt: null,
          completedAt: null,
          errorMessage: null,
          executionLog: null,
          nextRetryAt: null,
          cursorUserId: null,
        },
        create: {
          id: crypto.randomUUID(),
          companyId,
          postId: newsPost.id,
          status: "PENDING",
          scheduledAt: new Date(),
        },
      });
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

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "5", 10);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const skip = (page - 1) * limit;

  const session = await auth();
  if (!session?.user?.companyId || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestingUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      Department_User_departmentIdToDepartment: {
        select: { name: true },
      },
      JobRole: {
        select: { name: true },
      },
      Employee: {
        select: {
          Department: {
            select: { name: true },
          },
          JobRole: {
            select: { name: true },
          },
          Location: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!requestingUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin =
    requestingUser.role === "ADMIN" || requestingUser.role === "SUPER_ADMIN";

  // Check User table first, then fall back to Employee table for department/role
  const departmentName =
    requestingUser.Department_User_departmentIdToDepartment?.name ?? 
    requestingUser.Employee?.Department?.name ?? 
    null;
  const jobRoleName = 
    requestingUser.JobRole?.name ?? 
    requestingUser.Employee?.JobRole?.name ?? 
    null;
  const locationName = requestingUser.Employee?.Location?.name ?? null;

  const baseWhereClause = {
    OR: [
      { companyId: session.user.companyId },
      { User: { is: { companyId: session.user.companyId } } },
    ],
  };

  // Build audience filter - user should see post if they match ANY specified dimension
  const audienceWhereClause = {
    OR: [
      // Show if post targets all users (type is "all" or null/undefined with no specific targeting)
      { audience: { path: ["type"], equals: "all" } },
      {
        AND: [
          {
            OR: [
              { audience: { path: ["type"], equals: Prisma.AnyNull } },
              { audience: { path: ["type"], equals: Prisma.DbNull } },
            ],
          },
          {
            OR: [
              { audience: { path: ["departments"], equals: Prisma.AnyNull } },
              { audience: { path: ["departments"], equals: [] } },
            ],
          },
          {
            OR: [
              { audience: { path: ["roles"], equals: Prisma.AnyNull } },
              { audience: { path: ["roles"], equals: [] } },
            ],
          },
          {
            OR: [
              { audience: { path: ["locations"], equals: Prisma.AnyNull } },
              { audience: { path: ["locations"], equals: [] } },
            ],
          },
        ],
      },
      // Show if user's department matches (and departments are specified)
      ...(departmentName ? [{
        AND: [
          { audience: { path: ["departments"], not: Prisma.AnyNull } },
          { audience: { path: ["departments"], not: { equals: [] } } },
          { audience: { path: ["departments"], array_contains: [departmentName] } },
        ],
      }] : []),
      // Show if user's role matches (and roles are specified)
      ...(jobRoleName ? [{
        AND: [
          { audience: { path: ["roles"], not: Prisma.AnyNull } },
          { audience: { path: ["roles"], not: { equals: [] } } },
          { audience: { path: ["roles"], array_contains: [jobRoleName] } },
        ],
      }] : []),
      // Show if user's location matches (and locations are specified)
      ...(locationName ? [{
        AND: [
          { audience: { path: ["locations"], not: Prisma.AnyNull } },
          { audience: { path: ["locations"], not: { equals: [] } } },
          { audience: { path: ["locations"], array_contains: [locationName] } },
        ],
      }] : []),
    ],
  };

  // Ensure drafts are never shown in public feed (publishedAt must be not null AND in the past)
  const publishedFilter = {
    publishedAt: {
      not: null,
      lte: new Date(), // Only show posts published in the past, not future-scheduled
    },
  };

  const whereClause = isAdmin
    ? { AND: [baseWhereClause, publishedFilter] }
    : { AND: [baseWhereClause, audienceWhereClause, publishedFilter] };

  // Get total count for pagination
  const totalCount = await prisma.newsPost.count({
    where: whereClause,
  });

  const posts = await prisma.newsPost.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    skip,
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
      if (coverUrl) {
        // If already a signed Supabase URL and likely expired, extract path and re-sign
        if (/^https?:\/\//i.test(coverUrl) && coverUrl.includes("/object/sign/") && coverUrl.includes("/documents/")) {
          try {
            const after = coverUrl.split("/documents/")[1] || "";
            const path = after.split("?")[0] || "";
            if (path) {
              const { data, error } = await supabase.storage
                .from("documents")
                .createSignedUrl(path, 60 * 10);
              if (!error) coverUrl = data?.signedUrl ?? coverUrl;
            }
          } catch {}
        } else if (!/^https?:\/\//i.test(coverUrl)) {
          // Stored as a bare path; sign it
          try {
            const { data, error } = await supabase.storage
              .from("documents")
              .createSignedUrl(coverUrl, 60 * 10);
            if (!error) coverUrl = data?.signedUrl ?? null;
          } catch {}
        }
      }

      const preview = extractPreview(post.content);

      return {
        ...mapNewsPost({ ...post, coverImageUrl: coverUrl }),
        preview,
      };
    }),
  );

  return NextResponse.json({
    posts: postsWithPreview,
    pagination: {
      total: totalCount,
      limit,
      offset: skip,
      page,
      hasMore: skip + posts.length < totalCount,
    },
  });
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
    const baseUrl = getAppBaseUrl();
    const previewText = renderContentPreview(content);

    console.log("📨 Sending batch of", users.length, "emails");

    for (const user of users) {
      const { html, text } = renderPeopleCoreEmail({
        preheader: title,
        title: "New PeopleCore News",
        intro: [
          `Hi ${user.firstName || "there"},`,
          "There's a new news post on your portal.",
        ],
        sections: [
          {
            title,
            description: previewText ? [previewText] : undefined,
          },
        ],
        ctas: {
          label: "View News Post",
          href: `${baseUrl}/news`,
        },
        outro: [
          "Log in to view the full post.",
        ],
      });

      await resend.emails
        .send({
          from: "noreply@peoplecore.co.nz",
          to: user.email,
          subject: `New News Post: ${title}`,
          html,
          text,
        })
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
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

async function generateUniqueSlug(title: string, companyId: string) {
  const baseSlug = generateSlug(title) || "news";
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.newsPost.findFirst({ where: { companyId, slug } })) {
    const suffix = `-${counter++}`;
    const maxBaseLength = Math.max(1, 50 - suffix.length);
    slug = `${baseSlug.slice(0, maxBaseLength)}${suffix}`;
  }

  return slug;
}


// Apply feature guard to all handlers
const newsGuard = withFeatureGuard(FEATURE_KEYS.NEWS);
export const POST = newsGuard(postHandler);
export const GET = newsGuard(getHandler);
