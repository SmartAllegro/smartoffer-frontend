# dump_frontend.ps1 — безопасный дамп фронтенда (без node_modules, без OutOfMemory)

$projectRoot = Split-Path -Parent $PSScriptRoot   # C:\projects\smartoffer-frontend
Set-Location $projectRoot

New-Item -ItemType Directory -Force -Path ".\snapshots" | Out-Null
$outFile = ".\snapshots\frontend_dump.txt"

# Чистим старый файл
Remove-Item $outFile -ErrorAction SilentlyContinue

# Папки/пути, которые исключаем (важно: с экранированными слэшами)
$excludeRegex = "\\node_modules\\|\\dist\\|\\build\\|\\.next\\|\\out\\|\\coverage\\|\\.cache\\|\\__pycache__\\|\\\.git\\|\\snapshots\\"

# 1) Собираем список файлов
$files = Get-ChildItem -Path "." -Recurse -File |
  Where-Object {
    $_.FullName -notmatch $excludeRegex -and
    $_.FullName -notmatch "\\frontend_dump\.txt$" -and
    $_.FullName -notmatch "\\dump_frontend\.ps1$"
  } |
  Sort-Object FullName

# 2) Пишем дерево
"===== FRONTEND TREE =====" | Out-File $outFile -Encoding UTF8
$files.FullName | Out-File $outFile -Append -Encoding UTF8
"" | Out-File $outFile -Append -Encoding UTF8
"===== FRONTEND FILES =====" | Out-File $outFile -Append -Encoding UTF8

# 3) Пишем содержимое файлов (ВАЖНО: без -Raw, чтобы не падать по памяти)
foreach ($f in $files) {
  "" | Out-File $outFile -Append -Encoding UTF8
  ("----- FILE: " + $f.FullName + " -----") | Out-File $outFile -Append -Encoding UTF8

  try {
    Get-Content -LiteralPath $f.FullName | Out-File $outFile -Append -Encoding UTF8
  }
  catch {
    ("[READ ERROR] " + $f.FullName + " :: " + $_.Exception.Message) | Out-File $outFile -Append -Encoding UTF8
  }
}

"===== DONE =====" | Out-File $outFile -Append -Encoding UTF8

