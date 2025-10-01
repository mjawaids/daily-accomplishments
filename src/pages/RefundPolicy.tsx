import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { PageFooter } from '../components/PageFooter';

const RefundPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col">
      <PageHeader title="Refund Policy" />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                <strong>Effective Date:</strong> January 1st, 2025
              </p>
              
              <p className="mb-6">
                We want you to be satisfied with DailyWins.
              </p>

              <ul className="space-y-4 mb-6">
                <li>Paddle processes all payments and issues refunds on our behalf.</li>
                <li>You can request a refund within <strong>30 days</strong> of purchase if you are not satisfied.</li>
                <li>After 30 days, refunds are not guaranteed. Exceptions may apply for technical issues that prevent use of the service.</li>
                <li>Refund requests should be sent to <a href="mailto:jawaid@jawaid.dev" className="text-blue-600 dark:text-blue-400 hover:underline">jawaid@jawaid.dev</a>.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <PageFooter />
    </div>
  );
};

export default RefundPolicy;