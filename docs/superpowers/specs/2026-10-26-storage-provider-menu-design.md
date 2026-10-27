# Storage provider menu

## Intent

Make the existing `LOCAL FIRST · PRIVATE` sidebar label an actionable storage
menu. Users should be able to reach Storage Settings and switch between Local
SQLite and an already configured Supabase project without re-entering the
project configuration.

## Scope and constraints

- Local SQLite remains the default and is always listed.
- Supabase is listed only when a valid profile has been configured locally.
- `Configure storage` navigates to `/settings/storage`.
- Selecting a listed provider activates that provider without copying,
  merging, or deleting data.
- Switching to Local must preserve the configured Supabase profile and its
  session so the user can switch back; the active API handler still changes
  immediately.
- Firebase remains future work and is not added to the menu.
- The menu is keyboard accessible, exposes the active provider, and works when
  the sidebar is collapsed.

## Approaches

1. A storage-aware sidebar menu backed by the API client (chosen): the client
   owns provider activation and persisted profile state; the shell owns only
   presentation and navigation.
2. A navigation-only menu: simpler, but switching would require a second
   interaction in Settings and would not provide the requested direct switch.
3. A new React storage context: broader than this change and duplicates state
   already owned by `@forge-org/api-client`.

## Design

Add a small storage-provider capability to `@forge-org/api-client` for reading
available configured providers and activating one. Preserve the Supabase
profile while Local is active, but keep Local's request handler active until
the user explicitly selects Supabase. The sidebar subscribes to a storage
change event, renders the menu, and navigates to Settings for configuration.

Add focused shell and API-client tests for provider discovery, reversible
switching, menu accessibility, configuration navigation, and collapsed-sidebar
rendering. Run the focused tests, full frontend tests, typecheck, build, and
architecture checks before delivery.
