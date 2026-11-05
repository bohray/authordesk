import "server-only";
import bcrypt from "bcryptjs";

const rounds = 10;

export const hashPassword = (plain: string) => bcrypt.hash(plain, rounds);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);
