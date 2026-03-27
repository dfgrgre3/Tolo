$paths = @(
  "src/app/api/ai/exam/route.ts",
  "src/app/api/forum/categories/route.ts",
  "src/app/api/healthz/route.ts",
  "src/app/api/library/categories/route.ts"
)

foreach ($path in $paths) {
    # Full path to file
    $file = Join-Path "d:/thanawy" $path
    if (Test-Path $file) {
        Write-Host "Converting $file ..."
        # Read with Default (ANSI/1256) encoding
        $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::Default)
        # Write as UTF8 No BOM
        $utf8NoBOM = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($file, $content, $utf8NoBOM)
    }
}
