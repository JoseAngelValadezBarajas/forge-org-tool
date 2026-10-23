# `@forge-org/api-client`

The package exposes the FORGE Org Tool HTTP client as compiled ESM with TypeScript declarations.

```ts
import { organizationApi } from '@forge-org/api-client';

const workspaces = await organizationApi.listWorkspaces();
```

Capability modules are also available through stable subpaths when an application wants a narrower dependency:

```ts
import { planningCapability } from '@forge-org/api-client/planning';

const overview = await planningCapability.planningOverview(workspaceId, projectId);
```

`organizationApi` remains the compatibility facade for existing FORGE consumers. New operations belong in the capability module that owns their HTTP contract. The package build emits `dist/*.js` and `dist/*.d.ts`; consumers should use the package exports rather than importing source files.
