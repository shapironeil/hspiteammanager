@echo off
setlocal EnableExtensions
title HSPI Team Manager - aggiorna

rem ============================================================
rem  Porta la cartella di lavoro all'ultima versione su GitHub e
rem  avvia subito il portale, senza fare domande:
rem    1. scarica i file nuovi e modificati;
rem    2. toglie i file del portale che la nuova versione non usa
rem       piu': spostati, rinominati o eliminati;
rem    3. all'avvio il portale aggiorna da solo il database.
rem  Non vengono toccati: la cartella "data" (database e file
rem  caricati), "progetti", Node.js e le tue immagini.
rem
rem  NOTA TECNICA: tutto il lavoro sta in un unico blocco tra
rem  parentesi, cosi' lo script resta in memoria anche se
rem  l'aggiornamento sostituisce questo stesso file.
rem ============================================================

set "ROOT=%~dp0"
set "REPO=shapironeil/hspiteammanager"
set "BRANCH=main"
set "TMPDIR=%TEMP%\hspitm_%RANDOM%"

rem --- Git: prima quello portatile nella cartella del progetto (PortableGit), poi quello installato
set "GIT="
for /d %%D in ("%ROOT%PortableGit*") do if exist "%%D\cmd\git.exe" set "GIT=%%D\cmd\git.exe"
if not defined GIT for /d %%D in ("%ROOT%..\PortableGit*") do if exist "%%D\cmd\git.exe" set "GIT=%%D\cmd\git.exe"
if not defined GIT where git >nul 2>nul && set "GIT=git"
set "USEGIT=0"
if defined GIT if exist "%ROOT%.git" set "USEGIT=1"

rem --- Node.js: prima quello portatile nella cartella del progetto, poi quello installato
set "NODE="
for /d %%D in ("%ROOT%node-v*-win-x64") do if exist "%%D\node.exe" set "NODE=%%D\node.exe"
if not defined NODE for /d %%D in ("%ROOT%..\node-v*-win-x64") do if exist "%%D\node.exe" set "NODE=%%D\node.exe"
if not defined NODE where node >nul 2>nul && set "NODE=node"

(
    echo.
    echo  HSPI Team Manager - aggiornamento da GitHub
    echo  Repository: %REPO%  ^(ramo %BRANCH%^)
    echo.
    if "%USEGIT%"=="1" (
        echo  Aggiorno con git pull...
        "%GIT%" -C "%ROOT%." pull --ff-only origin %BRANCH% || goto :errore
    ) else (
        echo  Scarico lo ZIP del ramo %BRANCH%...
        mkdir "%TMPDIR%" || goto :errore
        curl -f -L -o "%TMPDIR%\repo.zip" "https://github.com/%REPO%/archive/refs/heads/%BRANCH%.zip" || goto :errore
        tar -xf "%TMPDIR%\repo.zip" -C "%TMPDIR%" || goto :errore
        robocopy "%TMPDIR%\hspiteammanager-%BRANCH%" "%ROOT%." /E /XD data progetti /NFL /NDL /NJH /NJS >nul
        if errorlevel 8 goto :errore
        echo  Allineo la cartella di lavoro alla nuova versione...
        if defined NODE "%NODE%" "%ROOT%scripts\allinea-cartella.js" "%TMPDIR%\hspiteammanager-%BRANCH%"
        if not defined NODE echo  Node.js non trovato: i vecchi file non piu' usati restano nella cartella.
        rmdir /s /q "%TMPDIR%" >nul 2>nul
    )
    echo.
    echo  Aggiornamento completato. Avvio il portale...
    call "%ROOT%avvia.bat"
    exit /b 0
)

:errore
echo.
echo  ERRORE: aggiornamento non riuscito.
echo  - Controlla la connessione a internet.
echo  - Se il repository e' privato serve Git ^(anche PortableGit nella cartella del progetto^).
echo  - Se hai caricato file con carica-su-github.bat e Git segnala
echo    differenze, rilancia prima carica-su-github.bat.
echo.
if exist "%TMPDIR%" rmdir /s /q "%TMPDIR%" >nul 2>nul
pause
exit /b 1
