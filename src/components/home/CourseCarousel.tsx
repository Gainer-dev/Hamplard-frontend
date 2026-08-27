'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CourseCard } from '@/components/courses/CourseCard';
import { CourseCardSkeleton } from '@/components/courses/CourseCardSkeleton';
import type { Course } from '@/types';

interface CourseCarouselProps {
  /** Section heading, e.g. "Bestsellers" */
  title: string;
  /** Optional short line under the heading */
  subtitle?: string;
  /** "See all" destination — usually a pre-filtered /courses URL */
  seeAllHref: string;
  courses: Course[];
  loading?: boolean;
  skeletonCount?: number;
  emptyMessage?: string;
}

const CARD_WIDTH_CLASS = 'w-[72vw] max-w-[280px] sm:w-[264px]';
const GAP_PX = 16; // matches gap-4

export function CourseCarousel({
  title,
  subtitle,
  seeAllHref,
  courses,
  loading = false,
  skeletonCount = 4,
  emptyMessage = 'No courses to show here yet.',
}: CourseCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLDivElement>(null);

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [activeDot, setActiveDot] = useState(0);

  const itemCount = loading ? skeletonCount : courses.length;

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollPrev(el.scrollLeft > 4);
    setCanScrollNext(el.scrollLeft < maxScroll - 4);

    const step = (firstItemRef.current?.offsetWidth ?? el.clientWidth) + GAP_PX;
    if (step > 0) {
      const index = Math.round(el.scrollLeft / step);
      setActiveDot(Math.min(index, Math.max(itemCount - 1, 0)));
    }
  }, [itemCount]);

  useEffect(() => {
    updateScrollState();
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => updateScrollState();
    const onResize = () => updateScrollState();

    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [updateScrollState, courses.length, loading]);

  // Reset scroll position whenever the underlying list changes (e.g. after loading finishes)
  useEffect(() => {
    scrollerRef.current?.scrollTo({ left: 0 });
  }, [loading, courses]);

  function scrollByCard(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    const step = (firstItemRef.current?.offsetWidth ?? el.clientWidth) + GAP_PX;
    el.scrollBy({ left: step * direction, behavior: 'smooth' });
  }

  function scrollToDot(index: number) {
    const el = scrollerRef.current;
    if (!el) return;
    const step = (firstItemRef.current?.offsetWidth ?? el.clientWidth) + GAP_PX;
    el.scrollTo({ left: step * index, behavior: 'smooth' });
  }

  const showArrows = !loading && courses.length > 0 && (canScrollPrev || canScrollNext);
  const showDots = !loading && courses.length > 1;

  return (
    <section className="relative" aria-label={title}>
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="section-heading">{title}</h2>
          {subtitle && <p className="text-sm text-ink-400 mt-1">{subtitle}</p>}
        </div>
        <Link
          href={seeAllHref}
          className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-hamplard-primary hover:text-hamplard-deep transition-colors"
        >
          See all
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>

      {/* Carousel */}
      <div className="relative">
        {/* Desktop arrows */}
        {showArrows && (
          <>
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              disabled={!canScrollPrev}
              aria-label={`Scroll ${title} left`}
              className={cn(
                'hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10',
                'w-10 h-10 items-center justify-center rounded-full bg-white shadow-md border border-ink-100',
                'transition-opacity hover:bg-hamplard-lilac focus:outline-none focus:ring-2 focus:ring-hamplard-primary',
                !canScrollPrev && 'opacity-0 pointer-events-none',
              )}
            >
              <ChevronLeft className="w-5 h-5 text-hamplard-deep" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              disabled={!canScrollNext}
              aria-label={`Scroll ${title} right`}
              className={cn(
                'hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10',
                'w-10 h-10 items-center justify-center rounded-full bg-white shadow-md border border-ink-100',
                'transition-opacity hover:bg-hamplard-lilac focus:outline-none focus:ring-2 focus:ring-hamplard-primary',
                !canScrollNext && 'opacity-0 pointer-events-none',
              )}
            >
              <ChevronRight className="w-5 h-5 text-hamplard-deep" />
            </button>
          </>
        )}

        {/* Scroll row */}
        {!loading && courses.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-sm text-ink-400">{emptyMessage}</p>
          </div>
        ) : (
          <div
            ref={scrollerRef}
            className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth pb-1 -mx-1 px-1"
          >
            {loading
              ? Array.from({ length: skeletonCount }).map((_, i) => (
                  <div
                    key={i}
                    ref={i === 0 ? firstItemRef : undefined}
                    className={cn(CARD_WIDTH_CLASS, 'shrink-0 snap-start')}
                  >
                    <CourseCardSkeleton />
                  </div>
                ))
              : courses.map((course, i) => (
                  <div
                    key={course.id}
                    ref={i === 0 ? firstItemRef : undefined}
                    className={cn(CARD_WIDTH_CLASS, 'shrink-0 snap-start')}
                  >
                    <CourseCard course={course} />
                  </div>
                ))}
          </div>
        )}

        {/* Mobile dots */}
        {showDots && (
          <div className="flex md:hidden items-center justify-center gap-1.5 mt-4" role="tablist" aria-label={`${title} slides`}>
            {courses.map((course, i) => (
              <button
                key={course.id}
                type="button"
                role="tab"
                aria-selected={i === activeDot}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => scrollToDot(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-200',
                  i === activeDot ? 'w-5 bg-hamplard-primary' : 'w-1.5 bg-ink-200',
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}