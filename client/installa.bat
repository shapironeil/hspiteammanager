@echo off
setlocal EnableExtensions
title HSPI Client - installazione

rem ============================================================
rem  Installa HSPI Client sul TUO PC, senza diritti di
rem  amministratore: tutto va in %LOCALAPPDATA%\HSPI-Client.
rem  - copia il programma;
rem  - scarica dal portale il motore Node.js (se non c'e' gia');
rem  - crea il collegamento "HSPI" sul desktop;
rem  - avvia il programma, che si aggiorna da solo alla stessa
rem    versione del portale.
rem  Si puo' rilanciare: aggiorna senza perdere niente.
rem ============================================================

set "SRC=%~dp0"
set "DEST=%LOCALAPPDATA%\HSPI-Client"
set "HOSTURL="
if exist "%SRC%host.txt" set /p HOSTURL=<"%SRC%host.txt"
if not defined HOSTURL set /p HOSTURL=Indirizzo del portale (es. https://pc-ufficio.tail1234.ts.net): 

echo.
echo  Installo HSPI Client in %DEST%
echo  Portale: %HOSTURL%
echo.

if not exist "%DEST%" mkdir "%DEST%"
xcopy "%SRC%app" "%DEST%\app\" /E /I /Y /Q >nul
if errorlevel 1 goto :errore
copy /Y "%SRC%HSPI.bat" "%DEST%\HSPI.bat" >nul
copy /Y "%SRC%LEGGIMI.txt" "%DEST%\LEGGIMI.txt" >nul
> "%DEST%\host.txt" echo %HOSTURL%

rem --- Node.js: quello gia' presente, altrimenti lo scarica dal portale (circa 80 MB, una volta sola)
set "HAVENODE="
if exist "%DEST%\node.exe" set "HAVENODE=1"
if not defined HAVENODE (
    echo  Scarico il motore Node.js dal portale...
    curl -f -L -s -o "%DEST%\node.exe.part" "%HOSTURL%/scarica/node.exe"
    if errorlevel 1 (
        where node >nul 2>nul
        if errorlevel 1 goto :nonode
        echo  Uso il Node.js gia' installato sul PC.
    ) else (
        move /Y "%DEST%\node.exe.part" "%DEST%\node.exe" >nul
    )
)

rem --- collegamento sul desktop (finestra ridotta a icona)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\HSPI.lnk');$s.TargetPath='%DEST%\HSPI.bat';$s.WorkingDirectory='%DEST%';$s.WindowStyle=7;$s.Description='HSPI Team Manager';$s.Save()" >nul 2>nul
if errorlevel 1 copy /Y "%DEST%\HSPI.bat" "%USERPROFILE%\Desktop\HSPI.bat" >nul

echo.
echo  Fatto. D'ora in poi apri HSPI dal collegamento sul desktop.
echo.
start "" "%DEST%\HSPI.bat"
exit /b 0

:nonode
echo.
echo  Non riesco a scaricare Node.js dal portale e non ne trovo uno sul PC.
echo  Controlla di essere collegato al portale (Tailscale acceso) e riprova.
echo.
pause
exit /b 1

:errore
echo.
echo  ERRORE: non riesco a copiare i file in %DEST%.
pause
exit /b 1
