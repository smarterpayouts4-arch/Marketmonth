type ContentErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function ContentErrorState({ message, onRetry }: ContentErrorStateProps) {
  return (
    <div
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      role="alert"
      aria-live="assertive"
    >
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-sm font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
