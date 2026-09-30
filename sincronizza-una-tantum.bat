@echo off
setlocal EnableExtensions
title HSPI Team Manager - importazione una tantum

rem ============================================================
rem  Importazione una tantum: COPIA dentro un progetto del portale
rem  i file che oggi stanno altrove, per esempio l'archivio di
rem  Verbale Studio.
rem
rem  - L'origine non viene toccata: niente viene spostato o cancellato.
rem  - Non sovrascrive mai un file gia' presente nel progetto.
rem  - Alla fine scrive un rapporto nella cartella del progetto.
rem
rem  Da usare una volta sola: da li' in poi i file si gestiscono
rem  dal portale, nella scheda del progetto.
rem ============================================================

set "ROOT=%~dp0"

rem --- Node.js: prima quello portatile nella cartella del progetto, poi quello installato
set "NODE="
for /d %%D in ("%ROOT%node-v*-win-x64") do if exist "%%D\node.exe" set "NODE=%%D\node.exe"
if not defined NODE for /d %%D in ("%ROOT%..\node-v*-win-x64") do if exist "%%D\node.exe" set "NODE=%%D\node.exe"
if not defined NODE where node >nul 2>nul && set "NODE=node"
if not defined NODE goto :nonode

"%NODE%" "%ROOT%scripts\importa-in-progetto.js" %*
echo.
pause
exit /b 0

:nonode
echo.
echo  Node.js non trovato: metti la cartella node-v...-win-x64 dentro
echo  %ROOT%
echo  come per avvia.bat, poi riprova.
echo.
pause
exit /b 1
