import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Alert, Badge, Checkbox, EmptyState, ErrorState, FormField, Input, LoadingState, MetricCard, Progress, SearchField, Select, Textarea, Button, Card } from '@forge-org/ui';

describe('public shared component contracts', () => {
  it('renders Card as a neutral div by default and forwards native props and refs', () => {
    const ref = createRef<HTMLDivElement>();

    render(<Card ref={ref} className="custom-card" aria-label="Default card" data-testid="default-card">Content</Card>);

    const card = screen.getByTestId('default-card');
    expect(card.tagName).toBe('DIV');
    expect(card).toHaveClass('custom-card');
    expect(card).toHaveAttribute('aria-label', 'Default card');
    expect(ref.current).toBe(card);
  });

  it('allows a justified semantic Card root without requiring section semantics', () => {
    render(<Card as="section" aria-label="Semantic card">Content</Card>);

    expect(screen.getByRole('region', { name: 'Semantic card' })).toBeInTheDocument();
  });

  it('preserves Button disabled, loading, and pressed DOM contracts', () => {
    render(<Button loading aria-pressed="true">Save</Button>);

    const button = screen.getByRole('button', { name: /working/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('forwards native form contracts through shared controls', () => {
    render(<form>
      <FormField label="Workspace name" hint="Required">
        <Input name="workspace" defaultValue="Forge" />
      </FormField>
      <Select aria-label="Status" defaultValue="active"><option value="active">Active</option></Select>
      <Textarea aria-label="Description" defaultValue="Local first" />
      <Checkbox aria-label="Show archived" defaultChecked />
      <SearchField aria-label="Search projects" defaultValue="alpha" />
    </form>);

    expect(screen.getByLabelText('Workspace name')).toHaveValue('Forge');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('active');
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue('Local first');
    expect(screen.getByRole('checkbox', { name: 'Show archived' })).toBeChecked();
    expect(screen.getByRole('searchbox', { name: 'Search projects' })).toHaveValue('alpha');
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('renders generic metric and state compositions with accessible status', () => {
    render(<>
      <MetricCard label="Projects" value="4" detail="Active" />
      <Badge tone="success">Ready</Badge>
      <Alert tone="warning">Review required</Alert>
      <EmptyState title="No projects" description="Create a project to begin." />
      <LoadingState label="Loading projects" />
      <ErrorState title="Unable to load" description="Try again." />
      <Progress value={40} max={100} label="Completion" />
    </>);

    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Review required')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading projects' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Completion' })).toHaveValue(40);
  });
});
