Add-Type -AssemblyName System.Drawing
$source = "c:\Users\TECNO PC\Desktop\thanksgiving\public\assets\images\praisepage.jpeg"
$dest192 = "c:\Users\TECNO PC\Desktop\thanksgiving\public\assets\images\icon-192.png"
$dest512 = "c:\Users\TECNO PC\Desktop\thanksgiving\public\assets\images\icon-512.png"

Write-Output "Loading source image from $source..."
$img = [System.Drawing.Image]::FromFile($source)

# Create 192x192
Write-Output "Resizing to 192x192..."
$bmp192 = New-Object System.Drawing.Bitmap(192, 192)
$graph192 = [System.Drawing.Graphics]::FromImage($bmp192)
$graph192.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graph192.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graph192.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graph192.DrawImage($img, 0, 0, 192, 192)
$bmp192.Save($dest192, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp192.Dispose()
$graph192.Dispose()

# Create 512x512
Write-Output "Resizing to 512x512..."
$bmp512 = New-Object System.Drawing.Bitmap(512, 512)
$graph512 = [System.Drawing.Graphics]::FromImage($bmp512)
$graph512.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graph512.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graph512.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graph512.DrawImage($img, 0, 0, 512, 512)
$bmp512.Save($dest512, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp512.Dispose()
$graph512.Dispose()

$img.Dispose()
Write-Output "Icons successfully generated!"
