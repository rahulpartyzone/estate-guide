-- Labels on the public site that an admin changed or hid (Admin -> Settings -> Site text).
CREATE TABLE "SiteText" (
    "key" TEXT NOT NULL,
    "value" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SiteText_pkey" PRIMARY KEY ("key")
);
