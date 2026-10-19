СКРИБО — говори, оно напишет

БЫСТРО (любая система, без установки)
  Откройте index.html двойным щелчком. Работают: редактор, перевод, ИИ (ключ Gemini), таблицы, разговор.
  Речь: Chrome/Edge — встроенная; Opera GX, Firefox, Safari — меню ☰ → Ещё → Движок речи → «Whisper в браузере».

ОДИН КЛИК С WHISPER (точнее, офлайн)
  Windows: start.bat   Mac: start.command   Linux: start.sh
  Скрипт сам найдёт Python, создаст окружение, поставит компоненты, выберет свободный порт и откроет браузер.
  Нет Python или интернета — откроется лёгкая версия. Ярлык на рабочем столе (Windows): make_shortcut.bat.
  Настройки: WHISPER_MODEL=tiny|base|small|medium, WHISPER_DEVICE=cpu|cuda.

КАК САЙТ / ПРИЛОЖЕНИЕ
  Загрузите всю папку на любой статический хостинг (GitHub Pages, Netlify) — получится сайт, который можно
  «Установить» как приложение на ПК и телефон (меню ☰ → Ещё → Установить как приложение).

НАСТРОЙКА ДАННЫХ
  langs.json, templates.json, config.json — языки, шаблоны, подсказки. После правки: python tools/build_data.py
ИИ: меню → Ещё → «Ключ Gemini» (aistudio.google.com/apikey) или ANTHROPIC_API_KEY для сервера.
Данные: с сервером — golos.db и backups/, без него — память браузера (делайте бэкап: меню → Файл).
