$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$distRoot = Join-Path $projectRoot 'dist'
$slug = 'cachorros-del-guadarrama-thor-sg-24ad4'
$exportedRoute = Join-Path $distRoot "$slug.html"
$routeDirectory = Join-Path $distRoot $slug
$htaccessSource = Join-Path $projectRoot 'deploy\public-route.htaccess'
$pwaSource = Join-Path $distRoot 'pwa'

if (-not (Test-Path -LiteralPath $exportedRoute -PathType Leaf)) {
  throw "No existe $exportedRoute. Ejecuta antes: npx expo export --platform web"
}

if (-not (Test-Path -LiteralPath $pwaSource -PathType Container)) {
  throw "No existe $pwaSource. La exportacion no contiene los recursos PWA."
}

New-Item -ItemType Directory -Path $routeDirectory -Force | Out-Null
Copy-Item -LiteralPath $exportedRoute -Destination (Join-Path $routeDirectory 'index.html') -Force
Copy-Item -LiteralPath $htaccessSource -Destination (Join-Path $routeDirectory '.htaccess') -Force
Copy-Item -Path (Join-Path $pwaSource '*') -Destination $routeDirectory -Recurse -Force

Write-Output "Paquete preparado en dist\$slug\"
