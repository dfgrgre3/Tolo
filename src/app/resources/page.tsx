"use client";

import { useEffect, useState } from "react";

type Resource = { id: string; subject: string; title: string; url: string; free: boolean; type: string; source?: string | null };

export default function ResourcesPage() {
	const [resources, setResources] = useState<Resource[]>([]);

	useEffect(() => {
		fetch("/api/resources").then((r) => r.json()).then(setResources);
	}, []);

	const groups = resources.reduce<Record<string, Resource[]>>((acc, r) => {
		(acc[r.subject] ||= []).push(r);
		return acc;
	}, {});

	return (
		<div className="px-4">
			<section className="mx-auto max-w-7xl py-8 space-y-6">
				<h1 className="text-2xl md:text-3xl font-bold">الموارد الدراسية الحقيقية</h1>
				<div className="grid gap-4 md:grid-cols-2">
					{Object.entries(groups).map(([subject, list]) => (
						<div key={subject} className="rounded-lg border p-4">
							<h2 className="font-semibold mb-2">{subject}</h2>
							<ul className="text-sm text-primary list-disc pr-5">
								{list.map((l) => (
									<li key={l.id}>
										<a href={l.url} target="_blank" rel="noreferrer" className="hover:underline">{l.title}</a>
										<span className="ml-2 text-muted-foreground">{l.free ? "مجانًا" : "مدفوع"}</span>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</section>
		</div>
	);
} 