import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const admin = await prisma.user.upsert({
    where: { dingtalk_userid: "admin_001" },
    update: {},
    create: {
      dingtalk_userid: "admin_001",
      name: "系统管理员",
      role: "ADMIN",
    },
  });

  const user = await prisma.user.upsert({
    where: { dingtalk_userid: "user_001" },
    update: {},
    create: {
      dingtalk_userid: "user_001",
      name: "测试用户",
      role: "USER",
    },
  });

  const existingCount = await prisma.item.count();
  if (existingCount === 0) {
    await prisma.item.createMany({
      data: [
        { name: "MacBook Pro 16", category: "电子设备", stock: 5, level: "SPECIAL" },
        { name: "Dell 27寸显示器", category: "电子设备", stock: 12, level: "SPECIAL" },
        { name: "罗技无线鼠标", category: "外设配件", stock: 50, level: "NORMAL" },
        { name: "机械键盘", category: "外设配件", stock: 30, level: "NORMAL" },
        { name: "晨光 A4 打印纸", category: "办公耗材", stock: 200, level: "NORMAL" },
        { name: "白板笔套装", category: "办公耗材", stock: 80, level: "NORMAL" },
        { name: "USB-C 扩展坞", category: "外设配件", stock: 15, level: "NORMAL" },
        { name: "人体工学椅", category: "办公家具", stock: 8, level: "SPECIAL" },
      ],
    });
  }

  console.log("Seed completed:", {
    admin: admin.name,
    user: user.name,
    itemCount: existingCount || 8,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
