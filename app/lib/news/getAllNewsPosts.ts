import { prisma, ensurePrismaConnected } from "@/lib/prisma";

export async function getAllNewsPosts(companyId?: string) {
  await ensurePrismaConnected();
  return prisma.newsPost.findMany({
    where: {
      publishedAt: { not: null },
      ...(companyId ? { User: { companyId } } : {}),
    },
    orderBy: { publishedAt: "desc" },
    include: {
      User: { select: { name: true, email: true, companyId: true } },
    },
  });
}

