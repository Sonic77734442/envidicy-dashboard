# Meta Review Screencast Script

## Goal
Demonstrate that Envidicy Dashboard uses Meta access only for agency-side connection and read-only reporting import.

## Before recording
- Prepare a clean agency admin test user.
- Make sure at least one Meta ad account is visible to that user.
- Start from the login screen.

## Recording script

1. Show the Envidicy Dashboard login screen.
2. Log in as the agency admin test user.
3. Open the `Agency` page.
4. Explain that this workspace is used by the agency admin to connect advertising sources and manage client visibility.
5. Click `Подключить Meta`.
6. Complete the Facebook Login flow.
7. After returning to the agency workspace, show that Meta is connected.
8. Click `Импорт META`.
9. Show the imported Meta ad account list.
10. Select one imported account in `Включить в клиентский дашборд`.
11. Click `Обновить dashboard accounts`.
12. Click `Запустить sync`.
13. Wait for the sync result.
14. Open the `Дашборд` page.
15. Show the synced reporting data for the imported Meta account.
16. Explain that the client viewer consumes only the internal dashboard and does not authenticate with Meta.

## Talking points
- Agency admins authorize their own Meta access.
- The product reads ad account reporting data for dashboards and reports.
- Client viewers do not log in with Meta and do not receive Meta tokens.
- The product is used for reporting and account visibility management only.
