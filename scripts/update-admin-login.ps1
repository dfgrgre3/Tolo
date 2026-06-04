$file = "d:\thanawy\frontend\src\app\(auth)\admin-login\page.tsx"
$content = Get-Content $file -Raw

# Replace 1: destructure
$content = $content -replace 'const \{ login, isAuthenticated, user, isLoading: isAuthLoading \} = useAuth\(\);', 'const { adminLogin, isAuthenticated, user, isLoading: isAuthLoading } = useAuth();'

# Replace 2: the login() call
$content = $content -replace 'const result = await login\(', 'const result = await adminLogin('

# Save
$content | Set-Content -Path $file -NoNewline -Encoding UTF8
Write-Host "Updated admin-login page successfully" -ForegroundColor Green

# Verify
$new = Get-Content $file -Raw
if ($new -match 'adminLogin') {
    Write-Host "VERIFIED: adminLogin is now used" -ForegroundColor Green
} else {
    Write-Host "WARNING: adminLogin not found" -ForegroundColor Yellow
}
