param(
  [string]$ChromePath = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
)

$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$captureDirectory = Join-Path $projectRoot 'reports\layout-captures'
$pageUrl = 'file:///' + (($PSScriptRoot -replace '\\', '/') + '/card-layout-capture.html')
$samples = @(
  @('par-de-dos', 'par_de_dos', '', 'front'),
  @('opcionometro', 'opcionometro', '', 'front'),
  @('lexicon', 'lexicon', '', 'front'),
  @('ordenigma', 'ordenigma', '', 'front'),
  @('buscapalabras', 'buscapalabras', '', 'front'),
  @('todos-patras', 'todos_patras', '', 'front'),
  @('titerin-todos', 'titerin', 'todos_juegan', 'front'),
  @('imiton-todos', 'imiton', 'todos_juegan', 'front'),
  @('tarasilba', 'tarasilba', '', 'back'),
  @('pintacierta-todos', 'pintacierta', 'todos_juegan', 'front'),
  @('dibunoveo-todos', 'dibunoveo', 'todos_juegan', 'front'),
  @('escultorama', 'escultorama', '', 'front'),
  @('respuesta-extensa', 'adimimo', '', 'back'),
  @('explicacion-extensa', 'si_o_no', '', 'back')
)

New-Item -ItemType Directory -Force -Path $captureDirectory | Out-Null
foreach ($sample in $samples) {
  $name, $mode, $variant, $face = $sample
  $profilePath = Join-Path $projectRoot ('.chrome-layout-capture-' + [Guid]::NewGuid().ToString('N'))
  $outputPath = Join-Path $captureDirectory ($name + '.png')
  $url = "$pageUrl`?modalidad=$mode&variante=$variant&cara=$face"
  & $ChromePath --headless=new --disable-gpu --no-first-run "--user-data-dir=$profilePath" `
    --allow-file-access-from-files --hide-scrollbars --window-size=1366,1100 `
    --virtual-time-budget=2500 "--screenshot=$outputPath" $url 2>$null
  Start-Sleep -Milliseconds 150
  if (Test-Path -LiteralPath $profilePath) {
    Remove-Item -LiteralPath $profilePath -Recurse -Force -ErrorAction SilentlyContinue
  }
}
Write-Output "Captures: $captureDirectory"
