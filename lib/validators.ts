import { z } from "zod";

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const imageUrlSchema = z
  .string()
  .transform((v) => v.trim())
  .refine(
    (value) => value === "" || value.startsWith("/uploads/") || isHttpUrl(value),
    "请输入有效的图片 URL（支持 http(s) 或 /uploads/ 路径）"
  );

export const itemFormSchema = z.object({
  name: z.string().min(1, "物资名称不能为空").max(100),
  category: z.string().min(1, "分类不能为空").max(50),
  stock: z.number({ error: "请输入有效数字" }).int().min(0, "库存不能为负数"),
  level: z.enum(["NORMAL", "SPECIAL"]),
  imageUrl: imageUrlSchema.optional(),
});

export const itemFormSchemaCoerced = z.object({
  name: z.string().min(1, "物资名称不能为空").max(100),
  category: z.string().min(1, "分类不能为空").max(50),
  stock: z.coerce.number().int().min(0, "库存不能为负数"),
  level: z.enum(["NORMAL", "SPECIAL"]),
  imageUrl: imageUrlSchema.optional(),
});

export type ItemFormValues = z.infer<typeof itemFormSchema>;
