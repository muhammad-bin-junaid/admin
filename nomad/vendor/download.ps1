$base = "C:\Users\muham\OneDrive\Desktop\nomadgoods.com\vendor"

$cssFiles = @(
  @("css/reset.css", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/_assets/reset-5UPKECKT.css"),
  @("css/app.css", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/_assets/app-ZDPVZ54A.css"),
  @("css/bundle.css", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/css-bundle-FKHC6X4E.css")
)

$jsFiles = @(
  @("js/manifest.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/manifest-42D55231.js"),
  @("js/root.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/root-6HHSKPYD.js"),
  @("js/entry.client.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/entry.client-SCJG7SXK.js"),
  @("js/routes/frame.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/routes/($lang)._frame-C2PRKMHH.js"),
  @("js/routes/index.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/routes/($lang)._frame._index-ZPQB63HE.js"),
  @("js/_shared/chunk-273F5NN3.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/_shared/chunk-273F5NN3.js"),
  @("js/_shared/chunk-4IHDGXLI.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/_shared/chunk-4IHDGXLI.js"),
  @("js/_shared/chunk-4RY6DXDF.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/_shared/chunk-4RY6DXDF.js"),
  @("js/_shared/chunk-CC6ELVAD.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/_shared/chunk-CC6ELVAD.js"),
  @("js/_shared/chunk-G4BWE65L.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/_shared/chunk-G4BWE65L.js"),
  @("js/_shared/chunk-GAH5I7PS.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/_shared/chunk-GAH5I7PS.js"),
  @("js/_shared/chunk-K336KWAT.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/_shared/chunk-K336KWAT.js"),
  @("js/_shared/chunk-LGHZ5AJO.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/_shared/chunk-LGHZ5AJO.js"),
  @("js/_shared/chunk-OCLP2OVH.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/_shared/chunk-OCLP2OVH.js"),
  @("js/_shared/chunk-OQVVG6BP.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/_shared/chunk-OQVVG6BP.js"),
  @("js/_shared/chunk-QUKJ2YZ7.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/_shared/chunk-QUKJ2YZ7.js"),
  @("js/_shared/chunk-RVX5UFTR.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/_shared/chunk-RVX5UFTR.js"),
  @("js/_shared/chunk-UPKAGUDM.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/_shared/chunk-UPKAGUDM.js"),
  @("js/_shared/chunk-XXS5I7HN.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/_shared/chunk-XXS5I7HN.js"),
  @("js/_shared/chunk-YX4REAJP.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/_shared/chunk-YX4REAJP.js"),
  @("js/_shared/chunk-ZHODNS2R.js", "https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/_shared/chunk-ZHODNS2R.js")
)

$fonts = @(
  @("fonts/gotham-book.woff2", "https://cdn.shopify.com/s/files/1/0384/6721/files/gotham-book_3b2a841f-3bf5-40f5-9d33-a3da29118b3a.woff2?v=1786660362"),
  @("fonts/gotham-bold.woff2", "https://cdn.shopify.com/s/files/1/0384/6721/files/gotham-bold_5a9b1208-d242-4ade-8bce-b6a991ce1cab.woff2?v=1786660362"),
  @("fonts/Aleo-Regular.ttf", "https://cdn.shopify.com/s/files/1/0384/6721/files/Aleo-Regular.ttf?v=1619025153")
)

$all = $cssFiles + $jsFiles + $fonts
$count = 0
$total = $all.Count

foreach($item in $all) {
  $count++
  $path = Join-Path $base $item[0]
  $url = $item[1]
  $dir = Split-Path $path -Parent
  if(!(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Write-Output "[$count/$total] Downloading: $($item[0])"
  try {
    Invoke-WebRequest -Uri $url -OutFile $path -UseBasicParsing -TimeoutSec 30
    $size = (Get-Item $path).Length
    Write-Output "  OK ($size bytes)"
  } catch {
    Write-Output "  FAILED: $($_.Exception.Message)"
  }
}

Write-Output "`nDone! Downloaded $count files."
