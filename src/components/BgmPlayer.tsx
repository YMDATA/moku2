import { useState, useRef, useEffect } from 'react';

interface RadioStation {
  name: string;
  url: string;
}

const stations: RadioStation[] = [
  { name: 'Lofi Girl - Lofi Hip Hop', url: 'https://stream.zeno.fm/f3wvbbqmdg8uv' },
  { name: 'ChillHop Radio', url: 'https://stream.zeno.fm/fyn8eh3h5f8uv' },
  { name: 'Relaxing Piano', url: 'https://stream.zeno.fm/0r0xa792kwzuv' },
  { name: 'Jazz Radio', url: 'https://stream.zeno.fm/0zqd8y0dd5zuv' },
];

interface TimerState {
  minutes: number;
  seconds: number;
  isActive: boolean;
  isBreak: boolean;
}

interface BgmPlayerProps {
  timerState?: TimerState;
}

const VOLUME_LEVELS = [0, 50];
const VOLUME_LABELS = ['🔇', '🔊'];

export default function BgmPlayer({ timerState }: BgmPlayerProps) {
  const [selectedStation, setSelectedStation] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = VOLUME_LEVELS[volumeLevel] / 100;
    }
  }, [volumeLevel]);

  useEffect(() => {
    const savedVolumeLevel = localStorage.getItem('moku2-volume-level');
    const savedStation = localStorage.getItem('moku2-station');

    if (savedVolumeLevel !== null) {
      const level = parseInt(savedVolumeLevel);
      setVolumeLevel(level);
    } else {
      setVolumeLevel(1);
      localStorage.setItem('moku2-volume-level', '1');
    }
    if (savedStation) setSelectedStation(parseInt(savedStation));
  }, []);

  useEffect(() => {
    localStorage.setItem('moku2-volume-level', volumeLevel.toString());
    localStorage.setItem('moku2-station', selectedStation.toString());
  }, [volumeLevel, selectedStation]);

  // タイマー連動でBGMを自動制御
  useEffect(() => {
    if (!timerState) return;

    const { isActive, minutes, seconds } = timerState;

    // タイマーが停止された場合、またはタイマーが0になった場合、BGMを停止
    if (!isActive || (minutes === 0 && seconds === 0)) {
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    // タイマーがアクティブになり、音量が0でない場合、BGMを自動再生
    if (isActive && !isPlaying && volumeLevel > 0 && audioRef.current) {
      const autoPlay = async () => {
        try {
          if (audioRef.current) {
            await audioRef.current.play();
            setIsPlaying(true);
          }
        } catch (error) {
          console.error('自動再生エラー:', error);
        }
      };
      autoPlay();
    }
  }, [timerState, isPlaying, volumeLevel]);

  const toggleVolume = () => {
    setVolumeLevel(prev => prev === 0 ? 1 : 0);
  };

  const changeStation = () => {
    const wasPlaying = isPlaying;
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const newIndex = (selectedStation + 1) % stations.length;
    setSelectedStation(newIndex);
    setIsPlaying(false);

    if (wasPlaying && audioRef.current) {
      setTimeout(() => {
        audioRef.current?.play().then(() => setIsPlaying(true));
      }, 100);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 px-4 py-2">
      <audio ref={audioRef} src={stations[selectedStation].url} />

      {/* 音量トグルボタン */}
      <button
        onClick={toggleVolume}
        className={`px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
          volumeLevel === 0
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
        }`}
        title={volumeLevel === 0 ? 'OFF (クリックでON)' : 'ON (クリックでOFF)'}
      >
        <span className="text-lg">{VOLUME_LABELS[volumeLevel]}</span>
        <span className="text-xs font-medium">BGM</span>
      </button>

      {/* チェンジボタン */}
      <button
        onClick={changeStation}
        className="px-3 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all duration-200 flex items-center gap-1.5"
        title="放送局を変更"
      >
        <span className="text-lg">⏭️</span>
        <span className="text-xs font-medium">Skip</span>
      </button>

      {/* 現在の放送局名 */}
      <div className="text-white text-sm font-medium flex-1 overflow-hidden">
        <div className="whitespace-nowrap overflow-hidden text-ellipsis">
          {stations[selectedStation].name}
        </div>
      </div>

      {/* 再生インジケーター */}
      {isPlaying && volumeLevel > 0 && (
        <div className="flex gap-1">
          <div className="w-1 h-3 bg-violet-400 rounded-full animate-pulse"></div>
          <div className="w-1 h-4 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-1 h-2 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        </div>
      )}
    </div>
  );
}
