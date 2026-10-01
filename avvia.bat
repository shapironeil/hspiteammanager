@echo off
setlocal EnableExtensions
title HSPI Team Manager - portale

rem ============================================================
rem  Avvia il portale su questo PC e apre il browser.
rem
rem  Node.js viene cercato in quest'ordine:
rem    1. cartella portatile "node-v...-win-x64" dentro il progetto
rem       (es. node-v22.22.2-win-x64), senza installare niente
rem    2. stessa cartella, un livello sopra il progetto
rem    3. Node.js installato nel sistema
rem  Serve la versione 22.13 o successiva.
rem
rem  Il portale risponde SOLO su questo PC: cosi' Windows non chiede
rem  il permesso del firewall. Per aprirlo alla rete: avvia-rete.bat
rem  Per usare un'altra porta:  set PORT=9000  prima di avviare.
rem ============================================================

set "ROOT=%~dp0"
if not defined PORT set "PORT=8080"

set "NODE="
for /d %%D in ("%ROOT%node-v*-win-x64") do if exist "%%D\node.exe" set "NODE=%%D\node.exe"
if not defined NODE for /d %%D in ("%ROOT%..\node-v*-win-x64") do if exist "%%D\node.exe" set "NODE=%%D\node.exe"
if defined NODE goto :trovato
where node >nul 2>nul
if errorlevel 1 goto :nonode
set "NODE=node"

:trovato
"%NODE%" -e "require('node:sqlite')" >nul 2>nul
if errorlevel 1 goto :oldnode

echo.
echo  Node.js: %NODE%
echo  Avvio di HSPI Team Manager sulla porta %PORT%...
if /i "%HOST%"=="0.0.0.0" echo  Modalita' RETE: Windows puo' chiedere il permesso del firewall.
if /i not "%HOST%"=="0.0.0.0" echo  Modalita' SOLO QUESTO PC: nessuna richiesta del firewall.
echo.

start "" /min cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:%PORT%"
rem  Memoria del portale limitata (768 MB): l'host deve restare leggero, i lavori pesanti vanno sui client.
"%NODE%" --max-old-space-size=768 --disable-warning=ExperimentalWarning "%ROOT%app\server.js"

echo.
echo  Il portale si e' fermato.
pause
exit /b 0

:oldnode
echo.
echo  Il Node.js trovato e' troppo vecchio o non funziona:
echo  %NODE%
"%NODE%" -v
echo  Serve la versione 22.13 o successiva.
goto :istruzioni

:nonode
echo.
echo  Node.js non trovato.

:istruzioni
echo.
echo  Cosa fare: scarica lo ZIP "Windows Binary (.zip)" x64 da
echo  https://nodejs.org/en/download ed estrailo dentro questa cartella:
echo  %ROOT%
echo  Deve risultare, ad esempio:
echo  %ROOT%node-v22.22.2-win-x64\node.exe
echo  Poi rilancia avvia.bat.
echo.
pause
exit /b 1
