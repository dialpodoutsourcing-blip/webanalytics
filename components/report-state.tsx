export function ReportState({ kind, title, message }: { kind: "empty" | "error" | "loading" | "stale"; title: string; message: string }) {
  return <div role="status" className={`state state-${kind}`}><strong>{title}</strong><span>{message}</span></div>;
}
