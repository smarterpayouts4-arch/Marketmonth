type VoiceSpectrumProps = {
  labelLeft: string;
  labelRight: string;
  value: number;
};

export function VoiceSpectrum({
  labelLeft,
  labelRight,
  value,
}: VoiceSpectrumProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-text-muted">
        <span>{labelLeft}</span>
        <span>{labelRight}</span>
      </div>
      <div className="relative h-2 rounded-full bg-muted">
        <div
          className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-primary bg-card shadow-soft"
          style={{ left: `calc(${value}% - 8px)` }}
        />
      </div>
    </div>
  );
}
