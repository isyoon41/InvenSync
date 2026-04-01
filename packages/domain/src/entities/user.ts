export type UserRole = "admin" | "reviewer" | "operator";

export interface User {
  id: string;
  firmId: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  firmId: string;
  name: string;
  email: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}
