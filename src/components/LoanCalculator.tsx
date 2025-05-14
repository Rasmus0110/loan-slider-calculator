
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import LoanSlider from "./LoanSlider";
import { prefetchLoanData, getMonthlyCost } from '@/services/supabaseService';
import { debounce } from '@/lib/debounce';

const LoanCalculator = () => {
  // Default values
  const [loanAmount, setLoanAmount] = useState(25000);
  const [loanYear, setLoanYear] = useState(5);
  const [monthlyCost, setMonthlyCost] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format currency values
  const formatCurrency = (value: number): string => {
    return value.toLocaleString();
  };

  // Fetch monthly cost with debounce
  const fetchMonthlyCost = useCallback(async (amount: number, years: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const cost = await getMonthlyCost(amount, years);
      if (cost !== null) {
        setMonthlyCost(cost);
      } else {
        setError("Cost data not available for the selected values.");
      }
    } catch (err) {
      setError("Error fetching monthly cost. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create debounced version of fetch function - 300ms is typically a good balance
  const debouncedFetchMonthlyCost = useCallback(
    debounce((amount: number, years: number) => {
      fetchMonthlyCost(amount, years);
    }, 300),
    [fetchMonthlyCost]
  );

  // Handle loan amount changes
  const handleLoanAmountChange = (values: number[]) => {
    setLoanAmount(values[0]);
  };

  // Handle loan year changes
  const handleLoanYearChange = (values: number[]) => {
    setLoanYear(values[0]);
  };

  // Update monthly cost when inputs change
  useEffect(() => {
    debouncedFetchMonthlyCost(loanAmount, loanYear);
  }, [loanAmount, loanYear, debouncedFetchMonthlyCost]);

  // Prefetch data on component mount
  useEffect(() => {
    prefetchLoanData().then(() => {
      // After prefetching, immediately load the initial value
      fetchMonthlyCost(loanAmount, loanYear);
    });
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-center mb-2 text-calculator-text">Loan Calculator</h2>
        <p className="text-center text-gray-600 mb-6">
          Adjust the sliders to calculate your monthly loan payment
        </p>
      </div>

      <LoanSlider
        min={1000}
        max={70000}
        step={1000}
        value={loanAmount}
        onChange={handleLoanAmountChange}
        label="Loan Amount"
        unit="€"
        formatValue={formatCurrency}
      />

      <LoanSlider
        min={1}
        max={15}
        step={1}
        value={loanYear}
        onChange={handleLoanYearChange}
        label="Loan Term"
        unit="years"
        formatValue={(val) => val.toString()}
      />

      <Card className="p-6 bg-calculator-secondary border-2 border-calculator-primary shadow-lg">
        <div className="text-center">
          <h3 className="text-xl font-medium mb-2 text-calculator-text">Monthly Payment</h3>
          {isLoading ? (
            <div className="animate-pulse h-10 bg-gray-200 rounded w-3/4 mx-auto"></div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : (
            <div className="text-3xl font-bold text-calculator-primary">
              {monthlyCost !== null ? `${formatCurrency(monthlyCost)} €` : "Not found"}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default LoanCalculator;
