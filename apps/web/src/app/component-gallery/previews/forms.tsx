import type { ReactNode } from 'react';
import {
  Card,
  Checkbox,
  FilePicker,
  FormActions,
  FormField,
  Input,
  MultiSelect,
  Radio,
  SearchField,
  Select,
  Switch,
  Textarea,
} from '@corefoundry-labs/forge-ui';
import styles from '../ComponentGallery.module.css';

export function renderFormPreview(componentId: string): ReactNode | null {
  switch (componentId) {
    case 'input':
      return (
        <Card>
          <label htmlFor="host-input">Input preview</label>
          <Input id="host-input" placeholder="Type a value" />
        </Card>
      );
    case 'select':
      return (
        <div className={styles.previewStack}>
          <Card>
            <FormField label="Default select">
              <Select defaultValue="one">
                <option value="one">Option one</option>
                <option value="two">Option two</option>
              </Select>
            </FormField>
          </Card>
          <Card>
            <FormField label="Invalid select" error="Choose an available option.">
              <Select aria-invalid="true" defaultValue="">
                <option value="">Choose…</option>
                <option value="one">Option one</option>
              </Select>
            </FormField>
          </Card>
          <Card>
            <FormField label="Disabled select" disabled>
              <Select disabled defaultValue="one">
                <option value="one">Option one</option>
              </Select>
            </FormField>
          </Card>
        </div>
      );
    case 'textarea':
      return (
        <div className={styles.previewStack}>
          <Card>
            <FormField label="Default textarea">
              <Textarea placeholder="Type details" />
            </FormField>
          </Card>
          <Card>
            <FormField label="Invalid textarea" error="Add a short description.">
              <Textarea aria-invalid="true" defaultValue="" />
            </FormField>
          </Card>
          <Card>
            <FormField label="Disabled textarea" disabled>
              <Textarea disabled defaultValue="Read-only context" />
            </FormField>
          </Card>
        </div>
      );
    case 'checkbox':
      return (
        <Card>
          <div className={styles.previewStack}>
            <label className={styles.previewRow} htmlFor="host-checkbox-unchecked">
              <Checkbox id="host-checkbox-unchecked" />
              Unchecked
            </label>
            <label className={styles.previewRow} htmlFor="host-checkbox-checked">
              <Checkbox id="host-checkbox-checked" defaultChecked />
              Checked
            </label>
            <label className={styles.previewRow} htmlFor="host-checkbox-indeterminate">
              <Checkbox id="host-checkbox-indeterminate" indeterminate />
              Indeterminate
            </label>
            <label className={styles.previewRow} htmlFor="host-checkbox-disabled">
              <Checkbox id="host-checkbox-disabled" disabled />
              Disabled
            </label>
          </div>
        </Card>
      );
    case 'form-field':
      return (
        <div className={styles.previewStack}>
          <Card>
            <FormField label="Field label" hint="Helpful hint">
              <Input placeholder="Field value" />
            </FormField>
          </Card>
          <Card>
            <FormField label="Required field" required hint="Required for this example">
              <Input placeholder="Field value" />
            </FormField>
          </Card>
          <Card>
            <FormField label="Invalid field" error="Enter a valid value.">
              <Input aria-invalid="true" defaultValue="Invalid" />
            </FormField>
          </Card>
          <Card>
            <FormField label="Disabled field" disabled>
              <Input disabled defaultValue="Unavailable" />
            </FormField>
          </Card>
        </div>
      );
    case 'search-field':
      return (
        <div className={styles.previewStack}>
          <Card>
            <SearchField aria-label="Empty search" placeholder="Search records" />
          </Card>
          <Card>
            <SearchField aria-label="Search with query" defaultValue="evidence" />
          </Card>
          <Card>
            <SearchField aria-label="Disabled search" disabled defaultValue="Unavailable" />
          </Card>
        </div>
      );
    case 'multi-select':
      return (
        <div className={styles.previewStack}>
          <MultiSelect
            presentation="checkboxList"
            label="Relevant evidence"
            name="host-evidence"
            defaultValue={['criteria', 'build']}
            options={[
              { value: 'criteria', label: 'Criteria evidence' },
              { value: 'build', label: 'Build report' },
            ]}
          />
          <MultiSelect
            presentation="checkboxList"
            label="Relevant evidence"
            options={[]}
            emptyMessage="No saved records available."
          />
        </div>
      );
    case 'file-picker':
      return (
        <div className={styles.previewStack}>
          <FilePicker
            title="Choose JSON file"
            description="Browse locally for a JSON file."
            metadata=".json · Max 8 MiB"
            accept="application/json,.json"
          />
          <FilePicker
            title="Choose JSON file"
            description="A selected file is handled by the consuming feature."
            metadata=".json · Max 8 MiB"
            accept="application/json,.json"
            state="selected"
          />
          <FilePicker
            title="Choose JSON file"
            description="The selected file exceeds the feature's configured limit."
            metadata=".json · Max 8 MiB"
            accept="application/json,.json"
            state="error"
          />
        </div>
      );
    case 'form-actions':
      return (
        <div className={styles.previewStack}>
          <FormActions onCancel={() => undefined} onSave={() => undefined} />
          <FormActions state="saving" />
          <FormActions state="readOnly" />
        </div>
      );
    case 'radio':
      return (
        <Card>
          <fieldset className={styles.fieldset}>
            <legend>Repository access</legend>
            <label htmlFor="host-repo-access-read">
              <Radio
                id="host-repo-access-read"
                name="host-repo-access"
                value="read"
                defaultChecked
              />{' '}
              Read only
            </label>
            <label htmlFor="host-repo-access-write">
              <Radio id="host-repo-access-write" name="host-repo-access" value="write" /> Read and
              write
            </label>
            <label htmlFor="host-repo-access-disabled">
              <Radio
                id="host-repo-access-disabled"
                name="host-repo-access-disabled"
                value="none"
                disabled
              />{' '}
              Unavailable
            </label>
          </fieldset>
        </Card>
      );
    case 'switch':
      return (
        <Card>
          <div className={styles.previewStack}>
            <label className={styles.previewRow} htmlFor="host-switch-off">
              <Switch id="host-switch-off" />
              Off
            </label>
            <label className={styles.previewRow} htmlFor="host-switch-on">
              <Switch id="host-switch-on" defaultChecked />
              On
            </label>
            <label className={styles.previewRow} htmlFor="host-switch-disabled">
              <Switch id="host-switch-disabled" disabled />
              Disabled
            </label>
          </div>
        </Card>
      );
    default:
      return null;
  }
}
