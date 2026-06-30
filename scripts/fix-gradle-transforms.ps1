param(
  [string]$GradleHome = $(if ($env:GRADLE_USER_HOME) { $env:GRADLE_USER_HOME } else { Join-Path $env:USERPROFILE ".gradle" })
)

$transformDirs = @(
  (Join-Path $GradleHome "caches\8.14.3\transforms"),
  (Join-Path $GradleHome "caches\8.14\transforms")
)

$fixed = 0
foreach ($base in $transformDirs) {
  if (-not (Test-Path $base)) { continue }

  Get-ChildItem -Path $base -Directory | Where-Object { $_.Name -match "-" } | ForEach-Object {
    $src = $_.FullName
    $newName = ($_.Name -split "-", 2)[0]
    $dst = Join-Path $base $newName
    if ($src -eq $dst) { return }

    if (Test-Path $dst) {
      Remove-Item -Path $dst -Recurse -Force -ErrorAction SilentlyContinue
    }

    try {
      Rename-Item -Path $src -NewName $newName -ErrorAction Stop
      $fixed++
    } catch {
      Write-Warning "Could not rename $src -> $newName : $_"
    }
  }
}

Write-Host "Fixed $fixed Gradle transform folder(s) under $GradleHome"
