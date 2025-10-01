import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface PageHeaderProps {
  title: string;
  showBackButton?: boolean;
}

export function PageHeader({ title, showBackButton = true }: PageHeaderProps) {
  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <Link 
                to="/"
                className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                <span className="hidden sm:inline">Back to Home</span>
                <span className="sm:hidden">Back</span>
              </Link>
            )}
            <div className="flex items-center space-x-3">
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}