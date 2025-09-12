import { prisma } from "@/lib/prisma";

export async function getAllNewsPosts() {
  return prisma.newsPost.findMany({
    where: {
      publishedAt: {
        not: null,
      },
    },
    orderBy: {
      publishedAt: "desc",
    },
    include: {
      author: {
        select: { name: true, email: true },
      },
    },
  });
}
