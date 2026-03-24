Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:MySqlExe = $null
$script:PythonExe = $null

function Import-EnvFile {
    param(
        [string]$Path = ".env"
    )

    if (-not (Test-Path $Path)) {
        Write-Host "No .env file found at $Path. Using existing environment variables/defaults." -ForegroundColor Yellow
        return
    }

    Write-Host "Loading environment variables from $Path" -ForegroundColor Cyan

    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
            return
        }

        $parts = $line.Split("=", 2)
        $key = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"').Trim("'")

        if ($key) {
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)][string]$Title,
        [Parameter(Mandatory = $true)][scriptblock]$Action
    )

    Write-Host "`n=== $Title ===" -ForegroundColor Green
    & $Action
    if ($LASTEXITCODE -ne 0) {
        throw "Step failed: $Title"
    }
}

function Resolve-MySqlExe {
    $cmd = Get-Command mysql -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    $candidates = @(
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Workbench 8.0\mysql.exe",
        "C:\xampp\mysql\bin\mysql.exe"
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    throw "mysql.exe not found. Add MySQL bin to PATH or install MySQL CLI tools."
}

function Resolve-PythonExe {
    $venvPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
    if (Test-Path $venvPython) {
        return $venvPython
    }

    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    throw "python executable not found. Install Python or create .venv in project root."
}

function Invoke-MySqlFile {
    param(
        [Parameter(Mandatory = $true)][string]$SqlFile,
        [string]$Database
    )

    $user = if ($env:CAREOPS_DB_USER) { $env:CAREOPS_DB_USER } else { "root" }
    $dbHost = if ($env:CAREOPS_DB_HOST) { $env:CAREOPS_DB_HOST } else { "localhost" }
    $dbPort = if ($env:CAREOPS_DB_PORT) { $env:CAREOPS_DB_PORT } else { "3306" }
    $password = if ($env:CAREOPS_DB_PASSWORD) { $env:CAREOPS_DB_PASSWORD } else { "" }

    $args = @("--host=$dbHost", "--port=$dbPort", "--user=$user")
    if ($password -ne "") {
        $args += "--password=$password"
    }
    if ($Database) {
        $args += "--database=$Database"
    }

    $resolvedPath = (Resolve-Path $SqlFile).Path.Replace('\\', '/')
    $args += "--execute=source $resolvedPath"
    & $script:MySqlExe @args
}

Import-EnvFile
$script:MySqlExe = Resolve-MySqlExe
$script:PythonExe = Resolve-PythonExe

Invoke-Step -Title "Phase 2: Create OLTP schema" -Action {
    Invoke-MySqlFile -SqlFile "phase2_oltp\oltp_table.sql"
}

Invoke-Step -Title "Phase 3: Apply advanced DBMS features" -Action {
    Invoke-MySqlFile -SqlFile "phase3_adv\phase3_all.sql"
}

Invoke-Step -Title "Phase 4: Generate OLTP data" -Action {
    & $script:PythonExe phase4_genData\data.py
}

Invoke-Step -Title "Phase 5: Create DW schema" -Action {
    Invoke-MySqlFile -SqlFile "phase5_datawarehouse\createDW.sql"
}

Invoke-Step -Title "Phase 5 support: Populate dimensions" -Action {
    & $script:PythonExe phase5_datawarehouse\addData.py
}

Invoke-Step -Title "Phase 6: Run ETL" -Action {
    & $script:PythonExe phase6_etl\etl_code.py
}

Write-Host "`nAll demo steps completed successfully." -ForegroundColor Cyan
