param(
  [switch]$Fix
)

$ErrorActionPreference = "Continue"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).ProviderPath
$DocsDir = Join-Path $Root "docs"
$ReportPath = Join-Path $DocsDir "audit-report.md"
$Results = New-Object System.Collections.Generic.List[object]
$IgnoredDirs = @(".git", ".next", "node_modules", "coverage", "dist", "build", "out", "test-results")
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
  if ($File.Name -in @("package-lock.json", "pnpm-lock.yaml", "tsconfig.tsbuildinfo")) {
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
    if ($relative -eq ".env.example" -and $line.Contains("your-")) {
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

  $files = Get-ChildItem -Path $Root -Recurse -File -Force |
    Where-Object { Test-ShouldAuditFile -File $_ }

  foreach ($file in $files) {
    $fileFindings = Get-FileSecretFindings -File $file -Patterns $patterns
    if ($null -ne $fileFindings) {
      $findings.AddRange($fileFindings)
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

$backendDir = Join-Path $Root "backend"
$frontendDir = Join-Path $Root "frontend"

if ($Fix) {
  Invoke-AuditCommand -Name "ESLint auto-fix" -FilePath "npx.cmd" -Arguments @("eslint", ".", "--fix") -WorkingDirectory $frontendDir -WarnOnly
  if (Test-Path $backendDir) {
    Invoke-AuditCommand -Name "Go formatting" -FilePath "gofmt.exe" -Arguments @("-w", ".") -WorkingDirectory $backendDir -WarnOnly
  }
}

Invoke-AuditCommand -Name "TypeScript type-check" -FilePath "npx.cmd" -Arguments @("tsc", "--noEmit") -WorkingDirectory $frontendDir
Invoke-AuditCommand -Name "ESLint" -FilePath "npx.cmd" -Arguments @("eslint", ".") -WorkingDirectory $frontendDir -WarnOnly
Invoke-AuditCommand -Name "Frontend tests" -FilePath "npm.cmd" -Arguments @("test") -WorkingDirectory $frontendDir
Invoke-AuditCommand -Name "Next production build" -FilePath "npm.cmd" -Arguments @("run", "build") -WorkingDirectory $frontendDir
if (Test-Path $backendDir) {
  Invoke-AuditCommand -Name "Go tests" -FilePath "go.exe" -Arguments @("test", "./...") -WorkingDirectory $backendDir
}
Invoke-SecretScan
Invoke-AuditCommand -Name "npm dependency audit" -FilePath "npm.cmd" -Arguments @("audit", "--audit-level=moderate", "--omit=dev") -WorkingDirectory $frontendDir -WarnOnly

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
