# ============================================================
# Integrate admin project into the main project
# ============================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$SRC_ADMIN = "D:\admin"
$DST_MAIN = "D:\thanawy\frontend"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Starting integration of admin into the main project" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if (-not (Test-Path $SRC_ADMIN)) {
    Write-Host "ERROR: admin folder not found at $SRC_ADMIN" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $DST_MAIN)) {
    Write-Host "ERROR: main project folder not found at $DST_MAIN" -ForegroundColor Red
    exit 1
}

# Step 1: Copy admin pages from (admin)/admin into main (admin)/admin
Write-Host "`n[1/8] Copying admin panel pages..." -ForegroundColor Yellow
$adminPagesSrc = Join-Path $SRC_ADMIN "src\app\(admin)\admin"
$adminPagesDst = Join-Path $DST_MAIN "src\app\(admin)\admin"

if (Test-Path $adminPagesSrc) {
    if (-not (Test-Path $adminPagesDst)) {
        New-Item -ItemType Directory -Path $adminPagesDst -Force | Out-Null
    }
    robocopy "$adminPagesSrc" "$adminPagesDst" /E /NFL /NDL /NJH /NJS /NP /R:3 /W:2 | Out-Null
    Write-Host "  - Admin pages copied successfully" -ForegroundColor Green
} else {
    Write-Host "  - Admin pages folder not found, skipping" -ForegroundColor DarkYellow
}

# Step 2: Copy other (admin) pages (coupons, revenue, subjects)
Write-Host "[2/8] Copying admin sub-pages..." -ForegroundColor Yellow
$otherAdminSrc = Join-Path $SRC_ADMIN "src\app\(admin)"
$otherAdminDst = Join-Path $DST_MAIN "src\app\(admin)"

if (Test-Path $otherAdminSrc) {
    Get-ChildItem -Path $otherAdminSrc -Directory | Where-Object { $_.Name -ne "admin" } | ForEach-Object {
        $srcDir = $_.FullName
        $dstDir = Join-Path $otherAdminDst $_.Name
        if (-not (Test-Path $dstDir)) {
            New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
        }
        robocopy "$srcDir" "$dstDir" /E /NFL /NDL /NJH /NJS /NP /R:3 /W:2 | Out-Null
        Write-Host "  - Copied $($_.Name)" -ForegroundColor Green
    }
}

# Step 3: Copy (admin) layout.tsx
$adminLayoutSrc = Join-Path $otherAdminSrc "layout.tsx"
$adminLayoutDst = Join-Path $otherAdminDst "layout.tsx"
if ((Test-Path $adminLayoutSrc) -and (-not (Test-Path $adminLayoutDst))) {
    Copy-Item $adminLayoutSrc $adminLayoutDst -Force
    Write-Host "  - Copied admin layout.tsx" -ForegroundColor Green
}

# Step 4: Copy admin components
Write-Host "[3/8] Copying admin components..." -ForegroundColor Yellow
$adminCompSrc = Join-Path $SRC_ADMIN "src\components\admin"
$adminCompDst = Join-Path $DST_MAIN "src\components\admin"

if (Test-Path $adminCompSrc) {
    if (-not (Test-Path $adminCompDst)) {
        New-Item -ItemType Directory -Path $adminCompDst -Force | Out-Null
    }
    robocopy "$adminCompSrc" "$adminCompDst" /E /NFL /NDL /NJH /NJS /NP /R:3 /W:2 | Out-Null
    Write-Host "  - Admin components copied" -ForegroundColor Green
}

# Step 5: Merge auth, providers, shared components
Write-Host "[4/8] Merging auth, providers, shared components..." -ForegroundColor Yellow
$adminExtraSrc = @("auth", "providers", "shared")
foreach ($folder in $adminExtraSrc) {
    $srcF = Join-Path $SRC_ADMIN "src\components\$folder"
    $dstF = Join-Path $DST_MAIN "src\components\$folder"
    if (Test-Path $srcF) {
        if (-not (Test-Path $dstF)) {
            New-Item -ItemType Directory -Path $dstF -Force | Out-Null
        }
        Get-ChildItem -Path $srcF -Recurse -File | ForEach-Object {
            $rel = $_.FullName.Substring($srcF.Length).TrimStart('\', '/')
            $target = Join-Path $dstF $rel
            $targetDir = Split-Path $target -Parent
            if (-not (Test-Path $targetDir)) {
                New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            }
            if (-not (Test-Path $target)) {
                Copy-Item $_.FullName $target -Force
            }
        }
        Write-Host "  - Merged $folder folder" -ForegroundColor Green
    }
}

# Step 6: Copy specific admin lib files
Write-Host "[5/8] Copying admin lib files..." -ForegroundColor Yellow
$libSrc = Join-Path $SRC_ADMIN "src\lib"
$libDst = Join-Path $DST_MAIN "src\lib"

$adminLibFiles = @(
    "admin-audit.ts",
    "admin-panel-route-access.ts",
    "admin-panel-roles.ts",
    "public-cache\admin-cache-paths.ts"
)

foreach ($file in $adminLibFiles) {
    $srcFile = Join-Path $libSrc $file
    $dstFile = Join-Path $libDst $file
    if (Test-Path $srcFile) {
        $dstDir = Split-Path $dstFile -Parent
        if (-not (Test-Path $dstDir)) {
            New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
        }
        Copy-Item $srcFile $dstFile -Force
        Write-Host "  - Copied lib/$file" -ForegroundColor Green
    }
}

# Step 7: Merge services folder
Write-Host "[6/8] Merging services folder..." -ForegroundColor Yellow
$srvSrc = Join-Path $SRC_ADMIN "src\services"
$srvDst = Join-Path $DST_MAIN "src\services"

if (Test-Path $srvSrc) {
    if (-not (Test-Path $srvDst)) {
        New-Item -ItemType Directory -Path $srvDst -Force | Out-Null
    }
    Get-ChildItem -Path $srvSrc -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($srvSrc.Length).TrimStart('\', '/')
        $target = Join-Path $srvDst $rel
        $targetDir = Split-Path $target -Parent
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        if (-not (Test-Path $target)) {
            Copy-Item $_.FullName $target -Force
        }
    }
    Write-Host "  - Merged services" -ForegroundColor Green
}

# Step 8: Merge hooks, contexts, types, utils
Write-Host "[7/8] Merging hooks, contexts, types, utils..." -ForegroundColor Yellow
$foldersToMerge = @("hooks", "contexts", "types", "utils")
foreach ($folder in $foldersToMerge) {
    $srcF = Join-Path $SRC_ADMIN "src\$folder"
    $dstF = Join-Path $DST_MAIN "src\$folder"
    if (Test-Path $srcF) {
        if (-not (Test-Path $dstF)) {
            New-Item -ItemType Directory -Path $dstF -Force | Out-Null
        }
        Get-ChildItem -Path $srcF -Recurse -File | ForEach-Object {
            $rel = $_.FullName.Substring($srcF.Length).TrimStart('\', '/')
            $target = Join-Path $dstF $rel
            $targetDir = Split-Path $target -Parent
            if (-not (Test-Path $targetDir)) {
                New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            }
            if (-not (Test-Path $target)) {
                Copy-Item $_.FullName $target -Force
            }
        }
        Write-Host "  - Merged $folder" -ForegroundColor Green
    }
}

# Step 9: Merge providers, messages, modules
Write-Host "[8/8] Merging providers, messages, modules..." -ForegroundColor Yellow
$extraFolders = @("providers", "messages", "modules")
foreach ($folder in $extraFolders) {
    $srcF = Join-Path $SRC_ADMIN "src\$folder"
    $dstF = Join-Path $DST_MAIN "src\$folder"
    if (Test-Path $srcF) {
        if (-not (Test-Path $dstF)) {
            New-Item -ItemType Directory -Path $dstF -Force | Out-Null
        }
        Get-ChildItem -Path $srcF -Recurse -File | ForEach-Object {
            $rel = $_.FullName.Substring($srcF.Length).TrimStart('\', '/')
            $target = Join-Path $dstF $rel
            $targetDir = Split-Path $target -Parent
            if (-not (Test-Path $targetDir)) {
                New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            }
            if (-not (Test-Path $target)) {
                Copy-Item $_.FullName $target -Force
            }
        }
        Write-Host "  - Merged $folder" -ForegroundColor Green
    }
}

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  Admin files integration completed successfully!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Resolve any code conflicts" -ForegroundColor White
Write-Host "  2. Update import paths to use @/" -ForegroundColor White
Write-Host "  3. Update proxy.ts to handle /admin routes" -ForegroundColor White
Write-Host "  4. Update layout.tsx for ClerkProvider in admin pages" -ForegroundColor White
Write-Host "  5. Test the full application" -ForegroundColor White
