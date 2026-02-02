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

type BgmMode = 'radio' | 'youtube';

// YouTubeのURLからビデオIDまたはプレイリストIDを抽出
function parseYouTubeUrl(url: string): { type: 'video' | 'playlist'; id: string } | null {
  try {
    const urlObj = new URL(url);

    // プレイリストURL: youtube.com/playlist?list=xxx
    const listId = urlObj.searchParams.get('list');
    if (listId && urlObj.pathname.includes('playlist')) {
      return { type: 'playlist', id: listId };
    }

    // 動画URL（プレイリスト付き）: youtube.com/watch?v=xxx&list=xxx
    if (listId) {
      return { type: 'playlist', id: listId };
    }

    // 通常の動画URL: youtube.com/watch?v=xxx
    const videoId = urlObj.searchParams.get('v');
    if (videoId) {
      return { type: 'video', id: videoId };
    }

    // 短縮URL: youtu.be/xxx
    if (urlObj.hostname === 'youtu.be') {
      const id = urlObj.pathname.slice(1);
      if (id) return { type: 'video', id };
    }

    return null;
  } catch {
    return null;
  }
}

export default function BgmPlayer({ timerState }: BgmPlayerProps) {
  const [mode, setMode] = useState<BgmMode>('radio');
  const [selectedStation, setSelectedStation] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(1);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeInput, setYoutubeInput] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  // 初期読み込み
  useEffect(() => {
    const savedVolumeLevel = localStorage.getItem('moku2-volume-level');
    const savedStation = localStorage.getItem('moku2-station');
    const savedMode = localStorage.getItem('moku2-bgm-mode');
    const savedYoutubeUrl = localStorage.getItem('moku2-youtube-url');

    if (savedVolumeLevel !== null) {
      setVolumeLevel(parseInt(savedVolumeLevel));
    }
    if (savedStation) setSelectedStation(parseInt(savedStation));
    if (savedMode === 'youtube') setMode('youtube');
    if (savedYoutubeUrl) {
      setYoutubeUrl(savedYoutubeUrl);
      setYoutubeInput(savedYoutubeUrl);
    }
  }, []);

  // 設定保存
  useEffect(() => {
    localStorage.setItem('moku2-volume-level', volumeLevel.toString());
    localStorage.setItem('moku2-station', selectedStation.toString());
    localStorage.setItem('moku2-bgm-mode', mode);
    if (youtubeUrl) {
      localStorage.setItem('moku2-youtube-url', youtubeUrl);
    }
  }, [volumeLevel, selectedStation, mode, youtubeUrl]);

  // 音量設定
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volumeLevel === 0 ? 0 : 0.5;
    }
  }, [volumeLevel]);

  // タイマー連動（ラジオモードのみ）
  useEffect(() => {
    if (!timerState || mode !== 'radio') return;

    const { isActive, minutes, seconds } = timerState;

    if (!isActive || (minutes === 0 && seconds === 0)) {
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    if (isActive && !isPlaying && volumeLevel > 0 && audioRef.current) {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('自動再生エラー:', err));
    }
  }, [timerState, isPlaying, volumeLevel, mode]);

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

  const handleYoutubeSubmit = () => {
    if (youtubeInput.trim()) {
      setYoutubeUrl(youtubeInput.trim());
    }
  };

  const parsed = youtubeUrl ? parseYouTubeUrl(youtubeUrl) : null;
  const youtubeEmbedUrl = parsed
    ? parsed.type === 'playlist'
      ? `https://www.youtube.com/embed/videoseries?list=${parsed.id}&autoplay=1`
      : `https://www.youtube.com/embed/${parsed.id}?autoplay=1`
    : null;

  return (
    <div className="space-y-3">
      {/* モード切り替えタブ */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('radio')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            mode === 'radio'
              ? 'bg-violet-500/30 text-violet-300 border border-violet-500/50'
              : 'bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          📻 ラジオ
        </button>
        <button
          onClick={() => setMode('youtube')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            mode === 'youtube'
              ? 'bg-red-500/30 text-red-300 border border-red-500/50'
              : 'bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          ▶️ YouTube
        </button>
      </div>

      {mode === 'radio' ? (
        /* ラジオモード */
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 px-4 py-2">
          <audio ref={audioRef} src={stations[selectedStation].url} />

          <button
            onClick={toggleVolume}
            className={`px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
              volumeLevel === 0
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
            title={volumeLevel === 0 ? 'OFF' : 'ON'}
          >
            <span className="text-lg">{volumeLevel === 0 ? '🔇' : '🔊'}</span>
          </button>

          <button
            onClick={changeStation}
            className="px-3 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
            title="放送局を変更"
          >
            ⏭️
          </button>

          <div className="text-white text-sm font-medium flex-1 overflow-hidden">
            <div className="whitespace-nowrap overflow-hidden text-ellipsis">
              {stations[selectedStation].name}
            </div>
          </div>

          {isPlaying && volumeLevel > 0 && (
            <div className="flex gap-1">
              <div className="w-1 h-3 bg-violet-400 rounded-full animate-pulse"></div>
              <div className="w-1 h-4 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 h-2 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            </div>
          )}
        </div>
      ) : (
        /* YouTubeモード */
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={youtubeInput}
              onChange={(e) => setYoutubeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleYoutubeSubmit()}
              placeholder="YouTubeのURLを入力..."
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-400 focus:outline-none focus:border-red-500/50"
            />
            <button
              onClick={handleYoutubeSubmit}
              className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-all"
            >
              設定
            </button>
          </div>

          {youtubeEmbedUrl && (
            <div className="aspect-video rounded-lg overflow-hidden bg-black/50">
              <iframe
                src={youtubeEmbedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {!youtubeEmbedUrl && youtubeUrl && (
            <div className="text-red-400 text-sm text-center py-2">
              無効なURLです
            </div>
          )}

          {!youtubeUrl && (
            <div className="text-slate-400 text-sm text-center py-4">
              YouTubeの動画またはプレイリストのURLを入力してください
            </div>
          )}
        </div>
      )}
    </div>
  );
}
