"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

// 1. Definisi Tipe Data (Sesuai SRS)
type Task = {
  id: string;
  dbId: number;
  content: string;
  judul_task: string;  
  id_user: number;    
  id_kategori: number;
  deadline: string;    
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
  const [editingTask, setEditingTask] = useState<any | null>(null);
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
            judul_task: task.judul_task || "",    
            id_user: task.id_user || "",          
            id_kategori: task.id_kategori || "",  
            deadline: task.deadline || "",      
            kategori: task.kategori?.nama_kategori || "Umum",
            warnaKategori: task.kategori?.kode_warna || "#ccc"
          };

          const status = task.status || "TODO";
          if (newData.columns[status]) {
            newData.columns[status].taskIds.push(taskId);
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
    const handleEditClick = (task: any) => {

    // 1. Set task yang sedang diedit
    setEditingTask(task);
    // 2. Format tanggal agar sesuai dengan input type="date"
    const formattedDate = task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : "";
  
    // 3. Isi form dengan data lama
    setFormData({
      judul_task: task.judul_task || "",
      deskripsi: task.content || "",
      id_user: task.id_user ? task.id_user.toString() : "",
      id_kategori: task.id_kategori ? task.id_kategori.toString() : "",
      deadline: formattedDate
    });

    // 4. Buka modal
    setIsModalOpen(true);
  };

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


  // --- LOGIKA TAMBAH/EDIT TUGAS (CREATE/UPDATE) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let response;
      let responseData;

      if (editingTask) {
        // UPDATE: Gunakan PATCH untuk edit task
        response = await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_task: editingTask.dbId,
            ...formData
          }),
        });
        responseData = await response.json();

        // Update task di state
        const taskId = editingTask.id;
        setData({
          ...data,
          tasks: {
            ...data.tasks,
            [taskId]: {
              id: taskId,
              dbId: responseData.id_task,
              judul_task: responseData.judul_task,
              content: responseData.deskripsi,
              kategori: responseData.kategori.nama_kategori,
              warnaKategori: responseData.kategori.kode_warna,
              id_user: responseData.id_user,
              id_kategori: responseData.id_kategori,
              deadline: responseData.deadline
            }
          }
        });
      } else {
        // CREATE: Gunakan POST untuk task baru
        response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        responseData = await response.json();

        const taskId = `task-${responseData.id_task}`;

        setData({
          ...data,
          tasks: {
            ...data.tasks,
            [taskId]: {
              id: taskId,
              dbId: responseData.id_task,
              judul_task: responseData.judul_task,
              content: responseData.deskripsi,
              kategori: responseData.kategori.nama_kategori,
              warnaKategori: responseData.kategori.kode_warna,
              id_user: responseData.id_user,
              id_kategori: responseData.id_kategori,
              deadline: responseData.deadline
            }
          },
          columns: {
            ...data.columns,
            "TODO": { ...data.columns["TODO"], taskIds: [...data.columns["TODO"].taskIds, taskId] }
          }
        });
      }

      // Reset form dan tutup modal
      setFormData({ judul_task: "", deskripsi: "", id_user: "", id_kategori: "", deadline: "" });
      setEditingTask(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Terjadi kesalahan:", error);
      alert("Gagal menyimpan tugas. Coba lagi!");
    }
  };

  if (isLoading) return <div className="p-8 text-center text-black flex items-center justify-center min-h-screen">Memuat data dari Neon...</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <button 
        onClick={() => {
          setEditingTask(null);
          setFormData({ judul_task: "", deskripsi: "", id_user: "", id_kategori: "", deadline: "" });
          setIsModalOpen(true);
        }}
        className="mb-6 bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 hover:shadow transition-all font-medium"
      >
        + Tambah Tugas Baru
      </button>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6">
          {data.columnOrder.map((columnId) => {
            const column = data.columns[columnId];
            const tasks = column.taskIds.map((taskId) => data.tasks[taskId]);

            return (
              <div key={column.id} className="flex flex-col bg-gray-200/80 rounded-xl w-1/3 p-4 min-h-[500px]">
                <h2 className="font-bold text-gray-700 mb-4 px-2">{column.title} <span className="ml-2 text-sm bg-gray-300 px-2 py-0.5 rounded-full">{tasks.length}</span></h2>
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
                              onClick={() => handleEditClick(task)}
                              className="cursor-pointer hover:border-blue-400 hover:shadow-md transition-all bg-white p-4 mb-3 rounded-lg shadow-sm border border-gray-200 flex flex-col gap-2"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded w-fit text-white uppercase" style={{ backgroundColor: task.warnaKategori }}>
                                  {task.kategori}
                                </span>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation(); 
                                    handleDeleteTask(task.id, task.dbId);
                                  }}
                                  className="text-gray-400 hover:text-red-500 transition-colors z-10 p-1"
                                  title="Hapus Tugas"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                  </svg>
                                </button>
                              </div>
                              <h4 className="font-semibold text-gray-900">{task.judul_task || task.content}</h4>
                              <p className="text-sm text-gray-600 line-clamp-2">{task.content}</p>
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

      {/* Modal Form Tambah & Edit Tugas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl p-8">
            
            {/* Header Modal */}
            <div className="mb-6">
              <div className="bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {editingTask ? "Edit Task" : "Add Task"}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {editingTask ? "Update the information below to modify the task" : "Fill in the form below to create a task"}
              </p>
            </div>

            {/* Form Input */}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Kolom Kiri */}
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                    <input 
                      type="text" 
                      placeholder="Judul Tugas..." 
                      value={formData.judul_task}
                      required 
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 outline-none transition" 
                      onChange={(e) => setFormData({...formData, judul_task: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Task Description</label>
                    <textarea 
                      placeholder="Give a description of the task..." 
                      value={formData.deskripsi}
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 outline-none h-32 resize-none transition" 
                      onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                    ></textarea>
                  </div>
                </div>

                {/* Kolom Kanan */}
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Penanggung Jawab</label>
                    <select 
                      required 
                      value={formData.id_user}
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-gray-900 outline-none focus:ring-2 focus:ring-green-500 transition bg-white" 
                      onChange={(e) => setFormData({...formData, id_user: e.target.value})}
                    >
                      <option value="">Pilih Penanggung Jawab...</option>
                      {users.map(u => <option key={u.id_user} value={u.id_user.toString()}>{u.nama_lengkap}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                    <select 
                      required 
                      value={formData.id_kategori}
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-gray-900 outline-none focus:ring-2 focus:ring-green-500 transition bg-white" 
                      onChange={(e) => setFormData({...formData, id_kategori: e.target.value})}
                    >
                      <option value="">Pilih Kategori...</option>
                      {categories.map(c => <option key={c.id_kategori} value={c.id_kategori.toString()}>{c.nama_kategori}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                    <input 
                      type="date" 
                      required 
                      value={formData.deadline}
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500 outline-none transition" 
                      onChange={(e) => setFormData({...formData, deadline: e.target.value})} 
                    />
                  </div>
                </div>
              </div>

              {/* Tombol Aksi */}
              <div className="flex justify-end gap-3 mt-8 border-t pt-5">
                <button 
                  type="button" 
                  onClick={() => {
                    setFormData({ judul_task: "", deskripsi: "", id_user: "", id_kategori: "", deadline: "" });
                    setEditingTask(null);
                    setIsModalOpen(false);
                    setEditingTask(null);
                  }} 
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition"
                >
                  Close
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
                >
                  {editingTask ? "Update Changes" : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

