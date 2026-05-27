import { useRef, useState, useEffect, useMemo } from 'react';
import { Play, Pause } from 'lucide-react';

interface Props {
  fileUrl: string;
  seed: string;
  isOwn: boolean;
}

const BAR_COUNT = 28;

function seededBars(seed: string): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  const bars: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    h = Math.imul(1664525, h) + 1013904223 | 0;
    bars.push(((h >>> 0) % 72) + 15);
  }
  return bars;
}

function fmt(s: number): string {
  if (!isFinite(s) || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

/** Parse duration encoded in filename: voice-30-timestamp.webm → 30 */
function parseFallbackDuration(url: string): number {
  const name = url.split('/').pop() ?? '';
  const m = name.match(/^voice-(\d+)-/);
  return m ? parseInt(m[1]) : 0;
}

export default function VoiceMessage({ fileUrl, seed, isOwn }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const seekingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const bars = useMemo(() => seededBars(seed), [seed]);
  const fallback = useMemo(() => parseFallbackDuration(fileUrl), [fileUrl]);

  // Use fallback duration immediately while waiting for real metadata
  useEffect(() => {
    if (fallback > 0) setDuration(fallback);
  }, [fallback]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      const d = audio.duration;
      if (isFinite(d) && !isNaN(d)) {
        setDuration(d);
      } else if (fallback === 0) {
        // WebM duration not embedded — seek trick
        seekingRef.current = true;
        audio.currentTime = 1e101;
      }
    };

    const onTime = () => {
      if (seekingRef.current) {
        const d = audio.duration;
        if (isFinite(d) && !isNaN(d)) {
          seekingRef.current = false;
          setDuration(d);
          audio.currentTime = 0;
        }
        return;
      }
      setCurrent(audio.currentTime);
      setProgress(audio.duration > 0 ? audio.currentTime / audio.duration : 0);
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
  }, [fallback]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    audio.currentTime = Math.max(0, Math.min(1, (x - rect.left) / rect.width)) * audio.duration;
  };

  const playedCount = Math.round(progress * BAR_COUNT);
  const displayTime = fmt(playing || current > 0 ? current : duration);

  const accent = isOwn ? 'var(--color-tg-msg-out-text)' : 'var(--color-tg-primary)';
  const muted  = isOwn ? 'var(--color-tg-msg-out-text-muted)' : 'var(--color-tg-text-secondary)';
  const btnBg  = isOwn ? 'var(--color-tg-msg-out-text)' : 'var(--color-tg-primary)';
  const btnFg  = isOwn ? 'var(--color-tg-msg-out)' : '#fff';

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 min-w-[220px] max-w-[280px]">
      <audio ref={audioRef} src={fileUrl} preload="metadata" />

      {/* Play/Pause */}
      <button
        onClick={toggle}
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-opacity hover:opacity-80 active:scale-95"
        style={{ background: btnBg, color: btnFg }}
      >
        {playing
          ? <Pause className="w-4 h-4" />
          : <Play className="w-4 h-4 translate-x-[1px]" />}
      </button>

      {/* Waveform + time */}
      <div className="flex-1 flex flex-col gap-[5px]">
        <div
          className="flex items-center gap-[2.5px] h-7 cursor-pointer"
          onClick={seek}
          onTouchEnd={seek as unknown as React.TouchEventHandler}
        >
          {bars.map((h, i) => {
            const active = i < playedCount;
            const head = playing && i === playedCount;
            return (
              <div
                key={i}
                className="rounded-full shrink-0"
                style={{
                  width: 3,
                  height: `${h}%`,
                  background: active || head ? accent : muted,
                  opacity: active || head ? 1 : 0.45,
                  transform: head && playing ? 'scaleY(1.3)' : 'scaleY(1)',
                  transition: 'transform 0.1s, opacity 0.15s',
                }}
              />
            );
          })}
        </div>
        <span className="text-[11px] tabular-nums select-none leading-none" style={{ color: muted }}>
          {displayTime}
        </span>
      </div>
    </div>
  );
}
