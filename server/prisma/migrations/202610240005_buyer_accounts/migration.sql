-- Buyers who sign in with their phone number (OTP) so their saved projects follow them to any device.
-- Their saved projects stay in "Wishlist", keyed by the buyer's id instead of the browser's random id.

CREATE TABLE "Buyer" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    CONSTRAINT "Buyer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Buyer_phone_key" ON "Buyer"("phone");
