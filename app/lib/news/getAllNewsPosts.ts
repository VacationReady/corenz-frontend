import { prisma, ensurePrismaConnected } from "@/lib/prisma";

export async function getAllNewsPosts(companyId?: string) {
  await ensurePrismaConnected();
  return prisma.newsPost.findMany({
    where: {
      publishedAt: { not: null },
      ...(companyId ? { User: { companyId } } : {}),
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      coverImage: true,
      authorId: true,
      publishedAt: true,
      pinned: true,
      tags: true,
      audience: true,
      attachments: true,
      videoEmbedUrl: true,
      sendEmail: true,
      createdAt: true,
      updatedAt: true,
      User: { select: { name: true, email: true, profileImageUrl: true, companyId: true } },
    },
  });
}

