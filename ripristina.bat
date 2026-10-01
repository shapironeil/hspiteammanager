@echo off
setlocal EnableExtensions
title HSPI Team Manager - ripristino

rem ============================================================
rem  Rimette data, progetti, immagini e web app com'erano in un
rem  backup a scelta. Le cartelle attuali NON vengono cancellate:
rem  finiscono in .ripristino-precedente\<data>\
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
"%NODE%" --disable-warning=ExperimentalWarning "%ROOT%scripts\ripristina.js" %*
pause
