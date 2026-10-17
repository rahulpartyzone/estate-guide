CREATE TABLE "NewsArticle" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "imageUrl" TEXT,
  "category" TEXT,
  "authorName" TEXT,
  "sourceUrl" TEXT,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "published" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsArticle_slug_key" ON "NewsArticle"("slug");
CREATE INDEX "NewsArticle_published_publishedAt_idx" ON "NewsArticle"("published", "publishedAt");
CREATE INDEX "NewsArticle_createdAt_idx" ON "NewsArticle"("createdAt");
