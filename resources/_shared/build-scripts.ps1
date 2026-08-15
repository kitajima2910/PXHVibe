# Build Pipeline — Real PowerShell Script (chạy được trực tiếp)
# Agent pxh-devops: chạy script này, KHÔNG đọc như markdown

param([string]$Step = "all")

$isNode = Test-Path "package.json"
$isRust = Test-Path "Cargo.toml"
$isPython = (Test-Path "pyproject.toml") -or (Test-Path "requirements.txt")

function Invoke-LintAndTypeCheck {
  if ($isNode) {
    $scripts = (Get-Content "package.json" -Raw | ConvertFrom-Json).scripts
    if ($scripts.lint) {
      npm run lint
      if ($LASTEXITCODE -ne 0) { Write-Error "Lint failed (exit $LASTEXITCODE)"; exit 1 }
      Write-Output "[OK] Lint pass"
    } else {
      Write-Output "[SKIP] No lint script"
    }
    if ($scripts.typecheck) {
      npm run typecheck
      if ($LASTEXITCODE -ne 0) { Write-Error "TypeCheck failed (exit $LASTEXITCODE)"; exit 1 }
      Write-Output "[OK] TypeCheck pass"
    } elseif (Test-Path "tsconfig.json") {
      npx tsc --noEmit
      if ($LASTEXITCODE -ne 0) { Write-Error "TypeCheck failed (exit $LASTEXITCODE)"; exit 1 }
      Write-Output "[OK] TypeCheck pass"
    } else {
      Write-Output "[SKIP] No typecheck script or tsconfig.json"
    }
  } elseif ($isRust) {
    cargo clippy
    if (-not $?) { exit 1 }
    Write-Output "[OK] Clippy pass"
    cargo check
    if (-not $?) { exit 1 }
    Write-Output "[OK] Cargo check pass"
  } elseif ($isPython) {
    ruff check . 2>$null
    if ($?) { Write-Output "[OK] Ruff pass" } else { Write-Warning "Ruff unavailable or lint failed" }
  }
}

function Invoke-Test {
  if ($isNode) {
    $hasTest = (Get-Content "package.json" -Raw | ConvertFrom-Json).scripts.test
    if ($hasTest) {
      npm test
      if (-not $?) { Write-Warning "Tests failed"; exit 1 }
      Write-Output "[OK] Tests pass"
    } else { Write-Output "[SKIP] No test script" }
  } elseif ($isRust) {
    cargo test
    if (-not $?) { exit 1 }
    Write-Output "[OK] Tests pass"
  } elseif ($isPython) {
    $pytestOut = pytest 2>&1
    if ($LASTEXITCODE -eq 0) { Write-Output "[OK] Tests pass" } else { Write-Warning "pytest failed (exit $LASTEXITCODE)" }
  }
}

function Invoke-Build {
  if ($isNode) {
    $hasBuild = (Get-Content "package.json" -Raw | ConvertFrom-Json).scripts.build
    if ($hasBuild) {
      npm run build
      if ($?) {
        $outDir = if (Test-Path ".next") { ".next" } elseif (Test-Path "dist") { "dist" } else { "build" }
        if (Test-Path $outDir) {
          $size = (Get-ChildItem -Path $outDir -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
          Write-Output "[OK] Build success ($($size.ToString('N1'))MB)"
        } else { Write-Output "[OK] Build success" }
      } else { exit 1 }
    } else {
      Write-Output "[SKIP] No build script; meta-project"
    }
  } elseif ($isRust) {
    cargo build --release
    if ($?) {
      $size = (Get-ChildItem -Path "target/release" -File | Measure-Object -Property Length -Sum).Sum / 1MB
      Write-Output "[OK] Build success ($($size.ToString('N1'))MB)"
    } else { exit 1 }
  } elseif ($isPython) {
    $buildOut = python -m build 2>&1
    if ($LASTEXITCODE -eq 0) { Write-Output "[OK] Build success" } else { Write-Warning "Build not configured" }
  }
}

switch ($Step) {
  "lint"    { Invoke-LintAndTypeCheck }
  "test"    { Invoke-Test }
  "build"   { Invoke-Build }
  default {
    Invoke-LintAndTypeCheck
    if ($LASTEXITCODE -eq 0) { Invoke-Test }
    if ($LASTEXITCODE -eq 0) { Invoke-Build }
  }
}
