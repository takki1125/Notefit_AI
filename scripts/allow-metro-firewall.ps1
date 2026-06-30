# Allow inbound Metro (Expo dev server) traffic on private networks.
# Run once in an elevated PowerShell:  .\scripts\allow-metro-firewall.ps1
$ErrorActionPreference = "Stop"
$ruleName = "NoteFit AI Metro (TCP 8081)"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Firewall rule already exists: $ruleName"
  exit 0
}
New-NetFirewallRule `
  -DisplayName $ruleName `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort 8081 `
  -Profile Private `
  -Description "Expo Metro bundler for NoteFit AI dev client on LAN"
Write-Host "Created firewall rule: $ruleName (Private networks, TCP 8081)"
