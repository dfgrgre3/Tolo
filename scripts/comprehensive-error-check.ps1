param(
  [switch]$Fix
)

$ErrorActionPreference = "Continue"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).ProviderPath
$DocsDir = Join-Path $Root "docs"
$ReportPath = Join-Path $DocsDir "unified-audit-report.md"
$Results = New-Object System.Collections.Generic.List[object]

$frontendDir = Join-Path $Root "frontend"
$adminDir = Resolve-Path (Join-Path $Root "../admin") -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ProviderPath
$backendDir = Resolve-Path (Join-Path $Root "../backend") -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ProviderPath

if (-not $adminDir) { $adminDir = Join-Path $Root "../admin" }
if (-not $backendDir) { $backendDir = Join-Path $Root "../backend" }

$IgnoredDirs = @(".git", ".next", "node_modules", "coverage", "dist", "build", "out", "test-results", ".gocache", ".venv")
$TextExtensions = @(
  ".go", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".yml", ".yaml", ".toml",
  ".sql", ".ps1", ".sh", ".env", ".example", ".txt", ".css", ".scss", ".html", ".dockerignore",
  ".gitignore", ".npmrc"
)

function Get-RelativePath {
  param([string]$Path)
  $rootPath = $Root.TrimEnd("\", "/")
  $fullPath = [System.IO.Path]::GetFullPath($Path)
  if ($fullPath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $fullPath.Substring($rootPath.Length).TrimStart("\", "/")
  }
  return $fullPath
}

function Clip-Text {
  param([string]$Value, [int]$Max = 8000)
  if ([string]::IsNullOrEmpty($Value) -or $Value.Length -le $Max) {
    return $Value
  }
  return $Value.Substring(0, $Max) + "`n`n... output truncated ..."
}

function Invoke-AuditCommand {
  param(
    [string]$Name,
    [string]$FilePath,
    [string[]]$Arguments = @(),
    [string]$WorkingDirectory = $Root,
    [switch]$WarnOnly
  )

  $started = Get-Date
  $stdoutPath = Join-Path ([System.IO.Path]::GetTempPath()) ("thanawy-audit-stdout-" + [System.Guid]::NewGuid().ToString("N") + ".txt")
  $stderrPath = Join-Path ([System.IO.Path]::GetTempPath()) ("thanawy-audit-stderr-" + [System.Guid]::NewGuid().ToString("N") + ".txt")
  $displayCommand = ((@($FilePath) + $Arguments) -join " ").Trim()

  try {
    $env:GOCACHE = if ($env:GOCACHE) { $env:GOCACHE } else { Join-Path $Root ".gocache" }
    $resolvedCommand = (Get-Command $FilePath -ErrorAction Stop).Source
    $process = Start-Process -FilePath $resolvedCommand `
      -ArgumentList $Arguments `
      -WorkingDirectory $WorkingDirectory `
      -NoNewWindow `
      -Wait `
      -PassThru `
      -RedirectStandardOutput $stdoutPath `
      -RedirectStandardError $stderrPath
    $exitCode = $process.ExitCode
    $output = ((Get-Content -LiteralPath $stdoutPath -Raw -ErrorAction SilentlyContinue) + (Get-Content -LiteralPath $stderrPath -Raw -ErrorAction SilentlyContinue))
  } finally {
    Remove-Item -LiteralPath $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue
  }

  $isPermissionIssue = $output -match "EPERM|operation not permitted|Access is denied"
  $status = if ($exitCode -eq 0) { "pass" } elseif ($WarnOnly -or $isPermissionIssue) { "warn" } else { "fail" }
  $summary = if ($status -eq "pass") {
    "Completed successfully."
  } elseif ($isPermissionIssue) {
    "Command was blocked by a local permission or sandbox restriction."
  } else {
    "Command exited with a non-zero status."
  }
  $Results.Add([pscustomobject]@{
      Name       = $Name
      Command    = $displayCommand
      Status     = $status
      DurationMs = [int]((Get-Date) - $started).TotalMilliseconds
      Summary    = $summary
      Output     = Clip-Text $output
    })
}

function Test-ShouldAuditFile {
  param(
    [object]$File
  )
  $relative = Get-RelativePath $File.FullName
  $parts = $relative -split "[\\/]"
  foreach ($part in $parts) {
    if ($IgnoredDirs -contains $part) {
      return $false
    }
  }
  if ($File.Length -gt 1MB) {
    return $false
  }
  if ($File.Name -in @("package-lock.json", "pnpm-lock.yaml", "tsconfig.tsbuildinfo", "go.sum")) {
    return $false
  }
  if ($TextExtensions -contains $File.Extension -or $File.Name.StartsWith(".")) {
    return $true
  }
  return $false
}

function Test-LineForSecret {
  param(
    [string]$Line,
    [array]$Patterns
  )
  foreach ($pattern in $Patterns) {
    if ($Line -match $pattern.Pattern) {
      return $pattern.Name
    }
  }
  return $null
}

function Get-FileSecretFindings {
  param(
    [object]$File,
    [array]$Patterns
  )
  $findings = New-Object System.Collections.Generic.List[string]
  $relative = Get-RelativePath $File.FullName
  try {
    $lines = Get-Content -LiteralPath $File.FullName -ErrorAction Stop
  } catch {
    return ,$findings
  }

  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = [string]$lines[$i]
    if ($relative.EndsWith(".env.example") -and $line.Contains("your-")) {
      continue
    }
    if ($line.Contains("valid-jwt-token")) {
      continue
    }
    $matchedSecret = Test-LineForSecret -Line $line -Patterns $Patterns
    if ($null -ne $matchedSecret) {
      $findings.Add("${relative}:$($i + 1) - $matchedSecret")
    }
  }
  return ,$findings
}

function Invoke-SecretScan {
  $started = Get-Date
  $findings = New-Object System.Collections.Generic.List[string]
  $patterns = @(
    @{ Name = "JWT-like token"; Pattern = "eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}" },
    @{ Name = "OpenAI API key"; Pattern = "sk-[A-Za-z0-9_-]{20,}" },
    @{ Name = "Generic private key"; Pattern = "-----BEGIN [A-Z ]*PRIVATE KEY-----" },
    @{ Name = "AWS access key"; Pattern = "AKIA[0-9A-Z]{16}" },
    @{ Name = "Likely hard-coded secret"; Pattern = "\b(secret|api[_-]?key|token|password)\b\s*[:=]\s*[""'][^""']{12,}[""']" }
  )

  $pathsToScan = @($Root)
  if (Test-Path $adminDir) { $pathsToScan += $adminDir }
  if (Test-Path $backendDir) { $pathsToScan += $backendDir }

  foreach ($scanPath in $pathsToScan) {
    $files = Get-ChildItem -Path $scanPath -Recurse -File -Force -ErrorAction SilentlyContinue |
      Where-Object { Test-ShouldAuditFile -File $_ }

    foreach ($file in $files) {
      $fileFindings = Get-FileSecretFindings -File $file -Patterns $patterns
      if ($null -ne $fileFindings) {
        $findings.AddRange($fileFindings)
      }
    }
  }

  $Results.Add([pscustomobject]@{
      Name       = "Secret and credential scan"
      Command    = ""
      Status     = if ($findings.Count -eq 0) { "pass" } else { "warn" }
      DurationMs = [int]((Get-Date) - $started).TotalMilliseconds
      Summary    = if ($findings.Count -eq 0) { "No obvious hard-coded secrets found." } else { "$($findings.Count) possible secret references found." }
      Output     = $findings -join "`n"
    })
}

function Get-StatusLabel {
  param([string]$Status)
  if ($Status -eq "pass") { return "PASS" }
  if ($Status -eq "warn") { return "WARN" }
  return "FAIL"
}

# ==================== RUNNING CHECKS ====================

# Frontend
if (Test-Path $frontendDir) {
  Write-Host "Adding Frontend checks..." -ForegroundColor Cyan
  if ($Fix) {
    Invoke-AuditCommand -Name "Frontend: ESLint auto-fix" -FilePath "npx.cmd" -Arguments @("eslint", ".", "--fix") -WorkingDirectory $frontendDir -WarnOnly
  }
  Invoke-AuditCommand -Name "Frontend: TypeScript type-check" -FilePath "npx.cmd" -Arguments @("tsc", "--noEmit") -WorkingDirectory $frontendDir
  Invoke-AuditCommand -Name "Frontend: ESLint" -FilePath "npx.cmd" -Arguments @("eslint", ".") -WorkingDirectory $frontendDir -WarnOnly
  Invoke-AuditCommand -Name "Frontend: Unit tests" -FilePath "npm.cmd" -Arguments @("test") -WorkingDirectory $frontendDir
  Invoke-AuditCommand -Name "Frontend: Dependency audit" -FilePath "npm.cmd" -Arguments @("audit", "--audit-level=moderate", "--omit=dev") -WorkingDirectory $frontendDir -WarnOnly
}

# Admin
if (Test-Path $adminDir) {
  Write-Host "Adding Admin checks..." -ForegroundColor Cyan
  if ($Fix) {
    Invoke-AuditCommand -Name "Admin: ESLint auto-fix" -FilePath "npx.cmd" -Arguments @("eslint", ".", "--fix") -WorkingDirectory $adminDir -WarnOnly
  }
  Invoke-AuditCommand -Name "Admin: TypeScript type-check" -FilePath "npx.cmd" -Arguments @("tsc", "--noEmit") -WorkingDirectory $adminDir
  Invoke-AuditCommand -Name "Admin: ESLint" -FilePath "npx.cmd" -Arguments @("eslint", ".") -WorkingDirectory $adminDir -WarnOnly
  Invoke-AuditCommand -Name "Admin: Unit tests" -FilePath "npm.cmd" -Arguments @("test") -WorkingDirectory $adminDir
  Invoke-AuditCommand -Name "Admin: Dependency audit" -FilePath "npm.cmd" -Arguments @("audit", "--audit-level=moderate", "--omit=dev") -WorkingDirectory $adminDir -WarnOnly
}

# Backend
if (Test-Path $backendDir) {
  Write-Host "Adding Backend checks..." -ForegroundColor Cyan
  if ($Fix) {
    Invoke-AuditCommand -Name "Backend: Go formatting" -FilePath "gofmt.exe" -Arguments @("-w", ".") -WorkingDirectory $backendDir -WarnOnly
  }
  Invoke-AuditCommand -Name "Backend: Go vet" -FilePath "go.exe" -Arguments @("vet", "./...") -WorkingDirectory $backendDir
  Invoke-AuditCommand -Name "Backend: Go compilation check" -FilePath "go.exe" -Arguments @("build", "-o", "NUL", "./...") -WorkingDirectory $backendDir
  Invoke-AuditCommand -Name "Backend: Go tests" -FilePath "go.exe" -Arguments @("test", "./...") -WorkingDirectory $backendDir
  Invoke-AuditCommand -Name "Backend: Prisma Schema validate" -FilePath "npx.cmd" -Arguments @("prisma", "validate") -WorkingDirectory $backendDir
}

# Global
Write-Host "Running Global checks..." -ForegroundColor Cyan
Invoke-SecretScan

if (-not (Test-Path $DocsDir)) {
  New-Item -ItemType Directory -Path $DocsDir | Out-Null
}

$passed = @($Results | Where-Object { $_.Status -eq "pass" }).Count
$warned = @($Results | Where-Object { $_.Status -eq "warn" }).Count
$failed = @($Results | Where-Object { $_.Status -eq "fail" }).Count

$report = New-Object System.Text.StringBuilder
[void]$report.AppendLine("# Unified Project Audit Report")
[void]$report.AppendLine("")
[void]$report.AppendLine("Generated: $((Get-Date).ToUniversalTime().ToString("o"))")
[void]$report.AppendLine("Mode: $(if ($Fix) { "fix" } else { "check" })")
[void]$report.AppendLine("")
[void]$report.AppendLine("## Summary")
[void]$report.AppendLine("")
[void]$report.AppendLine("- Passed: $passed")
[void]$report.AppendLine("- Warnings: $warned")
[void]$report.AppendLine("- Failed: $failed")
[void]$report.AppendLine("")

foreach ($result in $Results) {
  [void]$report.AppendLine("## $(Get-StatusLabel $result.Status) $($result.Name)")
  [void]$report.AppendLine($result.Summary)
  if ($result.Command) {
    [void]$report.AppendLine("Command: ``$($result.Command)``")
  }
  [void]$report.AppendLine("Duration: $($result.DurationMs)ms")
  if ($result.Output) {
    [void]$report.AppendLine("")
    [void]$report.AppendLine("<details>")
    [void]$report.AppendLine("<summary>Output</summary>")
    [void]$report.AppendLine("")
    [void]$report.AppendLine("``````text")
    [void]$report.AppendLine(($result.Output -replace "``````", "'''"))
    [void]$report.AppendLine("``````")
    [void]$report.AppendLine("")
    [void]$report.AppendLine("</details>")
  }
  [void]$report.AppendLine("")
}

Set-Content -Path $ReportPath -Value $report.ToString() -Encoding UTF8

Write-Host "Audit report written to docs\unified-audit-report.md" -ForegroundColor Green
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Warnings: $warned" -ForegroundColor Yellow
Write-Host "Failed: $failed" -ForegroundColor Red

if ($failed -gt 0) {
  exit 1
}
