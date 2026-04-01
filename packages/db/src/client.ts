import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __ipReviewPrisma__: PrismaClient | undefined;
}

const prismaClientSingleton = () =>
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

export const prisma = global.__ipReviewPrisma__ ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  global.__ipReviewPrisma__ = prisma;
}

export default prisma;
