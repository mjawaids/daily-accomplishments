import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { PageFooter } from '../components/PageFooter';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col">
      <PageHeader title="Privacy Policy" />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                <strong>Effective Date:</strong> January 1st, 2025
              </p>
              
              <p className="mb-6">
                DailyWins ("we", "our", "us") is owned and operated by <strong>Muhammad Jawaid Shamshad</strong>. 
                Your privacy matters, and this policy explains how we collect, use, and safeguard your personal information.
              </p>

              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mt-8 mb-4">Information We Collect</h2>
              <ul className="space-y-2 mb-6">
                <li>Account details (name, email, password) when you sign up.</li>
                <li>Payment details (handled securely by Paddle, our Merchant of Record).</li>
                <li>Usage data (e.g., features accessed, error logs).</li>
              </ul>

              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mt-8 mb-4">How We Use Information</h2>
              <ul className="space-y-2 mb-6">
                <li>To provide and improve DailyWins.</li>
                <li>To communicate with you about your account, support, or service updates.</li>
                <li>To comply with legal obligations.</li>
              </ul>

              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mt-8 mb-4">Sharing Your Information</h2>
              <ul className="space-y-2 mb-6">
                <li>We do not sell your data.</li>
                <li>Paddle processes all payments, and shares limited order information with us for account management.</li>
              </ul>

              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mt-8 mb-4">Data Retention</h2>
              <p className="mb-6">
                We retain information as long as needed to deliver services, comply with laws, or resolve disputes.
              </p>

              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mt-8 mb-4">Your Rights</h2>
              <p className="mb-6">
                You may have rights to access, correct, or delete your personal data depending on your jurisdiction. 
                Contact us at <a href="mailto:jawaid@jawaid.dev" className="text-blue-600 dark:text-blue-400 hover:underline">jawaid@jawaid.dev</a>.
              </p>
            </div>
          </div>
        </div>
      </main>

      <PageFooter />
    </div>
  );
};

export default PrivacyPolicy;