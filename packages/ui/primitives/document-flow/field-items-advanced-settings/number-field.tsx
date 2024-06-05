'use client';

import { useState } from 'react';

import { ChevronDown, ChevronUp } from 'lucide-react';

import { type TNumberFieldMeta as NumberFieldMeta } from '@documenso/lib/types/field-field-meta';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@documenso/ui/primitives/select';
import { Switch } from '@documenso/ui/primitives/switch';

import { numberFormatValues } from './constants';

type NumberFieldAdvancedSettingsProps = {
  fieldState: NumberFieldMeta;
  handleFieldChange: (key: keyof NumberFieldMeta, value: string | boolean) => void;
  handleErrors: (errors: string[]) => void;
};

export const NumberFieldAdvancedSettings = ({
  fieldState,
  handleFieldChange,
  handleErrors,
}: NumberFieldAdvancedSettingsProps) => {
  const [showValidation, setShowValidation] = useState(false);

  const validateValue = (
    value: number,
    minNumber: number,
    maxNumber: number,
    readOnly: boolean,
    required: boolean,
  ) => {
    const errors = [];

    if (minNumber > 0 && value < minNumber) {
      errors.push(`Value ${value} is less than the min value ${minNumber}`);
    }

    if (maxNumber > 0 && value > maxNumber) {
      errors.push(`Value ${value} is greater than the max value ${maxNumber}`);
    }

    if (minNumber > maxNumber) {
      errors.push('Min value cannot be greater than max value');
    }

    if (maxNumber < minNumber) {
      errors.push('Max value cannot be less than min value');
    }

    if (readOnly && value < 1) {
      errors.push('A read only field must have a value greater than 0');
    }

    if (readOnly && required) {
      errors.push('A field cannot be both read only and required');
    }

    return errors;
  };

  const handleInput = (field: keyof NumberFieldMeta, value: string | boolean) => {
    const userValue = field === 'value' ? Number(value) : Number(fieldState.value || 0);
    const userMinValue = field === 'minValue' ? Number(value) : Number(fieldState.minValue || 0);
    const userMaxValue = field === 'maxValue' ? Number(value) : Number(fieldState.maxValue || 0);
    const readOnly = field === 'readOnly' ? Boolean(value) : Boolean(fieldState.readOnly);
    const required = field === 'required' ? Boolean(value) : Boolean(fieldState.required);

    const valueErrors = validateValue(userValue, userMinValue, userMaxValue, readOnly, required);
    handleErrors(valueErrors);

    handleFieldChange(field, value);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Label</Label>
        <Input
          id="label"
          className="bg-background mt-2"
          placeholder="Label"
          value={fieldState.label}
          onChange={(e) => handleFieldChange('label', e.target.value)}
        />
      </div>
      <div>
        <Label className="mt-4">Placeholder</Label>
        <Input
          id="placeholder"
          className="bg-background mt-2"
          placeholder="Placeholder"
          value={fieldState.placeholder}
          onChange={(e) => handleFieldChange('placeholder', e.target.value)}
        />
      </div>
      <div>
        <Label className="mt-4">Value</Label>
        <Input
          id="value"
          className="bg-background mt-2"
          placeholder="Value"
          value={fieldState.value}
          onChange={(e) => handleInput('value', e.target.value)}
        />
      </div>
      <div>
        <Label>Number format</Label>
        <Select
          value={fieldState.numberFormat}
          onValueChange={(val) => handleFieldChange('numberFormat', val)}
        >
          <SelectTrigger className="text-muted-foreground bg-background mt-2 w-full">
            <SelectValue placeholder="Field format" />
          </SelectTrigger>
          <SelectContent position="popper">
            {numberFormatValues.map((item, index) => (
              <SelectItem key={index} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-2 flex flex-col gap-4">
        <div className="flex flex-row items-center gap-2">
          <Switch
            className="bg-background"
            checked={fieldState.required}
            onCheckedChange={(checked) => handleInput('required', checked)}
          />
          <Label>Required field</Label>
        </div>
        <div className="flex flex-row items-center gap-2">
          <Switch
            className="bg-background"
            checked={fieldState.readOnly}
            onCheckedChange={(checked) => handleInput('readOnly', checked)}
          />
          <Label>Read only</Label>
        </div>
      </div>
      <Button
        className="bg-foreground/10 hover:bg-foreground/5 border-foreground/10 mt-2 border"
        variant="outline"
        onClick={() => setShowValidation((prev) => !prev)}
      >
        <span className="flex w-full flex-row justify-between">
          <span className="flex items-center">Validation</span>
          {showValidation ? <ChevronUp /> : <ChevronDown />}
        </span>
      </Button>
      {showValidation && (
        <div className="mb-4 flex flex-row gap-x-4">
          <div className="flex flex-col">
            <Label className="mt-4">Min</Label>
            <Input
              id="minValue"
              className="bg-background mt-2"
              placeholder="E.g. 0"
              value={fieldState.minValue}
              onChange={(e) => handleInput('minValue', e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <Label className="mt-4">Max</Label>
            <Input
              id="maxValue"
              className="bg-background mt-2"
              placeholder="E.g. 100"
              value={fieldState.maxValue}
              onChange={(e) => handleInput('maxValue', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
