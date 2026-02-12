import { useState, useEffect, useRef, useCallback } from 'react';
import BgmPlayer from './BgmPlayer';
import { useChime } from '../hooks/useChime';

interface DailyRecord {
  date: string;        // "2024-01-26"
  count: number;       // 完了回数
  totalMinutes: number; // 合計作業分数
}

type TimerStatus = 'idle' | 'working' | 'break';

export default function PomodoroTimer() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>(() => {
    const saved = localStorage.getItem('moku2-daily-records');
    return saved ? JSON.parse(saved) : [];
  });
  const [workTime, setWorkTime] = useState(25);
  const [currentSessionStartTime, setCurrentSessionStartTime] = useState<number | null>(null);
  const breakTime = 5;
  const intervalRef = useRef<number | null>(null);

  const { playChime } = useChime();

  // LocalStorageに保存
  useEffect(() => {
    localStorage.setItem('moku2-daily-records', JSON.stringify(dailyRecords));
  }, [dailyRecords]);

  const handleTimerComplete = useCallback(() => {
    // チャイムを鳴らす
    playChime();

    if (status === 'working') {
      // 作業完了 → 日付ごとに集計して保存
      const sessionTime = currentSessionStartTime ? Math.round((Date.now() - currentSessionStartTime) / 1000 / 60) : workTime;
      const today = new Date().toISOString().split('T')[0];

      setDailyRecords(prev => {
        const existingIndex = prev.findIndex(r => r.date === today);
        if (existingIndex >= 0) {
          // 同じ日付があれば更新
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            count: updated[existingIndex].count + 1,
            totalMinutes: updated[existingIndex].totalMinutes + sessionTime
          };
          return updated;
        } else {
          // なければ新規追加
          return [...prev, { date: today, count: 1, totalMinutes: sessionTime }];
        }
      });
      setCurrentSessionStartTime(null);

      // 自動で休憩開始
      setStatus('break');
      setMinutes(breakTime);
      setSeconds(0);
      // isActiveはtrueのまま継続

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('ポモドーロ完了！', {
          body: '5分間の休憩を開始します',
        });
      }
    } else if (status === 'break') {
      // 休憩終了 → 待機画面に戻る
      setIsActive(false);
      setStatus('idle');
      setMinutes(25);
      setSeconds(0);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('休憩終了！', {
          body: '次の作業を始めましょう',
        });
      }
    }
  }, [status, currentSessionStartTime, workTime, playChime, breakTime]);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = window.setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            handleTimerComplete();
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, minutes, seconds, handleTimerComplete]);

  const startTimer = (duration: number) => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    setWorkTime(duration);
    setMinutes(duration);
    setSeconds(0);
    setStatus('working');
    setCurrentSessionStartTime(Date.now());
    setIsActive(true);
  };

  const giveUp = () => {
    setIsActive(false);
    setStatus('idle');
    setMinutes(25);
    setSeconds(0);
    setCurrentSessionStartTime(null);
  };

  const endBreak = () => {
    playChime();
    setIsActive(false);
    setStatus('idle');
    setMinutes(25);
    setSeconds(0);
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-6 relative overflow-hidden">
      {/* Gradient overlay for active state */}
      <div className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-500 rounded-2xl ${
        isActive ? (status === 'break' ? 'from-orange-500/10 to-amber-500/10 opacity-100' : 'from-emerald-500/10 to-cyan-500/10 opacity-100') : 'opacity-0'
      }`}></div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-3 h-3 rounded-full transition-colors ${
            status === 'break' ? 'bg-orange-400 animate-pulse' :
            status === 'working' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
          }`}></div>
          <h2 className="text-xl font-bold text-white">
            ポモドーロタイマー
          </h2>
        </div>

        {/* タイマー動作中は時間表示を表示 */}
        {isActive && (
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <div className="text-7xl font-mono font-bold bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent mb-3 tracking-wider">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <div className={`absolute -inset-4 bg-gradient-to-br rounded-full blur-xl opacity-30 transition-opacity ${
                status === 'break' ? 'from-orange-400 to-amber-400' : 'from-emerald-400 to-cyan-400'
              }`}></div>
            </div>
            {status === 'break' && (
              <div className="flex items-center justify-center gap-4 text-slate-300">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-500/20 text-orange-300">
                  🧘 休憩中
                </span>
              </div>
            )}
          </div>
        )}

        {isActive ? (
          <div className="text-center mb-6">
            {status === 'break' ? (
              <button
                onClick={endBreak}
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-emerald-500/25 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                ☕ 休憩終わり
              </button>
            ) : (
              <button
                onClick={giveUp}
                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-red-500/25 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                🏳️ ギブアップ
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6 mb-6">
            {/* メインの25分ボタン */}
            <button
              onClick={() => startTimer(25)}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold text-xl py-6 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-emerald-500/25 transform hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            >
              🚀 作業開始！
              <span className="text-2xl font-extrabold mx-2 px-2 py-1 bg-white/20 rounded-lg">25分</span>
            </button>

            {/* 時間ない時用のボタン群 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-300 text-center border-t border-white/10 pt-4">
                ⏰ 時間ない時用
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => startTimer(20)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold py-4 px-2 rounded-xl transition-all duration-200 shadow-lg hover:shadow-blue-500/25 transform hover:scale-[1.02] active:scale-[0.98] text-center"
                >
                  <div>⚡ 作業開始！</div>
                  <div className="text-xl font-extrabold mt-1 px-1 py-0.5 bg-white/20 rounded">20分</div>
                </button>
                <button
                  onClick={() => startTimer(15)}
                  className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-semibold py-4 px-2 rounded-xl transition-all duration-200 shadow-lg hover:shadow-purple-500/25 transform hover:scale-[1.02] active:scale-[0.98] text-center"
                >
                  <div>💨 作業開始！</div>
                  <div className="text-xl font-extrabold mt-1 px-1 py-0.5 bg-white/20 rounded">15分</div>
                </button>
                <button
                  onClick={() => startTimer(10)}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-4 px-2 rounded-xl transition-all duration-200 shadow-lg hover:shadow-orange-500/25 transform hover:scale-[1.02] active:scale-[0.98] text-center"
                >
                  <div>🔥 作業開始！</div>
                  <div className="text-xl font-extrabold mt-1 px-1 py-0.5 bg-white/20 rounded">10分</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 完遂履歴 */}
        {dailyRecords.length > 0 && (
          <div className="pt-4 border-t border-white/10">
            <h3 className="text-sm font-medium text-slate-200 mb-3">📊 完遂履歴</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {dailyRecords.slice(-5).reverse().map((record, index) => (
                <div key={index} className="flex justify-between items-center py-2 px-3 bg-slate-700/30 rounded-lg text-sm">
                  <span className="text-slate-300">{record.date}</span>
                  <span className="text-cyan-400 font-mono">{record.count}回 / {record.totalMinutes}分</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center">
              <span className="text-sm text-slate-400">
                今日: {dailyRecords.find(r => r.date === new Date().toISOString().split('T')[0])?.count ?? 0}回 /
                総計: {dailyRecords.reduce((sum, r) => sum + r.count, 0)}回
              </span>
            </div>
          </div>
        )}

        {/* BGMコントロール */}
        <div className="pt-4 border-t border-white/10 mt-4">
          <div className={isActive ? '' : 'opacity-50 pointer-events-none'}>
            <BgmPlayer timerState={{ minutes, seconds, isActive, isBreak: status === 'break' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
