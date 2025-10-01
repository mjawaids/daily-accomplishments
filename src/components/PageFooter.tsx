import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ExternalLink } from 'lucide-react';

export function PageFooter() {
  return (
    <footer className="bg-slate-800 dark:bg-slate-900 text-white mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center space-y-6">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-blue-400" />
            <span className="text-xl font-bold">Daily Wins</span>
          </div>
          
          <p className="text-slate-300 text-center max-w-md text-sm">
            Track your daily accomplishments and build momentum towards your goals.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link to="/privacy" className="text-blue-400 hover:text-blue-300 transition-colors">Privacy Policy</Link>
            <span className="text-slate-500">•</span>
            <Link to="/refund" className="text-blue-400 hover:text-blue-300 transition-colors">Refund Policy</Link>
            <span className="text-slate-500">•</span>
            <Link to="/terms" className="text-blue-400 hover:text-blue-300 transition-colors">Terms & Conditions</Link>
            <span className="text-slate-500">•</span>
            <Link to="/pricing" className="text-blue-400 hover:text-blue-300 transition-colors">Pricing</Link>
          </div>

          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-8">
            <div className="text-slate-300 text-sm">
              Developed with ❤️ by{' '}
              <a
                href="https://jawaid.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Jawaid
              </a>
            </div>
            
            <a
              href="https://ibexoft.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full text-xs font-medium hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span>Powered by Ibexoft</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="text-slate-400 text-xs text-center">
            © 2025 Daily Wins. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}