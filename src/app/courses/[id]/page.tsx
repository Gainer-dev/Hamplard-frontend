import type { Metadata } from 'next';
import Link from 'next/link';
import { coursesApi } from '@/lib/api/services';
import { formatUsdc, courseTotalMins } from '@/lib/utils';
import type { Course } from '@/types';

const DEFAULT_OG_IMAGE = '/hamplard-og.svg';

interface Props {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const defaultTitle = 'Hamplard Course';
  const defaultDescription =
    'Explore Hamplard practical online courses with step-by-step learning and blockchain certification.';
  const url = `https://hamplard.app/courses/${params.id}`;

  try {
    const course = await coursesApi.get(params.id);
    const title = course?.title ? `${course.title} | Hamplard` : defaultTitle;
    const description =
      course?.description ||
      `${course.title ?? 'A Hamplard course'} with practical learning and verified certification.`;
    const image = course?.thumbnailUrl ?? DEFAULT_OG_IMAGE;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        siteName: 'Hamplard',
        type: 'article',
        images: [{ url: image, alt: title }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
      },
    };
  } catch {
    return {
      title: defaultTitle,
      description: defaultDescription,
      openGraph: {
        title: defaultTitle,
        description: defaultDescription,
        url,
        siteName: 'Hamplard',
        type: 'article',
        images: [{ url: DEFAULT_OG_IMAGE, alt: defaultTitle }],
      },
      twitter: {
        card: 'summary_large_image',
        title: defaultTitle,
        description: defaultDescription,
        images: [DEFAULT_OG_IMAGE],
      },
    };
  }
}

export default async function CoursePage({ params }: Props) {
  let course: Course | null = null;
  let error = false;

  try {
    course = await coursesApi.get(params.id);
  } catch {
    error = true;
  }

  if (!course || error) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl text-center">
          <p className="text-sm font-medium text-saffron-600 mb-3">Course not found</p>
          <h1 className="font-display text-3xl font-bold text-ink-900 mb-4">This course is unavailable</h1>
          <p className="text-ink-500 mb-6">
            The course you are looking for could not be loaded. Please return to the homepage.
          </p>
          <Link href="/" className="btn-primary inline-flex px-6 py-3">
            Back to homepage
          </Link>
        </div>
      </div>
    );
  }

  const totalMinutes = courseTotalMins(course.totalDuration ?? 0);
  const lessons = course.modules?.flatMap((module) => module.lessons).length ?? 0;

  return (
    <div className="min-h-screen bg-ink-50 px-5 py-16">
      <div className="mx-auto max-w-6xl space-y-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-900 transition-colors">
          ← Back to Hamplard
        </Link>

        <div className="grid gap-10 lg:grid-cols-[1.7fr_0.9fr]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-saffron-100 to-saffron-200 aspect-video">
              {course.thumbnailUrl ? (
                <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-6xl">🎓</div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 text-sm text-ink-500">
                <span className="rounded-full border border-ink-200 bg-white px-3 py-1.5 font-medium text-ink-600">{course.category}</span>
                <span className="rounded-full border border-ink-200 bg-white px-3 py-1.5 font-medium text-ink-600">{course.level}</span>
                <span className="rounded-full border border-ink-200 bg-white px-3 py-1.5 font-medium text-ink-600">{course.language}</span>
              </div>
              <h1 className="font-display text-4xl font-bold text-ink-900">{course.title}</h1>
              <p className="text-lg leading-relaxed text-ink-500">{course.description ?? 'A practical Hamplard course with verified lessons and certification.'}</p>
            </div>
          </div>

          <aside className="space-y-6 rounded-3xl border border-ink-100 bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-400">Course details</p>
              <div className="text-sm text-ink-600">
                <p><span className="font-medium text-ink-900">Price:</span> {formatUsdc(course.price)} USDC</p>
                <p><span className="font-medium text-ink-900">Lessons:</span> {lessons}</p>
                <p><span className="font-medium text-ink-900">Duration:</span> {totalMinutes} min</p>
                <p><span className="font-medium text-ink-900">Instructor:</span> {course.instructor?.name ?? 'Hamplard Instructor'}</p>
              </div>
            </div>
            <Link href="/auth/login" className="btn-primary w-full text-center px-5 py-3">
              Sign in to enroll
            </Link>
          </aside>
        </div>
      </div>
    </>
  );
}
