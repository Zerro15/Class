'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/app/components/ToastProvider';
import { notifications } from '@/lib/api';
import type { LessonItem } from '@/lib/api-types';

interface LessonReminderButtonProps {
  lesson: LessonItem;
}

export function LessonReminderButton({ lesson }: LessonReminderButtonProps) {
  const [loading, setLoading] = useState(false);
  const [reminderType, setReminderType] = useState<'email' | 'sms' | 'push'>('email');
  const [delayHours, setDelayHours] = useState<number>(24);
  const { showToast } = useToast();

  const handleScheduleReminder = async () => {
    setLoading(true);
    try {
      await notifications.scheduleReminder(lesson.id, {
        reminder_type: reminderType,
        delay_hours: delayHours,
      });
      
      showToast('Напоминание запланировано', 'success');
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
    <div className="flex items-center gap-2 p-2">
      <Select value={reminderType} onValueChange={(value: any) => setReminderType(value)}>
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="email">Email</SelectItem>
          <SelectItem value="sms">SMS</SelectItem>
          <SelectItem value="push">Push</SelectItem>
        </SelectContent>
      </Select>

      <input
        type="number"
        min="1"
        max="72"
        value={delayHours}
        onChange={(e) => setDelayHours(Number(e.target.value))}
        className="h-8 w-16 rounded border px-2 text-xs focus:border-blue-500 focus:outline-none"
        placeholder="Часы"
      />

      <Button 
        onClick={handleScheduleReminder} 
        disabled={loading}
        size="sm"
        className="h-8 px-3 text-xs"
      >
        {loading ? '...' : 'Напомнить'}
      </Button>
    </div>
  );
}
