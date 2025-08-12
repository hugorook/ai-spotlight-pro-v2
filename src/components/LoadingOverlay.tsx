import { PropsWithChildren } from "react";

type LoadingOverlayProps = PropsWithChildren<{
  loading: boolean;
  label?: string;
}>;

export default function LoadingOverlay({ loading, label = "Loading...", children }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {loading && (
        <div className="absolute inset-0 z-50 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-in fade-in-0">
          <div className="h-7 w-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      )}
    </div>
  );
}

