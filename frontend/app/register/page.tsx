import { redirect } from "next/navigation";

export default function RegisterPage() {
  // Комментарий наставника: сохраняем маршрут /register рабочим, но направляем на единый auth-экран,
  // чтобы пользователь видел одинаковый интерфейс регистрации в одном месте.
  redirect("/login?mode=register");
}
