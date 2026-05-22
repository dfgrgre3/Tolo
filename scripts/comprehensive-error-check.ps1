param(
  [switch]$Fix
)

$ErrorActionPreference = "Continue"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$DocsDir = Join-Path $Root "docs"
$ReportPath = Join-Path $DocsDir "audit-report.md"
$Results = New-Object System.Collections.Generic.List[object]
$IgnoredDirs = @(".git", ".next", "node_modules", "coverage", "dist", "build", "out", "test-results")

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
    [string]$Command,
    [string]$WorkingDirectory = $Root,
    [switch]$WarnOnly
  )

  $started = Get-Date
  Push-Location $WorkingDirectory
  try {
    $env:GOCACHE = if ($env:GOCACHE) { $env:GOCACHE } else { "C:\tmp\go-build-cache-thanawy" }
    $output = & powershell.exe -NoProfile -ExecutionPolicy Bypass -Command $Command 2>&1 | Out-String
    $exitCode = $LASTEXITCODE
  } finally {
    Pop-Location
  }

  $status = if ($exitCode -eq 0) { "pass" } elseif ($WarnOnly) { "warn" } else { "fail" }
  $Results.Add([pscustomobject]@{
      Name       = $Name
      Command    = $Command
      Status     = $status
      DurationMs = [int]((Get-Date) - $started).TotalMilliseconds
      Summary    = if ($status -eq "pass") { "Completed successfully." } else { "Command exited with a non-zero status." }
      Output     = Clip-Text $output
    })
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

  $files = Get-ChildItem -Path $Root -Recurse -File -Force |
    Where-Object {
      $relative = Resolve-Path -Relative $_.FullName
      $parts = $relative -split "[\\/]"
      -not ($parts | Where-Object { $IgnoredDirs -contains $_ }) -and
      $_.Length -le 1MB -and
      $_.Name -notin @("package-lock.json", "pnpm-lock.yaml", "tsconfig.tsbuildinfo")
    }

  foreach ($file in $files) {
    $relative = [System.IO.Path]::GetRelativePath($Root, $file.FullName)
    $lines = @()
    try {
      $lines = Get-Content -LiteralPath $file.FullName -ErrorAction Stop
    } catch {
      continue
    }

    for ($i = 0; $i -lt $lines.Count; $i++) {
      $line = [string]$lines[$i]
      if ($relative -eq ".env.example" -and $line.Contains("your-")) {
        continue
      }
      foreach ($pattern in $patterns) {
        if ($line -match $pattern.Pattern) {
          $findings.Add("${relative}:$($i + 1) - $($pattern.Name)")
          break
        }
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

if ($Fix) {
  Invoke-AuditCommand -Name "ESLint auto-fix" -Command "npx eslint . --fix" -WarnOnly
  Invoke-AuditCommand -Name "Go formatting" -Command "gofmt -w ." -WorkingDirectory (Join-Path $Root "backend") -WarnOnly
}

Invoke-AuditCommand -Name "TypeScript type-check" -Command "npx tsc --noEmit"
Invoke-AuditCommand -Name "ESLint" -Command "npx eslint ." -WarnOnly
Invoke-AuditCommand -Name "Frontend tests" -Command "npm test"
Invoke-AuditCommand -Name "Next production build" -Command "npm run build"
Invoke-AuditCommand -Name "Go tests" -Command "go test ./..." -WorkingDirectory (Join-Path $Root "backend")
Invoke-SecretScan
Invoke-AuditCommand -Name "npm dependency audit" -Command "npm audit --audit-level=moderate --omit=dev" -WarnOnly

if (-not (Test-Path $DocsDir)) {
  New-Item -ItemType Directory -Path $DocsDir | Out-Null
}

$passed = @($Results | Where-Object { $_.Status -eq "pass" }).Count
$warned = @($Results | Where-Object { $_.Status -eq "warn" }).Count
$failed = @($Results | Where-Object { $_.Status -eq "fail" }).Count

$report = New-Object System.Text.StringBuilder
[void]$report.AppendLine("# Thanawy Project Audit Report")
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

Write-Host "Audit report written to docs\audit-report.md"
Write-Host "Passed: $passed"
Write-Host "Warnings: $warned"
Write-Host "Failed: $failed"

if ($failed -gt 0) {
  exit 1
}
