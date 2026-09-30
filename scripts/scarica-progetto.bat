@echo off
setlocal EnableExtensions
title HSPI Team Manager - scarica progetto

rem ============================================================
rem  Scarica o aggiorna il progetto HSPI Team Manager da GitHub.
rem  - Con Git installato: git clone / git pull
rem  - Senza Git: scarica lo ZIP del ramo (solo repository pubblico)
rem  Il progetto finisce nella sottocartella "hspiteammanager"
rem  accanto a questo file.
rem ============================================================

set "REPO=shapironeil/hspiteammanager"
set "BRANCH=main"
set "HERE=%~dp0"
set "DEST=%HERE%hspiteammanager"

echo.
echo  HSPI Team Manager - download da GitHub
echo  Repository: %REPO%  (ramo %BRANCH%)
echo.

where git >nul 2>nul
if errorlevel 1 goto :zip

rem --- Caso 1: lo script e' gia' dentro il progetto (cartella scripts) ---
if exist "%HERE%..\.git" (
    echo  Progetto trovato: aggiorno con git pull...
    git -C "%HERE%.." pull --ff-only origin %BRANCH%
    if errorlevel 1 goto :errore
    for %%I in ("%HERE%..") do set "DEST=%%~fI"
    goto :fatto
)

rem --- Caso 2: progetto gia' scaricato accanto allo script ---
if exist "%DEST%\.git" (
    echo  Progetto trovato: aggiorno con git pull...
    git -C "%DEST%" pull --ff-only origin %BRANCH%
    if errorlevel 1 goto :errore
    goto :fatto
)

rem --- Caso 3: primo download ---
echo  Primo download con git clone...
git clone --branch %BRANCH% "https://github.com/%REPO%.git" "%DEST%"
if errorlevel 1 goto :errore
goto :fatto

:zip
echo  Git non trovato: scarico lo ZIP del ramo %BRANCH%...
set "TMPDIR=%TEMP%\hspitm_%RANDOM%"
mkdir "%TMPDIR%" || goto :errore
curl -f -L -o "%TMPDIR%\repo.zip" "https://github.com/%REPO%/archive/refs/heads/%BRANCH%.zip"
if errorlevel 1 (
    echo.
    echo  Download ZIP non riuscito. Se il repository e' privato serve Git:
    echo  https://git-scm.com/download/win
    rmdir /s /q "%TMPDIR%" >nul 2>nul
    goto :errore
)
tar -xf "%TMPDIR%\repo.zip" -C "%TMPDIR%"
if errorlevel 1 (
    rmdir /s /q "%TMPDIR%" >nul 2>nul
    goto :errore
)
rem Copia i file senza cancellare quelli locali gia' presenti
robocopy "%TMPDIR%\hspiteammanager-%BRANCH%" "%DEST%" /E /NFL /NDL /NJH /NJS >nul
if errorlevel 8 (
    rmdir /s /q "%TMPDIR%" >nul 2>nul
    goto :errore
)
rmdir /s /q "%TMPDIR%" >nul 2>nul
goto :fatto

:fatto
echo.
echo  Fatto. Progetto in:
echo  %DEST%
echo.
pause
exit /b 0

:errore
echo.
echo  ERRORE: operazione non riuscita. Controlla la connessione
echo  e l'accesso al repository, poi riprova.
echo.
pause
exit /b 1
