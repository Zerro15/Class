"use client";

import type { LessonItem } from "@/lib/api";
import { useDroppable } from "@dnd-kit/core";
import { useMemo } from "react";

interface DropZoneProps {
  day: Date;
  minute: number;
  children: React.ReactNode;
  onDrop: (lesson: LessonItem, newDateTime: Date) => void;
  className?: string;
}

export function DropZone({ day, minute, children, onDrop, className = "" }: DropZoneProps) {
  const {
    isOver,
    setNodeRef,
  } = useDroppable({
    id: `dropzone-${day.toISOString()}-${minute}`,
    data: {
      type: 'time-slot',
      day,
      minute,
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // This will be handled by @dnd-kit's onDragEnd
  };

  return (
    <div
      ref={setNodeRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        relative min-h-[40px] transition-colors
        ${isOver ? 'bg-sky-50 ring-2 ring-sky-200 ring-inset' : ''}
        ${className}
      `}
    >
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-lg border-2 border-dashed border-sky-400 bg-sky-50/50 px-3 py-1 text-xs text-sky-600">
            Отпустите для переноса
          </div>
        </div>
      )}
      {children}
    </div>
  );
}