"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import apiClient from "@/lib/api/api-client";
import type { Certificate } from "../types";

export function useCertificates() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?redirect=/settings/certificates");
      return;
    }

    const fetchCertificates = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get<{ certificates?: Certificate[] }>('/api/certificates');
        setCertificates(data.certificates || []);
      } catch (error) {
        console.error("Failed to fetch certificates:", error);
        setCertificates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, [authLoading, user, router]);

  // Search filtered certificates
  const filteredCertificates = useMemo(() => {
    if (!searchTerm.trim()) return certificates;
    const term = searchTerm.toLowerCase();
    return certificates.filter((c) => c.courseTitle.toLowerCase().includes(term));
  }, [certificates, searchTerm]);

  return {
    loading,
    searchTerm,
    setSearchTerm,
    filteredCertificates,
    certificates,
  };
}
