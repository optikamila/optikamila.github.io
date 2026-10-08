param(
    [string]$Root = (Split-Path -Parent $PSScriptRoot),
    [switch]$Force
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$rootPath = [IO.Path]::GetFullPath($Root)
$output = [IO.Path]::Combine($rootPath, 'img/og-optika-mila.png')
if ([IO.File]::Exists($output) -and -not $Force) { throw 'Share image already exists. Use -Force to regenerate it.' }
$bitmap = $null
$graphics = $null
$logo = $null
$resources = [Collections.Generic.List[IDisposable]]::new()
function Brush([string]$Hex) {
    $brush = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($Hex))
    $resources.Add($brush)
    return $brush
}
function Font([string]$Family, [single]$Size) {
    $font = [Drawing.Font]::new($Family, $Size, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)
    $resources.Add($font)
    return $font
}
try {
    $bitmap = [Drawing.Bitmap]::new(1200, 630)
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    $logo = [Drawing.Image]::FromFile([IO.Path]::Combine($rootPath, 'icon-192.png'))
    $graphics.Clear([Drawing.ColorTranslator]::FromHtml('#F7F4EE'))
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.TextRenderingHint = [Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $ink = Brush '#16241D'
    $forest = Brush '#1C3F33'
    $soft = Brush '#4B5B52'
    $line = Brush '#DCD3C4'
    $graphics.DrawImage($logo, 80, 76, 104, 104)
    $graphics.DrawString('Optika Mila Foča', (Font 'Georgia' 64), $ink, 208, 90)
    $graphics.DrawString('Pregled vida, naočare i sočiva', (Font 'Segoe UI' 40), $forest, 76, 228)
    $graphics.DrawString('U Foči od 1997. godine.', (Font 'Segoe UI' 28), $soft, 78, 296)
    $graphics.FillRectangle($line, 80, 392, 1040, 1)
    $graphics.DrawString('Pregledi jednom mjesečno i van Foče', (Font 'Segoe UI' 26), $soft, 78, 426)
    $cityFont = Font 'Georgia' 35
    $graphics.DrawString('Nevesinje', $cityFont, $forest, 78, 482)
    $graphics.DrawString('Rogatica', $cityFont, $forest, 354, 482)
    $graphics.DrawString('Gacko', $cityFont, $forest, 614, 482)
    $graphics.DrawString('www.optikamila.com', (Font 'Segoe UI' 22), $soft, 894, 564)
    $bitmap.Save($output, [Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Created $output (1200 x 630)"
} finally {
    foreach ($resource in $resources) { $resource.Dispose() }
    if ($logo) { $logo.Dispose() }
    if ($graphics) { $graphics.Dispose() }
    if ($bitmap) { $bitmap.Dispose() }
}
