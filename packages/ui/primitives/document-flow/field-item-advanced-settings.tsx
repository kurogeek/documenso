'use client';

import { forwardRef, useEffect, useState } from 'react';

import { useParams } from 'next/navigation';
import { usePathname } from 'next/navigation';

import {
  type TBaseFieldMeta as BaseFieldMeta,
  type TCheckboxFieldMeta as CheckboxFieldMeta,
  type TDropdownFieldMeta as DropdownFieldMeta,
  type TFieldMetaSchema as FieldMeta,
  type TNumberFieldMeta as NumberFieldMeta,
  type TRadioFieldMeta as RadioFieldMeta,
  type TTextFieldMeta as TextFieldMeta,
  ZFieldMetaSchema,
} from '@documenso/lib/types/field-field-meta';
import { FieldType } from '@documenso/prisma/client';
import { trpc } from '@documenso/trpc/react';
import { useToast } from '@documenso/ui/primitives/use-toast';

import type { FieldFormType } from './add-fields';
import {
  DocumentFlowFormContainerActions,
  DocumentFlowFormContainerContent,
  DocumentFlowFormContainerFooter,
  DocumentFlowFormContainerHeader,
} from './document-flow-root';
import { FieldItem } from './field-item';
import { CheckboxFieldAdvancedSettings } from './field-items-advanced-settings/checkbox-field';
import { DropdownFieldAdvancedSettings } from './field-items-advanced-settings/dropdown-field';
import { NumberFieldAdvancedSettings } from './field-items-advanced-settings/number-field';
import { RadioFieldAdvancedSettings } from './field-items-advanced-settings/radio-field';
import { TextFieldAdvancedSettings } from './field-items-advanced-settings/text-field';

export type FieldAdvancedSettingsProps = {
  title: string;
  description: string;
  field: FieldFormType;
  fields: FieldFormType[];
  onAdvancedSettings?: () => void;
  isDocumentPdfLoaded?: boolean;
  onSave?: (fieldState: FieldMeta) => void;
};

export type FieldMetaKeys =
  | keyof BaseFieldMeta
  | keyof TextFieldMeta
  | keyof NumberFieldMeta
  | keyof RadioFieldMeta
  | keyof CheckboxFieldMeta
  | keyof DropdownFieldMeta;

export const FieldAdvancedSettings = forwardRef<HTMLDivElement, FieldAdvancedSettingsProps>(
  (
    { title, description, field, fields, onAdvancedSettings, isDocumentPdfLoaded = true, onSave },
    ref,
  ) => {
    const { toast } = useToast();
    const params = useParams();
    const pathname = usePathname();
    const id = params?.id;
    const isTemplatePage = pathname?.includes('template');
    const isDocumentPage = pathname?.includes('document');

    const getDefaultState = (fieldType: FieldType): FieldMeta => {
      switch (fieldType) {
        case FieldType.TEXT:
          return {
            type: 'text',
            label: '',
            placeholder: '',
            text: '',
            characterLimit: 0,
            required: false,
            readOnly: false,
          };
        case FieldType.NUMBER:
          return {
            type: 'number',
            label: '',
            placeholder: '',
            numberFormat: '',
            value: 0,
            minValue: 0,
            maxValue: 0,
            required: false,
            readOnly: false,
          };
        case FieldType.RADIO:
          return {
            type: 'radio',
            values: [],
            required: false,
            readOnly: false,
          };
        case FieldType.CHECKBOX:
          return {
            type: 'checkbox',
            values: [],
            validationRule: '',
            validationLength: 0,
            required: false,
            readOnly: false,
          };
        case FieldType.DROPDOWN:
          return {
            type: 'dropdown',
            values: [],
            defaultValue: '',
            required: false,
            readOnly: false,
          };
        default:
          throw new Error(`Unsupported field type: ${fieldType}`);
      }
    };

    const { data: template } = trpc.template.getTemplateWithDetailsById.useQuery(
      {
        id: Number(id),
      },
      {
        enabled: isTemplatePage,
      },
    );

    const { data: document } = trpc.document.getDocumentById.useQuery(
      {
        id: Number(id),
      },
      {
        enabled: isDocumentPage,
      },
    );

    const doesFieldExist = (!!document || !!template) && field.nativeId !== undefined;

    const { data: fieldData } = trpc.field.getField.useQuery(
      {
        fieldId: Number(field.nativeId),
        documentId: document?.id ?? undefined,
        templateId: template?.id ?? undefined,
      },
      {
        enabled: doesFieldExist,
      },
    );

    const fieldMeta = fieldData?.fieldMeta;

    console.log('\n');
    console.log('\n');
    console.log('\n');
    console.log('\n');
    console.log('fieldMeta', fieldMeta);
    console.log('\n');
    console.log('\n');
    console.log('\n');
    console.log('\n');

    const localStorageKey = `field_${field.formId}_${field.type}`;

    const defaultState: FieldMeta = getDefaultState(field.type);

    const [fieldState, setFieldState] = useState(() => {
      const savedState = localStorage.getItem(localStorageKey);
      return savedState ? { ...defaultState, ...JSON.parse(savedState) } : defaultState;
    });

    useEffect(() => {
      if (fieldMeta && typeof fieldMeta === 'object') {
        const parsedFieldMeta = ZFieldMetaSchema.parse(fieldMeta);

        setFieldState({
          ...defaultState,
          ...parsedFieldMeta,
        });
      }
    }, [fieldMeta]);

    const handleFieldChange = (
      key: FieldMetaKeys,
      value: string | { checked: boolean; value: string }[] | { value: string }[],
    ) => {
      setFieldState((prevState: FieldMeta) => {
        if (['characterLimit', 'minValue', 'maxValue', 'value', 'validationLength'].includes(key)) {
          const parsedValue = Number(value);

          return {
            ...prevState,
            [key]: isNaN(parsedValue) ? undefined : parsedValue,
          };
        } else {
          return {
            ...prevState,
            [key]: value,
          };
        }
      });
    };

    const handleToggleChange = (key: FieldMetaKeys) => {
      setFieldState((prevState: FieldMeta) => {
        if (prevState && key in prevState) {
          return {
            ...prevState,
            // @ts-expect-error fix this later
            [key]: !prevState[key],
          };
        }
        return prevState;
      });
    };

    const numberField = field.type === FieldType.NUMBER;
    const checkBoxField = field.type === FieldType.CHECKBOX;
    const radioField = field.type === FieldType.RADIO;
    const textField = field.type === FieldType.TEXT;
    const dropdownField = field.type === FieldType.DROPDOWN;

    const handleOnGoNextClick = () => {
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(fieldState));

        onSave?.(fieldState);
        onAdvancedSettings?.();
      } catch (error) {
        console.error('Failed to save to localStorage:', error);

        toast({
          title: 'Error',
          description: 'Failed to save settings.',
          variant: 'destructive',
        });
      }
    };

    return (
      <div ref={ref} className="flex h-full flex-col">
        <DocumentFlowFormContainerHeader title={title} description={description} />
        <DocumentFlowFormContainerContent>
          {isDocumentPdfLoaded &&
            fields.map((field, index) => (
              <span key={index} className="opacity-75 active:pointer-events-none">
                <FieldItem key={index} field={field} disabled={true} color={'gray-500'} />
              </span>
            ))}

          {textField && (
            <TextFieldAdvancedSettings
              fieldState={fieldState}
              handleFieldChange={handleFieldChange}
              handleToggleChange={handleToggleChange}
            />
          )}

          {numberField && (
            <NumberFieldAdvancedSettings
              fieldState={fieldState}
              handleFieldChange={handleFieldChange}
              handleToggleChange={handleToggleChange}
            />
          )}

          {radioField && (
            <RadioFieldAdvancedSettings
              fieldState={fieldState}
              handleFieldChange={handleFieldChange}
              handleToggleChange={handleToggleChange}
            />
          )}

          {checkBoxField && (
            <CheckboxFieldAdvancedSettings
              fieldState={fieldState}
              handleFieldChange={handleFieldChange}
              handleToggleChange={handleToggleChange}
            />
          )}

          {dropdownField && (
            <DropdownFieldAdvancedSettings
              fieldState={fieldState}
              handleFieldChange={handleFieldChange}
              handleToggleChange={handleToggleChange}
            />
          )}
        </DocumentFlowFormContainerContent>
        <DocumentFlowFormContainerFooter className="mt-auto">
          <DocumentFlowFormContainerActions
            goNextLabel="Save"
            goBackLabel="Cancel"
            onGoBackClick={onAdvancedSettings}
            onGoNextClick={handleOnGoNextClick}
          />
        </DocumentFlowFormContainerFooter>
      </div>
    );
  },
);

FieldAdvancedSettings.displayName = 'FieldAdvancedSettings';
