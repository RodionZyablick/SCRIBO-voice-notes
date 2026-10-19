@echo off
powershell -NoProfile -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut([Environment]::GetFolderPath(\x27Desktop\x27)+\x27\Scribo.lnk\x27);$s.TargetPath=\x27%~dp0start.bat\x27;$s.WorkingDirectory=\x27%~dp0\x27;$s.IconLocation=\x27%~dp0scribo.ico\x27;$s.Save()"
echo Shortcut Scribo created on Desktop.
pause
