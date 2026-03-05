import "./globals.css";

import { AppShell } from "./components/AppShell";
import { ToastProvider } from "./components/ToastProvider";

export const metadata = {
  title: "ClassFlow",
  description: "Tutor assistant MVP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
