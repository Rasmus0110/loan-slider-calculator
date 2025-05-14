
import React from 'react';
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";

interface LoanSliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number[]) => void;
  label: string;
  unit?: string;
  formatValue?: (value: number) => string;
}

const LoanSlider: React.FC<LoanSliderProps> = ({
  min,
  max,
  step,
  value,
  onChange,
  label,
  unit = "",
  formatValue = (val) => val.toString()
}) => {
  return (
    <Card className="p-6 mb-6 shadow-md border-2 border-calculator-secondary">
      <div className="flex justify-between mb-2 items-center">
        <h3 className="text-lg font-medium text-calculator-text">{label}</h3>
        <div className="text-xl font-bold text-calculator-primary">
          {formatValue(value)}{unit ? ` ${unit}` : ""}
        </div>
      </div>
      
      <Slider 
        defaultValue={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={onChange}
        className="mt-2"
      />
      
      <div className="flex justify-between mt-1 text-sm text-gray-500">
        <span>{formatValue(min)}{unit}</span>
        <span>{formatValue(max)}{unit}</span>
      </div>
    </Card>
  );
};

export default LoanSlider;
