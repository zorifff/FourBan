import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Mengambil semua data dari tb_tasks
    // Kita gunakan 'include' agar nama kategori dan nama user ikut terbawa
    const tasks = await prisma.tb_tasks.findMany({
      include: {
        kategori: true,
        user: true,
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data dari database" },
      { status: 500 }
    );
  }
}

// ... (Kode export async function GET() yang sudah ada biarkan saja) ...

export async function PUT(request: Request) {
  try {
    // Membaca data yang dikirim dari front end
    const body = await request.json();
    const { id_task, status } = body;

    if (!id_task || !status) {
      return NextResponse.json(
        { error: "ID Task dan Status harus diisi" },
        { status: 400 }
      );
    }

    // Update status di database Neon menggunakan Prisma
    const updatedTask = await prisma.tb_tasks.update({
      where: { 
        id_task: Number(id_task) 
      },
      data: { 
        status: status 
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error updating task status:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui status tugas di database" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id_user, id_kategori, judul_task, deskripsi, deadline } = body;

    // Validasi sederhana
    if (!id_user || !id_kategori || !judul_task) {
      return NextResponse.json(
        { error: "Field wajib (User, Kategori, Judul) harus diisi" },
        { status: 400 }
      );
    }

    const newTask = await prisma.tb_tasks.create({
      data: {
        id_user: Number(id_user),
        id_kategori: Number(id_kategori),
        judul_task: judul_task,
        deskripsi: deskripsi || "",
        status: "TODO", // Tugas baru otomatis masuk ke To-Do
        deadline: new Date(deadline),
      },
      include: {
        kategori: true,
        user: true,
      }
    });

    return NextResponse.json(newTask);
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Gagal membuat tugas baru" },
      { status: 500 }
    );
  }
}

// ... (Kode GET, PUT, POST yang sudah ada biarkan saja) ...

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id_task } = body;

    if (!id_task) {
      return NextResponse.json(
        { error: "ID Task harus diisi" },
        { status: 400 }
      );
    }

    // Menghapus data dari tb_tasks berdasarkan ID
    await prisma.tb_tasks.delete({
      where: { 
        id_task: Number(id_task) 
      },
    });

    return NextResponse.json({ success: true, message: "Tugas berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Gagal menghapus tugas dari database" },
      { status: 500 }
    );
  }
}


export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id_task, judul_task, deskripsi, id_user, id_kategori, deadline } = body;

    const updatedTask = await prisma.tb_tasks.update({
      where: { id_task: Number(id_task) },
      data: {
        judul_task,
        deskripsi,
        id_user: Number(id_user),
        id_kategori: Number(id_kategori),
        deadline: new Date(deadline),
      },
      include: { kategori: true, user: true }
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    return NextResponse.json({ error: "Gagal memperbarui rincian tugas" }, { status: 500 });
  }
}