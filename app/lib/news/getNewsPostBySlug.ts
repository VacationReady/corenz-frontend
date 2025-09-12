import { prisma } from "@/lib/prisma";

export async function getNewsPostBySlug(slug: string) {
  return prisma.newsPost.findUnique({
    where: { slug },
    include: {
      author: {
        select: { name: true, email: true },
      },
    },
  });
}
