@echo off
setlocal EnableExtensions
title HSPI Team Manager - backup

rem ============================================================
rem  Backup completo adesso: data, progetti, immagini, web app.
rem  Va nella cartella Backup (o in quella scelta in Sistema -> Backup).
rem  Il portale fa comunque un backup da solo una volta al giorno.
rem ============================================================

set "ROOT=%~dp0"
rem --- Node.js: prima quello portatile nella cartella del progetto, poi quello installato
set "NODE="
for /d %%D in ("%ROOT%node-v*-win-x64") do if exist "%%D\node.exe" set "NODE=%%D\node.exe"
if not defined NODE for /d %%D in ("%ROOT%..\node-v*-win-x64") do if exist "%%D\node.exe" set "NODE=%%D\node.exe"
if not defined NODE where node >nul 2>nul && set "NODE=node"

if not defined NODE (
    echo  Node.js non trovato.
    pause
    exit /b 1
)
"%NODE%" --disable-warning=ExperimentalWarning "%ROOT%scripts\backup.js" manuale
pause
