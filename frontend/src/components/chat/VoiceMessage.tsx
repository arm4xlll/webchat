import { useRef, useState, useEffect, useMemo } from 'react';
import { Play, Pause } from 'lucide-react';

interface Props {
  fileUrl: string;
  /** Seed for generating consistent waveform bars */
  seed: string;
  isOwn: boolean;
}

const BAR_COUNT = 30;

/** Deterministic pseudo-random from string seed */
function seededBars(seed: string): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    h = Math.imul(1664525, h) + 1013904223 | 0;
    const v = ((h >>> 0) % 80) + 20; // 20..99
    bars.push(v);
  }
  return bars;
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function VoiceMessage({ fileUrl, seed, isOwn }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const bars = useMemo(() => seededBars(seed), [seed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTime = () => {
      setCurrent(audio.currentTime);
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    };
    const onEnded = () => { setPlaying(false); setProgress(0); setCurrent(0); };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * audio.duration;
  };

  const playedCount = Math.round(progress * BAR_COUNT);

  return (
    <div className="flex items-center gap-2.5 px-1 py-0.5 min-w-[200px] max-w-[260px]">
      <audio ref={audioRef} src={fileUrl} preload="metadata" />

      {/* Play/pause button */}
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer"
        style={{
          background: isOwn
            ? 'var(--color-tg-msg-out-text)'
            : 'var(--color-tg-primary)',
          color: isOwn
            ? 'var(--color-tg-msg-out)'
            : 'var(--color-tg-bg)',
        }}
      >
        {playing
          ? <Pause className="w-4 h-4" />
          : <Play className="w-4 h-4 translate-x-[1px]" />}
      </button>

      {/* Waveform + time */}
      <div className="flex-1 flex flex-col gap-1.5">
        {/* Waveform bars */}
        <div
          className="flex items-center gap-[2px] h-8 cursor-pointer"
          onClick={handleBarClick}
        >
          {bars.map((h, i) => {
            const played = i < playedCount;
            const animating = playing && i === playedCount;
            return (
              <div
                key={i}
                className={`rounded-full transition-all duration-75 ${animating ? 'animate-pulse' : ''}`}
                style={{
                  width: 3,
                  height: `${h}%`,
                  background: played || animating
                    ? (isOwn ? 'var(--color-tg-msg-out-text)' : 'var(--color-tg-primary)')
                    : (isOwn ? 'var(--color-tg-msg-out-text-muted)' : 'var(--color-tg-text-secondary)'),
                  opacity: played || animating ? 1 : 0.55,
                  flexShrink: 0,
                }}
              />
            );
          })}
        </div>

        {/* Duration */}
        <span
          className="text-[11px] leading-none select-none tabular-nums"
          style={{ color: isOwn ? 'var(--color-tg-msg-out-text-muted)' : 'var(--color-tg-text-secondary)' }}
        >
          {formatDuration(playing || current > 0 ? current : duration)}
        </span>
      </div>
    </div>
  );
}
