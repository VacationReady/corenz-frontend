import { prisma } from "@/lib/prisma";

export async function getAllNewsPosts(companyId?: string) {
  return prisma.newsPost.findMany({
    where: {
      publishedAt: { not: null },
      ...(companyId ? { author: { companyId } } : {}),
    },
    orderBy: { publishedAt: "desc" },
    include: {
      author: { select: { name: true, email: true, companyId: true } },
    },
  });
}
