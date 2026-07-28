export function ControlsTab({
  showPaths,
  onShowPathsChange,
  onResetEvaluation,
  onResetLabHistory,
  historyPath,
  productPath,
}: {
  showPaths: boolean;
  onShowPathsChange: (v: boolean) => void;
  onResetEvaluation: () => void;
  onResetLabHistory: () => void;
  historyPath?: string;
  productPath?: string;
}) {
  return (
    <div className="space-y-4" data-testid="inspector-controls">
      <p className="text-xs text-text-secondary">
        Reset Evaluation clears scores/selection only. Reset Lab History clears
        only Idea Lab history. Product topic history is untouched.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onResetEvaluation}
          className="rounded-xl border border-border px-3 py-2 text-xs font-medium"
        >
          Reset Evaluation
        </button>
        <button
          type="button"
          onClick={onResetLabHistory}
          className="rounded-xl border border-warning px-3 py-2 text-xs font-medium"
        >
          Reset Lab History
        </button>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={showPaths}
          onChange={(e) => onShowPathsChange(e.target.checked)}
        />
        Show technical paths
      </label>
      {showPaths ? (
        <div className="space-y-1 font-mono text-[10px] text-text-muted break-all">
          <div>Lab: {historyPath}</div>
          <div>Product: {productPath}</div>
        </div>
      ) : null}
    </div>
  );
}
