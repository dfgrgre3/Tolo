"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

// ─── Constants ───────────────────────────────────────────────────

const IMPERSONATE_COOKIE_NAME = "impersonate_csrf_token";
const CHECK_INTERVAL_MS = 3000;
const ADMIN_DASHBOARD_URL = "/admin";

// ─── Helpers ─────────────────────────────────────────────────────

function isImpersonating(): boolean {
	if (typeof window === "undefined") return false;
	return document.cookie
		.split(";")
		.some((item) => item.trim().startsWith(`${IMPERSONATE_COOKIE_NAME}=`));
}

// ─── Component ───────────────────────────────────────────────────

export function ImpersonationBanner() {
	const [impersonating, setImpersonating] = useState(false);
	const [isStopping, setIsStopping] = useState(false);

	// ── Poll for impersonation cookie ─────────────────────────────

	useEffect(() => {
		queueMicrotask(() => {
			setImpersonating(isImpersonating());
		});

		const interval = setInterval(() => {
			setImpersonating(isImpersonating());
		}, CHECK_INTERVAL_MS);

		return () => clearInterval(interval);
	}, []);

	// ── Stop impersonation handler ────────────────────────────────

	const handleStopImpersonating = useCallback(async () => {
		if (isStopping) return;
		setIsStopping(true);

		try {
			const response = await fetch("/api/admin/impersonate", {
				method: "DELETE",
				credentials: "include"
			});

			if (response.ok) {
				window.location.href = ADMIN_DASHBOARD_URL;
			} else {
				window.location.reload();
			}
		} catch (error) {
			logger.error("Error stopping impersonation:", error);
			window.location.reload();
		} finally {
			setIsStopping(false);
		}
	}, [isStopping]);

	// ── Early return ──────────────────────────────────────────────

	if (!impersonating) return null;

	// ── Render ────────────────────────────────────────────────────

	return (
		<div
			role="alert"
			aria-live="assertive"
			className="bg-amber-600 text-white py-2.5 px-4 text-center text-sm font-semibold flex items-center justify-center gap-3 z-50 sticky top-0 border-b border-amber-700 shadow-md"
		>
			<ShieldAlert className="h-5 w-5 text-amber-100 shrink-0" aria-hidden="true" />
			<span>أنت تقوم حالياً بتقمص حساب طالب للتجربة والمعاينة.</span>
			<Button
				variant="secondary"
				size="sm"
				disabled={isStopping}
				onClick={handleStopImpersonating}
				className="bg-white text-amber-700 hover:bg-amber-50 font-bold shrink-0"
				aria-label="إنهاء تقمص الحساب والعودة إلى لوحة التحكم"
			>
				{isStopping ? "جاري الإنهاء..." : "إنهاء التقمص والتراجع"}
			</Button>
		</div>
	);
}