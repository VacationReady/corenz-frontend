import { prisma, ensurePrismaConnected } from "@/lib/prisma";

export async function getAllNewsPosts(companyId?: string) {
  await ensurePrismaConnected();
  const posts = await prisma.newsPost.findMany({
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
      coverImageUrl: true,
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

  return posts.map(mapNewsPost);
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

