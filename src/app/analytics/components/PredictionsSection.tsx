'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/card";
import { Progress } from "@/shared/progress";
import { Zap, Target, Calendar, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

type PredictionsData = {
	period: string;
	predictedScore: number;
	confidence: number;
	milestones: Array<{ date: string; goal: string; status: string }>;
	recommendations: string[];
};

interface PredictionsSectionProps {
	predictions: PredictionsData[];
}

export default function PredictionsSection({ predictions }: PredictionsSectionProps) {
	if (!predictions || predictions.length === 0) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="text-center py-8 text-muted-foreground">
						<Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
						<p>لا توجد تنبؤات متاحة حالياً</p>
						<p className="text-sm mt-2">سيتم إنشاء تنبؤات بناءً على أدائك</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{predictions.map((prediction, index) => (
				<Card key={index} className="border-2 border-primary/20 shadow-lg">
					<CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
						<CardTitle className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Zap className="h-5 w-5 text-primary" />
								{prediction.period}
							</div>
							<div className="flex items-center gap-2">
								<span className="text-sm font-medium text-muted-foreground">الثقة:</span>
								<span className="text-lg font-bold text-primary">
									{prediction.confidence}%
								</span>
							</div>
						</CardTitle>
					</CardHeader>
					<CardContent className="p-6 space-y-6">
						{/* Predicted Score */}
						<div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800">
							<div className="flex items-center justify-between mb-2">
								<p className="text-sm font-medium text-muted-foreground">الدرجة المتوقعة</p>
								<TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
							</div>
							<p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
								{prediction.predictedScore}%
							</p>
							<Progress value={prediction.predictedScore} className="h-2" />
						</div>

						{/* Milestones */}
						{prediction.milestones && prediction.milestones.length > 0 && (
							<div>
								<h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
									<Target className="h-5 w-5 text-primary" />
									الأهداف والمهام
								</h3>
								<div className="space-y-3">
									{prediction.milestones.map((milestone, mIndex) => (
										<div
											key={mIndex}
											className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
										>
											<div className="p-2 rounded-full bg-primary/10 mt-0.5">
												<Calendar className="h-4 w-4 text-primary" />
											</div>
											<div className="flex-1">
												<div className="flex items-center justify-between mb-1">
													<p className="font-medium">{milestone.goal}</p>
													{milestone.status === 'completed' ? (
														<CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
													) : (
														<Clock className="h-4 w-4 text-muted-foreground" />
													)}
												</div>
												<p className="text-sm text-muted-foreground">
													{format(new Date(milestone.date), 'EEEE، d MMMM yyyy', { locale: ar })}
												</p>
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Recommendations */}
						{prediction.recommendations && prediction.recommendations.length > 0 && (
							<div>
								<h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
									<TrendingUp className="h-5 w-5 text-primary" />
									التوصيات
								</h3>
								<div className="space-y-2">
									{prediction.recommendations.map((recommendation, rIndex) => (
										<div
											key={rIndex}
											className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
										>
											<div className="p-1 rounded-full bg-green-100 dark:bg-green-900/30 mt-0.5">
												<CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
											</div>
											<p className="text-sm flex-1">{recommendation}</p>
										</div>
									))}
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			))}
		</div>
	);
}

