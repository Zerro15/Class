import "./globals.css";

import { AppShell } from "@/app/components/AppShell";

export const metadata = {
  title: "ClassFlow",
  description: "Tutor assistant MVP"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
