import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { PageFooter } from '../components/PageFooter';

const TermsConditions: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col">
      <PageHeader title="Terms & Conditions" />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                <strong>Effective Date:</strong> January 1st, 2025
              </p>

              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mt-8 mb-4">Introduction</h2>
              <p className="mb-6">
                Welcome to DailyWins (https://dailywins.ibexoft.com), a product owned and operated by <strong>Muhammad Jawaid Shamshad</strong>. 
                By using our services, you agree to these Terms & Conditions.
              </p>

              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mt-8 mb-4">Company & Payments</h2>
              <ul className="space-y-2 mb-6">
                <li>DailyWins is sold via Paddle, which acts as the Merchant of Record. Paddle handles billing, taxes, receipts, and compliance.</li>
                <li>By purchasing, you also agree to Paddle's <a href="https://paddle.com/legal/buyer-terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Buyer Terms</a>.</li>
              </ul>

              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mt-8 mb-4">Services</h2>
              <p className="mb-6">
                DailyWins provides a daily productivity tracker helping users log wins, track streaks, and stay motivated. 
                Features may change as we improve the service.
              </p>

              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mt-8 mb-4">Accounts & Usage</h2>
              <ul className="space-y-2 mb-6">
                <li>You must provide accurate information during signup.</li>
                <li>You're responsible for maintaining your login credentials.</li>
                <li>Misuse (fraud, abuse, violating laws) may result in account suspension.</li>
              </ul>

              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mt-8 mb-4">Refunds & Cancellations</h2>
              <ul className="space-y-2 mb-6">
                <li>Refunds follow our Refund Policy.</li>
                <li>You may cancel your subscription anytime; access continues until the end of the billing period.</li>
              </ul>

              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mt-8 mb-4">Liability</h2>
              <p className="mb-6">
                We provide DailyWins "as is" without warranties. We are not liable for indirect, incidental, or consequential damages.
              </p>
            </div>
          </div>
        </div>
      </main>

      <PageFooter />
    </div>
  );
};

export default TermsConditions;