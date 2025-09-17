import { prisma } from "@/lib/prisma";

export async function getNewsPostBySlug(slug: string, companyId?: string) {
  return prisma.newsPost.findFirst({
    where: { slug, ...(companyId ? { authorId: companyId } : {}) },
    include: {
      User: { select: { name: true, email: true, companyId: true } },
    },
  });
}

