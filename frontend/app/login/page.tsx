import { AuthForm } from "@/app/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-150px)] items-center justify-center bg-slate-50 px-4 py-8">
      <AuthForm mode="login" />
    </div>
  );
}
