import { useEffect, useState } from 'react';

interface WaveformBarProps {
  active: boolean;
  stream: MediaStream | null;
}

const BAR_COUNT = 20;

export function WaveformBar({ active, stream }: WaveformBarProps) {
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0.12));

  useEffect(() => {
    if (!active) {
      setLevels(Array(BAR_COUNT).fill(0.12));
      return;
    }

    let animationId = 0;
    let audioCtx: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;

    if (stream) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioCtx();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(dataArray);
          const next = Array.from({ length: BAR_COUNT }, (_, idx) => {
            const sample = dataArray[idx % dataArray.length] || 0;
            return Math.max(0.14, Math.min(1, sample / 180));
          });
          setLevels(next);
          animationId = requestAnimationFrame(tick);
        };
        animationId = requestAnimationFrame(tick);
      } catch {
        // fallback below if AudioContext cannot bind
      }
    }

    if (!animationId) {
      const tickFallback = () => {
        const now = Date.now() / 160;
        setLevels(
          Array.from({ length: BAR_COUNT }, (_, idx) => 0.25 + 0.45 * Math.abs(Math.sin(now + idx * 0.45)))
        );
        animationId = requestAnimationFrame(tickFallback);
      };
      animationId = requestAnimationFrame(tickFallback);
    }

    return () => {
      cancelAnimationFrame(animationId);
      try {
        source?.disconnect();
        audioCtx?.close();
      } catch {
        // ignore cleanup errors
      }
    };
  }, [active, stream]);

  return (
    <div
      className="flex items-center gap-1 h-7 px-2"
      aria-label={active ? 'Microphone recording waveform' : 'Microphone idle'}
    >
      {levels.map((level, idx) => (
        <span
          key={idx}
          className={`w-1 rounded-sm transition-transform duration-75 ${
            active ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-300 dark:bg-slate-700'
          }`}
          style={{
            height: '24px',
            transform: `scaleY(${level.toFixed(2)})`,
          }}
        />
      ))}
    </div>
  );
}
