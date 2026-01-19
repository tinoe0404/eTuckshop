$files = Get-ChildItem -Path "src\lib\http-service" -Recurse -Filter "schema.ts"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Remove { required_error: 'message' } from z.string() and z.number()
    $content = $content -replace '\.string\(\s*\{\s*required_error:\s*''[^'']+''\s*\}\s*\)', '.string()'
    $content = $content -replace '\.number\(\s*\{\s*required_error:\s*''[^'']+''\s*\}\s*\)', '.number()'
    
    # Change .min(number, { message: 'text' }) to .min(number, 'text')
    $content = $content -replace '\.min\((\d+),\s*\{\s*message:\s*(''[^'']+'')\s*\}\)', '.min($1, $2)'
    $content = $content -replace '\.max\((\d+),\s*\{\s*message:\s*(''[^'']+'')\s*\}\)', '.max($1, $2)'
    
    # Change .email({ message: 'text' }) to .email('text')
    $content = $content -replace '\.email\(\s*\{\s*message:\s*(''[^'']+'')\s*\}\)', '.email($1)'
    
    # Change .regex(/pattern/, { message: 'text' }) to .regex(/pattern/, 'text')
    $content = $content -replace '\.regex\(([^,]+),\s*\{\s*message:\s*(''[^'']+'')\s*\}\)', '.regex($1, $2)'
   
    # Change .int({ message: 'text' }) to .int('text')
    $content = $content -replace '\.int\(\s*\{\s*message:\s*(''[^'']+'')\s*\}\)', '.int($1)'
    
    # Change .positive({ message: 'text' }) to .positive('text')
    $content = $content -replace '\.positive\(\s*\{\s*message:\s*(''[^'']+'')\s*\}\)', '.positive($1)'
    
    # Fix enum errorMap issues - just remove the whole errorMap parameter
    $content = $content -replace ',\s*\{\s*errorMap:\s*\([^\)]*\)\s*=>\s*\([^\)]*\)\s*\}', ''
    
    # Fix refine with object syntax
    $content = $content -replace '\.refine\(([^,]+),\s*\{\s*message:\s*(''[^'']+'')\s*\}\)', '.refine($1, $2)'
    
    Set-Content -Path $file.FullName -Value $content
    Write-Host "Fixed: $($file.FullName)"
}

Write-Host "Done!"
