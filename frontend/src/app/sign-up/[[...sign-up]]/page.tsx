import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#0a0a0a]">
      <SignUp />
    </div>
  );
}
