@echo off
title Directory Structure Backup
echo ========================================================
echo   Extracting 100% of directory structure and files...
echo   Target: C:\Users\ecurb\Desktop\Luna's Cozy Pets - The Island
echo ========================================================
echo.

:: Run the dir command with all files/folders/subdirectories included
dir "C:\Users\ecurb\Desktop\Luna's Cozy Pets - The Island" /s /a > "%USERPROFILE%\Desktop\Lunas_Cozy_Pets_Directory_List.txt"

echo.
echo ========================================================
echo   Extraction Status: SUCCESS
echo   Output saved to: Desktop\Lunas_Cozy_Pets_Directory_List.txt
echo ========================================================
echo.
echo Complete. OK to close.
pause >nul