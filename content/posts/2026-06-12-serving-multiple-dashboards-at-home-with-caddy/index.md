---
ai: false
ai-tested-date:
author: "Tristan Madden"
categories:
  - "Home Lab"
  - "Networking"
  - "Hugo"
date: 2026-06-12
draft: false
summary: "Notes for serving multiple local Hugo dashboards from one Windows host on port 80 with Caddy and home.arpa DNS entries on an OpenWrt router."
tags:
  - "caddy"
  - "hugo"
  - "home-arpa"
  - "openwrt"
  - "dnsmasq"
  - "dashboards"
title: "Serving Multiple Home Dashboards on Port 80 with Caddy"
toc: true
usePageBundles: true
---

## Goal

I wanted multiple local Hugo dashboards to be available on normal HTTP port 80 from the home network:

```text
http://flashcards.home.arpa/
http://mealplanner.home.arpa/
```

Both names point to the same Windows machine, Hermes, at `192.168.8.172`. Caddy listens on port 80 and routes by hostname. Each Hugo site listens only on a private localhost port.

The important pattern is:

```text
Browser -> router DNS -> 192.168.8.172:80 -> Caddy -> Hugo backend
```

## Why home.arpa

Use `home.arpa`, not `home`, `home.arp`, or `local`.

`home.arpa` is the special-use domain reserved for residential home networks by [RFC 8375: Special-Use Domain 'home.arpa.'](https://www.rfc-editor.org/info/rfc8375/). The RFC says names ending in `.home.arpa.` are locally significant inside a home network and are not globally unique.

I initially tried names like `mealplanner.home` and `mealplanner.local`, but the final working setup uses:

```text
mealplanner.home.arpa
flashcards.home.arpa
```

## Current Setup

Hermes has the static DHCP lease:

```text
Hermes -> 192.168.8.172
```

The router is:

```text
192.168.8.1
```

Caddy owns port 80:

```text
0.0.0.0:80 -> caddy.exe
```

The Hugo backends are private to Hermes:

```text
Flash Cards         -> 127.0.0.1:1313
Family Meal Planner -> 127.0.0.1:1314
```

The Caddy routing is:

```text
flashcards.home.arpa  -> 127.0.0.1:1313
mealplanner.home.arpa -> 127.0.0.1:1314
```

## Caddyfile

The Caddy config lives here:

```text
C:\GitHub\Caddy\Caddyfile
```

Current contents:

```caddyfile
{
    auto_https off
}

http://flashcards.home.arpa {
    reverse_proxy 127.0.0.1:1313
}

http://mealplanner.home.arpa {
    reverse_proxy 127.0.0.1:1314
}
```

`auto_https off` matters because these are plain HTTP-only home-network names. Without that, Caddy may try to manage certificates for names that only exist inside the house.

## Starting the Dashboards

The start script lives here:

```text
C:\GitHub\Caddy\start-dashboards.bat
```

The useful shape of the script is:

```bat
@echo off
setlocal

set "HUGO=C:\Users\Hermes\AppData\Local\Microsoft\WinGet\Packages\Hugo.Hugo.Extended_Microsoft.Winget.Source_8wekyb3d8bbwe\hugo.exe"
set "CADDY=C:\Users\Hermes\AppData\Local\Microsoft\WinGet\Packages\CaddyServer.Caddy_Microsoft.Winget.Source_8wekyb3d8bbwe\caddy.exe"
set "CADDYFILE=C:\GitHub\Caddy\Caddyfile"

echo Stopping existing Hugo/Caddy processes...
taskkill /IM hugo.exe /F >nul 2>nul
taskkill /IM caddy.exe /F >nul 2>nul

echo Starting Flash Cards Hugo backend on 127.0.0.1:1313...
start "Flash Cards Hugo" /D "C:\GitHub\Flash-Cards" "%HUGO%" server --bind 127.0.0.1 --port 1313 --baseURL http://flashcards.home.arpa/ --appendPort=false --disableFastRender --renderToMemory

echo Starting Family Meal Planner Hugo backend on 127.0.0.1:1314...
start "Family Meal Planner Hugo" /D "C:\GitHub\Family-Meal-Planner" "%HUGO%" server --bind 127.0.0.1 --port 1314 --baseURL http://mealplanner.home.arpa/ --appendPort=false --disableFastRender --renderToMemory

echo Starting Caddy reverse proxy on port 80...
start "Caddy Reverse Proxy" /D "C:\GitHub\Caddy" "%CADDY%" run --config "%CADDYFILE%" --adapter caddyfile

echo.
echo Dashboards started:
echo   http://flashcards.home.arpa/
echo   http://mealplanner.home.arpa/
echo.
endlocal
```

The stop script lives here:

```text
C:\GitHub\Caddy\stop-dashboards.bat
```

Contents:

```bat
@echo off
echo Stopping dashboard Hugo/Caddy processes...
taskkill /IM hugo.exe /F >nul 2>nul
taskkill /IM caddy.exe /F >nul 2>nul
echo Done.
```

The login startup shim lives here:

```text
C:\Users\Hermes\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\start-dashboards.bat
```

Contents:

```bat
@echo off
call "C:\GitHub\Caddy\start-dashboards.bat"
```

## Router DNS Entries

The router is a GL.iNet/OpenWrt router at `192.168.8.1`. SSH in:

```powershell
ssh root@192.168.8.1
```

Add each dashboard name as a dnsmasq domain entry pointing to Hermes:

```sh
uci add dhcp domain
uci set dhcp.@domain[-1].name='mealplanner.home.arpa'
uci set dhcp.@domain[-1].ip='192.168.8.172'

uci add dhcp domain
uci set dhcp.@domain[-1].name='flashcards.home.arpa'
uci set dhcp.@domain[-1].ip='192.168.8.172'

uci commit dhcp
/etc/init.d/dnsmasq restart
```

Verify the router config:

```sh
uci show dhcp | grep home.arpa
```

Expected entries:

```text
dhcp.@domain[2].name='mealplanner.home.arpa'
dhcp.@domain[2].ip='192.168.8.172'
dhcp.@domain[3].name='flashcards.home.arpa'
dhcp.@domain[3].ip='192.168.8.172'
```

Verify DNS resolution through the router:

```sh
nslookup mealplanner.home.arpa 192.168.8.1
nslookup flashcards.home.arpa 192.168.8.1
```

Both should return:

```text
Address: 192.168.8.172
```

## Verifying Caddy Routing

From Hermes, verify that Caddy routes by the `Host` header:

```powershell
curl.exe -H "Host: flashcards.home.arpa" http://127.0.0.1/
curl.exe -H "Host: mealplanner.home.arpa" http://127.0.0.1/
```

The logged verification found:

```text
flashcards.home.arpa  -> <title>Flash Cards
mealplanner.home.arpa -> <title>Family Meal Planner - Family Meal Planner
```

Also check that Caddy is the only thing listening on public port 80:

```powershell
netstat -ano | findstr ":80"
tasklist /FI "IMAGENAME eq caddy.exe"
tasklist /FI "IMAGENAME eq hugo.exe"
```

The healthy state is:

```text
caddy.exe -> 0.0.0.0:80
hugo.exe  -> 127.0.0.1:1313
hugo.exe  -> 127.0.0.1:1314
```

If a Hugo process is listening directly on `0.0.0.0:80`, stop everything and restart with `C:\GitHub\Caddy\start-dashboards.bat`. Caddy should be the only public listener.

## Adding Another Dashboard

Use this checklist when adding the next local dashboard.

1. Clone or place the Hugo site under `C:\GitHub`.

Example:

```powershell
git clone https://github.com/trimad/New-Dashboard C:\GitHub\New-Dashboard
```

2. Pick the next unused backend port.

Current ports:

```text
1313 -> flashcards
1314 -> mealplanner
```

So the next one should probably be:

```text
1315 -> newdashboard
```

3. Add a new Hugo backend line to `C:\GitHub\Caddy\start-dashboards.bat`.

Template:

```bat
start "New Dashboard Hugo" /D "C:\GitHub\New-Dashboard" "%HUGO%" server --bind 127.0.0.1 --port 1315 --baseURL http://newdashboard.home.arpa/ --appendPort=false --disableFastRender --renderToMemory
```

4. Add a new Caddy site block to `C:\GitHub\Caddy\Caddyfile`.

Template:

```caddyfile
http://newdashboard.home.arpa {
    reverse_proxy 127.0.0.1:1315
}
```

5. Add the router DNS entry.

On the router:

```sh
uci add dhcp domain
uci set dhcp.@domain[-1].name='newdashboard.home.arpa'
uci set dhcp.@domain[-1].ip='192.168.8.172'
uci commit dhcp
/etc/init.d/dnsmasq restart
```

6. Restart the dashboard stack.

On Hermes:

```powershell
C:\GitHub\Caddy\stop-dashboards.bat
C:\GitHub\Caddy\start-dashboards.bat
```

7. Verify DNS and routing.

```powershell
nslookup newdashboard.home.arpa 192.168.8.1
curl.exe -H "Host: newdashboard.home.arpa" http://127.0.0.1/
```

Then test from another device on Wi-Fi:

```text
http://newdashboard.home.arpa/
```

## Troubleshooting Notes

- If `nslookup` fails, fix the router DNS entry first. Caddy cannot route a name that the client cannot resolve.
- If `nslookup` works but the page is wrong, check the Caddyfile host block and the Hugo backend port.
- If the page loads but links include `:1313`, `:1314`, or another backend port, make sure the Hugo command includes `--baseURL http://name.home.arpa/ --appendPort=false`.
- If port 80 is already in use, run `netstat -ano | findstr ":80"` and stop the process that owns it before starting Caddy.
- Avoid `.local` for this setup. `.local` is commonly handled by mDNS, which is not the same thing as the router's normal DNS host entries.
