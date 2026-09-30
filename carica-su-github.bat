@echo off
setlocal EnableExtensions
title HSPI Team Manager - carica su GitHub

rem ============================================================
rem  Carica su GitHub i file nuovi o modificati di questa cartella
rem  (loghi, sfondi, web app in apptools, ecc.), cosi' anche chi
rem  sviluppa il portale li vede.
rem
rem  NON vengono mai caricati (sono esclusi in .gitignore):
rem    data\      database, password e file caricati nel portale
rem    progetti\  file dei progetti: dati aziendali
rem    node-v...  Node.js portatile
rem    PortableGit
rem
rem  Serve Git. Senza permessi di amministratore: scarica
rem  "PortableGit" da https://git-scm.com/download/win ed estrailo
rem  in una cartella "PortableGit" dentro quella del progetto.
rem  Al primo caricamento Git apre il browser per l'accesso a GitHub.
rem
rem  NOTA TECNICA: il lavoro sta in un unico blocco tra parentesi,
rem  cosi' lo script resta in memoria anche se viene aggiornato.
rem ============================================================

set "ROOT=%~dp0"
set "REPO=shapironeil/hspiteammanager"
set "BRANCH=main"

rem --- Git: prima quello portatile nella cartella del progetto (PortableGit), poi quello installato
set "GIT="
for /d %%D in ("%ROOT%PortableGit*") do if exist "%%D\cmd\git.exe" set "GIT=%%D\cmd\git.exe"
if not defined GIT for /d %%D in ("%ROOT%..\PortableGit*") do if exist "%%D\cmd\git.exe" set "GIT=%%D\cmd\git.exe"
if not defined GIT where git >nul 2>nul && set "GIT=git"
if not defined GIT goto :nogit

(
    echo.
    echo  HSPI Team Manager - caricamento su GitHub
    echo  Repository: %REPO%  ^(ramo %BRANCH%^)
    echo.
    if not exist "%ROOT%.git" (
        echo  Prima volta: collego questa cartella al repository e la allineo...
        "%GIT%" -C "%ROOT%." init -q -b %BRANCH% || goto :errore
        "%GIT%" -C "%ROOT%." remote add origin https://github.com/%REPO%.git || goto :errore
        "%GIT%" -C "%ROOT%." fetch -q origin %BRANCH% || goto :errore
        "%GIT%" -C "%ROOT%." reset -q --hard origin/%BRANCH% || goto :errore
    )
    "%GIT%" -C "%ROOT%." config user.name >nul 2>nul || "%GIT%" -C "%ROOT%." config user.name "%USERNAME%"
    "%GIT%" -C "%ROOT%." config user.email >nul 2>nul || "%GIT%" -C "%ROOT%." config user.email "%USERNAME%@users.noreply.github.com"
    "%GIT%" -C "%ROOT%." add -A || goto :errore
    "%GIT%" -C "%ROOT%." diff --cached --quiet && goto :niente
    echo  File che verranno caricati ^(A = nuovo, M = modificato, D = cancellato^):
    echo.
    "%GIT%" -C "%ROOT%." status --short
    echo.
    echo  ATTENZIONE: quello che carichi resta su GitHub. Controlla che
    echo  nell'elenco non ci siano documenti aziendali o dati riservati.
    echo.
    choice /c SN /m "  Carico questi file su GitHub"
    if errorlevel 2 goto :annullato
    "%GIT%" -C "%ROOT%." commit -q -m "Risorse caricate dal PC" || goto :errore
    "%GIT%" -C "%ROOT%." pull -q --rebase origin %BRANCH% || goto :errore
    "%GIT%" -C "%ROOT%." push origin HEAD:%BRANCH% || goto :errore
    echo.
    echo  Fatto: i file sono su GitHub.
    echo.
    pause
    exit /b 0
)

:niente
echo  Niente da caricare: GitHub ha gia' tutto.
echo.
pause
exit /b 0

:annullato
"%GIT%" -C "%ROOT%." reset -q
echo.
echo  Annullato: non e' stato caricato niente.
echo.
pause
exit /b 0

:nogit
echo.
echo  Git non trovato.
echo  Senza permessi di amministratore: scarica "PortableGit" da
echo  https://git-scm.com/download/win ed estrailo in una cartella
echo  chiamata PortableGit dentro:
echo  %ROOT%
echo  Deve risultare: %ROOT%PortableGit\cmd\git.exe
echo.
pause
exit /b 1

:errore
echo.
echo  ERRORE: caricamento non riuscito.
echo  - Controlla la connessione e di aver fatto l'accesso a GitHub
echo    con un account che puo' scrivere nel repository.
echo  - GitHub rifiuta i file piu' grandi di 100 MB.
echo  - Se il messaggio parla di conflitti, chiedi a Claude come procedere.
echo.
pause
exit /b 1
