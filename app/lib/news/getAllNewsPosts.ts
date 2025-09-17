import { prisma } from "@/lib/prisma";

export async function getAllNewsPosts(companyId?: string) {
  return prisma.newsPost.findMany({
    where: {
      publishedAt: { not: null },
      ...(companyId ? { authorId: companyId } : {}),
    },
    orderBy: { publishedAt: "desc" },
    include: {
      User: { select: { name: true, email: true, companyId: true } },
    },
  });
}

