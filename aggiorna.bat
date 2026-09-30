@echo off
setlocal EnableExtensions
title HSPI Team Manager - aggiorna

rem ============================================================
rem  Aggiorna i file del progetto all'ultima versione su GitHub
rem  e avvia subito il portale, senza fare domande.
rem  Non vengono toccati: la cartella "data" (database e file
rem  caricati), la cartella di Node.js e le immagini in "branding".
rem
rem  NOTA TECNICA: tutto il lavoro sta in un unico blocco tra
rem  parentesi, cosi' lo script resta in memoria anche se
rem  l'aggiornamento sostituisce questo stesso file.
rem ============================================================

set "ROOT=%~dp0"
set "REPO=shapironeil/hspiteammanager"
set "BRANCH=main"
set "TMPDIR=%TEMP%\hspitm_%RANDOM%"
set "USEGIT=0"
where git >nul 2>nul
if not errorlevel 1 if exist "%ROOT%.git" set "USEGIT=1"

(
    echo.
    echo  HSPI Team Manager - aggiornamento da GitHub
    echo  Repository: %REPO%  ^(ramo %BRANCH%^)
    echo.
    if "%USEGIT%"=="1" (
        echo  Aggiorno con git pull...
        git -C "%ROOT%." pull --ff-only origin %BRANCH% || goto :errore
    ) else (
        echo  Scarico lo ZIP del ramo %BRANCH%...
        mkdir "%TMPDIR%" || goto :errore
        curl -f -L -o "%TMPDIR%\repo.zip" "https://github.com/%REPO%/archive/refs/heads/%BRANCH%.zip" || goto :errore
        tar -xf "%TMPDIR%\repo.zip" -C "%TMPDIR%" || goto :errore
        robocopy "%TMPDIR%\hspiteammanager-%BRANCH%" "%ROOT%." /E /XD data /NFL /NDL /NJH /NJS >nul
        if errorlevel 8 goto :errore
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
echo  - Se il repository e' privato serve Git: https://git-scm.com/download/win
echo  - Se hai modificato a mano dei file del progetto, Git puo' rifiutare
echo    l'aggiornamento: in quel caso chiedi a Claude come procedere.
echo.
if exist "%TMPDIR%" rmdir /s /q "%TMPDIR%" >nul 2>nul
pause
exit /b 1
