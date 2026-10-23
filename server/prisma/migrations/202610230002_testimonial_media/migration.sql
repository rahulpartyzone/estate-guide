-- Client photo and proof attachment (handwritten note, letter) for testimonials.
ALTER TABLE "Testimonial" ADD COLUMN "photoUrl" TEXT;
ALTER TABLE "Testimonial" ADD COLUMN "attachmentUrl" TEXT;
ALTER TABLE "Testimonial" ADD COLUMN "attachmentMimeType" TEXT;
