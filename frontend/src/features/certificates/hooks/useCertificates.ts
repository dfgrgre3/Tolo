"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { MyCourse } from "../types";

export function useCertificates() {
  const { user, isLoading: authLoading, fetchWithAuth } = useAuth();
  const router = useRouter();

  const [courses, setCourses] = useState<MyCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?redirect=/certificates");
      return;
    }

    const fetchMyCourses = async () => {
      try {
        setLoading(true);
        const res = await fetchWithAuth("/api/my-courses");
        if (res.ok) {
          const data = await res.json();
          setCourses(data.data?.courses || data.courses || []);
        }
      } catch (error) {
        console.error("Failed to fetch courses for certificates page:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyCourses();
  }, [authLoading, user, fetchWithAuth, router]);

  // Filter courses that have certificates
  const certificateCourses = useMemo(() => {
    return courses.filter((c) => c.certificate !== null);
  }, [courses]);

  // Search filtered certificates
  const filteredCertificates = useMemo(() => {
    if (!searchTerm.trim()) return certificateCourses;
    const term = searchTerm.toLowerCase();
    return certificateCourses.filter(
      (c) =>
        c.title.toLowerCase().includes(term) ||
        c.instructor.toLowerCase().includes(term)
    );
  }, [certificateCourses, searchTerm]);

  return {
    loading,
    searchTerm,
    setSearchTerm,
    filteredCertificates,
    certificateCourses,
  };
}
