import { useState, useEffect, useRef, useCallback } from 'react';
import BgmPlayer from './BgmPlayer';
import { useChime } from '../hooks/useChime';

interface CompletionData {
  date: string;
  workTime: number;
}

type TimerStatus = 'working' | 'break' | 'continue';

export default function PomodoroTimer() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<TimerStatus>('working');
  const [completionData, setCompletionData] = useState<CompletionData[]>([]);
  const [workTime, setWorkTime] = useState(25);
  const [showCompletionChoice, setShowCompletionChoice] = useState(false);
  const [currentSessionStartTime, setCurrentSessionStartTime] = useState<number | null>(null);
  const [continueStartTime, setContinueStartTime] = useState<number | null>(null);
  const breakTime = 5;
  const intervalRef = useRef<number | null>(null);

  const { playChime } = useChime();

  const handleTimerComplete = useCallback(() => {
    setIsActive(false);

    // チャイムを鳴らす
    playChime();

    if (status === 'working') {
      const sessionTime = currentSessionStartTime ? Math.round((Date.now() - currentSessionStartTime) / 1000 / 60) : workTime;
      const newCompletion: CompletionData = {
        date: new Date().toISOString().split('T')[0],
        workTime: sessionTime
      };
      setCompletionData(prev => [...prev, newCompletion]);
      setCurrentSessionStartTime(null);
      setShowCompletionChoice(true);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('ポモドーロ完了！', {
          body: '続行または休憩を選択してください',
        });
      }
    } else if (status === 'break') {
      setStatus('working');
      setMinutes(workTime);
      setSeconds(0);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('休憩終了！', {
          body: '作業を再開しましょう',
        });
      }
    }
  }, [status, currentSessionStartTime, workTime, playChime]);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = window.setInterval(() => {
        if (status === 'continue') {
          // 続行モード：カウントアップ
          setSeconds(prev => {
            if (prev === 59) {
              setMinutes(prev => prev + 1);
              return 0;
            }
            return prev + 1;
          });
        } else {
          // 通常のカウントダウン
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
  }, [isActive, minutes, seconds, status, handleTimerComplete]);

  const resetTimer = () => {
    setIsActive(false);
    setStatus('working');
    setMinutes(25);
    setSeconds(0);
    setShowCompletionChoice(false);
    setCurrentSessionStartTime(null);
    setContinueStartTime(null);
  };

  const startTimer = (duration: number) => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    setWorkTime(duration);
    setMinutes(duration);
    setSeconds(0);
    setStatus('working');
    setShowCompletionChoice(false);
    setCurrentSessionStartTime(Date.now());
    setIsActive(true);
  };

  const giveUp = () => {
    setIsActive(false);
    setStatus('working');
    setMinutes(25);
    setSeconds(0);
    setShowCompletionChoice(false);
    setCurrentSessionStartTime(null);
    setContinueStartTime(null);
  };

  const handleContinue = () => {
    setStatus('continue');
    setMinutes(0);
    setSeconds(0);
    setShowCompletionChoice(false);
    setContinueStartTime(Date.now());
    setIsActive(true);
  };

  const handleBreak = () => {
    // チャイムを鳴らす（休憩開始時）
    playChime();

    if (status === 'continue' && continueStartTime) {
      const continueTime = Math.round((Date.now() - continueStartTime) / 1000 / 60);
      setCompletionData(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1].workTime += continueTime;
        }
        return updated;
      });
      setContinueStartTime(null);
    }

    setStatus('break');
    setMinutes(breakTime);
    setSeconds(0);
    setShowCompletionChoice(false);
    setIsActive(true);
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-6 relative overflow-hidden">
      {/* Gradient overlay for active state */}
      <div className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-500 rounded-2xl ${
        isActive ? 'from-emerald-500/10 to-cyan-500/10 opacity-100' : 'opacity-0'
      }`}></div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-3 h-3 rounded-full transition-colors ${
            status === 'break' ? 'bg-orange-400' :
            status === 'continue' ? 'bg-purple-400 animate-pulse' :
            isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
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
                isActive ? 'from-emerald-400 to-cyan-400' : 'from-slate-400 to-slate-600'
              }`}></div>
            </div>
            {(status === 'break' || status === 'continue') && (
              <div className="flex items-center justify-center gap-4 text-slate-300">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  status === 'break' ? 'bg-orange-500/20 text-orange-300' :
                  status === 'continue' ? 'bg-purple-500/20 text-purple-300' :
                  'bg-slate-500/20 text-slate-300'
                }`}>
                  {status === 'break' ? '🧘 休憩中' : status === 'continue' ? '✨ 続行中' : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {showCompletionChoice ? (
          <div className="space-y-4 mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">🎉 お疲れさまでした！</h3>
              <p className="text-slate-300 text-sm">続行または休憩を選択してください</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleContinue}
                className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-purple-500/25 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                ✨ 続行
              </button>
              <button
                onClick={handleBreak}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-orange-500/25 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                🧘 休憩
              </button>
            </div>
          </div>
        ) : status === 'continue' ? (
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleBreak}
              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-orange-500/25 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              🧘 休憩
            </button>
            <button
              onClick={resetTimer}
              className="flex-1 bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 font-semibold py-3 px-6 rounded-xl transition-all duration-200 border border-slate-600/50 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              🔄 リセット
            </button>
          </div>
        ) : isActive ? (
          <div className="text-center mb-6">
            <button
              onClick={giveUp}
              className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-red-500/25 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              🏳️ ギブアップ
            </button>
          </div>
        ) : (
          <div className="space-y-6 mb-6">
            {/* メインの25分ボタン */}
            <button
              onClick={() => startTimer(25)}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold text-xl py-6 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-emerald-500/25 transform hover:scale-[1.02] active:scale-[0.98]"
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
        {completionData.length > 0 && (
          <div className="pt-4 border-t border-white/10">
            <h3 className="text-sm font-medium text-slate-200 mb-3">📊 完遂履歴</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {completionData.slice(-5).reverse().map((data, index) => (
                <div key={index} className="flex justify-between items-center py-2 px-3 bg-slate-700/30 rounded-lg text-sm">
                  <span className="text-slate-300">{data.date}</span>
                  <span className="text-cyan-400 font-mono">{data.workTime}分</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center">
              <span className="text-sm text-slate-400">
                今日: {completionData.filter(d => d.date === new Date().toISOString().split('T')[0]).length}回 /
                総計: {completionData.length}回
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
