import { Lottie, ANIM } from "./Lottie";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Lottie src={ANIM.loading} className="h-40 w-40" />
    </div>
  );
}
