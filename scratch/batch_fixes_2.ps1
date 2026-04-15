$files = @(
    "src/app/api/auth/callback/[provider]/route.ts",
    "src/app/api/auth/login/route.ts",
    "src/app/api/auth/magic-link/verify/route.ts",
    "src/app/api/auth/register/route.ts",
    "src/app/api/evaluate-test/route.ts",
    "src/app/api/generate-test/route.ts"
)

foreach ($file in $files) {
    if (Test-Path -LiteralPath $file) {
        $content = Get-Content -LiteralPath $file -Raw
        
        # auth fixes: location (string | null) passed to AuthService (string | undefined)
        $content = $content -replace 'location,', 'location: location || undefined,'
        
        # rateLimit fixes: 'evaluate_test' (string) passed to rateLimit (number)
        # Actually in api-utils, applyRateLimit(req: NextRequest, limit: number, windowMs = 900000)
        # Callers: await rateLimit(req, 20, 'evaluate_test')
        $content = $content -replace 'rateLimit\(req, 20, ''\w+''\)', 'rateLimit(req, 20)'

        Set-Content -LiteralPath $file -Value $content -Encoding utf8
        Write-Host "Fixed $file"
    }
}
