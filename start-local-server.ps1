$port = 8000

Write-Host "Starting local server on http://localhost:$port"

if (Test-Path .\server.js -and (Get-Command node -ErrorAction SilentlyContinue)) {
    node server.js
    return
}

function Start-PythonServer {
    if (Get-Command python -ErrorAction SilentlyContinue) {
        python -m http.server $port
        return $true
    }

    if (Get-Command python3 -ErrorAction SilentlyContinue) {
        python3 -m http.server $port
        return $true
    }

    return $false
}

if (-not (Start-PythonServer)) {
    Write-Host "Node and server.js not found. Install Node.js or use a static server."
    Write-Host "Example: npm install && npm start"
    exit 1
}
