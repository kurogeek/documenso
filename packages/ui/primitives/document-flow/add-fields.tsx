'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Caveat } from 'next/font/google';

import {
  CalendarDays,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronsUpDown,
  Disc,
  Hash,
  Info,
  Mail,
  Type,
  User,
} from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';

import { getBoundingClientRect } from '@documenso/lib/client-only/get-bounding-client-rect';
import { useDocumentElement } from '@documenso/lib/client-only/hooks/use-document-element';
import { PDF_VIEWER_PAGE_SELECTOR } from '@documenso/lib/constants/pdf-viewer';
import { RECIPIENT_ROLES_DESCRIPTION } from '@documenso/lib/constants/recipient-roles';
import { ZFieldMetaSchema } from '@documenso/lib/types/field-field-meta';
import { type TFieldMetaSchema as FieldMeta } from '@documenso/lib/types/field-field-meta';
import { nanoid } from '@documenso/lib/universal/id';
import type { Field, Recipient } from '@documenso/prisma/client';
import { RecipientRole } from '@documenso/prisma/client';
import { FieldType, SendStatus } from '@documenso/prisma/client';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Card, CardContent } from '../card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../command';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { useStep } from '../stepper';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';
import type { TAddFieldsFormSchema } from './add-fields.types';
import {
  DocumentFlowFormContainerActions,
  DocumentFlowFormContainerContent,
  DocumentFlowFormContainerFooter,
  DocumentFlowFormContainerHeader,
  DocumentFlowFormContainerStep,
} from './document-flow-root';
import { FieldItem } from './field-item';
import { FieldAdvancedSettings } from './field-item-advanced-settings';
import { type DocumentFlowStep, FRIENDLY_FIELD_TYPE } from './types';

const fontCaveat = Caveat({
  weight: ['500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-caveat',
});

const DEFAULT_HEIGHT_PERCENT = 5;
const DEFAULT_WIDTH_PERCENT = 15;

const MIN_HEIGHT_PX = 60;
const MIN_WIDTH_PX = 200;

export type FieldFormType = {
  nativeId?: number;
  formId: string;
  pageNumber: number;
  type: FieldType;
  pageX: number;
  pageY: number;
  pageWidth: number;
  pageHeight: number;
  signerEmail: string;
  fieldMeta?: FieldMeta;
};

export type CombinedStylesKey = keyof typeof combinedStyles;

export type AddFieldsFormProps = {
  documentFlow: DocumentFlowStep;
  hideRecipients?: boolean;
  recipients: Recipient[];
  fields: Field[];
  onSubmit: (_data: TAddFieldsFormSchema) => void;
  isDocumentPdfLoaded: boolean;
};

/* 
  I hate this, but due to TailwindCSS JIT, I couldnn't find a better way to do this for now.

  TODO: Try to find a better way to do this.
*/
export const combinedStyles = {
  'orange-500': {
    ringColor: 'ring-orange-500/30 ring-offset-orange-500',
    borderWithHover: 'group-data-[selected]:border-orange-500 hover:border-orange-500',
    border: 'border-orange-500',
    borderActive: 'border-orange-500 bg-orange-500/20',
    background: 'bg-orange-500/60 border-orange-500',
    initialsBG: 'bg-orange-500',
  },
  'green-500': {
    ringColor: 'ring-green-500/30 ring-offset-green-500',
    borderWithHover: 'group-data-[selected]:border-green-500 hover:border-green-500',
    border: 'border-green-500',
    borderActive: 'border-green-500 bg-green-500/20',
    background: 'bg-green-500/60 border-green-500',
    initialsBG: 'bg-green-500',
  },
  'cyan-500': {
    ringColor: 'ring-cyan-500/30 ring-offset-cyan-500',
    borderWithHover: 'group-data-[selected]:border-cyan-500 hover:border-cyan-500',
    border: 'border-cyan-500',
    borderActive: 'border-cyan-500 bg-cyan-500/20',
    background: 'bg-cyan-500/60 border-cyan-500',
    initialsBG: 'bg-cyan-500',
  },
  'blue-500': {
    ringColor: 'ring-blue-500/30 ring-offset-blue-500',
    borderWithHover: 'group-data-[selected]:border-blue-500 hover:border-blue-500',
    border: 'border-blue-500',
    borderActive: 'border-blue-500 bg-blue-500/20',
    background: 'bg-blue-500/60 border-blue-500',
    initialsBG: 'bg-blue-500',
  },
  'indigo-500': {
    ringColor: 'ring-indigo-500/30 ring-offset-indigo-500',
    borderWithHover: 'group-data-[selected]:border-indigo-500 hover:border-indigo-500',
    border: 'border-indigo-500',
    borderActive: 'border-indigo-500 bg-indigo-500/20',
    background: 'bg-indigo-500/60 border-indigo-500',
    initialsBG: 'bg-indigo-500',
  },
  'purple-500': {
    ringColor: 'ring-purple-500/30 ring-offset-purple-500',
    borderWithHover: 'group-data-[selected]:border-purple-500 hover:border-purple-500',
    border: 'border-purple-500',
    borderActive: 'border-purple-500 bg-purple-500/20',
    background: 'bg-purple-500/60 border-purple-500',
    initialsBG: 'bg-purple-500',
  },
  'pink-500': {
    ringColor: 'ring-pink-500/30 ring-offset-pink-500',
    borderWithHover: 'group-data-[selected]:border-pink-500 hover:border-pink-500',
    border: 'border-pink-500',
    borderActive: 'border-pink-500 bg-pink-500/20',
    background: 'bg-pink-500/60 border-pink-500',
    initialsBG: 'bg-pink-500',
  },
  'gray-500': {
    ringColor: 'ring-gray-500/30 ring-offset-gray-500',
    borderWithHover: 'group-data-[selected]:border-gray-500 hover:border-gray-500',
    border: 'border-gray-500',
    borderActive: 'border-gray-500 bg-gray-500/20',
    background: 'bg-gray-500/60 border-gray-500',
    initialsBG: 'bg-gray-500',
    fieldBackground: 'bg-gray-500/[.025]',
  },
};

export const colorClasses: CombinedStylesKey[] = [
  'orange-500',
  'green-500',
  'cyan-500',
  'blue-500',
  'indigo-500',
  'purple-500',
  'pink-500',
];

export const AddFieldsFormPartial = ({
  documentFlow,
  hideRecipients = false,
  recipients,
  fields,
  onSubmit,
  isDocumentPdfLoaded,
}: AddFieldsFormProps) => {
  const { isWithinPageBounds, getFieldPosition, getPage } = useDocumentElement();
  const { currentStep, totalSteps, previousStep } = useStep();
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [currentField, setCurrentField] = useState<FieldFormType>();
  const settingsRef = useRef<HTMLDivElement>(null);

  const recipientColorClasses = useMemo(() => {
    const colorMap = new Map<Recipient['id'], CombinedStylesKey>();
    recipients.forEach((recipient, index) => {
      colorMap.set(recipient.id, colorClasses[index % colorClasses.length]);
    });
    return colorMap;
  }, [recipients]);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    setValue,
    getValues,
  } = useForm<TAddFieldsFormSchema>({
    defaultValues: {
      fields: fields.map((field) => ({
        nativeId: field.id,
        formId: `${field.id}-${field.documentId}`,
        pageNumber: field.page,
        type: field.type,
        pageX: Number(field.positionX),
        pageY: Number(field.positionY),
        pageWidth: Number(field.width),
        pageHeight: Number(field.height),
        signerEmail:
          recipients.find((recipient) => recipient.id === field.recipientId)?.email ?? '',
        fieldMeta: ZFieldMetaSchema.parse(field.fieldMeta) ?? {},
      })),
    },
  });

  const onFormSubmit = handleSubmit(onSubmit);
  const handleSavedFieldSettings = (fieldState: FieldMeta) => {
    const initialValues = getValues();

    const updatedFields = initialValues.fields.map((field) => {
      if (field.formId === currentField?.formId) {
        const parsedFieldMeta = ZFieldMetaSchema.parse(fieldState);

        return {
          ...field,
          fieldMeta: parsedFieldMeta,
        };
      }

      return field;
    });

    setValue('fields', updatedFields);
  };

  const {
    append,
    remove,
    update,
    fields: localFields,
  } = useFieldArray({
    control,
    name: 'fields',
  });

  const [selectedField, setSelectedField] = useState<FieldType | null>(null);
  const [selectedSigner, setSelectedSigner] = useState<Recipient | null>(null);
  const [showRecipientsSelector, setShowRecipientsSelector] = useState(false);

  const selectedSignerStyles = useMemo(() => {
    if (!selectedSigner) return {};

    const colorClass = recipientColorClasses.get(selectedSigner.id);
    if (!colorClass) return {};

    const styles = combinedStyles[colorClass];

    return {
      ringClass: styles?.ringColor,
      borderClass: styles?.borderWithHover,
      activeBorderClass: styles?.borderActive,
    };
  }, [selectedSigner]);

  const {
    ringClass: selectedSignerRingClass,
    borderClass: selectedSignerBorderClass,
    activeBorderClass: selectedSignerActiveBorderClass,
  } = selectedSignerStyles;

  const hasSelectedSignerBeenSent = selectedSigner?.sendStatus === SendStatus.SENT;

  const isFieldsDisabled =
    !selectedSigner ||
    hasSelectedSignerBeenSent ||
    selectedSigner?.role === RecipientRole.VIEWER ||
    selectedSigner?.role === RecipientRole.CC;

  const [isFieldWithinBounds, setIsFieldWithinBounds] = useState(false);
  const [coords, setCoords] = useState({
    x: 0,
    y: 0,
  });

  const fieldBounds = useRef({
    height: 0,
    width: 0,
  });

  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      setIsFieldWithinBounds(
        isWithinPageBounds(
          event,
          PDF_VIEWER_PAGE_SELECTOR,
          fieldBounds.current.width,
          fieldBounds.current.height,
        ),
      );

      setCoords({
        x: event.clientX - fieldBounds.current.width / 2,
        y: event.clientY - fieldBounds.current.height / 2,
      });
    },
    [isWithinPageBounds],
  );

  const onMouseClick = useCallback(
    (event: MouseEvent) => {
      if (!selectedField || !selectedSigner) {
        return;
      }

      const $page = getPage(event, PDF_VIEWER_PAGE_SELECTOR);

      if (
        !$page ||
        !isWithinPageBounds(
          event,
          PDF_VIEWER_PAGE_SELECTOR,
          fieldBounds.current.width,
          fieldBounds.current.height,
        )
      ) {
        setSelectedField(null);
        return;
      }

      const { top, left, height, width } = getBoundingClientRect($page);

      const pageNumber = parseInt($page.getAttribute('data-page-number') ?? '1', 10);

      // Calculate x and y as a percentage of the page width and height
      let pageX = ((event.pageX - left) / width) * 100;
      let pageY = ((event.pageY - top) / height) * 100;

      // Get the bounds as a percentage of the page width and height
      const fieldPageWidth = (fieldBounds.current.width / width) * 100;
      const fieldPageHeight = (fieldBounds.current.height / height) * 100;

      // And center it based on the bounds
      pageX -= fieldPageWidth / 2;
      pageY -= fieldPageHeight / 2;

      append({
        formId: nanoid(12),
        type: selectedField,
        pageNumber,
        pageX,
        pageY,
        pageWidth: fieldPageWidth,
        pageHeight: fieldPageHeight,
        signerEmail: selectedSigner.email,
        fieldMeta: undefined,
      });

      setIsFieldWithinBounds(false);
      setSelectedField(null);
    },
    [append, isWithinPageBounds, selectedField, selectedSigner, getPage],
  );

  const onFieldResize = useCallback(
    (node: HTMLElement, index: number) => {
      const field = localFields[index];

      const $page = window.document.querySelector<HTMLElement>(
        `${PDF_VIEWER_PAGE_SELECTOR}[data-page-number="${field.pageNumber}"]`,
      );

      if (!$page) {
        return;
      }

      const {
        x: pageX,
        y: pageY,
        width: pageWidth,
        height: pageHeight,
      } = getFieldPosition($page, node);

      update(index, {
        ...field,
        pageX,
        pageY,
        pageWidth,
        pageHeight,
      });
    },
    [getFieldPosition, localFields, update],
  );

  const onFieldMove = useCallback(
    (node: HTMLElement, index: number) => {
      const field = localFields[index];

      const $page = window.document.querySelector<HTMLElement>(
        `${PDF_VIEWER_PAGE_SELECTOR}[data-page-number="${field.pageNumber}"]`,
      );

      if (!$page) {
        return;
      }

      const { x: pageX, y: pageY } = getFieldPosition($page, node);

      update(index, {
        ...field,
        pageX,
        pageY,
      });
    },
    [getFieldPosition, localFields, update],
  );

  useEffect(() => {
    if (selectedField) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseClick);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseClick);
    };
  }, [onMouseClick, onMouseMove, selectedField]);

  useEffect(() => {
    const observer = new MutationObserver((_mutations) => {
      const $page = document.querySelector(PDF_VIEWER_PAGE_SELECTOR);

      if (!$page) {
        return;
      }

      const { height, width } = $page.getBoundingClientRect();

      fieldBounds.current = {
        height: Math.max(height * (DEFAULT_HEIGHT_PERCENT / 100), MIN_HEIGHT_PX),
        width: Math.max(width * (DEFAULT_WIDTH_PERCENT / 100), MIN_WIDTH_PX),
      };
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    setSelectedSigner(recipients.find((r) => r.sendStatus !== SendStatus.SENT) ?? recipients[0]);
  }, [recipients]);

  const recipientsByRole = useMemo(() => {
    const recipientsByRole: Record<RecipientRole, Recipient[]> = {
      CC: [],
      VIEWER: [],
      SIGNER: [],
      APPROVER: [],
    };

    recipients.forEach((recipient) => {
      recipientsByRole[recipient.role].push(recipient);
    });

    return recipientsByRole;
  }, [recipients]);

  const recipientsByRoleToDisplay = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return (Object.entries(recipientsByRole) as [RecipientRole, Recipient[]][]).filter(
      ([role]) => role !== RecipientRole.CC && role !== RecipientRole.VIEWER,
    );
  }, [recipientsByRole]);

  const handleAdvancedSettings = () => {
    setShowAdvancedSettings((prev) => !prev);
  };

  const handleClickOutsideAdancedSettingsTab = (event: MouseEvent) => {
    if (
      showAdvancedSettings &&
      settingsRef.current &&
      !event.composedPath().includes(settingsRef.current)
    ) {
      setShowAdvancedSettings(false);
    }
  };

  useEffect(() => {
    document.body.addEventListener('click', handleClickOutsideAdancedSettingsTab);

    return () => {
      document.body.removeEventListener('click', handleClickOutsideAdancedSettingsTab);
    };
  }, [showAdvancedSettings]);

  return (
    <>
      {showAdvancedSettings && currentField ? (
        <FieldAdvancedSettings
          title="Advanced settings"
          description={`Configure the ${FRIENDLY_FIELD_TYPE[currentField.type]} field`}
          field={currentField}
          fields={localFields}
          onAdvancedSettings={handleAdvancedSettings}
          isDocumentPdfLoaded={isDocumentPdfLoaded}
          ref={settingsRef}
          onSave={handleSavedFieldSettings}
        />
      ) : (
        <>
          <DocumentFlowFormContainerHeader
            title={documentFlow.title}
            description={documentFlow.description}
          />
          <DocumentFlowFormContainerContent>
            <div className="flex flex-col">
              {selectedField && (
                <Card
                  className={cn(
                    'pointer-events-none fixed z-50 cursor-pointer border-2 backdrop-blur-[1px]',
                    selectedSignerActiveBorderClass,
                    {
                      'text-field-card-foreground border-2': isFieldWithinBounds,
                      'opacity-50': !isFieldWithinBounds,
                    },
                  )}
                  style={{
                    top: coords.y,
                    left: coords.x,
                    height: fieldBounds.current.height,
                    width: fieldBounds.current.width,
                  }}
                >
                  <CardContent className="text-field-card-background flex h-full w-full items-center justify-center p-2">
                    {FRIENDLY_FIELD_TYPE[selectedField]}
                  </CardContent>
                </Card>
              )}

              {isDocumentPdfLoaded &&
                localFields.map((field, index) => {
                  const recipient = recipients.find((r) => r.email === field.signerEmail);
                  const colorClass = recipient ? recipientColorClasses.get(recipient.id) : '';

                  return (
                    <FieldItem
                      key={index}
                      field={field}
                      disabled={
                        selectedSigner?.email !== field.signerEmail || hasSelectedSignerBeenSent
                      }
                      minHeight={fieldBounds.current.height}
                      minWidth={fieldBounds.current.width}
                      passive={isFieldWithinBounds && !!selectedField}
                      onResize={(options) => onFieldResize(options, index)}
                      onMove={(options) => onFieldMove(options, index)}
                      onRemove={() => remove(index)}
                      onAdvancedSettings={() => {
                        setCurrentField(field);
                        handleAdvancedSettings();
                      }}
                      color={colorClass || undefined}
                      hideRecipients={hideRecipients}
                    />
                  );
                })}

              {!hideRecipients && (
                <Popover open={showRecipientsSelector} onOpenChange={setShowRecipientsSelector}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className={cn(
                        'bg-background text-muted-foreground hover:text-foreground mb-12 mt-2 justify-between font-normal ring ring-offset-2',
                        selectedSignerRingClass,
                      )}
                    >
                      {selectedSigner?.email && (
                        <span className="flex-1 truncate text-left">
                          {selectedSigner?.name} ({selectedSigner?.email})
                        </span>
                      )}

                      {!selectedSigner?.email && (
                        <span className="flex-1 truncate text-left">{selectedSigner?.email}</span>
                      )}

                      <ChevronsUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="p-0" align="start">
                    <Command value={selectedSigner?.email}>
                      <CommandInput />

                      <CommandEmpty>
                        <span className="text-muted-foreground inline-block px-4">
                          No recipient matching this description was found.
                        </span>
                      </CommandEmpty>

                      {recipientsByRoleToDisplay.map(([role, recipients], roleIndex) => (
                        <CommandGroup key={roleIndex}>
                          <div className="text-muted-foreground mb-1 ml-2 mt-2 text-xs font-medium">
                            {`${RECIPIENT_ROLES_DESCRIPTION[role].roleName}s`}
                          </div>

                          {recipients.length === 0 && (
                            <div
                              key={`${role}-empty`}
                              className="text-muted-foreground/80 px-4 pb-4 pt-2.5 text-center text-xs"
                            >
                              No recipients with this role
                            </div>
                          )}

                          {recipients.map((recipient) => (
                            <CommandItem
                              key={recipient.id}
                              className={cn('px-2 last:mb-1 [&:not(:first-child)]:mt-1', {
                                'text-muted-foreground': recipient.sendStatus === SendStatus.SENT,
                              })}
                              onSelect={() => {
                                setSelectedSigner(recipient);
                                setShowRecipientsSelector(false);
                              }}
                            >
                              <span
                                className={cn('text-foreground/70 truncate', {
                                  'text-foreground/80': recipient === selectedSigner,
                                })}
                              >
                                {recipient.name && (
                                  <span title={`${recipient.name} (${recipient.email})`}>
                                    {recipient.name} ({recipient.email})
                                  </span>
                                )}

                                {!recipient.name && (
                                  <span title={recipient.email}>{recipient.email}</span>
                                )}
                              </span>

                              <div className="ml-auto flex items-center justify-center">
                                {recipient.sendStatus !== SendStatus.SENT ? (
                                  <Check
                                    aria-hidden={recipient !== selectedSigner}
                                    className={cn('h-4 w-4 flex-shrink-0', {
                                      'opacity-0': recipient !== selectedSigner,
                                      'opacity-100': recipient === selectedSigner,
                                    })}
                                  />
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Info className="ml-2 h-4 w-4" />
                                    </TooltipTrigger>

                                    <TooltipContent className="text-muted-foreground max-w-xs">
                                      This document has already been sent to this recipient. You can
                                      no longer edit this recipient.
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ))}
                    </Command>
                  </PopoverContent>
                </Popover>
              )}

              <div className="-mx-2 flex-1 overflow-y-auto px-2">
                <fieldset disabled={isFieldsDisabled} className="grid grid-cols-2 gap-x-4 gap-y-8">
                  <button
                    type="button"
                    className="group h-full w-full"
                    onClick={() => setSelectedField(FieldType.SIGNATURE)}
                    onMouseDown={() => setSelectedField(FieldType.SIGNATURE)}
                    data-selected={selectedField === FieldType.SIGNATURE ? true : undefined}
                  >
                    <Card
                      className={cn(
                        'h-full w-full cursor-pointer group-disabled:opacity-50',
                        selectedSignerBorderClass,
                      )}
                    >
                      <CardContent className="flex flex-col items-center justify-center px-6 py-4">
                        <p
                          className={cn(
                            'text-muted-foreground group-data-[selected]:text-foreground w-full truncate text-3xl font-medium',
                            fontCaveat.className,
                          )}
                        >
                          {selectedSigner?.name || 'Signature'}
                        </p>
                      </CardContent>
                    </Card>
                  </button>

                  <button
                    type="button"
                    className="group h-full w-full"
                    onClick={() => setSelectedField(FieldType.EMAIL)}
                    onMouseDown={() => setSelectedField(FieldType.EMAIL)}
                    data-selected={selectedField === FieldType.EMAIL ? true : undefined}
                  >
                    <Card
                      className={cn(
                        'h-full w-full cursor-pointer group-disabled:opacity-50',
                        selectedSignerBorderClass,
                      )}
                    >
                      <CardContent className="flex flex-col items-center justify-center px-6 py-4">
                        <p
                          className={cn(
                            selectedSigner?.name ? 'mt-1.5' : 'mt-0',
                            'text-muted-foreground group-data-[selected]:text-foreground flex items-center justify-center gap-x-1 text-xl font-normal',
                          )}
                        >
                          <Mail />
                          {'Email'}
                        </p>
                      </CardContent>
                    </Card>
                  </button>

                  <button
                    type="button"
                    className="group h-full w-full"
                    onClick={() => setSelectedField(FieldType.NAME)}
                    onMouseDown={() => setSelectedField(FieldType.NAME)}
                    data-selected={selectedField === FieldType.NAME ? true : undefined}
                  >
                    <Card
                      className={cn(
                        'h-full w-full cursor-pointer group-disabled:opacity-50',
                        selectedSignerBorderClass,
                      )}
                    >
                      <CardContent className="flex flex-col items-center justify-center px-6 py-4">
                        <p
                          className={cn(
                            'text-muted-foreground group-data-[selected]:text-foreground flex items-center justify-center gap-x-1 text-xl font-normal',
                          )}
                        >
                          <User />
                          {'Name'}
                        </p>
                      </CardContent>
                    </Card>
                  </button>

                  <button
                    type="button"
                    className="group h-full w-full"
                    onClick={() => setSelectedField(FieldType.DATE)}
                    onMouseDown={() => setSelectedField(FieldType.DATE)}
                    data-selected={selectedField === FieldType.DATE ? true : undefined}
                  >
                    <Card
                      className={cn(
                        'h-full w-full cursor-pointer group-disabled:opacity-50',
                        selectedSignerBorderClass,
                      )}
                    >
                      <CardContent className="flex flex-col items-center justify-center px-6 py-4">
                        <p
                          className={cn(
                            'text-muted-foreground group-data-[selected]:text-foreground flex items-center justify-center gap-x-1 text-xl font-normal',
                          )}
                        >
                          <CalendarDays />
                          {'Date'}
                        </p>
                      </CardContent>
                    </Card>
                  </button>

                  <button
                    type="button"
                    className="group h-full w-full"
                    onClick={() => setSelectedField(FieldType.TEXT)}
                    onMouseDown={() => setSelectedField(FieldType.TEXT)}
                    data-selected={selectedField === FieldType.TEXT ? true : undefined}
                  >
                    <Card
                      className={cn(
                        'h-full w-full cursor-pointer group-disabled:opacity-50',
                        selectedSignerBorderClass,
                      )}
                    >
                      <CardContent className="flex flex-col items-center justify-center px-6 py-4">
                        <p
                          className={cn(
                            'text-muted-foreground group-data-[selected]:text-foreground flex items-center justify-center gap-x-1 text-xl font-normal',
                          )}
                        >
                          <Type />
                          {'Text'}
                        </p>
                      </CardContent>
                    </Card>
                  </button>

                  <button
                    type="button"
                    className="group h-full w-full"
                    onClick={() => setSelectedField(FieldType.NUMBER)}
                    onMouseDown={() => setSelectedField(FieldType.NUMBER)}
                    data-selected={selectedField === FieldType.NUMBER ? true : undefined}
                  >
                    <Card
                      className={cn(
                        'h-full w-full cursor-pointer group-disabled:opacity-50',
                        selectedSignerBorderClass,
                      )}
                    >
                      <CardContent className="flex flex-col items-center justify-center px-6 py-4">
                        <p
                          className={cn(
                            'text-muted-foreground group-data-[selected]:text-foreground flex items-center justify-center gap-x-1 text-xl font-normal',
                          )}
                        >
                          <Hash />
                          {'Number'}
                        </p>
                      </CardContent>
                    </Card>
                  </button>

                  <button
                    type="button"
                    className="group h-full w-full"
                    onClick={() => setSelectedField(FieldType.RADIO)}
                    onMouseDown={() => setSelectedField(FieldType.RADIO)}
                    data-selected={selectedField === FieldType.RADIO ? true : undefined}
                  >
                    <Card
                      className={cn(
                        'h-full w-full cursor-pointer group-disabled:opacity-50',
                        selectedSignerBorderClass,
                      )}
                    >
                      <CardContent className="flex flex-col items-center justify-center px-6 py-4">
                        <p
                          className={cn(
                            'text-muted-foreground group-data-[selected]:text-foreground flex items-center justify-center gap-x-1 text-xl font-normal',
                          )}
                        >
                          <Disc />
                          {'Radio'}
                        </p>
                      </CardContent>
                    </Card>
                  </button>

                  <button
                    type="button"
                    className="group h-full w-full"
                    onClick={() => setSelectedField(FieldType.CHECKBOX)}
                    onMouseDown={() => setSelectedField(FieldType.CHECKBOX)}
                    data-selected={selectedField === FieldType.CHECKBOX ? true : undefined}
                  >
                    <Card
                      className={cn(
                        'h-full w-full cursor-pointer group-disabled:opacity-50',
                        selectedSignerBorderClass,
                      )}
                    >
                      <CardContent className="flex flex-col items-center justify-center px-6 py-4">
                        <p
                          className={cn(
                            'text-muted-foreground group-data-[selected]:text-foreground flex items-center justify-center gap-x-1 text-xl font-normal',
                          )}
                        >
                          <CheckSquare />
                          {'Checkbox'}
                        </p>
                      </CardContent>
                    </Card>
                  </button>

                  <button
                    type="button"
                    className="group h-full w-full"
                    onClick={() => setSelectedField(FieldType.DROPDOWN)}
                    onMouseDown={() => setSelectedField(FieldType.DROPDOWN)}
                    data-selected={selectedField === FieldType.DROPDOWN ? true : undefined}
                  >
                    <Card
                      className={cn(
                        'h-full w-full cursor-pointer group-disabled:opacity-50',
                        selectedSignerBorderClass,
                      )}
                    >
                      <CardContent className="flex flex-col items-center justify-center px-6 py-4">
                        <p
                          className={cn(
                            'text-muted-foreground group-data-[selected]:text-foreground flex items-center justify-center gap-x-1 text-xl font-normal',
                          )}
                        >
                          <ChevronDown />
                          {'Dropdown'}
                        </p>
                      </CardContent>
                    </Card>
                  </button>
                </fieldset>
              </div>
            </div>
          </DocumentFlowFormContainerContent>
          <DocumentFlowFormContainerFooter>
            <DocumentFlowFormContainerStep
              title={documentFlow.title}
              step={currentStep}
              maxStep={totalSteps}
            />

            <DocumentFlowFormContainerActions
              loading={isSubmitting}
              disabled={isSubmitting}
              onGoBackClick={() => {
                previousStep();
                remove();
              }}
              onGoNextClick={() => void onFormSubmit()}
            />
          </DocumentFlowFormContainerFooter>
        </>
      )}
    </>
  );
};
