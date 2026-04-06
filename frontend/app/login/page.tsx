import { AuthForm } from "@/app/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <AuthForm mode="login" />
    </div>
  );
}
