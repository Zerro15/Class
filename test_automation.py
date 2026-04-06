#!/usr/bin/env python3
"""
Автоматический тестовый скрипт для ClassFlow MVP
Проверяет: регистрацию, логин, добавление ученика, создание занятия и уведомлений
"""

import requests
import time
import json
from typing import Dict, Any

BASE_URL = "http://localhost:9000"
FRONTEND_URL = "http://localhost:5000"

class ClassFlowTester:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.student_id = None
        self.lesson_id = None
        
    def log(self, message: str):
        print(f"[{len(self.test_results) + 1}] {message}")
        
    @property
    def headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}
    
    def run_all_tests(self):
        self.test_results = []
        
        # Тест 1: Проверка API доступен
        self.check_api_health()
        
        # Тест 2: Регистрация пользователя
        self.register_user()
        
        # Тест 3: Логин пользователя  
        self.login_user()
        
        # Тест 4: Создание ученика
        self.create_student()
        
        # Текст 5: Создание занятия
        self.create_lesson()
        
        # Тест 6: Планирование уведомления
        self.schedule_notification()
        
        # Отчет по тестам
        self.print_report()
    
    def check_api_health(self):
        """Проверка доступности API"""
        try:
            response = requests.get(f"{BASE_URL}/api/v1/health")
            if response.status_code == 200:
                self.log("✅ API health check passed")
            else:
                self.log(f"❌ API health check failed: {response.status_code}")
        except Exception as e:
            self.log(f"❌ API health check error: {e}")
    
    def register_user(self):
        """Регистрация нового пользователя"""
        email = f"test_{int(time.time())}@example.com"
        password = "testpassword123"
        
        try:
            response = requests.post(
                f"{BASE_URL}/api/v1/auth/register",
                json={"email": email, "password": password}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.log(f"✅ User registered successfully: {email}")
                
                # Получаем информацию о пользователе
                me_response = requests.get(
                    f"{BASE_URL}/api/v1/auth/me",
                    headers=self.headers
                )
                if me_response.status_code == 200:
                    user_data = me_response.json()
                    self.user_id = user_data.get("id")
                    self.log(f"✅ Got user ID: {self.user_id}")
            else:
                self.log(f"❌ Registration failed: {response.text}")
                
        except Exception as e:
            self.log(f"❌ Registration error: {e}")
    
    def login_user(self):
        """Логин пользователя"""
        if not self.token:
            # Попробуем логин, если у нас ещё нет токена
            try:
                response = requests.post(
                    f"{BASE_URL}/api/v1/auth/login",
                    json={"email": "test@example.com", "password": "password"}
                )
                if response.status_code == 200:
                    self.token = response.json().get("access_token")
                    self.log("✅ Login successful")
                else:
                    self.log("⚠️  Using registration token (login not needed)")
            except:
                self.log("⚠️  Using registration token (login not needed)")
        else:
            self.log("✅ Already logged in")
    
    def create_student(self):
        """Создание тестового ученика"""
        try:
            response = requests.post(
                f"{BASE_URL}/api/v1/students",
                json={
                    "name": "Test Student",
                    "notes": "Automated test student"
                },
                headers=self.headers
            )
            
            if response.status_code == 201:
                student_data = response.json()
                self.student_id = student_data.get("id")
                self.log(f"✅ Student created: ID={self.student_id}")
            else:
                self.log(f"❌ Student creation failed: {response.text}")
                
        except Exception as e:
            self.log(f"❌ Student creation error: {e}")
    
    def create_lesson(self):
        """Создание тестового занятия"""
        if not self.student_id:
            self.log("⚠️  Skipping lesson creation - no student available")
            return
            
        try:
            # Создаем занятие на завтра
            tomorrow = (time.time() + 86400) * 1000  # Unix timestamp в миллисекундах
            lesson_time = time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(tomorrow / 1000))
            
            response = requests.post(
                f"{BASE_URL}/api/v1/lessons",
                json={
                    "student_id": self.student_id,
                    "start_at": lesson_time,
                    "duration_min": 60,
                    "status": "scheduled",
                    "topic": "Automated test lesson",
                    "price": 1000
                },
                headers=self.headers
            )
            
            if response.status_code == 201:
                lesson_data = response.json()
                self.lesson_id = lesson_data.get("id")
                self.log(f"✅ Lesson created: ID={self.lesson_id}")
            else:
                self.log(f"❌ Lesson creation failed: {response.text}")
                
        except Exception as e:
            self.log(f"❌ Lesson creation error: {e}")
    
    def schedule_notification(self):
        """Планирование уведомления о занятии"""
        if not self.lesson_id:
            self.log("⚠️  Skipping notification scheduling - no lesson available")
            return
            
        try:
            response = requests.post(
                f"{BASE_URL}/api/v1/notifications/{self.lesson_id}/schedule-reminder",
                params={
                    "reminder_type": "email",
                    "delay_hours": 24
                },
                headers=self.headers
            )
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ Notification scheduled: {result}")
            else:
                self.log(f"❌ Notification scheduling failed: {response.text}")
                
        except Exception as e:
            self.log(f"❌ Notification scheduling error: {e}")
    
    def print_report(self):
        """Вывод отчета по тестам"""
        print("\n" + "="*60)
        print("ТЕСТОВЫЙ ОТЧЕТ КЛАССФЛОВА MVP")
        print("="*60)
        
        passed = sum(1 for r in self.test_results if "✅" in r)
        total = len(self.test_results)
        
        print(f"\n📊 Результаты: {passed}/{total} тестов пройдено")
        print(f"🎯 Успешность: {(passed/total)*100:.1f}%")
        
        if self.token:
            print(f"\n🔑 Токен авторизации: {self.token[:50]}...")
        if self.user_id:
            print(f"👤 ID пользователя: {self.user_id}")
        if self.student_id:
            print(f"🧑‍🎓 ID ученика: {self.student_id}")
        if self.lesson_id:
            print(f"📅 ID занятия: {self.lesson_id}")
        
        print(f"\n🌐 Доступные URL:")
        print(f"   Frontend: http://localhost:5000")
        print(f"   API Docs: http://localhost:9000/docs")
        
        if passed == total:
            print(f"\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Система работает корректно.")
        else:
            print(f"\n⚠️  Некоторые тесты не прошли. Проверьте логи выше.")

if __name__ == "__main__":
    tester = ClassFlowTester()
    tester.run_all_tests()
