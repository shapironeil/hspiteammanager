@echo off
setlocal EnableExtensions

rem ============================================================
rem  Avvia il portale APERTO ALLA RETE LOCALE, cosi' i colleghi
rem  sulla stessa rete possono collegarsi.
rem
rem  Windows chiede il permesso del firewall per Node.js: senza un
rem  account amministratore la richiesta non si puo' accettare e
rem  gli altri PC restano bloccati (sul tuo il portale funziona
rem  comunque). Vedi docs\ACCESSO-RETE.md per cosa chiedere all'IT.
rem ============================================================

set "HOST=0.0.0.0"
call "%~dp0avvia.bat"
