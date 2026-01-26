import { useCallback, useRef } from 'react';

// 学校チャイム音（キンコンカンコン）をWeb Audio APIで生成
export function useChime() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const playNote = useCallback((
    ctx: AudioContext,
    frequency: number,
    startTime: number,
    duration: number
  ) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startTime);

    // エンベロープ設定（鐘のような音）
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }, []);

  const playChime = useCallback(() => {
    const ctx = getAudioContext();

    // AudioContextが中断状態の場合は再開
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const noteDuration = 0.5;
    const noteGap = 0.5;

    // キンコンカンコンの音階（G5, E5, F5, C5 をベースにアレンジ）
    // 実際の学校チャイムに近い音程
    const notes = [
      { freq: 783.99, time: 0 },           // G5 (キン)
      { freq: 659.25, time: noteGap },     // E5 (コン)
      { freq: 698.46, time: noteGap * 2 }, // F5 (カン)
      { freq: 523.25, time: noteGap * 3 }, // C5 (コン)
    ];

    notes.forEach(note => {
      playNote(ctx, note.freq, now + note.time, noteDuration);
    });
  }, [getAudioContext, playNote]);

  return { playChime };
}
