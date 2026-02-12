import PomodoroTimer from './components/PomodoroTimer';
import StickyNotesPanel from './components/StickyNotesPanel';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(156, 146, 172, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(156, 146, 172, 0.1) 0%, transparent 50%)`
        }}></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="relative text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2 tracking-tight">
            moku2
          </h1>
          <p className="text-slate-300 text-base font-medium">作業集中支援アプリ</p>
          <div className="w-24 h-1 bg-gradient-to-r from-cyan-400 to-purple-400 mx-auto mt-3 rounded-full"></div>
        </header>

        <div className="flex gap-6 items-start">
          {/* 左: ポモドーロタイマー */}
          <div className="w-[440px] flex-shrink-0 transform transition-all duration-300 hover:scale-[1.01]">
            <PomodoroTimer />
          </div>

          {/* 右: 付箋パネル */}
          <div className="flex-1 min-w-0">
            <StickyNotesPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
