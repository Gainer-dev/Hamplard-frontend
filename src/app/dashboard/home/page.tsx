'use client';

import React, { useEffect, useState } from 'react';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import { OnboardingModal } from '@/components/dashboard/OnboardingModal';
import { BottomTabs } from '@/components/layout/BottomTabs';
import {
  QuickStatsSkeleton,
  ContinueLearningSkeletonList,
  CourseGridSkeleton,
} from '@/components/skeletons';
import { enrollmentsApi, usersApi } from '@/lib/api/services';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import type { Enrollment } from '@/types';

export default function DashboardHomePage() {
  const { user }                              = useAuthStore();
  const [enrollments, setEnrollments]         = useState<Enrollment[]>([]);
  const [loadingStats, setLoadingStats]       = useState(true);
  const [loadingCourses, setLoadingCourses]   = useState(true);
  const [userName, setUserName]               = useState(user?.name ?? 'Student');

  // Fetch current user name (may not be in store yet on first load)
  useEffect(() => {
    if (user?.name) {
      setUserName(user.name);
      return;
    }
    usersApi.getMe()
      .then((u) => setUserName(u.name ?? 'Student'))
      .catch(() => {});
  }, [user]);

  // Fetch enrollments for stats + continue-learning
  useEffect(() => {
    setLoadingStats(true);
    setLoadingCourses(true);

    enrollmentsApi
      .getMy(1, 20)
      .then((res) => setEnrollments(res.data))
      .catch(() => {})
      .finally(() => {
        setLoadingStats(false);
        setLoadingCourses(false);
      });
  }, []);

  // Derive quick-stats from real data
  const stats = [
    { label: 'Courses',      value: enrollments.length },
    { label: 'Completed',    value: enrollments.filter((e) => e.status === 'COMPLETED').length },
    { label: 'Certificates', value: enrollments.filter((e) => e.progressPercent === 100).length },
  ];

  // Derive in-progress items for ContinueLearning
  const inProgress = enrollments
    .filter((e) => e.progressPercent < 100)
    .slice(0, 4)
    .map((e) => ({
      id:       e.courseId,
      title:    e.course?.title ?? 'Untitled',
      progress: e.progressPercent,
      href:     `/dashboard/courses/${e.courseId}/learn`,
    }));

  return (
    <div>
      {/* Onboarding Modal */}
      <OnboardingModal />

      {/* Stats section — skeleton until data arrives */}
      {loadingStats ? (
        <div className="mb-6">
          <div className="h-5 w-28 rounded bg-hamplard-lilac animate-pulse mb-4" />
          <QuickStatsSkeleton />
        </div>
      ) : null}

      {/* Continue learning section — skeleton until courses load */}
      {loadingCourses ? (
        <div className="mb-6">
          <div className="h-5 w-40 rounded bg-hamplard-lilac animate-pulse mb-4" />
          <ContinueLearningSkeletonList count={2} />
        </div>
      ) : null}

      {/* Course grid skeleton — shown while loading */}
      {loadingCourses ? (
        <div className="mb-6">
          <div className="h-5 w-44 rounded bg-hamplard-lilac animate-pulse mb-4" />
          <CourseGridSkeleton count={3} columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />
        </div>
      ) : null}

      {/* Real dashboard — rendered once data is ready */}
      {!loadingStats && !loadingCourses && (
        <StudentDashboard
          name={userName}
          stats={stats}
          inProgress={inProgress}
        />
      )}

      <BottomTabs />
    </div>
  );
}
