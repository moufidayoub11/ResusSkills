import "server-only";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user.model";
export async function currentProfessor(userId: string) {
  await connectDB();
  return !!(await User.exists({ _id: userId, role: "professor" }));
}
