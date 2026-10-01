@echo off
setlocal EnableExtensions
title HSPI Client

rem  Avvia HSPI Client: si allinea alla versione del portale, accende il motore locale
rem  (AI e lavori pesanti su questo PC) e apre il portale nel browser.
rem  Lascia questa finestra aperta (anche ridotta a icona) mentre usi il portale.

set "DIR=%~dp0"
set "NODE=%DIR%node.exe"
if not exist "%NODE%" set "NODE=node"
"%NODE%" --disable-warning=ExperimentalWarning "%DIR%app\hspi-client.js" %*
if errorlevel 1 pause
