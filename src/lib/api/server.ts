import type { Course } from '@/types';

/**
 * Server-side reads used by `generateMetadata` and the sitemap.
 *
 * The browser client in `./client.ts` is axios-based and attaches a localStorage
 * token, neither of which works during SSR. These helpers use plain `fetch` so
 * Next can cache and de-duplicate them across a render pass, and they resolve to
 * null/[] on any failure — metadata must never be the reason a page 500s.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

/** Revalidate window for SEO reads, in seconds. */
const REVALIDATE = 3600;

export async function getCourseForMetadata(id: string): Promise<Course | null> {
  try {
    const res = await fetch(`${API_URL}/courses/${encodeURIComponent(id)}`, {
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return (body?.data as Course) ?? null;
  } catch {
    return null;
  }
}

/** Published courses for the sitemap. Paginated payloads are `data.data` + `data.meta`. */
export async function getCoursesForSitemap(limit = 200): Promise<Course[]> {
  try {
    const res = await fetch(`${API_URL}/courses?limit=${limit}`, {
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return [];
    const body = await res.json();
    const courses = body?.data?.data;
    return Array.isArray(courses) ? (courses as Course[]) : [];
  } catch {
    return [];
  }
}
