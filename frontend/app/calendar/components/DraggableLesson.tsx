"use client";

import type { LessonItem } from "@/lib/api";
import { useDraggable } from "@dnd-kit/core";
import type { CSS } from "@dnd-kit/utilities";
import { useMemo } from "react";

interface DraggableLessonProps {
  lesson: LessonItem;
  studentName: string;
  style?: React.CSSProperties;
  onClick: () => void;
}

export function DraggableLesson({ lesson, studentName, style, onClick }: DraggableLessonProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `lesson-${lesson.id}`,
    data: {
      type: 'lesson',
      lesson,
    },
  });

  const transformStyle = useMemo(() => {
    return {
      transform: CSS.Translate.toString(transform),
      zIndex: isDragging ? 1000 : undefined,
      opacity: isDragging ? 0.8 : undefined,
    };
  }, [transform, isDragging]);

  const statusColors = {
    scheduled: "bg-sky-100 border-sky-200 text-sky-700 hover:bg-sky-200",
    done: "bg-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200",
    canceled: "bg-rose-100 border-rose-200 text-rose-700 hover:bg-rose-200",
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...transformStyle }}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`
        group relative cursor-grab rounded-xl border px-3 py-2 text-xs transition-all
        ${statusColors[lesson.status]}
        ${isDragging ? 'cursor-grabbing shadow-lg' : 'hover:shadow-md'}
      `}
    >
      <div className="font-medium truncate">{studentName}</div>
      <div className="text-xs opacity-75 truncate">
        {lesson.topic || `Урок ${lesson.duration_min}м`}
      </div>
      {lesson.price > 0 && (
        <div className="absolute top-1 right-2 text-xs font-medium">
          {lesson.price}₽
        </div>
      )}

      {/* Drag indicator */}
      <div className="absolute left-1 top-1/2 h-3 w-1 -translate-y-1/2 rounded-full bg-current opacity-0 group-hover:opacity-30 transition-opacity" />
    </div>
  );
}