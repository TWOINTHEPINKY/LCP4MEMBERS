# LCP4MEMBERS

Монорепозиторий: React + Vite (`src/`), FastAPI (`backend/`), aiogram 3 (`bot/`).
Сайт: https://twointhepinky.github.io/LCP4MEMBERS/

## Авторизация через Telegram

1. `/#/login` вызывает `POST /auth/bot/start`.
2. Backend создаёт случайный `login_id` (192 бита), отдельный `browser_token` (256 бит) и challenge на 5 минут.
3. Браузер сохраняет challenge в `sessionStorage` своей вкладки и открывает `https://t.me/connorsvpn_bot?start=login_<login_id>`. Если popup заблокирован, есть явная ссылка «Открыть Telegram».
4. Бот показывает «Подтвердить вход в LCP?» и кнопки «✅ Да, войти» / «❌ Нет». Обычный `/start` сохраняет приветствие с изображением.
5. Бот передаёт решение и данные `callback.from_user` в backend с `X-Bot-Internal-Secret`.
6. Браузер опрашивает статус примерно каждые 2 секунды с `X-Login-Token: <browser_token>`. Этот ключ не передаётся Telegram. Один `login_id` не позволяет получить JWT.
7. Первый успешный запрос статуса получает JWT на 30 дней; challenge атомарно переходит в `consumed`. JWT сохраняется в `localStorage`, открывается `/#/account`, профиль загружается через `/auth/me`.

Повторные подтверждения/отмены запрещены; Telegram-пользователь после подтверждения не может быть заменён. Polling не перекрывается, имеет timeout запроса, очищается при unmount и останавливается при результате, ошибке или истечении TTL. Незавершённый вход можно продолжить после обновления исходной вкладки в пределах TTL.

## Конфигурация

Реальные `.env` не входят в Git. Если соответствующего файла ещё нет, создайте его вручную по `.env.example`. Не заменяйте существующие файлы целиком: сохраните токен, поддержку и `ADMIN_IDS`.

| Файл | Переменная | Значение |
| --- | --- | --- |
| `backend/.env` | `BOT_TOKEN` | Токен существующего бота; нужен также сохранённому Telegram Widget endpoint |
| `backend/.env` | `JWT_SECRET` | Отдельный случайный секрет длиной минимум 32 символа |
| `backend/.env` | `BOT_INTERNAL_SECRET` | Другой случайный секрет длиной минимум 32 символа, одинаковый в backend и bot |
| `backend/.env` | `BOT_USERNAME` | `connorsvpn_bot` (значение по умолчанию) |
| `bot/.env` | `BOT_TOKEN` | Токен того же бота |
| `bot/.env` | `BOT_INTERNAL_SECRET` | Точное совпадение с backend |
| `bot/.env` | `BACKEND_INTERNAL_URL` | `http://127.0.0.1:8000` для локального запуска |
| `bot/.env` | `WEB_APP_URL` | `https://twointhepinky.github.io/LCP4MEMBERS`, без завершающего hash/query |
| `bot/.env` | `SUPPORT_TELEGRAM_URL` | Существующая ссылка поддержки `https://t.me/<username>` |
| `bot/.env` | `ADMIN_IDS` | Существующие числовые ID через запятую; пустое значение отключает админку |
| `.env` (корень) | `VITE_API_URL` | Публичный адрес backend; локально `http://localhost:8000` |

Для каждого нового секрета отдельно выполните `python3 -c 'import secrets; print(secrets.token_urlsafe(48))'`. Не используйте BOT_TOKEN вместо internal/JWT secret. Backend явно отказывается запускаться без обязательных секретов, с короткими или совпадающими секретами. Бот читает настройки только из `bot/.env`, как и прежде. Backend читает `backend/.env`, при этом переменные окружения имеют приоритет.

`VITE_API_URL` не секрет: Vite включает его в frontend при сборке. В dev доступен fallback `http://localhost:8000`; в production fallback отсутствует, и при пустой настройке UI сообщает о недоступной конфигурации. Для GitHub Pages задайте repository variable `VITE_API_URL` с HTTPS-адресом backend до следующей сборки; workflow уже передаёт эту переменную в Vite.

## Локальный запуск

Проверено на Python 3.14 и Node.js 24. Backend requirements приведены к версиям FastAPI/Pydantic, совместимым с установленным Python 3.14. Команды каждого блока начинаются в корне репозитория; запускайте сервисы в отдельных терминалах.

Backend:

```sh
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt
backend/.venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --workers 1 --no-access-log
```

Конфигурация берётся из `backend/.env`. Проверка: `http://127.0.0.1:8000/health`; описание API: `/docs`. Используйте один worker: хранилище challenge пока находится в памяти процесса. `--no-access-log` исключает идентификаторы login из стандартного HTTP access log.

Bot:

```sh
python3 -m venv bot/.venv
bot/.venv/bin/python -m pip install -r bot/requirements.txt
cd bot
.venv/bin/python main.py
```

Внешние вызовы backend выполняются общей async-сессией aiohttp с timeout 10 секунд; перенаправления отключены. Не запускайте второй polling-процесс с тем же токеном одновременно. Если этот бот уже работает на VPS, локальный тест требует согласованного отдельного запуска или тестового бота; этот проект не останавливает и не меняет VPS. Для тестового бота поменяйте `BOT_USERNAME` и соответствующий `BOT_TOKEN` в своих локальных настройках.

Frontend:

```sh
npm ci
npm run dev -- --host localhost
```

Откройте `http://localhost:5173/LCP4MEMBERS/#/login`. В локальном сценарии сайт открывайте непосредственно в браузере: HTTPS-кнопки Telegram продолжают вести на GitHub Pages. Для локального теста весь frontend на GitHub Pages или HTTPS-туннель не требуются: локальный бот получает updates через исходящее соединение с Telegram, а backend доступен ему по loopback.

## API

| Метод и путь | Доступ и результат |
| --- | --- |
| `POST /auth/bot/start` | Публичный; `login_id`, `browser_token`, `telegram_url`, `expires_in: 300` |
| `POST /auth/bot/confirm` | `X-Bot-Internal-Secret`; JSON `{login_id, id, first_name, username?, last_name?}`; только `{status: "approved"}`, без JWT |
| `POST /auth/bot/cancel` | Тот же header и JSON; `{status: "cancelled"}` |
| `GET /auth/bot/status/{login_id}` | `X-Login-Token`; `pending`, `cancelled`, `expired` или однократно `approved` + `access_token`, `token_type`, `user` |
| `GET /auth/me` | `Authorization: Bearer <JWT>`; `{id, first_name, username, last_name}` |
| `POST /auth/telegram` | Сохранённая авторизация Telegram Widget; HMAC через `compare_digest`, optional поля, проверка времени, JWT без fallback secret |
| `GET /health`, `GET /plans` | Сохранены |

Для неизвестного login ID — 404; неверного/отсутствующего browser key — 403; internal secret — 401; повторного решения/consumed — 409; решения после TTL — 410. Неправильная форма запроса — 422. Для невалидного/просроченного JWT — 401. Переполнение ограниченного хранилища — 429. Истёкшие записи удаляются лениво спустя ещё один TTL, после чего возвращается 404. CORS сохраняет `http://localhost:5173` и `https://twointhepinky.github.io`, включая новые заголовки.

## Ручная проверка

1. Заполните локальные env-настройки; запустите backend, bot, frontend. Проверьте `/health`.
2. Откройте `http://localhost:5173/LCP4MEMBERS/#/login`. При необходимости переключите язык на RU.
3. Нажмите «Войти через Telegram». Должны появиться состояния «Откройте Telegram и подтвердите вход» / «Ожидаем подтверждение…». Если отдельная вкладка не открылась, нажмите «Открыть Telegram».
4. В Telegram нажмите Start/«Запустить», если клиент предлагает его, затем «✅ Да, войти».
5. Вернитесь именно в исходную вкладку сайта. В течение очередного опроса должен открыться `/#/account` с именем, username (если есть) и Telegram ID.
6. Обновите кабинет: профиль должен повторно загрузиться через `/auth/me`. Нажмите «Выйти»: токен удаляется, открывается login. Прямое открытие account без токена также приводит на login.
7. Начните новый вход и нажмите «❌ Нет»: сайт показывает «Вход отменён», доступна новая попытка.
8. Начните новый вход и подождите больше 5 минут: сайт показывает истечение ссылки; подтверждение старой ссылки больше не работает.
9. Повторно нажмите кнопку на старом сообщении/откройте старую ссылку: повторный вход или смена Telegram ID запрещены.
10. Остановите локальный backend и попробуйте вход: UI показывает сетевую ошибку; обычный `/start`, поддержка, «О нас», `/admin` для ADMIN_IDS продолжают работать у запущенного бота.
11. После публикации сборки с настроенным API проверьте прямое открытие и обновление `https://twointhepinky.github.io/LCP4MEMBERS/#/login` и `/#/account`. HashRouter не отправляет маршрут страницы серверу GitHub Pages; basename роутера не нужен, Vite base остаётся `/LCP4MEMBERS/`.

## Автоматические проверки

Из корня:

```sh
backend/.venv/bin/python -m compileall -q backend/app backend/tests bot/main.py bot/auth_client.py bot/config bot/handlers bot/keyboards bot/texts bot/tests
backend/.venv/bin/python -c 'from backend.app.main import app; print(app.title)'
backend/.venv/bin/python -m unittest discover -s backend/tests -v
npm run build
npm run lint
git diff --check
```

Из `bot/`:

```sh
.venv/bin/python -c 'import main; print("Bot import OK")'
.venv/bin/python -m unittest discover -s tests -v
```

Backend-тесты изолируют `.env`, проверяют полный обмен на JWT, владение challenge, TTL, отмену, гонки, replay, невалидные токены, CORS и Widget. Bot-тесты используют настоящий dispatcher и подменяют Telegram API: внешние сообщения не отправляются. Отдельный ручной тест с реальным Telegram необходим перед production.

## Ограничения и TODO

- In-memory storage рассчитан на один процесс. Перезапуск backend теряет pending challenges; несколько workers/инстансов требуют общего Redis/Supabase хранилища с TTL и атомарными переходами. Контракт замены — `ChallengeStore` в `backend/app/challenges.py`.
- В выдаче JWT действует at-most-once: если ответ с токеном потерян после consumption, начать вход заново. Автоматически перевыдавать JWT по consumed ID нельзя.
- JWT пока хранится в localStorage. После размещения frontend/backend на одном production-домене перейти на Secure HttpOnly cookie с CSRF-защитой. Logout удаляет локальный токен; отзыва уже выданного JWT и refresh-сессий пока нет.
- Добавить rate limiting на создание/опрос и внутренние endpoints, аудит без секретов, распределённое хранилище и управление сессиями. Сейчас есть только общий лимит записей в памяти.
- Публичный API для GitHub Pages должен работать по HTTPS. Internal endpoints ограничить сетью/reverse proxy; вне loopback использовать HTTPS. Исключить JWT, browser/internal secret, URL challenge из логов proxy/APM.
- Подтверждать только собственную попытку входа. Защита от пересылки ссылки/социальной инженерии требует дополнительного UX (например, сверяемый код в браузере и боте).
- Telegram WebView и внешний браузер имеют раздельное хранилище: завершать вход следует в той вкладке, где он был начат. Наличие Telegram ID само по себе не заменяет этот обмен.

Реальные `.env`, VPS и настройки GitHub автоматически не изменяются; commit/push/deploy не выполняются.
