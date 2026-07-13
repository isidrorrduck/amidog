$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$distRoot = Join-Path $projectRoot 'dist'
$routeDirectory = Join-Path $distRoot 'public\puppies'
$exportedRoute = Join-Path $routeDirectory '[slug].html'
$htaccessSource = Join-Path $projectRoot 'deploy\public-puppies.htaccess'

if (-not (Test-Path -LiteralPath $exportedRoute -PathType Leaf)) {
  throw "No existe $exportedRoute. Ejecuta antes: npm run export:web"
}

Copy-Item -LiteralPath $exportedRoute -Destination (Join-Path $routeDirectory 'index.html') -Force
Copy-Item -LiteralPath $htaccessSource -Destination (Join-Path $routeDirectory '.htaccess') -Force

Write-Output 'Ruta publica generica preparada en dist\public\puppies\'

