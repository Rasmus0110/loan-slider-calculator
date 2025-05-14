
import React from 'react';
import LoanCalculator from '@/components/LoanCalculator';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-calculator-primary mb-4">Loan Payment Calculator</h1>
          <p className="text-lg text-gray-600">
            Calculate your monthly loan payments based on loan amount and term
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-xl p-6 md:p-10">
          <LoanCalculator />
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Data provided from our database. Adjust the sliders to see different payment options.</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
