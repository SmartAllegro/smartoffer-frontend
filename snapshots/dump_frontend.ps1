New-Item -ItemType Directory -Force -Path snapshots | Out-Null

Get-ChildItem -Recurse -File . |
  Where-Object { $_.FullName -notmatch "\\node_modules\\|\\dist\\|\\build\\|\\.next\\|\\.cache\\|\\coverage\\|\\.git\\" } |
  Sort-Object FullName |
  ForEach-Object {
    "`n----- FILE: $($_.FullName) -----"
    Get-Content $_.FullName -Raw
  } | Out-File snapshots\frontend_dump.txt -Encoding UTF8
