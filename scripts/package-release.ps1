param([string]$Version = '1.2.0-rc.1')
$ErrorActionPreference = 'Stop'
if ($Version -notmatch '^[0-9A-Za-z.-]+$') { throw 'Versão inválida.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$releaseDirectory = Join-Path $projectRoot 'releases'
[IO.Directory]::CreateDirectory($releaseDirectory) | Out-Null
$outputPath = Join-Path $releaseDirectory ('Tutor_Digital_' + $Version + '.zip')
if (Test-Path -LiteralPath $outputPath) { throw 'O pacote já existe. Use outra versão ou preserve a cópia existente.' }
$files = Get-ChildItem -LiteralPath $projectRoot -Recurse -File -Force | Where-Object {
  $relativePath = $_.FullName.Substring($projectRoot.Length + 1).Replace('\','/')
  $relativePath -notmatch '(^|/)(node_modules|releases|\.git|\.supabase)(/|$)' -and
  $_.Name -notmatch '\.(zip|log)$' -and
  ($_.Name -notlike '.env*' -or $_.Name -eq '.env.example')
} | Sort-Object FullName
$manifestFiles = @()
$zip = [IO.Compression.ZipFile]::Open($outputPath, [IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($projectRoot.Length + 1).Replace('\','/')
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $relativePath, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    $manifestFiles += [ordered]@{ path = $relativePath; sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
  }
  $entry = $zip.CreateEntry('RELEASE_MANIFEST.json')
  $writer = [IO.StreamWriter]::new($entry.Open(), [Text.UTF8Encoding]::new($false))
  try { $writer.Write(([ordered]@{ version = $Version; files = $manifestFiles } | ConvertTo-Json -Depth 5)) }
  finally { $writer.Dispose() }
} finally { $zip.Dispose() }
Get-Item -LiteralPath $outputPath | Select-Object FullName, Length
Get-FileHash -LiteralPath $outputPath -Algorithm SHA256
