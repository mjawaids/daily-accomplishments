import React from 'react';
import { Link } from 'react-router-dom';

interface PrivacyPolicyProps {
  onBack?: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
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
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Privacy Policy</h1>
          
          <div className="prose prose-lg text-gray-700 dark:text-gray-300 max-w-none">
            <p className="mb-4">
              Daily Wins collects only the information necessary to provide the service, such as login credentials and usage data. 
              This data is used solely to deliver app functionality and improve the service. We do not sell or rent personal 
              information to third parties, except as required by law.
            </p>
            
            <p className="mb-6">
              EU users may request access, correction, or deletion of their data by emailing support@ibexoft.com. 
              Our site is secured with SSL, and all payments are processed by Paddle.com — we never store payment card details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
