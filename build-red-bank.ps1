$basePath = 'C:\Users\User\.codex\attachments\09f0ca28-ba14-4251-b0c7-09524433d057\pasted-text.txt'
$updatesPath = 'C:\Users\User\.codex\attachments\3a251844-3933-47bd-b892-011d4ff56ed2\pasted-text.txt'
$targetPath = Join-Path $PSScriptRoot 'data\tarjetas-rojas.json'

function Clean-Text([string]$value) {
  $value = $value.Trim()
  $value = $value -replace '\*\*', '' -replace '\*', ''
  $value = $value -replace '\\div', '÷' -replace '\\times', '×'
  $value = $value -replace '\((\d+)\s*-\s*(\d+)\s*=\s*(\d+)\)', '$1 − $2 = $3'
  $value = $value -replace '\((\d+)\s*÷\s*(\d+)\s*=\s*(\d+)\)', '$1 ÷ $2 = $3'
  $value = $value -replace '\((\d+)\s*×\s*(\d+)\)', '$1 × $2'
  return $value.Trim()
}

function Split-Composite([string]$value) {
  if ($value -match '^\*\*(.+?)\*\*\s*(.*)$') {
    $answer = Clean-Text $matches[1]
    $explanation = Clean-Text $matches[2]
  } else {
    $answer = Clean-Text $value
    $explanation = ''
  }
  [PSCustomObject]@{
    answer = $answer -replace '\.$', ''
    explanation = $explanation
  }
}

function New-BaseCard([int]$number) {
  [ordered]@{
    id = 'roja-{0:D3}' -f $number
    numero = $number
    familia = 'DatoNauta'
    color = 'rojo'
    variante = 'normal'
    dificultad = 'media'
  }
}

$originMap = @{
  'Original' = 'original'
  'Original corregida' = 'original_corregida'
  'Reemplazo de imagen' = 'reemplazo_de_imagen'
  'Nueva' = 'nueva'
}

$cards = @{}
$baseText = [IO.File]::ReadAllText($basePath, [Text.Encoding]::UTF8)

foreach ($line in ($baseText -split "`r?`n" | Where-Object { $_ -match '^\| Tarjeta ' })) {
  $parts = $line.Split('|') | ForEach-Object { $_.Trim() }
  $number = [int]($parts[1] -replace '^Tarjeta\s+', '')
  $card = New-BaseCard $number
  $composite = Split-Composite $parts[5]

  if ($number -le 38 -or ($number -ge 151 -and $number -le 163)) {
    $card.modalidad = 'opcionometro'
    $card.pregunta = Clean-Text $parts[3]
    $card.opciones = @($parts[4].Split(';') | ForEach-Object { Clean-Text $_ })
    $card.respuesta = $composite.answer
  } elseif (($number -ge 39 -and $number -le 76) -or ($number -ge 164 -and $number -le 176)) {
    $card.modalidad = 'si_o_no'
    $card.afirmacion = Clean-Text $parts[3]
    $card.respuesta = if ($composite.answer -match 'Sí|Verdadero') { 'Verdadero' } else { 'Falso' }
  } elseif (($number -ge 77 -and $number -le 113) -or ($number -ge 177 -and $number -le 188)) {
    $card.modalidad = 'sapienreto'
    $card.pregunta = Clean-Text $parts[3]
    $card.respuesta = $composite.answer
  } else {
    $card.modalidad = 'par_de_dos'
    $card.tema = Clean-Text $parts[3]
    $card.opciones = @($parts[4].Split(';') | ForEach-Object { Clean-Text $_ })
    $card.respuesta = @($composite.answer -split '\s+(?:y|e)\s+', 2 | ForEach-Object { Clean-Text $_ })
  }

  $card.explicacion = $composite.explanation
  $card.origen = $originMap[$parts[2]]
  $cards[$number] = [PSCustomObject]$card
}

$updatesText = [IO.File]::ReadAllText($updatesPath, [Text.Encoding]::UTF8)

foreach ($line in ($updatesText -split "`r?`n" | Where-Object { $_ -match '^\| Tarjeta ' })) {
  $parts = $line.Split('|') | ForEach-Object { $_.Trim() }
  if ($parts[1] -notmatch '^Tarjeta \d+$') { continue }
  $number = [int]($parts[1] -replace '^Tarjeta\s+', '')
  if ($number -lt 151 -or $number -gt 200) { continue }

  $card = New-BaseCard $number

  if ($number -le 163) {
    $composite = Split-Composite $parts[4]
    $card.modalidad = 'opcionometro'
    $card.pregunta = Clean-Text $parts[2]
    $card.opciones = @($parts[3].Split(';') | ForEach-Object { Clean-Text $_ })
    $card.respuesta = $composite.answer
  } elseif ($number -le 176) {
    $composite = Split-Composite $parts[3]
    $card.modalidad = 'si_o_no'
    $card.afirmacion = Clean-Text $parts[2]
    $card.respuesta = if ($composite.answer -match 'Sí|Verdadero') { 'Verdadero' } else { 'Falso' }
  } elseif ($number -le 188) {
    $composite = Split-Composite $parts[3]
    $card.modalidad = 'sapienreto'
    $card.pregunta = Clean-Text $parts[2]
    $card.respuesta = $composite.answer
  } else {
    $composite = Split-Composite $parts[4]
    $card.modalidad = 'par_de_dos'
    $card.tema = Clean-Text $parts[2]
    $card.opciones = @($parts[3].Split(';') | ForEach-Object { Clean-Text $_ })
    $card.respuesta = @($composite.answer -split '\s+(?:y|e)\s+', 2 | ForEach-Object { Clean-Text $_ })
  }

  $card.explicacion = $composite.explanation
  $card.origen = 'nueva'
  $cards[$number] = [PSCustomObject]$card
}

function Set-Correction([int]$number, [string]$mode, $content) {
  $oldCard = $cards[$number]
  $card = New-BaseCard $number
  $card.modalidad = $mode
  $card.dificultad = $oldCard.dificultad
  foreach ($key in $content.Keys) { $card[$key] = $content[$key] }
  $card.origen = 'original_modificada'
  $cards[$number] = [PSCustomObject]$card
}

Set-Correction 17 'opcionometro' ([ordered]@{
  pregunta = '¿Cuál de los siguientes no fue un pirata o corsario del Caribe?'
  opciones = @('Francis Drake', 'Barbarroja', 'John Hawkins', 'el Olonés')
  respuesta = 'Barbarroja'
  explicacion = 'El Olonés, Drake y Hawkins actuaron en el Atlántico o el Caribe; los hermanos Barbarroja estuvieron vinculados principalmente al Mediterráneo y al Imperio otomano.'
})
Set-Correction 30 'opcionometro' ([ordered]@{
  pregunta = '¿Cuál de los siguientes no es un idioma indígena de México?'
  opciones = @('náhuatl', 'maya', 'mixteco', 'guanche')
  respuesta = 'guanche'
  explicacion = 'Es una lengua bereber que se hablaba en las islas Canarias.'
})
Set-Correction 65 'si_o_no' ([ordered]@{
  afirmacion = 'Una de las teorías etimológicas relaciona las palabras «ceviche» y «escabeche» con un mismo origen árabe.'
  respuesta = 'Verdadero'
  explicacion = 'La RAE presenta para ambas palabras una posible procedencia del árabe hispánico assukkabáǧ. No está demostrado que «ceviche» proceda directamente de la palabra española «escabeche».'
})
Set-Correction 69 'si_o_no' ([ordered]@{
  afirmacion = 'Según una leyenda popular, algunos religiosos europeos consideraron el café una bebida satánica hasta que el papa Clemente VIII lo probó y lo aprobó.'
  respuesta = 'Verdadero'
  explicacion = 'La anécdota está muy difundida, pero no debe presentarse como un hecho histórico plenamente documentado.'
})
Set-Correction 80 'sapienreto' ([ordered]@{
  pregunta = '¿Cuál fue la telenovela colombiana original cuya historia fue adaptada posteriormente como Pasión de gavilanes y Fuego en la sangre?'
  respuesta = 'Las aguas mansas'
  explicacion = 'Pasión de gavilanes también es una adaptación de esa historia, pero no es la versión original.'
})
Set-Correction 97 'sapienreto' ([ordered]@{
  pregunta = 'En un recorrido geográfico teórico por la costa atlántica desde Buenos Aires hasta Caracas, pasando por todos los territorios costeros y contando la Guayana Francesa como parte de Francia, ¿por cuántos países soberanos pasarías?'
  respuesta = '7'
  explicacion = 'Argentina, Uruguay, Brasil, Francia, Surinam, Guyana y Venezuela. La Guayana Francesa es parte integral de Francia.'
})
Set-Correction 114 'par_de_dos' ([ordered]@{
  tema = 'Dinosaurios'
  opciones = @('chasmosaurio', 'estegosaurio', 'trexosaurio', 'triceratops', 'enormosaurio')
  respuesta = @('trexosaurio', 'enormosaurio')
  explicacion = 'Chasmosaurus, Stegosaurus y Triceratops son dinosaurios reconocidos; los otros dos nombres son inventados.'
})
Set-Correction 134 'par_de_dos' ([ordered]@{
  tema = 'Gases nobles'
  opciones = @('Obregón', 'argón', 'muflón', 'xenón', 'criptón')
  respuesta = @('Obregón', 'muflón')
  explicacion = 'Argón, xenón y criptón son gases nobles.'
})
Set-Correction 137 'par_de_dos' ([ordered]@{
  tema = 'Roedores'
  opciones = @('capibara', 'tuco-tuco', 'pestosa', 'coipo', 'yumi-yumi')
  respuesta = @('pestosa', 'yumi-yumi')
  explicacion = 'El coipo es un roedor sudamericano al que en algunas regiones también se llama «nutria», de ahí la ambigüedad de la versión anterior.'
})

$output = @($cards.Values | Sort-Object numero)
if ($output.Count -ne 200) { throw "Se esperaban 200 tarjetas y se obtuvieron $($output.Count)." }

$json = $output | ConvertTo-Json -Depth 5
[IO.File]::WriteAllText($targetPath, $json + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
Write-Output "WROTE=$($output.Count)"
