import { AuthForm } from "@/app/components/AuthForm";

export default function RegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-150px)] items-center justify-center bg-slate-50 px-4 py-8">
      <AuthForm mode="register" />
    </div>
  );
}
