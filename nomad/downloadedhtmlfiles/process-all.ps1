# Batch process all downloaded nomadgoods.com HTML pages
# Applies same transformations as nomad.html

$inDir = "C:\Users\muham\OneDrive\Desktop\nomadgoods.com\nomad\downloadedhtmlfiles"
$files = Get-ChildItem "$inDir\*.html" | Where-Object { $_.Name -ne "process-all.ps1" }

Write-Output "Processing $($files.Count) files..."

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    
    # 1. Replace CDN CSS paths with local vendor paths
    $content = $content.Replace('https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4499557/build/_assets/reset-5AVHLLTA.css', 'vendor/css/reset.css')
    $content = $content.Replace('https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4499557/build/_assets/app-55V465N2.css', 'vendor/css/app.css')
    $content = $content.Replace('https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4499557/build/css-bundle-M5EMLYLM.css', 'vendor/css/bundle.css')
    $content = $content.Replace('https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/css-bundle-FKHC6X4E.css', 'vendor/css/bundle.css')
    $content = $content.Replace('https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/_assets/app-ZDPVZ54A.css', 'vendor/css/app.css')
    $content = $content.Replace('https://cdn.shopify.com/oxygen-v2/26993/12109/24871/4489108/build/_assets/reset-5UPKECKT.css', 'vendor/css/reset.css')
    
    # 2. Replace CDN font paths with local
    $content = $content.Replace('https://cdn.shopify.com/s/files/1/0384/6721/files/gotham-bold_5a9b1208-d242-4ade-8bce-b6a991ce1cab.woff2?v=1786660362', 'vendor/fonts/gotham-bold.woff2')
    $content = $content.Replace('https://cdn.shopify.com/s/files/1/0384/6721/files/gotham-book_3b2a841f-3bf5-40f5-9d33-a3da29118b3a.woff2?v=1786660362', 'vendor/fonts/gotham-book.woff2')
    $content = $content.Replace('https://cdn.shopify.com/s/files/1/0384/6721/files/Aleo-Regular.ttf?v=1619025153', 'vendor/fonts/Aleo-Regular.ttf')
    
    # 3. Add CSS unhide rule in <head> (after <head> tag)
    $content = $content.Replace('<head><meta charSet', '<head><style>div[hidden]{display:block!important}template{display:block!important}template>*,#B\:0,#B\:1,#B\:2{display:contents!important}</style><meta charSet')
    $content = $content.Replace('<head><meta charset', '<head><style>div[hidden]{display:block!important}template{display:block!important}template>*,#B\:0,#B\:1,#B\:2{display:contents!important}</style><meta charset')
    
    # 4. Remove Hydrogen module script
    do {
        $idx = $content.IndexOf('type="module"')
        if ($idx -ge 0) {
            $start = $content.LastIndexOf('<script', $idx)
            $end = $content.IndexOf('</script>', $idx) + 9
            if ($start -ge 0 -and $end -ge $start) {
                $content = $content.Substring(0, $start) + $content.Substring($end)
            } else { break }
        }
    } while ($idx -ge 0)
    
    # 5. Remove async __remixContext.r() calls
    do {
        $idx = $content.IndexOf('__remixContext.r(')
        if ($idx -ge 0) {
            $start = $content.LastIndexOf('<script', $idx)
            $end = $content.IndexOf('</script>', $idx) + 9
            if ($start -ge 0 -and $end -ge $start) {
                $content = $content.Substring(0, $start) + $content.Substring($end)
            } else { break }
        }
    } while ($idx -ge 0)
    
    # 6. Remove __remixContext definition
    do {
        $idx = $content.IndexOf('<script>window.__remixContext')
        if ($idx -ge 0) {
            $end = $content.IndexOf('</script>', $idx) + 9
            if ($end -ge $idx) {
                $content = $content.Substring(0, $idx) + $content.Substring($end)
            } else { break }
        }
    } while ($idx -ge 0)
    
    # 7. Remove modulepreload links
    do {
        $idx = $content.IndexOf('rel="modulepreload"')
        if ($idx -ge 0) {
            $start = $content.LastIndexOf('<link', $idx)
            $end = $content.IndexOf('/>', $idx) + 2
            if ($start -ge 0 -and $end -ge $start) {
                $content = $content.Substring(0, $start) + $content.Substring($end)
            } else { break }
        }
    } while ($idx -ge 0)
    
    # 8. Add our scripts before </body>
    $ourStuff = '<script>document.querySelectorAll(''a[href]'').forEach(function(a){var h=a.getAttribute(''href'');if(h&&h.startsWith(''/'')&&!h.startsWith(''//''))a.setAttribute(''href'',''https://nomadgoods.com''+h)});</script><script src="nomad-interact.js" defer></script><div id="embed"></div><script defer data-gorgias-loader-help-center data-gorgias-help-center-uid="xn86ljw5" src="https://help-center.gorgias.help/api/help-centers/loader.js?v=2"></script>'
    $content = $content.Replace('</body></html>', $ourStuff + '</body></html>')
    
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        Write-Output "Processed: $($file.Name)"
    } else {
        Write-Output "No changes: $($file.Name)"
    }
}

Write-Output "`nAll files processed!"