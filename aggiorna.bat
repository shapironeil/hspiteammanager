@echo off
setlocal EnableExtensions
title HSPI Team Manager - aggiorna

rem ============================================================
rem  Aggiorna il portale all'ultima versione e lo avvia.
rem  Tutto il lavoro lo fa scripts\aggiorna.js:
rem    - confronta la versione installata (version.json) con quella
rem      disponibile: se sono uguali non fa niente;
rem    - ferma il portale, fa un BACKUP completo, installa la nuova
rem      versione scambiando le cartelle del programma;
rem    - prova ad avviarla: se non parte rimette tutto com'era.
rem  Si puo' rilanciare quante volte si vuole.
rem  Non tocca MAI: data, progetti, Backup, apptools, Node.js.
rem
rem  Opzioni (in fondo al comando):  --forza   --solo-controllo
rem                                  --da "cartella con la nuova versione"
rem
rem  NOTA TECNICA: tutto sta in un unico blocco tra parentesi, cosi'
rem  il file resta in memoria anche se l'aggiornamento lo sostituisce.
rem ============================================================

set "ROOT=%~dp0"
rem --- Node.js: prima quello portatile nella cartella del progetto, poi quello installato
set "NODE="
for /d %%D in ("%ROOT%node-v*-win-x64") do if exist "%%D\node.exe" set "NODE=%%D\node.exe"
if not defined NODE for /d %%D in ("%ROOT%..\node-v*-win-x64") do if exist "%%D\node.exe" set "NODE=%%D\node.exe"
if not defined NODE where node >nul 2>nul && set "NODE=node"

(
    if not defined NODE (
        echo.
        echo  Node.js non trovato: metti la cartella node-v...-win-x64 in %ROOT%
        echo.
        pause
        exit /b 1
    )
    "%NODE%" --disable-warning=ExperimentalWarning "%ROOT%scripts\aggiorna.js" %*
    if errorlevel 1 (
        echo.
        echo  L'aggiornamento non e' andato a buon fine: il portale resta alla versione di prima.
        echo  - Controlla la connessione a internet.
        echo  - Se il repository e' privato serve Git ^(anche PortableGit nella cartella del progetto^).
        echo.
        pause
    )
    call "%ROOT%avvia.bat"
    exit /b 0
)
