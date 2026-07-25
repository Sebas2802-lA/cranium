param(
  [string]$ChromePath = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
)

$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$reportDirectory = Join-Path $projectRoot 'reports'
$reportPath = Join-Path $reportDirectory 'layout-audit.json'
$profilePath = Join-Path $projectRoot ('.chrome-layout-audit-' + [Guid]::NewGuid().ToString('N'))
$auditUrl = 'file:///' + ($PSScriptRoot -replace '\\', '/') + '/card-layout-audit.html'
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 8765)
$chromeProcess = $null

New-Item -ItemType Directory -Force -Path $reportDirectory | Out-Null

try {
  $listener.Start()
  $chromeProcess = Start-Process -FilePath $ChromePath -WindowStyle Hidden -PassThru -ArgumentList @(
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    "--user-data-dir=$profilePath",
    '--allow-file-access-from-files',
    '--window-size=2000,1200',
    $auditUrl
  )

  $client = $listener.AcceptTcpClient()
  $stream = $client.GetStream()
  $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::UTF8, $false, 4096, $true)

  $requestLine = $reader.ReadLine()
  $contentLength = 0
  while ($true) {
    $line = $reader.ReadLine()
    if ([string]::IsNullOrEmpty($line)) { break }
    if ($line -match '^Content-Length:\s*(\d+)$') {
      $contentLength = [int]$Matches[1]
    }
  }

  $buffer = New-Object char[] $contentLength
  $readTotal = 0
  while ($readTotal -lt $contentLength) {
    $read = $reader.Read($buffer, $readTotal, $contentLength - $readTotal)
    if ($read -le 0) { break }
    $readTotal += $read
  }

  $encodedBody = -join $buffer[0..($readTotal - 1)]
  $body = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($encodedBody))
  [IO.File]::WriteAllText($reportPath, $body, [Text.UTF8Encoding]::new($false))

  $response = [Text.Encoding]::ASCII.GetBytes(
    "HTTP/1.1 200 OK`r`nContent-Length: 2`r`nConnection: close`r`n`r`nOK"
  )
  $stream.Write($response, 0, $response.Length)
  $stream.Flush()
  $client.Close()

  $report = $body | ConvertFrom-Json
  if ($report.fatalError) {
    throw "Layout audit failed: $($report.fatalError)"
  }

  Write-Output "Cards: $($report.cards)"
  Write-Output "Renders: $($report.renders)"
  Write-Output "Faces: $($report.evaluatedFaces)"
  Write-Output "Failures: $($report.failureCount)"
  Write-Output "Report: $reportPath"
}
finally {
  $listener.Stop()
  if ($chromeProcess -and -not $chromeProcess.HasExited) {
    Stop-Process -Id $chromeProcess.Id -Force
  }
  Start-Sleep -Milliseconds 500
  $resolvedProfile = [IO.Path]::GetFullPath($profilePath)
  if (
    $resolvedProfile.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar) -and
    (Test-Path -LiteralPath $resolvedProfile)
  ) {
    for ($attempt = 0; $attempt -lt 10 -and (Test-Path -LiteralPath $resolvedProfile); $attempt += 1) {
      try {
        Remove-Item -LiteralPath $resolvedProfile -Recurse -Force -ErrorAction Stop
      } catch {
        Start-Sleep -Milliseconds 300
      }
    }
  }
}
