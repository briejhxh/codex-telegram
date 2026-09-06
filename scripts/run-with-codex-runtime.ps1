param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("dev", "setup", "login", "build", "start", "typecheck", "test", "check", "plugin:validate", "migrate-legacy-config")]
  [string]$Script,
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Arguments
)

$dependencies = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies"
$nodeBin = Join-Path $dependencies "node\bin"
$pnpm = Join-Path $dependencies "bin\fallback\pnpm.cmd"

if (-not (Test-Path (Join-Path $nodeBin "node.exe")) -or -not (Test-Path $pnpm)) {
  throw "Codex bundled Node.js runtime was not found. Install Node.js LTS from https://nodejs.org/ and reopen PowerShell."
}

$env:Path = "$nodeBin;$env:Path"
& $pnpm run $Script @Arguments
exit $LASTEXITCODE
