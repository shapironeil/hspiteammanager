@echo off
setlocal EnableExtensions
title HSPI Team Manager - portale

rem ============================================================
rem  Avvia il portale su questo PC e apre il browser.
rem  Serve solo Node.js 22.13 o successivo (nessun altro pacchetto).
rem  Per usare un'altra porta:  set PORT=9000  prima di avviare.
rem ============================================================

set "ROOT=%~dp0"
if not defined PORT set "PORT=8080"

where node >nul 2>nul
if errorlevel 1 goto :nonode

node -e "require('node:sqlite')" >nul 2>nul
if errorlevel 1 goto :oldnode

echo.
echo  Avvio di HSPI Team Manager sulla porta %PORT%...
echo  Se Windows chiede il permesso per Node.js sulla rete, consenti
echo  l'accesso sulle reti private: serve ai colleghi per collegarsi.
echo.

start "" /min cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:%PORT%"
node --disable-warning=ExperimentalWarning "%ROOT%app\server.js"

echo.
echo  Il portale si e' fermato.
pause
exit /b 0

:oldnode
echo.
echo  La versione di Node.js installata e' troppo vecchia:
node -v
echo  Serve la 22.13 o successiva.
goto :installa

:nonode
echo.
echo  Node.js non e' installato su questo PC.

:installa
where winget >nul 2>nul
if errorlevel 1 goto :manuale
echo.
choice /c SN /m "  Installo Node.js LTS adesso con winget"
if errorlevel 2 goto :manuale
winget install -e --id OpenJS.NodeJS.LTS
echo.
echo  Installazione terminata. Chiudi questa finestra e rilancia avvia.bat.
pause
exit /b 0

:manuale
echo.
echo  Scarica e installa la versione LTS da https://nodejs.org
echo  poi rilancia avvia.bat.
echo.
pause
exit /b 1
