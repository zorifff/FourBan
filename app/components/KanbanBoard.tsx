"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

// 1. Definisi Tipe Data (Sesuai SRS)
type Task = {
  id: string;
  dbId: number;
  content: string;
  kategori: string;
  warnaKategori: string;
};

type BoardData = {
  columns: Record<string, { id: string; title: string; taskIds: string[] }>;
  tasks: Record<string, Task>;
  columnOrder: string[];
};

const initialBoardData: BoardData = {
  columns: {
    "TODO": { id: "TODO", title: "To-Do", taskIds: [] },
    "DOING": { id: "DOING", title: "Doing", taskIds: [] },
    "DONE": { id: "DONE", title: "Done", taskIds: [] },
  },
  tasks: {},
  columnOrder: ["TODO", "DOING", "DONE"],
};

export default function KanbanBoard() {
  // --- STATE ---
  const [data, setData] = useState<BoardData>(initialBoardData);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    judul_task: "",
    deskripsi: "",
    id_user: "",
    id_kategori: "",
    deadline: ""
  });

  // --- FETCH DATA AWAL ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resTasks, resUsers, resCats] = await Promise.all([
          fetch('/api/tasks'),
          fetch('/api/users'),
          fetch('/api/categories')
        ]);

        const dbTasks = await resTasks.json();
        const dbUsers = await resUsers.json();
        const dbCats = await resCats.json();

        setUsers(dbUsers);
        setCategories(dbCats);

        const newData = JSON.parse(JSON.stringify(initialBoardData));
        dbTasks.forEach((task: any) => {
          const taskId = `task-${task.id_task}`;
          newData.tasks[taskId] = {
            id: taskId,
            dbId: task.id_task,
            content: task.deskripsi || "Tanpa Deskripsi",
            kategori: task.kategori?.nama_kategori || "Umum",
            warnaKategori: task.kategori?.kode_warna || "#ccc"
          };
          if (newData.columns[task.status]) {
            newData.columns[task.status].taskIds.push(taskId);
          }
        });

        setData(newData);
      } catch (error) {
        console.error("Gagal mengambil data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- LOGIKA DRAG AND DROP (UPDATE STATUS) ---
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const startColumn = data.columns[source.droppableId];
    const finishColumn = data.columns[destination.droppableId];

    // Optimistic UI Update
    const startTaskIds = Array.from(startColumn.taskIds);
    startTaskIds.splice(source.index, 1);
    const finishTaskIds = source.droppableId === destination.droppableId ? startTaskIds : Array.from(finishColumn.taskIds);
    if (source.droppableId !== destination.droppableId) {
        finishTaskIds.splice(destination.index, 0, draggableId);
    } else {
        startTaskIds.splice(destination.index, 0, draggableId);
    }

    setData({
      ...data,
      columns: {
        ...data.columns,
        [startColumn.id]: { ...startColumn, taskIds: startTaskIds },
        [finishColumn.id]: { ...finishColumn, taskIds: finishTaskIds },
      },
    });

    // Update ke Database
    if (source.droppableId !== destination.droppableId) {
      await fetch('/api/tasks', {
        method: 'PUT',
        body: JSON.stringify({ id_task: data.tasks[draggableId].dbId, status: destination.droppableId }),
      });
    }
  };

// --- LOGIKA HAPUS TUGAS (DELETE) ---
  const handleDeleteTask = async (taskId: string, dbId: number) => {
    // Munculkan pop-up konfirmasi bawaan browser
    const isConfirmed = window.confirm("Apakah kamu yakin ingin menghapus tugas ini?");
    if (!isConfirmed) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_task: dbId }),
      });

      if (!res.ok) throw new Error("Gagal menghapus tugas");

      // Hapus data dari state UI agar kartu langsung hilang tanpa refresh
      const newData = { ...data };
      
      // Cari kolom yang berisi task tersebut dan hapus ID-nya dari array
      for (const colId of newData.columnOrder) {
        newData.columns[colId].taskIds = newData.columns[colId].taskIds.filter(id => id !== taskId);
      }
      
      // Hapus detail task dari object tasks
      delete newData.tasks[taskId];
      
      setData(newData);
    } catch (error) {
      console.error("Terjadi kesalahan:", error);
      alert("Gagal menghapus tugas.");
    }
  };


  // --- LOGIKA TAMBAH TUGAS (CREATE) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    const newTask = await res.json();

    const taskId = `task-${newTask.id_task}`;
    setData({
      ...data,
      tasks: {
        ...data.tasks,
        [taskId]: {
          id: taskId,
          dbId: newTask.id_task,
          content: newTask.deskripsi,
          kategori: newTask.kategori.nama_kategori,
          warnaKategori: newTask.kategori.kode_warna
        }
      },
      columns: {
        ...data.columns,
        "TODO": { ...data.columns["TODO"], taskIds: [...data.columns["TODO"].taskIds, taskId] }
      }
    });
    setIsModalOpen(false);
  };

  if (isLoading) return <div className="p-8 text-center text-black">Memuat data dari Neon...</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <button 
        onClick={() => setIsModalOpen(true)}
        className="mb-6 bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition"
      >
        + Tambah Tugas Baru
      </button>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4">
          {data.columnOrder.map((columnId) => {
            const column = data.columns[columnId];
            const tasks = column.taskIds.map((taskId) => data.tasks[taskId]);

            return (
              <div key={column.id} className="flex flex-col bg-gray-200 rounded-xl w-1/3 p-4 min-h-[500px]">
                <h2 className="font-bold text-gray-700 mb-4 px-2">{column.title}</h2>
                <Droppable droppableId={column.id}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="flex-grow">
                      {tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bg-white p-4 mb-3 rounded-lg shadow-sm border border-gray-300 flex flex-col gap-2"
                            >
                              {/* Kode Baru */}
                                <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded w-fit text-white uppercase" style={{ backgroundColor: task.warnaKategori }}>
                                    {task.kategori}
                                </span>
                                <button 
                                    onClick={() => handleDeleteTask(task.id, task.dbId)}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                    title="Hapus Tugas"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                </button>
                                </div>
                                <p className="text-sm text-gray-800">{task.content}</p>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Modal Form Tambah Tugas */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-gray-800">Buat Tugas Baru</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input type="text" placeholder="Judul Tugas" required className="border p-3 rounded-xl text-black focus:ring-2 focus:ring-blue-500 outline-none" onChange={(e) => setFormData({...formData, judul_task: e.target.value})} />
              <textarea placeholder="Deskripsi Tugas" className="border p-3 rounded-xl text-black focus:ring-2 focus:ring-blue-500 outline-none h-24" onChange={(e) => setFormData({...formData, deskripsi: e.target.value})} />
              <select required className="border p-3 rounded-xl text-black outline-none" onChange={(e) => setFormData({...formData, id_user: e.target.value})}>
                <option value="">Pilih Penanggung Jawab</option>
                {users.map(u => <option key={u.id_user} value={u.id_user}>{u.nama_lengkap}</option>)}
              </select>
              <select required className="border p-3 rounded-xl text-black outline-none" onChange={(e) => setFormData({...formData, id_kategori: e.target.value})}>
                <option value="">Pilih Kategori</option>
                {categories.map(c => <option key={c.id_kategori} value={c.id_kategori}>{c.nama_kategori}</option>)}
              </select>
              <input type="date" required className="border p-3 rounded-xl text-black outline-none" onChange={(e) => setFormData({...formData, deadline: e.target.value})} />
              <div className="flex gap-3 justify-end mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">Batal</button>
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-blue-700 transition">Simpan Tugas</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

