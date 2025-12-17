"use client";

import React from "react";
import { WifiOff, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function OfflinePage() {
	const router = useRouter();
	const [isOnline, setIsOnline] = React.useState(false);

	React.useEffect(() => {
		// Ensure we're on the client side
		if (typeof window === "undefined" || typeof navigator === "undefined") {
			return;
		}

		// Check if online
		setIsOnline(navigator.onLine);

		// Listen for online event
		const handleOnline = () => {
			setIsOnline(true);
		};

		const handleOffline = () => {
			setIsOnline(false);
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	const handleRetry = () => {
		if (typeof window === "undefined") return;
		
		if (isOnline) {
			router.refresh();
			router.push("/");
		} else {
			// Force reload to check connection
			window.location.reload();
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-background p-4">
			<div className="max-w-md w-full text-center space-y-6">
				<div className="flex justify-center">
					<div className="relative">
						<WifiOff className="h-24 w-24 text-muted-foreground" />
						<div className="absolute inset-0 animate-ping">
							<WifiOff className="h-24 w-24 text-muted-foreground opacity-20" />
						</div>
					</div>
				</div>

				<div className="space-y-2">
					<h1 className="text-3xl font-bold text-foreground">
						أنت غير متصل بالإنترنت
					</h1>
					<p className="text-muted-foreground">
						{isOnline
							? "جارٍ التحقق من الاتصال..."
							: "يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى"}
					</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-3 justify-center">
					<Button
						onClick={handleRetry}
						variant="default"
						className="flex items-center gap-2"
					>
						<RefreshCw className={cn("h-4 w-4", !isOnline && "animate-spin")} />
						إعادة المحاولة
					</Button>
					<Button
						onClick={() => router.push("/")}
						variant="outline"
						className="flex items-center gap-2"
					>
						<Home className="h-4 w-4" />
						الصفحة الرئيسية
					</Button>
				</div>

				{isOnline && (
					<div className="pt-4 border-t border-border">
						<p className="text-sm text-muted-foreground">
							يبدو أنك متصل الآن. جارٍ إعادة التحميل...
						</p>
					</div>
				)}
			</div>
		</div>
	);
}

