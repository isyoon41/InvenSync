export { prisma } from "./client";
export { default } from "./client";

export type { Prisma, PrismaClient } from "@prisma/client";

// Repositories
export * from "./repositories";
export { createRepositoryContainer, getRepositoryContainer, resetRepositoryContainer } from "./repositories/container";
export type { RepositoryContainer } from "./repositories/container";
