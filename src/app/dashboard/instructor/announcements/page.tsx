'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BellRing, Loader2, Send } from 'lucide-react';
import { announcementsApi, usersApi } from '@/lib/api/services';
import { formatDate } from '@/lib/utils';
import type { Announcement, Course } from '@/types';

const announcementSchema = z.object({
  courseId: z.string().min(1, 'Choose a course to announce to.'),
  subject: z.string().min(3, 'Subject must be at least 3 characters.'),
  message: z.string().min(10, 'Message must be at least 10 characters.'),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

export default function InstructorAnnouncementsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      courseId: '',
      subject: '',
      message: '',
    },
  });

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === watch('courseId')) ?? null,
    [courses, watch],
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const stats = await usersApi.getInstructorStats();
        setCourses(stats?.courses ?? []);
        if (stats?.courses?.[0]?.id) {
          reset((prev) => ({ ...prev, courseId: stats.courses[0].id }));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingCourses(false);
      }

      try {
        const response = await announcementsApi.list();
        setAnnouncements(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingAnnouncements(false);
      }
    };

    loadData();
  }, [reset]);

  const onSubmit = async (values: AnnouncementFormValues) => {
    const course = courses.find((item) => item.id === values.courseId);
    if (!course) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const created = await announcementsApi.create({
        courseId: course.id,
        courseTitle: course.title,
        subject: values.subject,
        message: values.message,
        deliveryCount: Math.max(course.totalEnrollments, 1),
      });

      setAnnouncements((prev) => [created, ...prev]);
      reset({ courseId: values.courseId, subject: '', message: '' });
      setFeedback('Announcement sent to your enrolled students.');
    } catch (error) {
      console.error(error);
      setFeedback('We could not send this announcement right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="section-heading">Instructor announcements</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            Share course updates with enrolled students as in-app notifications.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <BellRing className="h-4 w-4 text-saffron-600" />
            <h2 className="font-display text-lg font-semibold text-ink-900">Compose update</h2>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Course</label>
              {loadingCourses ? (
                <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3 py-3 text-sm text-ink-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading your courses...
                </div>
              ) : (
                <>
                  <select
                    {...register('courseId')}
                    className="w-full rounded-xl border border-ink-200 bg-white px-3 py-3 text-sm text-ink-900 outline-none ring-0"
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                  {errors.courseId && (
                    <p className="mt-1 text-xs text-red-600">{errors.courseId.message}</p>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Subject</label>
              <input
                {...register('subject')}
                placeholder="Lesson reminder, schedule change, new resource..."
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-3 text-sm text-ink-900 outline-none"
              />
              {errors.subject && (
                <p className="mt-1 text-xs text-red-600">{errors.subject.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Message</label>
              <textarea
                {...register('message')}
                rows={7}
                placeholder="Write a clear announcement for your students..."
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-3 text-sm text-ink-900 outline-none"
              />
              {errors.message && (
                <p className="mt-1 text-xs text-red-600">{errors.message.message}</p>
              )}
            </div>

            {feedback && (
              <div className="rounded-xl border border-saffron-200 bg-saffron-50 px-3 py-2 text-sm text-saffron-700">
                {feedback}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-ink-500">
                {selectedCourse ? `Sending to ${selectedCourse.title}` : 'Select a course to continue.'}
              </p>
              <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {submitting ? 'Sending...' : 'Send announcement'}
              </button>
            </div>
          </form>
        </div>

        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink-900">Recent announcements</h2>
            <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-medium text-ink-600">
              {announcements.length} total
            </span>
          </div>

          {loadingAnnouncements ? (
            <div className="flex items-center justify-center py-10 text-sm text-ink-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading announcements...
            </div>
          ) : announcements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-500">
              No announcements yet. Send your first update above.
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="rounded-2xl border border-ink-100 bg-ink-50 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-900">{announcement.subject}</p>
                    <span className="rounded-full bg-saffron-100 px-2.5 py-1 text-[11px] font-medium text-saffron-700">
                      {announcement.deliveryCount} sent
                    </span>
                  </div>
                  <p className="mb-2 text-xs text-ink-500">{announcement.courseTitle}</p>
                  <p className="text-sm leading-6 text-ink-700">{announcement.message}</p>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-ink-400">
                    {formatDate(announcement.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
