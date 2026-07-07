import { Logo } from "./Logo";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="animate-pulse">
        <Logo />
      </div>
      <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 progress-fill animate-[hub-fill_1s_ease-in-out_infinite_alternate]" />
      </div>
    </div>
  );
}
