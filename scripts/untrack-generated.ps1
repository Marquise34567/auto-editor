param()

# Stage .gitignore
git add .gitignore

# $dirs to untrack if present
$dirs = @('node_modules','.next','out','build','dist','tmp','uploads','videos','artifacts','outputs','storage','.vercel','.firebase','.cache')
foreach($d in $dirs){
    if(Test-Path $d){
        Write-Host "Untracking directory: $d"
        git rm -r --cached $d -f 2>$null
    }
}

# $patterns to untrack by extension
$patterns = @('*.mp4','*.mov','*.webm','*.zip','*.tar.gz','*.tar','*.gz','*.env','*.env.*','*.log')
foreach($p in $patterns){
    $files = git ls-files -- $p 2>$null
    foreach($f in $files){
        if($f){
            Write-Host "Untracking file: $f"
            git rm --cached --ignore-unmatch -- $f
        }
    }
}

# Commit if any changes
try {
    git commit -m 'chore: ignore and untrack build artifacts, media, and env files' -q
} catch {
    Write-Host "No changes to commit"
}
