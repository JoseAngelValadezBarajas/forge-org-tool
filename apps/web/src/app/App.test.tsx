import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { act } from '@testing-library/react';
import { waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import parity from '../../../../docs/design/design-system-parity.json';
import { productPatternCatalogIds } from './component-gallery/catalog/product-patterns';
import { App } from './App';

function renderRoute(path: string) {
  const result = render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  if (path === '/__components') {
    return screen.findByRole('heading', { name: 'Component Host' }).then(() => result);
  }
  return result;
}

describe('M1 application shell', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('[]', { status: 200 }))),
    );
  });

  it('shows an actionable empty organization state', async () => {
    renderRoute('/');

    expect(await screen.findByRole('heading', { name: 'No workspaces yet' })).toBeInTheDocument();
    expect(screen.getByText('No workspaces yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create workspace/i })).toBeEnabled();
  });

  it('does not let a late initial workspace read erase a just-created active workspace', async () => {
    const workspaceResponses: ((response: Response) => void)[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (String(input) === '/api/v1/workspaces') {
          return new Promise<Response>((resolve) => workspaceResponses.push(resolve));
        }
        return Promise.resolve(new Response('[]', { status: 200 }));
      }),
    );
    renderRoute('/');
    await waitFor(() => expect(workspaceResponses.length).toBeGreaterThan(0));

    const workspace = {
      id: 'created-workspace',
      name: 'Created during startup',
      status: 'active',
      created_at: '',
      updated_at: '',
      archived_at: null,
    };
    await act(async () => {
      window.dispatchEvent(new CustomEvent('forge:workspace-created', { detail: { workspace } }));
      window.dispatchEvent(
        new CustomEvent('forge:active-workspace-change', {
          detail: { workspaceId: workspace.id },
        }),
      );
      for (const resolve of workspaceResponses) resolve(new Response('[]', { status: 200 }));
    });

    await waitFor(() => {
      expect(screen.getAllByRole('combobox', { name: 'Workspace' })).toHaveLength(2);
      for (const selector of screen.getAllByRole('combobox', { name: 'Workspace' })) {
        expect(selector).toHaveValue(workspace.id);
      }
      expect(screen.getByRole('heading', { name: 'Your workspace, in focus' })).toBeInTheDocument();
    });
    expect(localStorage.getItem('forge-active-workspace')).toBe(workspace.id);
  });

  it('opens an Epic detail route with project context', async () => {
    const workspace = {
      id: 'w1',
      name: 'Research',
      status: 'active',
      created_at: '',
      updated_at: '',
      archived_at: null,
    };
    const project = {
      id: 'p1',
      workspace_id: 'w1',
      name: 'Atlas',
      description: null,
      status: 'active',
      created_at: '',
      updated_at: '',
      archived_at: null,
    };
    const epic = {
      id: 'e1',
      project_id: 'p1',
      title: 'Release',
      description: null,
      status: 'backlog',
      archived_at: null,
      priority: 'medium',
      tags: [],
      feature_count: 0,
      completed_feature_count: 0,
      progress: 0,
      features: [],
      created_at: '',
      updated_at: '',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        const path = String(input);
        const payload =
          path === '/api/v1/workspaces'
            ? [workspace]
            : path === '/api/v1/workspaces/w1/projects?search=&status=active'
              ? [project]
              : path === '/api/v1/workspaces/w1/projects/p1'
                ? project
                : path === '/api/v1/workspaces/w1/projects/p1/planning/overview'
                  ? { epics: [epic], unassigned_features: [] }
                  : [];
        return Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }));
      }),
    );
    renderRoute('/planning/w1/p1/epics/e1');
    expect(await screen.findByRole('heading', { name: 'Release' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('link', {
        name: 'Atlas',
      }),
    ).toHaveAttribute('href', '/planning/w1/p1');
  });

  it('exposes the Figma sidebar hierarchy and keeps workspace controls in the shell', async () => {
    const workspace = {
      id: 'w1',
      name: 'Personal',
      status: 'active',
      created_at: '',
      updated_at: '',
      archived_at: null,
    };
    const project = {
      id: 'p1',
      workspace_id: 'w1',
      name: 'FormiAI',
      description: null,
      status: 'active',
      created_at: '',
      updated_at: '',
      archived_at: null,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        const path = String(input);
        const payload =
          path === '/api/v1/workspaces'
            ? [workspace]
            : path.includes('/projects?')
              ? [project]
              : [];
        return Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }));
      }),
    );
    renderRoute('/');

    const sidebar = screen.getByTestId('app-sidebar');
    expect(
      await within(sidebar).findByRole('navigation', { name: 'Project navigation' }),
    ).toBeInTheDocument();
    expect(within(sidebar).getByRole('combobox', { name: 'Workspace' })).toBeInTheDocument();
    expect(
      await within(sidebar).findByRole('heading', { name: 'Your projects' }),
    ).toBeInTheDocument();
    const projectNavigation = within(sidebar).getByRole('navigation', {
      name: 'Project navigation',
    });
    expect(within(projectNavigation).queryByRole('link', { name: 'Overview' })).toBeNull();
    expect(within(projectNavigation).getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      await within(projectNavigation).findByRole('link', { name: 'FormiAI' }),
    ).not.toHaveAttribute('aria-current', 'page');
    expect(within(sidebar).getByText(/LOCAL FIRST.*PRIVATE/u)).toBeInTheDocument();
  });

  it('provides compact mobile navigation for Projects, the current Board, Search and Settings', () => {
    renderRoute('/planning/w1/p1');

    const navigation = screen.getByRole('navigation', { name: 'Mobile navigation' });
    expect(within(navigation).getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/');
    expect(within(navigation).getByRole('link', { name: 'Board' })).toHaveAttribute(
      'href',
      '/planning/w1/p1',
    );
    expect(within(navigation).getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(within(navigation).getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/workspaces/w1/settings',
    );
  });

  it('keeps the active Workspace and its Projects in the persistent shell navigation', async () => {
    const workspaces = [
      { id: 'w1', name: 'Research', status: 'active', created_at: '', updated_at: '' },
      { id: 'w2', name: 'Studio', status: 'active', created_at: '', updated_at: '' },
    ];
    const projects = {
      w1: [
        {
          id: 'p1',
          workspace_id: 'w1',
          name: 'Atlas',
          description: null,
          status: 'active',
          created_at: '',
          updated_at: '',
          archived_at: null,
        },
      ],
      w2: [
        {
          id: 'p2',
          workspace_id: 'w2',
          name: 'Signal',
          description: null,
          status: 'active',
          created_at: '',
          updated_at: '',
          archived_at: null,
        },
      ],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        const path = String(input);
        const workspaceId = path.match(/workspaces\/(w[12])\/projects\?/u)?.[1] as
          'w1' | 'w2' | undefined;
        const payload =
          path === '/api/v1/workspaces' ? workspaces : workspaceId ? projects[workspaceId] : [];
        return Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }));
      }),
    );
    localStorage.setItem('forge-active-workspace', 'w1');
    const app = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    const sidebar = screen.getByRole('complementary');
    const projectNavigation = within(sidebar).getByRole('navigation', {
      name: 'Project navigation',
    });
    expect(await within(projectNavigation).findByRole('link', { name: 'Atlas' })).toHaveAttribute(
      'href',
      '/planning/w1/p1',
    );
    fireEvent.change(within(sidebar).getByRole('combobox', { name: 'Workspace' }), {
      target: { value: 'w2' },
    });

    expect(await within(projectNavigation).findByRole('link', { name: 'Signal' })).toHaveAttribute(
      'href',
      '/planning/w2/p2',
    );
    expect(localStorage.getItem('forge-active-workspace')).toBe('w2');
    expect(
      await screen.findByRole('heading', { name: 'Your workspace, in focus' }),
    ).toBeInTheDocument();
    app.unmount();
    renderRoute('/');
    const restoredSidebar = screen.getByRole('complementary');
    expect(await within(restoredSidebar).findByRole('link', { name: 'Signal' })).toHaveAttribute(
      'href',
      '/planning/w2/p2',
    );
    expect(within(restoredSidebar).getByRole('combobox', { name: 'Workspace' })).toHaveValue('w2');
  });

  it('discards an old Workspace project response after changing the global selector', async () => {
    const pending = new Map<string, Array<(response: Response) => void>>();
    const project = (workspaceId: string, id: string, name: string) => ({
      id,
      workspace_id: workspaceId,
      name,
      description: null,
      status: 'active',
      created_at: '',
      updated_at: '',
      archived_at: null,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        const path = String(input);
        if (path === '/api/v1/workspaces')
          return Promise.resolve(
            new Response(
              JSON.stringify([
                { id: 'w1', name: 'One', status: 'active', created_at: '', updated_at: '' },
                { id: 'w2', name: 'Two', status: 'active', created_at: '', updated_at: '' },
              ]),
              { status: 200 },
            ),
          );
        const workspaceId = path.match(/workspaces\/(w[12])\/projects\?/u)?.[1];
        if (workspaceId)
          return new Promise<Response>((resolve) => {
            pending.set(workspaceId, [...(pending.get(workspaceId) ?? []), resolve]);
          });
        return Promise.resolve(new Response('[]', { status: 200 }));
      }),
    );
    renderRoute('/');
    const sidebar = screen.getByRole('complementary');
    await within(sidebar).findByRole('option', { name: 'One' });
    await waitFor(() => expect(pending.get('w1')).toHaveLength(2));
    fireEvent.change(within(sidebar).getByRole('combobox', { name: 'Workspace' }), {
      target: { value: 'w2' },
    });
    await waitFor(() => expect(pending.get('w2')).toHaveLength(2));
    pending
      .get('w2')
      ?.forEach((resolve) =>
        resolve(
          new Response(JSON.stringify([project('w2', 'p2', 'Current project')]), { status: 200 }),
        ),
      );
    expect(await screen.findByRole('heading', { name: 'Current project' })).toBeInTheDocument();
    pending
      .get('w1')
      ?.forEach((resolve) =>
        resolve(
          new Response(JSON.stringify([project('w1', 'p1', 'Stale project')]), { status: 200 }),
        ),
      );
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Stale project' })).not.toBeInTheDocument(),
    );
  });

  it('keeps Workspace tag administration on its own settings route', async () => {
    const workspace = {
      id: 'w1',
      name: 'Research',
      description: 'Planning workspace',
      status: 'active',
      created_at: '',
      updated_at: '',
      archived_at: null,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        const path = String(input);
        const payload = path === '/api/v1/workspaces' ? [workspace] : [];
        return Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }));
      }),
    );
    renderRoute('/workspaces/w1/settings');

    expect(
      await screen.findByRole('heading', { name: 'Manage workspace tags' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Projects' })).toHaveAttribute('href', '/');
  });

  it('keeps supported product destinations reachable from the compact project sidebar and palette', () => {
    renderRoute('/planning/w1/p1');

    const navigation = screen.getByRole('navigation', { name: 'Project navigation' });
    expect(within(navigation).getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'href',
      '/projects/w1/p1',
    );
    expect(within(navigation).getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/');
    fireEvent.click(
      within(screen.getByRole('banner', { name: 'Application controls' })).getByRole('button', {
        name: 'Search',
      }),
    );
    expect(screen.getByRole('button', { name: 'Go to Planning' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Transfer' })).toBeInTheDocument();
    expect(
      within(navigation).queryAllByText(/Readiness|Workbench|Delivery|Repositories|Context/),
    ).toHaveLength(0);
  });

  it.each(['/readiness/w1/p1/f1', '/workbench/w1/p1', '/delivery/w1/p1'])(
    'does not mount retired product route %s',
    async (path) => {
      renderRoute(path);
      expect(await screen.findByText('Page not found.')).toBeInTheDocument();
    },
  );

  it('keeps a workspace-to-project breadcrumb in the supported planning workflow', () => {
    renderRoute('/planning/w1/p1');

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByRole('link', { name: 'Workspace' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(within(breadcrumb).getByText('Project board')).toHaveAttribute('aria-current', 'page');
  });

  it('exposes loading state and prevents native button interaction', async () => {
    await renderRoute('/__components');

    const loadingButton = screen.getByRole('button', { name: /working/i });
    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toHaveAttribute('aria-busy', 'true');
  });

  it('gives host form controls accessible names from their visible labels', async () => {
    await renderRoute('/__components');

    expect(screen.getByRole('checkbox', { name: 'Unchecked' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Read only' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Off' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'On' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Disabled' })).toBeDisabled();
  });

  it('previews the canonical PageHeader breadcrumb composition', async () => {
    await renderRoute('/__components');

    expect(
      screen.getByText('Feature detail', { selector: '[aria-current="page"]' }),
    ).toBeInTheDocument();
    expect(
      within(
        document.querySelector('[data-product-pattern="page-header"]') as HTMLElement,
      ).getByRole('link', { name: /^Planning$/ }),
    ).toHaveAttribute('href', '/planning/preview');
  });

  it('previews Disabled navigation and every DependencyGroup state', async () => {
    await renderRoute('/__components');

    const disabledItem = document.querySelector(
      '[data-product-pattern="navigation-item"] [aria-disabled="true"]',
    );
    expect(disabledItem).toHaveTextContent('Unavailable');
    expect(disabledItem?.closest('a')).toBeNull();

    const dependencies = document.querySelector('[data-product-pattern="dependency-group"]');
    expect(within(dependencies as HTMLElement).getByText('BLOCKED')).toBeInTheDocument();
  });

  it('previews each supported product state from the feature-owned components', async () => {
    await renderRoute('/__components');

    const planning = document.querySelector('[data-product-pattern="project-planning-home"]');
    expect(within(planning as HTMLElement).getByText('DEFAULT')).toBeInTheDocument();
  });

  it('supports gallery interaction and dark/light switching', async () => {
    await renderRoute('/__components');

    const gallery = screen.getByRole('heading', { name: 'Component Host' }).closest('[data-theme]');
    expect(gallery).toHaveAttribute('data-theme', 'dark');

    fireEvent.click(screen.getByRole('button', { name: /increment 0/i }));
    expect(screen.getByRole('button', { name: /increment 1/i })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Preview theme' }), {
      target: { value: 'light' },
    });
    expect(gallery).toHaveAttribute('data-theme', 'light');
    expect(screen.getByRole('combobox', { name: 'Preview theme' })).toHaveValue('light');
  });

  it('keeps the Component Host preview isolated from persisted application appearance', async () => {
    localStorage.setItem('forge-theme', 'dark');
    await renderRoute('/__components');

    const app = screen.getByTestId('application-shell');
    const gallery = screen.getByRole('heading', { name: 'Component Host' }).closest('[data-theme]');
    expect(app).toHaveAttribute('data-theme', 'dark');
    expect(gallery).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    fireEvent.change(screen.getByRole('combobox', { name: 'Preview theme' }), {
      target: { value: 'light' },
    });
    expect(gallery).toHaveAttribute('data-theme', 'light');
    expect(app).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem('forge-theme')).toBe('dark');
  });

  it('previews primitive palette tokens alongside semantic theme tokens', async () => {
    await renderRoute('/__components');

    expect(screen.getByText('--forge-palette-graphite-950')).toBeInTheDocument();
    expect(screen.getByText('--forge-palette-copper-500')).toBeInTheDocument();
  });

  it('provides a three-mode persistent application appearance control', () => {
    renderRoute('/');

    const appearance = within(screen.getByTestId('app-topbar')).getByRole('combobox', {
      name: 'Appearance',
    });
    expect(appearance).toHaveValue('dark');
    expect(screen.getByTestId('application-shell')).toHaveAttribute('data-theme', 'dark');
    fireEvent.change(appearance, { target: { value: 'light' } });
    expect(screen.getByTestId('application-shell')).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem('forge-theme')).toBe('light');
    fireEvent.change(appearance, { target: { value: 'system' } });
    expect(appearance).toHaveValue('system');
    expect(localStorage.getItem('forge-theme')).toBe('system');
  });

  it('provides searchable catalog sections and clearly labels review status', async () => {
    await renderRoute('/__components');

    expect(screen.getByRole('navigation', { name: 'Component host sections' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Foundations and tokens' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Core UI primitives' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Product-specific components' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Icon library' }).length).toBeGreaterThan(0);
    expect(document.querySelectorAll('[data-icon-name]')).toHaveLength(35);
    expect(screen.getAllByText('IMPLEMENTED_NOT_REVIEWED').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search components' }), {
      target: { value: 'status' },
    });

    expect(screen.getByRole('heading', { name: 'StatusChip' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Button' })).not.toBeInTheDocument();
  });

  it('renders a real preview under the stable host ID for every canonical core family', async () => {
    const coreEntries = parity.inventory.filter((entry) => entry.category === 'core');

    await renderRoute('/__components');

    expect(coreEntries).toHaveLength(37);
    for (const entry of coreEntries) {
      expect(
        document.querySelector(`[data-component-id="${entry.componentHost.id}"]`),
      ).not.toBeNull();
      const preview = document.querySelector(
        `[data-component-preview="${entry.componentHost.id}"]`,
      );
      expect(
        preview?.childElementCount,
        `${entry.figmaName} must render a real preview`,
      ).toBeGreaterThan(0);
    }
  });

  it('renders a real feature-owned preview for every page-20 product pattern', async () => {
    const productEntries = parity.inventory.filter(
      (entry) =>
        entry.category === 'product' &&
        productPatternCatalogIds.includes(
          entry.componentHost.id as (typeof productPatternCatalogIds)[number],
        ),
    );

    await renderRoute('/__components');

    expect(productEntries).toHaveLength(productPatternCatalogIds.length);
    for (const entry of productEntries) {
      const hostId = entry.componentHost.id;
      expect(entry.componentHost.status, `${entry.figmaName} host coverage`).toBe('AVAILABLE');
      expect(entry.visualReviewStatus, `${entry.figmaName} visual review`).toBe(
        'NOT_HUMAN_REVIEWED',
      );
      const preview = document.querySelector(`[data-product-pattern="${hostId}"]`);
      expect(preview, `${entry.figmaName} must have a product preview`).not.toBeNull();
      expect(
        preview?.childElementCount,
        `${entry.figmaName} must render its owned export`,
      ).toBeGreaterThan(0);
      expect(document.querySelector(`[data-component-id="${hostId}"]`)).toHaveTextContent(
        'AVAILABLE',
      );
    }
  });

  it('previews the reconciled canonical Card and status variants', async () => {
    await renderRoute('/__components');

    expect(
      document.querySelector('[data-component-preview="card"] [data-variant="elevated"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-component-preview="status-chip"] [data-tone="info"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-component-preview="status-chip"] [data-tone="reported"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-component-preview="badge"] [data-tone="info"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-component-preview="alert"] [data-tone="error"]'),
    ).not.toBeNull();
  });

  it('previews the canonical MultiSelect and FilePicker state compositions', async () => {
    await renderRoute('/__components');

    expect(
      document.querySelectorAll('[data-component-preview="multi-select"] fieldset'),
    ).toHaveLength(2);
    expect(
      document.querySelector('[data-component-preview="file-picker"] [data-state="empty"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-component-preview="file-picker"] [data-state="selected"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-component-preview="file-picker"] [data-state="error"]'),
    ).not.toBeNull();
  });

  it('keeps modal previews closed until explicitly opened and lets the preview close', async () => {
    await renderRoute('/__components');
    const dialogPreview = document.querySelector(
      '[data-component-preview="dialog"]',
    ) as HTMLElement;
    const view = within(dialogPreview);

    expect(dialogPreview.querySelector('dialog[open]')).toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Preview confirm dialog' }));
    expect(await view.findByRole('dialog', { name: 'Confirm transfer' })).toBeInTheDocument();
    fireEvent.click(view.getByRole('button', { name: 'Close preview' }));
    await waitFor(() => expect(view.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('distinguishes implementation gaps from implementations awaiting visual review', async () => {
    await renderRoute('/__components');

    expect(document.querySelector('[data-component-id="checkbox"]')).toHaveTextContent(
      'IMPLEMENTED_NOT_REVIEWED',
    );
    expect(document.querySelector('[data-component-id="card"]')).toHaveTextContent(
      'IMPLEMENTED_NOT_REVIEWED',
    );
  });

  it('previews every canonical icon export under its stable inventory ID', async () => {
    await renderRoute('/__components');

    const iconEntries = parity.inventory.filter((entry) => entry.category === 'icon');
    expect(iconEntries).toHaveLength(35);
    for (const entry of iconEntries) {
      expect(
        document.querySelector(`[data-component-id="${entry.componentHost.id}"]`),
      ).not.toBeNull();
    }
  });
});
