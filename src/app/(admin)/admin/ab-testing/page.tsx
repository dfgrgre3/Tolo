"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { Split, BarChart3, Plus } from "lucide-react";
import { ExperimentCard } from "@/components/ab-testing/experiment-card";
import { CreateExperimentDialog } from "@/components/ab-testing/create-experiment-dialog";
import { StatsCards } from "@/components/ab-testing/stats-cards";
import { FiltersBar } from "@/components/ab-testing/filters-bar";
import { EmptyState } from "@/components/ab-testing/empty-state";
import { abTestingService } from "@/services/ab-testing-service";
import { Experiment, CreateExperimentData } from "@/types/ab-testing";
import { logger } from '@/lib/logger';

export default function ABTestingPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [filteredExperiments, setFilteredExperiments] = useState<Experiment[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);

  // Load experiments on mount
  useEffect(() => {
    loadExperiments();
  }, []);

  // Apply filters whenever experiments, status filter, or search term changes
  useEffect(() => {
    let result = experiments;

    if (statusFilter !== "all") {
      result = result.filter((exp) => exp.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((exp) =>
      exp.title.toLowerCase().includes(term) ||
      exp.description.toLowerCase().includes(term) ||
      exp.createdBy.toLowerCase().includes(term)
      );
    }

    setFilteredExperiments(result);
  }, [experiments, statusFilter, searchTerm]);

  const loadExperiments = async () => {
    try {
      setLoading(true);
      const data = await abTestingService.getAllExperiments();
      setExperiments(data);
      setError(null);
    } catch (err) {
      logger.error("Error loading experiments:", err);
      setError("فشل تحميل تجارب A/B");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExperiment = async (newExpData: CreateExperimentData) => {
    try {
      const newExp = await abTestingService.createExperiment(newExpData);

      setExperiments((prev) => [newExp, ...prev]);
    } catch (err) {
      logger.error("Error creating experiment:", err);
      alert("فشل إنشاء تجربة جديدة");
    }
  };

  const toggleExperimentStatus = async (id: string, newStatus: "active" | "paused" | "completed") => {
    try {
      const updatedExp = await abTestingService.updateExperimentStatus(id, newStatus);
      setExperiments((prev) =>
      prev.map((exp) =>
      exp.id === id ? updatedExp : exp
      )
      );
    } catch (err) {
      logger.error("Error updating experiment status:", err);
      alert("فشل تحديث حالة التجربة");
    }
  };

  const declareWinner = async (id: string, winner: "A" | "B") => {
    try {
      const updatedExp = await abTestingService.declareWinner(id, winner);
      setExperiments((prev) =>
      prev.map((exp) =>
      exp.id === id ? updatedExp : exp
      )
      );
    } catch (err) {
      logger.error("Error declaring winner:", err);
      alert("فشل إعلان الفائز");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg font-medium">جاري تحميل تجارب A/B...</p>
        </div>
      </div>);

  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-6 max-w-md">
          <div className="mx-auto bg-destructive/20 dark:bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center">
            <Split className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-xl font-bold mt-4">خطأ في تحميل البيانات</h3>
          <p className="text-muted-foreground mt-2">{error}</p>
          <AdminButton
            className="mt-6"
            onClick={loadExperiments}>
            
            إعادة المحاولة
          </AdminButton>
        </div>
      </div>);

  }

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="مختبر النمو وتجارب (A/B Testing)"
        description="قارن بين نسخة واحدة من الاختبارات أو الدروس، واعرف أيهما يحقق أفضل تفاعل (Engagement) وأعلى معدلات استيعاب لدى المحاربين.">
        
        <CreateExperimentDialog 
          onCreate={handleCreateExperiment}
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        >
          <AdminButton icon={Plus} className="h-12 rounded-xl text-lg font-bold gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 shadow-[0_0_20px_rgba(20,184,166,0.3)]">
            إنشاء تجربة انقسام جديدة
          </AdminButton>
        </CreateExperimentDialog>
      </PageHeader>

      <StatsCards experiments={experiments} />

      <FiltersBar
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        onSearchChange={setSearchTerm}
        onStatusChange={setStatusFilter}
        experimentCount={filteredExperiments.length} />
      

      <h3 className="text-xl font-black flex items-center gap-2 mt-12 mb-6">
        <BarChart3 className="w-6 h-6 text-primary" />
        لوحة المختبر (Active & Past Experiments)
      </h3>

      {filteredExperiments.length === 0 ?
      <EmptyState onCreateClick={() => setShowCreateDialog(true)} /> :

      <div className="space-y-8">
          {filteredExperiments.map((exp, _idx) =>
        <ExperimentCard
          key={exp.id}
          experiment={exp}
          onToggleStatus={toggleExperimentStatus}
          onDeclareWinner={declareWinner} />

        )}
        </div>
      }
    </div>);

}
