import React from 'react';
import { Link } from 'react-router-dom';

interface RefundPolicyProps {
  onBack?: () => void;
}

const RefundPolicy: React.FC<RefundPolicyProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8">
          {onBack ? (
            <button 
              onClick={onBack}
              className="mb-6 inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Home
            </button>
          ) : (
            <Link 
              to="/"
              className="mb-6 inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Home
            </Link>
          )}
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Refund Policy</h1>
          
          <div className="prose prose-lg text-gray-700 dark:text-gray-300 max-w-none">
            <p className="mb-4">
              Daily Wins includes a free tier so you can try the service before subscribing. Paid subscriptions can be canceled anytime. 
              Refunds are granted in cases of billing errors or duplicate charges. Requests must be submitted to support@ibexoft.com within 
              30 days of the charge. Approved refunds will be processed within 7–10 business days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;
