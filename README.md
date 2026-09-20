# LCP4MEMBERS

Монорепозиторий: React + Vite (`src/`), FastAPI (`backend/`), aiogram 3 (`bot/`).
Сайт: https://lcpn3twork.com/

Маршруты через BrowserRouter: `/` — публичная главная, `/login` — вход, `/app` — текущий технический кабинет. Прямое открытие и обновление страниц поддерживает существующий Nginx SPA fallback: `try_files $uri $uri/ /index.html`. Vite собирается для корня `/`; дополнительный `--base=/` не нужен.

Старые ссылки `https://lcpn3twork.com/#/account` и `https://lcpn3twork.com/#/login` перед запуском роутера заменяются через `history.replaceState` на `/app` и `/login`; query сохраняется, маршрут в hash удаляется. Преобразуются только эти точные hash-маршруты на корне сайта; прочие anchors и Telegram launch data не меняются. Чистый `/account` перенаправляется на `/app` с заменой записи истории.

## Авторизация через Telegram

1. `/login` вызывает `POST /auth/bot/start`.
2. Backend создаёт случайный `login_id` (192 бита), отдельный `browser_token` (256 бит) и challenge на 5 минут.
3. Браузер сохраняет challenge в `sessionStorage` своей вкладки и открывает `https://t.me/connorsvpn_bot?start=login_<login_id>`. Если popup заблокирован, есть явная ссылка «Открыть Telegram».
4. Бот показывает «Подтвердить вход в LCP?» и кнопки «✅ Да, войти» / «❌ Нет». Обычный `/start` сохраняет приветствие с изображением.
5. Бот передаёт решение и данные `callback.from_user` в backend с `X-Bot-Internal-Secret`.
6. Браузер опрашивает статус примерно каждые 2 секунды с `X-Login-Token: <browser_token>`. Этот ключ не передаётся Telegram. Один `login_id` не позволяет получить JWT.
7. Первый успешный запрос статуса получает JWT на 30 дней; challenge атомарно переходит в `consumed`. JWT сохраняется в `localStorage`, открывается `/app`, профиль загружается через `/auth/me`.

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
| `bot/.env` | `WEB_APP_URL` | `https://lcpn3twork.com`, без пути, hash/query |
| `bot/.env` | `SUPPORT_TELEGRAM_URL` | Старый fallback для совместимости; кнопка поддержки теперь открывает Mini App `/support` |
| `bot/.env` | `ADMIN_IDS` | Существующие числовые ID через запятую; пустое значение отключает админку |
| `backend/.env` / окружение | `SUPPORT_DB_PATH` | Необязательно; путь к SQLite support-базе, по умолчанию `backend/data/support.sqlite3` |
| `.env` (корень) | `VITE_API_URL` | В production `/api` на том же домене; локально `http://localhost:8000` |
| `.env` (корень) / окружение сборки | `VITE_SUPPORT_TELEGRAM_URL` | Публичный адрес поддержки `https://t.me/<username>`; используйте тот же адрес, что в `SUPPORT_TELEGRAM_URL` бота |

Для каждого нового секрета отдельно выполните `python3 -c 'import secrets; print(secrets.token_urlsafe(48))'`. Не используйте BOT_TOKEN вместо internal/JWT secret. Backend явно отказывается запускаться без обязательных секретов, с короткими или совпадающими секретами. Бот читает настройки только из `bot/.env`, как и прежде. Backend читает `backend/.env`, при этом переменные окружения имеют приоритет.

`VITE_API_URL` не секрет: Vite включает его в frontend при сборке. В dev доступен fallback `http://localhost:8000`; в production fallback отсутствует, и при пустой настройке UI сообщает о недоступной конфигурации. Для production задайте `VITE_API_URL=/api` при обычной сборке `npm run build`; API и frontend доступны на `https://lcpn3twork.com`.

Поддержка открывается на странице `/support` внутри кабинета и Telegram Web App. Пользователь создаёт обращение и получает ответы в переписке; бот забирает новые обращения через internal API и уведомляет `ADMIN_IDS`. Администратор отвечает кнопкой `Ответить` прямо в Telegram. `VITE_SUPPORT_TELEGRAM_URL` и `SUPPORT_TELEGRAM_URL` больше не нужны для нового потока, но оставлены для совместимости старых конфигураций.

Бот формирует кнопку входа с `/login`, кнопку поддержки с `/support` и кнопку меню «Кабинет» с `/app`. При последующем обновлении production проверьте `WEB_APP_URL` в существующем `bot/.env`; после перезапуска бот установит новое default menu через `set_chat_menu_button`. Если URL Mini App отдельно задан в BotFather, обновите его на `https://lcpn3twork.com/app`. Старые сообщения на текущем домене поддерживаются редиректами выше. Ссылки на прежний GitHub Pages origin требуют отдельного перенаправления на том хостинге.

Старый `.github/workflows/deploy.yml` для GitHub Pages сохранён без изменений и по-прежнему настроен на push в `main`; это не способ публикации текущего production-домена. Его отключение или замена — отдельная задача.

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

Откройте `http://localhost:5173/login`. Для проверки `/support` нужен авторизованный пользователь и запущенный backend. Если support-бот уже работает на VPS, не запускайте второй polling с тем же токеном; локально можно проверять UI/backend, а Telegram-уведомления — после выкладки backend и bot на сервер.

## API

| Метод и путь | Доступ и результат |
| --- | --- |
| `POST /auth/bot/start` | Публичный; `login_id`, `browser_token`, `telegram_url`, `expires_in: 300` |
| `POST /auth/bot/confirm` | `X-Bot-Internal-Secret`; JSON `{login_id, id, first_name, username?, last_name?}`; только `{status: "approved"}`, без JWT |
| `POST /support/tickets` | JWT пользователя; создать обращение `{category, message}` |
| `GET /support/tickets` | JWT пользователя; список его обращений |
| `GET /support/tickets/{id}` | JWT пользователя; переписка по своему обращению |
| `POST /support/tickets/{id}/messages` | JWT пользователя; добавить сообщение |
| `GET /support/internal/pending` | `X-Bot-Internal-Secret`; новые обращения для Telegram-бота |
| `POST /support/internal/tickets/{id}/messages` | `X-Bot-Internal-Secret`; ответ администратора |
| `POST /auth/bot/cancel` | Тот же header и JSON; `{status: "cancelled"}` |
| `GET /auth/bot/status/{login_id}` | `X-Login-Token`; `pending`, `cancelled`, `expired` или однократно `approved` + `access_token`, `token_type`, `user` |
| `GET /auth/me` | `Authorization: Bearer <JWT>`; `{id, first_name, username, last_name}` |
| `POST /auth/telegram` | Сохранённая авторизация Telegram Widget; HMAC через `compare_digest`, optional поля, проверка времени, JWT без fallback secret |
| `GET /health`, `GET /plans` | Сохранены |

Для неизвестного login ID — 404; неверного/отсутствующего browser key — 403; internal secret — 401; повторного решения/consumed — 409; решения после TTL — 410. Неправильная форма запроса — 422. Для невалидного/просроченного JWT — 401. Переполнение ограниченного хранилища — 429. Истёкшие записи удаляются лениво спустя ещё один TTL, после чего возвращается 404. CORS сохраняет `http://localhost:5173` и `https://twointhepinky.github.io`, включая новые заголовки.

## Ручная проверка

1. Заполните локальные env-настройки; запустите backend, bot, frontend. Проверьте `/health`.
2. Откройте `http://localhost:5173/login`. При необходимости переключите язык на RU.
3. Нажмите «Войти через Telegram». Должны появиться состояния «Откройте Telegram и подтвердите вход» / «Ожидаем подтверждение…». Если отдельная вкладка не открылась, нажмите «Открыть Telegram».
4. В Telegram нажмите Start/«Запустить», если клиент предлагает его, затем «✅ Да, войти».
5. Вернитесь именно в исходную вкладку сайта. В течение очередного опроса должен открыться `/app` с именем, username (если есть) и Telegram ID.
6. Обновите кабинет: профиль должен повторно загрузиться через `/auth/me`. Нажмите «Выйти»: токен удаляется, открывается `/login`. Прямое открытие `/app` без токена в обычном браузере также приводит на `/login`.
7. Начните новый вход и нажмите «❌ Нет»: сайт показывает «Вход отменён», доступна новая попытка.
8. Начните новый вход и подождите больше 5 минут: сайт показывает истечение ссылки; подтверждение старой ссылки больше не работает.
9. Повторно нажмите кнопку на старом сообщении/откройте старую ссылку: повторный вход или смена Telegram ID запрещены.
10. Остановите локальный backend и попробуйте вход: UI показывает сетевую ошибку; обычный `/start`, поддержка, «О нас», `/admin` для ADMIN_IDS продолжают работать у запущенного бота.
11. При следующей публикации сборки с `VITE_API_URL=/api` проверьте прямое открытие и обновление `https://lcpn3twork.com/login` и `https://lcpn3twork.com/app`. Существующий Nginx SPA fallback должен отдавать `index.html` для этих путей, сохраняя отдельную обработку `/api`.
12. Проверьте старые `/#/account`, `/#/login` и `/account`: адрес должен стать чистым `/app` или `/login` (без токена кабинет в браузере затем отправит на `/login`). В Telegram проверьте вход через обе новые кнопки и старые сообщения: Mini App auth должен завершаться на `/app`.

## Автоматические проверки

Из корня:

```sh
backend/.venv/bin/python -m compileall -q backend/app backend/tests bot/main.py bot/auth_client.py bot/config bot/handlers bot/keyboards bot/texts bot/tests
backend/.venv/bin/python -c 'from backend.app.main import app; print(app.title)'
backend/.venv/bin/python -m unittest discover -s backend/tests -v
node --test tests/routing.test.mjs tests/auth.test.mjs tests/telegram.test.mjs
npm run build
npm run lint
git diff --check
```

Из `bot/`:

```sh
.venv/bin/python -c 'import main; print("Bot import OK")'
.venv/bin/python -m unittest discover -s tests -v
```

Backend-тесты изолируют `.env`, проверяют полный обмен на JWT, владение challenge, TTL, отмену, гонки, replay, невалидные токены, CORS и Widget. Bot-тесты используют настоящий dispatcher и подменяют Telegram API: внешние сообщения не отправляются. Для браузерных проверок реальных Login/Account компонентов откройте `http://localhost:5173/tests/telegram-auth.html` на dev-сервере: backend и хранилище там подменены тестовыми. Отдельный ручной тест с реальным Telegram необходим перед production.

## Ограничения и TODO

- In-memory storage рассчитан на один процесс. Перезапуск backend теряет pending challenges; несколько workers/инстансов требуют общего Redis/Supabase хранилища с TTL и атомарными переходами. Контракт замены — `ChallengeStore` в `backend/app/challenges.py`.
- В выдаче JWT действует at-most-once: если ответ с токеном потерян после consumption, начать вход заново. Автоматически перевыдавать JWT по consumed ID нельзя.
- JWT пока хранится в localStorage. После размещения frontend/backend на одном production-домене перейти на Secure HttpOnly cookie с CSRF-защитой. Logout удаляет локальный токен; отзыва уже выданного JWT и refresh-сессий пока нет.
- Добавить rate limiting на создание/опрос и внутренние endpoints, аудит без секретов, распределённое хранилище и управление сессиями. Сейчас есть только общий лимит записей в памяти.
- Публичный API доступен по HTTPS на `https://lcpn3twork.com/api`. Internal endpoints ограничить сетью/reverse proxy; вне loopback использовать HTTPS. Исключить JWT, browser/internal secret, URL challenge из логов proxy/APM.
- Подтверждать только собственную попытку входа. Защита от пересылки ссылки/социальной инженерии требует дополнительного UX (например, сверяемый код в браузере и боте).
- Telegram WebView и внешний браузер имеют раздельное хранилище: завершать вход следует в той вкладке, где он был начат. Наличие Telegram ID само по себе не заменяет этот обмен.

Реальные `.env`, VPS и настройки GitHub автоматически не изменяются; commit/push/deploy не выполняются.
