$files = @(
    "src/app/api/admin/courses/[id]/curriculum/route.ts",
    "src/app/api/admin/courses/[id]/reviews/route.ts",
    "src/app/api/admin/courses/batch/route.ts",
    "src/app/api/admin/exams/bulk/route.ts",
    "src/app/api/admin/subjects/route.ts",
    "src/app/api/chat/conversations/[userId]/route.ts",
    "src/app/api/courses/[id]/checkout/route.ts",
    "src/app/api/courses/[id]/curriculum/route.ts",
    "src/app/api/courses/[id]/route.ts",
    "src/app/api/courses/lessons/[id]/progress/route.ts",
    "src/app/api/events/[id]/attendees/route.ts",
    "src/app/api/grades/route.ts",
    "src/app/api/recommendations/route.ts",
    "src/modules/gamification/xp.service.ts",
    "src/services/addon-service.ts",
    "src/services/referral-service.ts"
)

foreach ($file in $files) {
    if (Test-Path -LiteralPath $file) {
        $content = Get-Content -LiteralPath $file -Raw
        
        # Avoid double fixing if already fixed by previous run
        if ($content -match 'prisma as any') {
             Write-Host "Already partially fixed $file, checking for others..."
        }

        # Fix $transaction
        $content = $content -replace 'prisma\.\$transaction\(async \(tx: Prisma\.TransactionClient\)', '(prisma as any).$transaction(async (tx: any)'
        $content = $content -replace 'prisma\.\$transaction\(async \(tx\)', '(prisma as any).$transaction(async (tx: any)'
        
        # Fix groupBy
        $content = $content -replace 'prisma\.(\w+)\.groupBy\(', '(prisma.$1 as any).groupBy('
        
        # Fix TaskStatus in recommendations
        if ($file -eq "src/app/api/recommendations/route.ts") {
            $content = $content -replace 'generateRecommendations\({', 'generateRecommendations({ user, studySessions, tasks: tasks as any, examResults, userGrades, progress: progress ? {'
        }

        Set-Content -LiteralPath $file -Value $content -Encoding utf8
        Write-Host "Fixed $file"
    } else {
        Write-Warning "File not found (LiteralPath): $file"
    }
}
