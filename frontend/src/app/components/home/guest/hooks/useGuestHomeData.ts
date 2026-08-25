'use client';

import { useEffect, useState } from 'react';
import { fetchHomeBatch, fetchCourses } from '../api';
import type { CourseSort } from '../api';
import type { Category, CourseItem, Instructor, PlatformStats, BlogPost } from '../types';

export function useGuestHomeData() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [selectedTab, setSelectedTab] = useState<CourseSort>('popular');
  const [, setLoadedTab] = useState<CourseSort | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingInstructors, setLoadingInstructors] = useState(false);
  const [loadingBlog, setLoadingBlog] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoadingCategories(true);
      setLoadingInstructors(true);
      setLoadingBlog(true);

      fetchHomeBatch().then(({ categories, stats, instructors, blogPosts }) => {
        if (cancelled) return;
        setCategories(categories);
        setStats(stats);
        setInstructors(instructors);
        setBlogPosts(blogPosts);
        setLoadingData(false);
        setLoadingCategories(false);
        setLoadingInstructors(false);
        setLoadingBlog(false);
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoadingCourses(true);
      fetchCourses(selectedTab).then((nextCourses) => {
        if (cancelled) return;
        setCourses(nextCourses);
        setLoadedTab(selectedTab);
        setLoadingCourses(false);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [selectedTab]);

  return {
    categories,
    courses,
    instructors,
    blogPosts,
    stats,
    selectedTab,
    setSelectedTab,
    loadingData,
    loadingCourses,
    loadingCategories,
    loadingInstructors,
    loadingBlog,
  };
}
