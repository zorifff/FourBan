import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    // Tangkap username dari request
    const { nama_lengkap, username, email, password } = await req.json();
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.tb_users.create({
      data: {
        nama_lengkap,
        username,
        email,
        password: hashedPassword,
      },
    });

    return NextResponse.json({ message: "User berhasil dibuat", user });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal membuat user" }, { status: 500 });
  }
}