"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useSession, signOut } from "next-auth/react";
import DeadlineBadge from "./DeadlineBadge";

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
  nama_user?: string;
};

type BoardData = {
  columns: Record<string, { id: string; title: string; taskIds: string[] }>;
  tasks: Record<string, Task>;
  columnOrder: string[];
};

const initialBoardData: BoardData = {
  columns: {
    "TODO": { id: "TODO", title: "TO DO", taskIds: [] },
    "DOING": { id: "DOING", title: "IN PROGRES", taskIds: [] },
    "DONE": { id: "DONE", title: "DONE", taskIds: [] },
  },
  tasks: {},
  columnOrder: ["TODO", "DOING", "DONE"],
};

export default function KanbanBoard() {
  // --- STATE ---
  const [data, setData] = useState<BoardData>(initialBoardData);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
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
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const { data: session } = useSession();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [sortOption, setSortOption] = useState<string>("A-Z");
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  // --- HELPER FUNCTION ---
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDeadline = (dateString: string) => {
    if (!dateString) return "No deadline";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

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

        // Buat mapping user untuk mendapatkan nama berdasarkan id_user
        const userMap = dbUsers.reduce((map: any, user: any) => {
          map[user.id_user] = user.nama_lengkap;
          return map;
        }, {});

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
            warnaKategori: task.kategori?.kode_warna || "#ccc",
            nama_user: userMap[task.id_user] || "Unknown"
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

  // --- SORTING LOGIC ---
  const handleSort = (option: string) => {
    setSortOption(option);
    setIsSortMenuOpen(false);

    const newData = { ...data };
    
    const sortTasks = (taskIds: string[], sortType: string) => {
      return taskIds.slice().sort((aId, bId) => {
        const taskA = newData.tasks[aId];
        const taskB = newData.tasks[bId];
        
        if (sortType === "A-Z") {
          return taskA.judul_task.localeCompare(taskB.judul_task);
        } else if (sortType === "Z-A") {
          return taskB.judul_task.localeCompare(taskA.judul_task);
        } else if (sortType === "Kategori (Low - High)") {
          const priority = { "low": 1, "medium": 2, "high": 3 } as Record<string, number>;
          const pA = priority[taskA.kategori.toLowerCase()] || 0;
          const pB = priority[taskB.kategori.toLowerCase()] || 0;
          return pA - pB;
        } else if (sortType === "Kategori (High - Low)") {
          const priority = { "low": 1, "medium": 2, "high": 3 } as Record<string, number>;
          const pA = priority[taskA.kategori.toLowerCase()] || 0;
          const pB = priority[taskB.kategori.toLowerCase()] || 0;
          return pB - pA;
        } else if (sortType === "Deadline (Terdekat)") {
          if (!taskA.deadline && !taskB.deadline) return 0;
          if (!taskA.deadline) return 1;
          if (!taskB.deadline) return -1;
          return new Date(taskA.deadline).getTime() - new Date(taskB.deadline).getTime();
        } else if (sortType === "Deadline (Terjauh)") {
          if (!taskA.deadline && !taskB.deadline) return 0;
          if (!taskA.deadline) return 1;
          if (!taskB.deadline) return -1;
          return new Date(taskB.deadline).getTime() - new Date(taskA.deadline).getTime();
        }
        return 0;
      });
    };

    newData.columnOrder.forEach(colId => {
      newData.columns[colId].taskIds = sortTasks(newData.columns[colId].taskIds, option);
    });

    setData(newData);
  };

  // --- HANDLER UNTUK MEMBUKA DETAIL TASK ---
  const handleTaskClick = async (task: any) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
    setOpenMenuTaskId(null);

    // Fetch comments
    setIsLoadingComments(true);
    try {
      const res = await fetch(`/api/comments?taskId=${task.dbId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (error) {
      console.error("Gagal mengambil komentar:", error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  // --- HANDLER UNTUK EDIT TASK DARI MENU ---
  const handleEditFromMenu = (task: any) => {
    setEditingTask(task);
    const formattedDate = task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : "";
    setFormData({
      judul_task: task.judul_task || "",
      deskripsi: task.content || "",
      id_user: task.id_user ? task.id_user.toString() : "",
      id_kategori: task.id_kategori ? task.id_kategori.toString() : "",
      deadline: formattedDate
    });
    setIsDetailModalOpen(false);
    setIsModalOpen(true);
    setOpenMenuTaskId(null);
  };

  // --- HANDLER UNTUK MARK TASK AS DONE ---
  const handleMarkAsDone = async (task: any) => {
    // Cari lokasi task saat ini
    let sourceColumnId = "TODO";
    for (const colId of data.columnOrder) {
      if (data.columns[colId].taskIds.includes(task.id)) {
        sourceColumnId = colId;
        break;
      }
    }

    if (sourceColumnId === "DONE") {
      setIsDetailModalOpen(false);
      return; // Sudah selesai
    }

    // Optimistic UI Update
    const startColumn = data.columns[sourceColumnId];
    const finishColumn = data.columns["DONE"];

    const startTaskIds = Array.from(startColumn.taskIds);
    startTaskIds.splice(startTaskIds.indexOf(task.id), 1);
    const finishTaskIds = Array.from(finishColumn.taskIds);
    finishTaskIds.push(task.id); // Taruh di akhir kolom DONE

    setData({
      ...data,
      columns: {
        ...data.columns,
        [startColumn.id]: { ...startColumn, taskIds: startTaskIds },
        [finishColumn.id]: { ...finishColumn, taskIds: finishTaskIds },
      },
    });

    setIsDetailModalOpen(false);

    // Update ke Database
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_task: task.dbId, status: "DONE" }),
      });
    } catch (error) {
      console.error("Gagal update status:", error);
    }
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
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTask) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask.dbId,
          isi_komentar: newComment,
        }),
      });

      if (res.ok) {
        const createdComment = await res.json();
        setComments([...comments, createdComment]);
        setNewComment("");
      } else {
        const errorData = await res.json();
        alert(`Gagal mengirim komentar: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Gagal mengirim komentar:", error);
      alert("Terjadi kesalahan saat mengirim komentar.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    const isConfirmed = window.confirm("Apakah kamu yakin ingin menghapus komentar ini?");
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/comments?id=${commentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setComments(comments.filter(c => c.id_komentar !== commentId));
      } else {
        alert("Gagal menghapus komentar");
      }
    } catch (error) {
      console.error("Gagal menghapus komentar:", error);
    }
  };

  const handleUpdateComment = async (commentId: number) => {
    if (!editCommentText.trim()) return;

    try {
      const res = await fetch('/api/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_komentar: commentId,
          isi_komentar: editCommentText,
        }),
      });

      if (res.ok) {
        const updatedComment = await res.json();
        setComments(comments.map(c => c.id_komentar === commentId ? updatedComment : c));
        setEditingCommentId(null);
        setEditCommentText("");
      } else {
        alert("Gagal mengupdate komentar");
      }
    } catch (error) {
      console.error("Gagal mengupdate komentar:", error);
    }
  };

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

        // Cari nama user berdasarkan id_user
        const selectedUser = users.find(u => u.id_user.toString() === formData.id_user);

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
              deadline: responseData.deadline,
              nama_user: selectedUser?.nama_lengkap || "Unknown"
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

        // Cari nama user berdasarkan id_user
        const selectedUser = users.find(u => u.id_user.toString() === formData.id_user);

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
              deadline: responseData.deadline,
              nama_user: selectedUser?.nama_lengkap || "Unknown"
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

      {/* HEADER: Tombol Tambah & Profil */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Projects</h1>
          <svg className="w-5 h-5 text-gray-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
        </div>

        <div className="flex items-center gap-6">
          {/* SORT MENU */}
          <div className="relative hidden md:flex items-center gap-2 text-gray-500 text-sm font-medium z-30">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
            <span>Sort</span>
            <span 
              className="text-gray-900 font-bold cursor-pointer flex items-center gap-1"
              onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
            >
              {sortOption} <span className="text-xs">↓</span>
            </span>

            {/* Dropdown Sort */}
            {isSortMenuOpen && (
              <div className="absolute top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                {["A-Z", "Z-A", "Kategori (Low - High)", "Kategori (High - Low)", "Deadline (Terdekat)", "Deadline (Terjauh)"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleSort(opt)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${sortOption === opt ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setEditingTask(null);
              setFormData({ judul_task: "", deskripsi: "", id_user: "", id_kategori: "", deadline: "" });
              setIsModalOpen(true);
            }}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-full shadow-sm hover:bg-blue-700 hover:shadow transition-all font-semibold text-sm"
          >
            Add New Task
          </button>

          {/* PROFIL MENU */}
          <div className="relative">
            {/* Avatar (Huruf Pertama) */}
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg uppercase shadow-md hover:bg-blue-700 hover:ring-4 ring-blue-100 transition-all focus:outline-none"
              title="Account Menu"
            >
              {session?.user?.name ? session.user.name[0] : "U"}
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Info Profil */}
                <div className="p-5 border-b border-gray-50 bg-gray-50/50">
                  <p className="font-bold text-gray-800 text-base mb-0.5 truncate">
                    {session?.user?.name || "Pengguna"}
                  </p>
                  <p className="text-gray-500 text-sm truncate">
                    {session?.user?.email || "email@example.com"}
                  </p>
                </div>

                {/* Tombol Aksi */}
                <div className="p-2">
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 font-semibold hover:bg-red-50 rounded-xl transition-colors flex items-center gap-3"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-[2rem] p-6 lg:p-8 shadow-sm">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6">
            {data.columnOrder.map((columnId) => {
              const column = data.columns[columnId];
              const tasks = column.taskIds.map((taskId) => data.tasks[taskId]);

              return (
                <div key={column.id} className="flex flex-col bg-white border border-gray-200 rounded-2xl w-1/3 p-4 min-h-[500px]">
                  <div className="bg-gray-100 rounded-xl p-3 mb-4 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-800">{column.title}</h2>
                    <span className="text-xs font-bold bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full shadow-sm">{tasks.length}</span>
                  </div>
                  <Droppable droppableId={column.id}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="flex-grow flex flex-col">
                        {tasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => handleTaskClick(task)}
                                className="cursor-pointer hover:border-blue-400 hover:shadow-md transition-all bg-white p-5 mb-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col gap-3"
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="text-[11px] font-bold px-3 py-1 rounded-full w-fit text-white uppercase tracking-wider" style={{ backgroundColor: task.warnaKategori }}>
                                    {task.kategori}
                                  </span>

                                  {/* MENU 3 TITIK */}
                                  <div className="relative">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuTaskId(openMenuTaskId === task.id ? null : task.id);
                                      }}
                                      className="text-gray-400 hover:text-gray-600 transition-colors z-10 p-1"
                                      title="Menu"
                                    >
                                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <circle cx="12" cy="5" r="2" />
                                        <circle cx="12" cy="12" r="2" />
                                        <circle cx="12" cy="19" r="2" />
                                      </svg>
                                    </button>

                                    {/* DROPDOWN MENU */}
                                    {openMenuTaskId === task.id && (
                                      <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditFromMenu(task);
                                          }}
                                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                                        >
                                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                          </svg>
                                          Edit Task
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteTask(task.id, task.dbId);
                                            setOpenMenuTaskId(null);
                                          }}
                                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors border-t border-gray-100"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                          </svg>
                                          Delete Task
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-extrabold text-gray-900 text-lg">{task.judul_task || "No Title"}</h4>
                                  <p className="text-gray-500 text-sm mt-1 line-clamp-2">{task.content}</p>
                                </div>

                                {/* Avatar dan Deadline */}
                                <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100">
                                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0" title={task.nama_user}>
                                    {getInitials(task.nama_user || "U")}
                                  </div>
                                  <DeadlineBadge date={task.deadline} />
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {/* Empty State */}
                        {tasks.length === 0 && (
                          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 mt-10">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            </div>
                            <p className="text-sm font-medium">No Tasks currently. Board is empty!</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* MODAL DETAIL TASK */}
      {isDetailModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1">
              {/* Header Modal */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{selectedTask.judul_task}</h2>
              </div>

              {/* Detail Informasi */}
              <div className="space-y-6">
                {/* Deskripsi */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Deskripsi</label>
                  <p className="text-gray-700 text-base leading-relaxed bg-gray-50 p-4 rounded-lg min-h-24">
                    {selectedTask.content || "Tidak ada deskripsi"}
                  </p>
                </div>

                {/* Grid Informasi */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* User */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Penanggung Jawab</label>
                    <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {getInitials(selectedTask.nama_user || "U")}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{selectedTask.nama_user || "Unknown"}</span>
                    </div>
                  </div>

                  {/* Kategori */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Kategori</label>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="inline-block text-xs font-bold px-3 py-1 rounded text-white" style={{ backgroundColor: selectedTask.warnaKategori }}>
                        {selectedTask.kategori}
                      </span>
                    </div>
                  </div>

                  {/* Deadline */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Deadline</label>
                    <div className="bg-gray-50 p-2.5 rounded-lg flex items-center">
                      <DeadlineBadge date={selectedTask.deadline} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Diskusi Tim */}
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Diskusi Tim</h3>

                {/* Daftar Komentar */}
                <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {isLoadingComments ? (
                    <p className="text-center text-sm text-gray-500">Memuat komentar...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-center text-sm text-gray-500">Belum ada diskusi untuk tugas ini.</p>
                  ) : (
                    comments.map((comment: any) => (
                      <div key={comment.id_komentar} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0" title={comment.user.nama_lengkap}>
                          {getInitials(comment.user.nama_lengkap || "U")}
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg rounded-tl-none flex-1 border border-gray-100">
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-800">{comment.user.nama_lengkap}</span>
                              <span className="text-[10px] text-gray-500">
                                {new Date(comment.created_at).toLocaleString('id-ID', {
                                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </div>

                            {/* Aksi Edit/Delete jika pemilik komentar */}
                            {session?.user && (session.user as any).id && parseInt((session.user as any).id) === comment.id_user && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingCommentId(comment.id_komentar);
                                    setEditCommentText(comment.isi_komentar);
                                  }}
                                  className="text-gray-400 hover:text-blue-600 transition-colors"
                                  title="Edit Komentar"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comment.id_komentar)}
                                  className="text-gray-400 hover:text-red-600 transition-colors"
                                  title="Hapus Komentar"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                              </div>
                            )}
                          </div>

                          {editingCommentId === comment.id_komentar ? (
                            <div className="mt-2 flex gap-2">
                              <input
                                type="text"
                                value={editCommentText}
                                onChange={(e) => setEditCommentText(e.target.value)}
                                className="flex-1 border border-gray-300 p-1.5 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateComment(comment.id_komentar);
                                  else if (e.key === 'Escape') setEditingCommentId(null);
                                }}
                              />
                              <button
                                onClick={() => handleUpdateComment(comment.id_komentar)}
                                className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                              >
                                Simpan
                              </button>
                              <button
                                onClick={() => setEditingCommentId(null)}
                                className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.isi_komentar}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Form Input Komentar */}
                <form onSubmit={handleSubmitComment} className="flex gap-3">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Tulis komentar..."
                    className="flex-1 border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                    disabled={isSubmittingComment}
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmittingComment}
                    className="px-4 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400 flex items-center justify-center min-w-[80px]"
                  >
                    {isSubmittingComment ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      "Kirim"
                    )}
                  </button>
                </form>
              </div>

              {/* Tombol Aksi */}
              <div className="flex justify-end gap-3 mt-8 border-t pt-5">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition"
                >
                  Tutup
                </button>
                <button
                  onClick={() => handleMarkAsDone(selectedTask)}
                  className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Tambah & Edit Tugas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1">
              {/* Header Modal */}
              <div className="mb-6">
                <div className="bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingTask ? editingTask.judul_task : "Add Task"}
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
                        className="w-full border border-gray-300 p-2.5 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
                        onChange={(e) => setFormData({ ...formData, judul_task: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Task Description</label>
                      <textarea
                        placeholder="Give a description of the task..."
                        value={formData.deskripsi}
                        className="w-full border border-gray-300 p-2.5 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none transition"
                        onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
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
                        className="w-full border border-gray-300 p-2.5 rounded-lg text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
                        onChange={(e) => setFormData({ ...formData, id_user: e.target.value })}
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
                        className="w-full border border-gray-300 p-2.5 rounded-lg text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
                        onChange={(e) => setFormData({ ...formData, id_kategori: e.target.value })}
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
                        className="w-full border border-gray-300 p-2.5 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
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
                    className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                  >
                    {editingTask ? "Save" : "Add Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

