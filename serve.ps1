# JainJoy local server for Windows. Uses only built-in Windows PowerShell; nothing to install.
param([int]$Port = 8080, [switch]$NoBrowser)
$ErrorActionPreference = 'Continue'
$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8'; '.webmanifest'='application/manifest+json'; '.json'='application/json'; '.png'='image/png'; '.svg'='image/svg+xml'; '.css'='text/css'; '.txt'='text/plain; charset=utf-8'; '.jpg'='image/jpeg'; '.md'='text/plain; charset=utf-8'; '.sql'='text/plain; charset=utf-8' }

$listener = $null
foreach ($p in @($Port, 8081, 8090, 5500)) {
  try { $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $p); $listener.Start(); $Port = $p; break }
  catch { $listener = $null }
}
if (-not $listener) { Write-Host 'Could not start: ports 8080, 8081, 8090 and 5500 are all busy.' -ForegroundColor Red; exit 1 }

$ips = @()
try { $ips = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | Where-Object { $_.AddressFamily -eq 'InterNetwork' -and -not $_.ToString().StartsWith('127.') -and -not $_.ToString().StartsWith('169.254.') } | ForEach-Object { $_.ToString() } } catch {}

Write-Host ''
Write-Host '  JainJoy is running' -ForegroundColor Magenta
Write-Host ''
Write-Host "  On this computer:            http://localhost:$Port" -ForegroundColor Green
foreach ($ip in $ips) { Write-Host "  On your phone (same Wi-Fi):  http://${ip}:$Port" -ForegroundColor Green }
Write-Host ''
Write-Host '  If Windows asks about the firewall, choose Allow (Private networks) so your phone can connect.'
Write-Host '  Keep this window open while you use the app. Close it to stop JainJoy.'
Write-Host ''
if (-not $NoBrowser) { Start-Process "http://localhost:$Port/" }

while ($true) {
  $client = $listener.AcceptTcpClient()
  # browsers open spare connections that may never send a request; never wait on them for long
  $client.ReceiveTimeout = 2000; $client.SendTimeout = 5000
  try {
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
    $line = $reader.ReadLine()
    while ($true) { $h = $reader.ReadLine(); if ($h -eq $null -or $h -eq '') { break } }
    $path = '/'
    if ($line -match '^[A-Z]+ ([^ ]+)') { $path = [System.Uri]::UnescapeDataString(($matches[1] -split '\?')[0]) }
    if ($path.EndsWith('/')) { $path = $path + 'index.html' }
    $rel = $path.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    $file = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $rel))
    if ($file.StartsWith($root) -and [System.IO.File]::Exists($file)) {
      $body = [System.IO.File]::ReadAllBytes($file)
      $ct = $types[[System.IO.Path]::GetExtension($file).ToLower()]
      if (-not $ct) { $ct = 'application/octet-stream' }
      $status = '200 OK'
    } else {
      $body = [System.Text.Encoding]::UTF8.GetBytes('Not found')
      $ct = 'text/plain'; $status = '404 Not Found'
    }
    $head = "HTTP/1.1 $status`r`nContent-Type: $ct`r`nContent-Length: $($body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
    $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
    $stream.Write($hb, 0, $hb.Length)
    if ($line -notmatch '^HEAD ') { $stream.Write($body, 0, $body.Length) }
    $stream.Flush()
  } catch { } finally { $client.Close() }
}
