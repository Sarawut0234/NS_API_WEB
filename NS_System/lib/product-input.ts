import { z } from "zod";

export const adminProductSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  licenseKey: z.string().trim().min(1),
  description: z.string().optional().default(""),
  extraInfo: z.string().optional().default(""),
  changelogText: z.string().optional().default(""),
  versionLabel: z.string().optional().default(""),
  price: z.number().finite().nonnegative().optional().default(0),
  isFree: z.boolean().optional().default(false),
  pointPrice: z.number().finite().nonnegative().optional().default(0),
  stockQuantity: z.number().finite().nonnegative().optional().default(0),
  category: z.string().optional().default("all"),
  imageUrl: z.string().optional().default(""),
  reviewVideoUrl: z.string().optional().default(""),
  downloadUrl: z.string().optional().default(""),
  filePath: z.string().optional().default(""),
  isActive: z.boolean().optional().default(true),
});

export type AdminProductInput = z.infer<typeof adminProductSchema>;
