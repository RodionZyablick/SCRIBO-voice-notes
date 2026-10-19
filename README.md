SCRIBO - speak, it will write



FAST (any system, no installation)

  Open index.html by double clicking. Works: editor, translation, AI (Gemini key), tables, conversation.

  Speech: Chrome/Edge - built-in; Opera GX, Firefox, Safari - menu ☰ → More → Speech engine → “Whisper in the browser.”



ONE CLICK WITH WHISPER (more precisely, offline)

  Windows: start.bat Mac: start.command Linux: start.sh

  The script itself will find Python, create an environment, install components, select a free port and open the browser.

  No Python or Internet - the light version will open. Desktop shortcut (Windows): make_shortcut.bat.

  Settings: WHISPER_MODEL=tiny|base|small|medium, WHISPER_DEVICE=cpu|cuda.



AS A SITE/APP

  Upload the entire folder to any static hosting (GitHub Pages, Netlify) - you’ll get a website that you can

  “Install” as an application on your PC and phone (menu ☰ → More → Install as application).



DATA SETUP

  langs.json, templates.json, config.json - languages, templates, tips. After editing: python tools/build_data.py

AI: menu → More → “Gemini Key” (aistudio.google.com/apikey) or ANTHROPIC_API_KEY for the server.

Data: with the server - golos.db and backups/, without it - browser memory (make a backup: menu → File).

