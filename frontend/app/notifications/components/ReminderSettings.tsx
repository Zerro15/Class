'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/app/components/ToastProvider';
import { notifications } from '@/lib/api';
import { LessonItem } from '@/lib/api-types';

interface ReminderSettingsProps {
  lessons: LessonItem[];
}

export function ReminderSettings({ lessons }: ReminderSettingsProps) {
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [reminderType, setReminderType] = useState<'email' | 'sms' | 'push'>('email');
  const [delayHours, setDelayHours] = useState<number>(24);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleScheduleReminder = async () => {
    if (!selectedLessonId) return;

    setLoading(true);
    try {
      await notifications.scheduleReminder(Number(selectedLessonId), {
        reminder_type: reminderType,
        delay_hours: delayHours,
      });
      
      showToast('Напоминание запланировано', 'success');
      setSelectedLessonId('');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Не удалось запланировать напоминание',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Настройка напоминаний</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Выберите занятие</label>
            <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Выберите занятие" />
              </SelectTrigger>
              <SelectContent>
                {lessons.map((lesson) => (
                  <SelectItem key={lesson.id} value={String(lesson.id)}>
                    {lesson.student_name || `Ученик #${lesson.student_id}`} - {new Date(lesson.start_at).toLocaleDateString('ru-RU')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Тип уведомления</label>
            <Select value={reminderType} onValueChange={(value: any) => setReminderType(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="push">Push-уведомление</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Задержка (часы)</label>
            <input
              type="number"
              min="1"
              max="72"
              value={delayHours}
              onChange={(e) => setDelayHours(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <Button 
          onClick={handleScheduleReminder} 
          disabled={!selectedLessonId || loading}
          className="w-full"
        >
          {loading ? 'Планируется...' : 'Запланировать напоминание'}
        </Button>
      </CardContent>
    </Card>
  );
}
