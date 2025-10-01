import React from 'react';
import { Check, Star, Zap, Shield, Download } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { PageFooter } from '../components/PageFooter';

const Pricing: React.FC = () => {
  const handleGetStarted = () => {
    window.location.href = '/';
  };

  const handleComingSoon = () => {
    alert('Pro plan is coming soon! Sign up for the free tier to be notified when it\'s available.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col">
      <PageHeader title="Pricing" />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-800 dark:text-white mb-4">
              Choose Your Plan
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Start free and upgrade when you're ready for advanced features
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 relative">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Free Tier</h3>
                <div className="text-4xl font-bold text-slate-800 dark:text-white mb-2">
                  $0
                  <span className="text-lg font-normal text-slate-500 dark:text-slate-400">/forever</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">Perfect for getting started</p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 dark:text-slate-300">Log unlimited daily wins</span>
                </li>
                <li className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 dark:text-slate-300">View personal streaks and history</span>
                </li>
                <li className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 dark:text-slate-300">Basic dashboard</span>
                </li>
                <li className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 dark:text-slate-300">No payment details required</span>
                </li>
              </ul>

              <button
                onClick={handleGetStarted}
                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Get Started Free
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 relative text-white">
              {/* Popular Badge */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full text-sm font-semibold flex items-center space-x-1">
                  <Star className="w-4 h-4" />
                  <span>Coming Soon</span>
                </div>
              </div>

              <div className="text-center mb-6 mt-4">
                <h3 className="text-2xl font-bold mb-2">Pro Plan</h3>
                <div className="text-4xl font-bold mb-2">
                  $9
                  <span className="text-lg font-normal opacity-80">/month</span>
                </div>
                <div className="text-sm opacity-80 mb-2">or $90/year (save 16%)</div>
                <p className="opacity-90">For power users and teams</p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
                  <span>Everything in Free, plus:</span>
                </li>
                <li className="flex items-start space-x-3">
                  <Zap className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                  <span>Advanced analytics & progress insights</span>
                </li>
                <li className="flex items-start space-x-3">
                  <Download className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
                  <span>Export data (CSV/PDF)</span>
                </li>
                <li className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-purple-300 flex-shrink-0 mt-0.5" />
                  <span>Custom reminders & notifications</span>
                </li>
                <li className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
                  <span>Priority email support</span>
                </li>
              </ul>

              <button
                onClick={handleComingSoon}
                className="w-full py-3 px-6 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Notify Me When Available
              </button>
            </div>
          </div>

          {/* Billing Notes */}
          <div className="mt-12 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Billing Notes</h3>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
              <li>• Subscriptions auto-renew unless cancelled</li>
              <li>• You can manage or cancel anytime through your Paddle billing portal (link in order emails)</li>
              <li>• All payments are processed securely by Paddle</li>
              <li>• 30-day money-back guarantee on all paid plans</li>
            </ul>
          </div>

          {/* FAQ Section */}
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white text-center mb-8">
              Frequently Asked Questions
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold text-slate-800 dark:text-white mb-2">Can I upgrade or downgrade anytime?</h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Yes! You can upgrade to Pro anytime. If you downgrade, you'll keep Pro features until your current billing period ends.
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold text-slate-800 dark:text-white mb-2">Is my data safe?</h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Absolutely. We use enterprise-grade security and never sell your data. Your accomplishments are private and secure.
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold text-slate-800 dark:text-white mb-2">What payment methods do you accept?</h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  We accept all major credit cards, PayPal, and other payment methods through our secure payment processor, Paddle.
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold text-slate-800 dark:text-white mb-2">Do you offer refunds?</h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Yes! We offer a 30-day money-back guarantee. If you're not satisfied, contact us for a full refund.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PageFooter />
    </div>
  );
};

export default Pricing;