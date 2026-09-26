import { PrismaClient } from '@prisma/client'

/** 单例 PrismaClient：连接池由 Prisma 管理（默认按 CPU 核数），避免热重载时重复创建 */
export const prisma = new PrismaClient({
  log: ['error', 'warn'],
})
