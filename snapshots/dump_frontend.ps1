# dump_frontend.ps1 ó  Œ––≈ “Õ€… Ë ¡≈«Œœ¿—Õ€… dump ÙÓÌÚ‡

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$outFile = ".\snapshots\frontend_dump.txt"
Remove-Item $outFile -ErrorAction SilentlyContinue

# ﬂ¬ÕŒ Á‡‰‡∏Ï, ˜ÚÓ Ò˜ËÚ‡ÂÏ ÙÓÌÚÓÏ
$includePaths = @(
  ".\src",
  ".\public",
  ".\index.html",
  ".\package.json",
  ".\package-lock.json",
  ".\vite.config.ts",
  ".\tsconfig.json",
  ".\tsconfig.app.json",
  ".\tsconfig.node.json",
  ".\postcss.config.js",
  ".\tailwind.config.ts",
  ".\components.json",
  ".\README.md"
)

"===== FRONTEND TREE =====" | Out-File $outFile -Encoding UTF8

foreach ($path in $includePaths) {
  if (Test-Path $path) {
    if ((Get-Item $path).PSIsContainer) {
      Get-ChildItem -Recurse -File $path |
        Sort-Object FullName |
        ForEach-Object { $_.FullName } |
        Out-File $outFile -Append -Encoding UTF8
    } else {
      (Resolve-Path $path).Path | Out-File $outFile -Append -Encoding UTF8
    }
  }
}

"" | Out-File $outFile -Append -Encoding UTF8
"===== FRONTEND FILES =====" | Out-File $outFile -Append -Encoding UTF8

foreach ($path in $includePaths) {
  if (Test-Path $path) {
    if ((Get-Item $path).PSIsContainer) {
      Get-ChildItem -Recurse -File $path |
        Sort-Object FullName |
        ForEach-Object {
          "" | Out-File $outFile -Append -Encoding UTF8
          ("----- FILE: " + $_.FullName + " -----") | Out-File $outFile -Append -Encoding UTF8
          Get-Content $_.FullName | Out-File $outFile -Append -Encoding UTF8
        }
    } else {
      "" | Out-File $outFile -Append -Encoding UTF8
      ("----- FILE: " + (Resolve-Path $path).Path + " -----") | Out-File $outFile -Append -Encoding UTF8
      Get-Content $path | Out-File $outFile -Append -Encoding UTF8
    }
  }
}

"===== DONE =====" | Out-File $outFile -Append -Encoding UTF8
