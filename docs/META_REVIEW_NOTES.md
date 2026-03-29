# Meta App Review Notes

## App purpose
Envidicy Dashboard is a multi-tenant reporting product for agencies and their clients.

Agency administrators connect their Meta advertising access to Envidicy Dashboard. After connection, the product imports the ad accounts available to that agency admin and reads reporting data such as campaign performance, impressions, clicks, spend, and audience breakdowns.

Clients of the agency do not authenticate with Meta. They only see internal synced reports inside Envidicy Dashboard based on the ad accounts assigned to them by the agency.

## Why `ads_read` is required
`ads_read` is required so the agency admin can authorize Envidicy Dashboard to read advertising performance data from Meta ad accounts that the agency already has access to. This data is used to build internal dashboards and client-facing reports.

## Why `business_management` is required
`business_management` is required because many agency ad accounts are available through Meta Business Manager relationships rather than direct ownership. Envidicy Dashboard uses this permission to discover ad accounts available through owned and client business assets during the import step.

## Data use
- Agency admins explicitly connect their own Meta access through Facebook Login.
- Envidicy Dashboard imports only the ad accounts available to the authorized agency admin.
- Data is used for internal reporting and read-only client dashboards.
- Client viewers do not receive Meta tokens and do not log into Meta.

## Reviewer test path
1. Log into Envidicy Dashboard with the provided agency admin test account.
2. Open the Agency workspace.
3. Click Connect Meta.
4. Complete Facebook Login.
5. Return to the Agency workspace and click Import META.
6. Activate one imported ad account for dashboard use.
7. Run sync.
8. Open the Dashboard page and verify the reporting view.
9. Optionally log in as the provided client viewer account and verify read-only dashboard access without Meta authentication.

## Expected outcome
The reviewer should see that:
- the Meta connection is made by the agency admin,
- ad accounts are imported after connection,
- reporting data is synced for activated accounts,
- the dashboard displays internal reporting data,
- client viewers consume reports without Meta authentication.
