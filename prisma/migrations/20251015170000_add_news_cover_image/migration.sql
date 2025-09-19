-- Add optional cover image to news posts for richer media support
ALTER TABLE "NewsPost" ADD COLUMN "coverImage" TEXT;
