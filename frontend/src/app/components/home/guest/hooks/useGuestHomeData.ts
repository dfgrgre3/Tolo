'use client';

import { useEffect, useState } from 'react';
import { fetchBlogPosts, fetchCategories, fetchCourses, fetchInstructors, fetchStats } from '../api';
import type { CourseSort } from '../api';
import type { BlogPost, Category, CourseItem, Instructor, PlatformStats } from '../types';

export function useGuestHomeData() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [selectedTab, setSelectedTab] = useState<CourseSort>('popular');
  const [loadedTab, setLoadedTab] = useState<CourseSort | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingInstructors, setLoadingInstructors] = useState(true);
  const [loadingBlog, setLoadingBlog] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchCategories(), fetchStats(), fetchInstructors(), fetchBlogPosts()]).then(
      ([nextCategories, nextStats, nextInstructors, nextPosts]) => {
        if (cancelled) return;
        setCategories(nextCategories);
        setStats(nextStats);
        setInstructors(nextInstructors);
        setBlogPosts(nextPosts);
        setLoadingCategories(false);
        setLoadingInstructors(false);
        setLoadingBlog(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchCourses(selectedTab).then((nextCourses) => {
      if (cancelled) return;
      setCourses(nextCourses);
      setLoadedTab(selectedTab);
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
    loadingCategories,
    loadingInstructors,
    loadingBlog,
    loadingCourses: loadedTab !== selectedTab,
  };
}
