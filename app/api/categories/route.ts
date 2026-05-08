import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.tb_categories.findMany();
  return NextResponse.json(categories);
}
