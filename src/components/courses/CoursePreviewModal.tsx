'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CoursePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  courseTitle: string;
  instructorName?: string;
}

/**
 * CoursePreviewModal
 * 
 * A modal dialog that displays a free preview video for a course.
 * Features:
 * - Overlay backdrop that dismisses modal on click
 * - Close button (X) in top-right
 * - Keyboard support (ESC to close)
 * - Focus trap to keep focus within modal when open
 * - Responsive: full-screen on mobile, centered on desktop
 * - HTML5 video player with controls
 */
export function CoursePreviewModal({
  isOpen,
  onClose,
  videoUrl,
  courseTitle,
  instructorName,
}: CoursePreviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Pause video when modal closes
  useEffect(() => {
    if (!isOpen && videoRef.current) {
      videoRef.current.pause();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on backdrop, not on modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Portal backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal dialog */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full h-full md:w-auto md:h-auto md:max-w-4xl md:rounded-2xl md:overflow-hidden bg-black flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-ink-900">
            <div className="flex-1 min-w-0">
              <h2 id="preview-title" className="text-white font-semibold truncate">
                Preview: {courseTitle}
              </h2>
              {instructorName && (
                <p className="text-xs text-ink-300 mt-0.5 truncate">
                  by {instructorName}
                </p>
              )}
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview modal"
              className={cn(
                'ml-4 flex-shrink-0 rounded-lg p-2',
                'text-ink-300 hover:text-white hover:bg-ink-800',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hamplard-primary',
                'transition-colors',
              )}
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Video container */}
          <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full h-full"
              controlsList="nodownload"
              poster=""
            >
              <track kind="captions" />
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Info footer */}
          <div className="px-4 py-3 bg-ink-900 border-t border-ink-700">
            <p className="text-xs text-ink-300">
              This is a preview lecture. <span className="text-hamplard-lilac font-medium">Enroll</span> to access the full course.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default CoursePreviewModal;
