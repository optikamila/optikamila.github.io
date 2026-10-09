param(
    [string]$Root = (Split-Path -Parent $PSScriptRoot),
    [switch]$Check
)
$ErrorActionPreference = 'Stop'
$rootPath = [IO.Path]::GetFullPath($Root)
$utf8 = [Text.UTF8Encoding]::new($false)
function Read-Source([string]$Path) {
    return [IO.File]::ReadAllText([IO.Path]::Combine($rootPath, $Path)).Replace("`r`n", "`n").TrimEnd()
}
function Remove-CssComments([string]$Css) {
    $pattern = @'
(?is)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|url\((?:\\.|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\\)"'])*\))|/\*.*?\*/
'@
    return [regex]::Replace($Css, $pattern, [Text.RegularExpressions.MatchEvaluator]{
        param($match)
        if ($match.Value.StartsWith('/*')) { return '' }
        return $match.Value
    }).Trim()
}
$css = Remove-CssComments (Read-Source 'src/site.css')
$eye = Read-Source 'src/eye.svg'
$phone = Read-Source 'src/phone.svg'
$navigation = Read-Source 'src/navigation.js'
if ($navigation -match '(?i)</script') { throw 'Navigation source must not close its inline script element' }
$scriptBytes = [IO.File]::ReadAllBytes([IO.Path]::Combine($rootPath, 'js/script.js'))
$version = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($scriptBytes)).ToLowerInvariant().Substring(0, 12)
$parts = [ordered]@{
    '{{STYLES}}' = $css
    '{{BRAND_MARK}}' = $eye
    '{{FOOTER_MARK}}' = $eye.Replace('class="brand-mark"', 'class="footer-mark"').Replace('width="38" height="27"', 'width="32" height="23"')
    '{{PHONE_ICON}}' = $phone
    '{{SCRIPT_VERSION}}' = $version
    '{{NAVIGATION_SCRIPT}}' = $navigation
}
$outputs = [ordered]@{}
# Validate both pages before replacing either generated file.
foreach ($name in @('index', '404')) {
    $html = Read-Source "src/$name.template.html"
    if ([regex]::Matches($html, '\{\{STYLES\}\}').Count -ne 1) { throw "Expected one style placeholder in $name" }
    $navigationCount = if ($name -eq 'index') { 1 } else { 0 }
    if ([regex]::Matches($html, '\{\{NAVIGATION_SCRIPT\}\}').Count -ne $navigationCount) { throw "Unexpected navigation placeholder count in $name" }
    foreach ($part in $parts.GetEnumerator()) { $html = $html.Replace($part.Key, $part.Value) }
    if ($html -match '\{\{[A-Z_]+\}\}') { throw "Unresolved template placeholder in $name" }
    $outputs["$name.html"] = $utf8.GetBytes($html + "`n")
}
$changed = @()
foreach ($output in $outputs.GetEnumerator()) {
    $path = [IO.Path]::Combine($rootPath, $output.Key)
    $same = [IO.File]::Exists($path) -and [Convert]::ToBase64String([IO.File]::ReadAllBytes($path)) -ceq [Convert]::ToBase64String($output.Value)
    if (-not $same) { $changed += $output.Key }
}
if ($Check) {
    if ($changed.Count) { throw "Generated output differs from sources: $($changed -join ', '). Run tools/build.ps1." }
    Write-Host 'Generated output matches sources; no files written.'
    return
}
foreach ($output in $outputs.GetEnumerator()) {
    if ($output.Key -in $changed) {
        [IO.File]::WriteAllBytes([IO.Path]::Combine($rootPath, $output.Key), $output.Value)
        Write-Host "Built $($output.Key) ($($output.Value.Length) bytes)"
    } else {
        Write-Host "Unchanged $($output.Key) ($($output.Value.Length) bytes)"
    }
}
Write-Host "Shared inline stylesheet; script version: $version"
