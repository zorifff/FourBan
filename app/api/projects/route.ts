import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as any).id);

    let projects = await prisma.tb_projects.findMany({
      where: {
        members: {
          some: {
            id_user: userId
          }
        }
      },
      include: {
        members: {
          where: {
            id_user: userId
          }
        },
        _count: {
          select: { members: true }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as any).id);
    const body = await request.json();
    const { nama_project, deskripsi, deadline } = body;

    // Create Project
    const project = await prisma.tb_projects.create({
      data: {
        nama_project,
        deskripsi,
        deadline: deadline ? new Date(deadline) : null,
        created_by: userId,
        members: {
          create: {
            id_user: userId,
            role: "admin"
          }
        }
      }
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as any).id);
    const body = await request.json();
    const { id_project } = body;

    // Check if user is a member
    const member = await prisma.tb_project_members.findUnique({
      where: {
        id_project_id_user: {
          id_project: Number(id_project),
          id_user: userId
        }
      }
    });

    if (!member) {
      return NextResponse.json({ error: "You are not a member of this project" }, { status: 400 });
    }

    // Remove user from project
    await prisma.tb_project_members.delete({
      where: {
        id_project_id_user: {
          id_project: Number(id_project),
          id_user: userId
        }
      }
    });

    return NextResponse.json({ success: true, message: "Berhasil keluar dari proyek" });
  } catch (error) {
    console.error("Error leaving project:", error);
    return NextResponse.json({ error: "Failed to leave project" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as any).id);
    const body = await request.json();
    const { id_project, nama_project, deskripsi, deadline } = body;

    // Check if user is an admin of the project
    const member = await prisma.tb_project_members.findUnique({
      where: {
        id_project_id_user: {
          id_project: Number(id_project),
          id_user: userId
        }
      }
    });

    if (!member || member.role !== "admin") {
      return NextResponse.json({ error: "Only project admins can edit project details" }, { status: 403 });
    }

    const updatedProject = await prisma.tb_projects.update({
      where: { id_project: Number(id_project) },
      data: {
        nama_project,
        deskripsi,
        deadline: deadline ? new Date(deadline) : null
      }
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}
