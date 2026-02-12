import { useState, useEffect, DragEvent } from 'react';

interface StickyNote {
  id: string;
  text: string;
  color: string;
  createdAt: string; // ISO date string
}

interface StickyNotesData {
  today: StickyNote[];
  permanent: StickyNote[];
}

const COLORS = [
  'bg-yellow-200',
  'bg-pink-200',
  'bg-blue-200',
  'bg-green-200',
  'bg-purple-200',
  'bg-orange-200',
];

function getRandomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export default function StickyNotesPanel() {
  const [notes, setNotes] = useState<StickyNotesData>(() => {
    const saved = localStorage.getItem('moku2-sticky-notes');
    if (saved) {
      const data: StickyNotesData = JSON.parse(saved);
      // 今日以外の付箋を削除
      const today = getTodayString();
      data.today = data.today.filter(note => note.createdAt === today);
      return data;
    }
    return { today: [], permanent: [] };
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggedNote, setDraggedNote] = useState<{ note: StickyNote; from: 'today' | 'permanent' } | null>(null);
  const [dragOverArea, setDragOverArea] = useState<'today' | 'permanent' | null>(null);

  // LocalStorageに保存
  useEffect(() => {
    localStorage.setItem('moku2-sticky-notes', JSON.stringify(notes));
  }, [notes]);

  const addNote = (area: 'today' | 'permanent') => {
    const newNote: StickyNote = {
      id: Date.now().toString(),
      text: '',
      color: getRandomColor(),
      createdAt: getTodayString(),
    };
    setNotes(prev => ({
      ...prev,
      [area]: [...prev[area], newNote],
    }));
    setEditingId(newNote.id);
  };

  const updateNote = (area: 'today' | 'permanent', id: string, text: string) => {
    setNotes(prev => ({
      ...prev,
      [area]: prev[area].map(note =>
        note.id === id ? { ...note, text } : note
      ),
    }));
  };

  const deleteNote = (area: 'today' | 'permanent', id: string) => {
    setNotes(prev => ({
      ...prev,
      [area]: prev[area].filter(note => note.id !== id),
    }));
  };

  const handleDragStart = (e: DragEvent, note: StickyNote, from: 'today' | 'permanent') => {
    setDraggedNote({ note, from });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent, area: 'today' | 'permanent') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverArea(area);
  };

  const handleDragLeave = () => {
    setDragOverArea(null);
  };

  const handleDrop = (e: DragEvent, toArea: 'today' | 'permanent') => {
    e.preventDefault();
    setDragOverArea(null);

    if (!draggedNote) return;

    const { note, from } = draggedNote;
    if (from === toArea) {
      setDraggedNote(null);
      return;
    }

    // 移動元から削除
    setNotes(prev => ({
      ...prev,
      [from]: prev[from].filter(n => n.id !== note.id),
      [toArea]: [...prev[toArea], { ...note, createdAt: getTodayString() }],
    }));

    setDraggedNote(null);
  };

  const handleDragEnd = () => {
    setDraggedNote(null);
    setDragOverArea(null);
  };

  const renderNote = (note: StickyNote, area: 'today' | 'permanent') => {
    const isEditing = editingId === note.id;

    return (
      <div
        key={note.id}
        draggable={!isEditing}
        onDragStart={(e) => handleDragStart(e, note, area)}
        onDragEnd={handleDragEnd}
        className={`${note.color} p-3 rounded-lg shadow-md cursor-move relative group transition-shadow hover:shadow-lg`}
      >
        <button
          onClick={() => deleteNote(area, note.id)}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
        >
          x
        </button>
        {isEditing ? (
          <textarea
            autoFocus
            value={note.text}
            onChange={(e) => updateNote(area, note.id, e.target.value)}
            onBlur={() => setEditingId(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setEditingId(null);
            }}
            className="w-full h-20 bg-transparent resize-none outline-none text-gray-800 text-sm"
            placeholder="メモを入力..."
          />
        ) : (
          <div
            onClick={() => setEditingId(note.id)}
            className="min-h-[50px] text-gray-800 text-sm whitespace-pre-wrap break-words cursor-text"
          >
            {note.text || <span className="text-gray-400">クリックして編集</span>}
          </div>
        )}
      </div>
    );
  };

  const renderArea = (area: 'today' | 'permanent', title: string, subtitle: string) => {
    const areaNotes = notes[area];
    const isDragOver = dragOverArea === area && draggedNote?.from !== area;

    return (
      <div
        onDragOver={(e) => handleDragOver(e, area)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, area)}
        className={`flex-1 min-w-0 bg-white/5 backdrop-blur-md rounded-xl border transition-all duration-200 p-4 overflow-hidden ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-500/10'
            : 'border-white/20'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-white font-semibold text-sm">{title}</h3>
            <p className="text-slate-400 text-xs">{subtitle}</p>
          </div>
          <button
            onClick={() => addNote(area)}
            className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white rounded-lg flex items-center justify-center text-xl font-bold transition-all hover:scale-110"
          >
            +
          </button>
        </div>

        <div className="space-y-3 min-h-[200px] max-h-[400px] overflow-y-auto overflow-x-hidden">
          {areaNotes.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-8">
              +ボタンで付箋を追加
            </div>
          ) : (
            areaNotes.map(note => renderNote(note, area))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-4 h-full">
      {renderArea('today', '今日のメモ', '日付が変わると消えます')}
      {renderArea('permanent', '保存メモ', 'ずっと残ります')}
    </div>
  );
}
