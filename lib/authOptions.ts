import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Cari user di database
        const user = await prisma.tb_users.findUnique({
          where: { email: credentials.email }
        });

        if (!user) throw new Error("Email tidak ditemukan");

        // Cek kecocokan password
        const isPasswordMatch = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordMatch) throw new Error("Password salah");

        return { 
          id: user.id_user.toString(), 
          email: user.email, 
          name: user.nama_lengkap,
          role: (user as any).role || "user"
        };
      }
    })
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub as string;
        (session.user as any).role = token.role;
      }
      return session;
    }
  }
};
