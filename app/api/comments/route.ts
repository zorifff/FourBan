import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  try {
    const comments = await prisma.tb_comments.findMany({
      where: {
        id_task: parseInt(taskId),
      },
      include: {
        user: {
          select: {
            nama_lengkap: true,
          },
        },
      },
      orderBy: {
        created_at: 'asc', // Urutkan dari yang terlama ke terbaru
      },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { taskId, isi_komentar } = body;

    if (!taskId || !isi_komentar) {
      return NextResponse.json({ error: "taskId and isi_komentar are required" }, { status: 400 });
    }

    const newComment = await prisma.tb_comments.create({
      data: {
        id_task: parseInt(taskId),
        id_user: parseInt((session.user as any).id),
        isi_komentar: isi_komentar,
      },
      include: {
        user: {
          select: {
            nama_lengkap: true, // Sertakan nama untuk response balikan
          },
        },
      },
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id_komentar, isi_komentar } = body;

    if (!id_komentar || !isi_komentar) {
      return NextResponse.json({ error: "id_komentar and isi_komentar are required" }, { status: 400 });
    }

    // Pastikan komentar ini milik user yang sedang login
    const existingComment = await prisma.tb_comments.findUnique({
      where: { id_komentar: parseInt(id_komentar) },
    });

    if (!existingComment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (existingComment.id_user !== parseInt((session.user as any).id)) {
      return NextResponse.json({ error: "Forbidden: You can only edit your own comment" }, { status: 403 });
    }

    const updatedComment = await prisma.tb_comments.update({
      where: { id_komentar: parseInt(id_komentar) },
      data: { isi_komentar },
      include: {
        user: { select: { nama_lengkap: true } }
      }
    });

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id_komentar = searchParams.get("id");

    if (!id_komentar) {
      return NextResponse.json({ error: "Comment ID is required" }, { status: 400 });
    }

    // Pastikan komentar ini milik user yang sedang login
    const existingComment = await prisma.tb_comments.findUnique({
      where: { id_komentar: parseInt(id_komentar) },
    });

    if (!existingComment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (existingComment.id_user !== parseInt((session.user as any).id)) {
      return NextResponse.json({ error: "Forbidden: You can only delete your own comment" }, { status: 403 });
    }

    await prisma.tb_comments.delete({
      where: { id_komentar: parseInt(id_komentar) },
    });

    return NextResponse.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
