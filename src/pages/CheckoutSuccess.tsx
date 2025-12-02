import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/PageHeader';

const CheckoutSuccess: React.FC = () => {
  const [message, setMessage] = useState('Processing subscription...');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setMessage('Please sign in to view your subscription.');
          setStatus('error');
          return;
        }

        // Wait a moment for webhook to process (Paddle webhooks are usually instant)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Query the profiles table to check subscription status set by webhook
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_plan')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setMessage('Could not verify subscription. Please contact support.');
          setStatus('error');
          return;
        }

        if (data?.subscription_status === 'active' && data?.subscription_plan === 'pro') {
          setMessage('Subscription confirmed! Thank you for upgrading to Pro.');
          setStatus('success');
        } else {
          setMessage('Subscription processing. Please check back in a moment.');
          setStatus('loading');
        }
      } catch (err) {
        console.error('Error processing checkout success:', err);
        setMessage('An error occurred. Please contact support.');
        setStatus('error');
      }
    })();
  }, []);

  return (
    <div>
      <PageHeader title="Subscription" />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-lg">
          {status === 'loading' && (
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold mb-2">Processing</h2>
              <p className="text-slate-600 dark:text-slate-300">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Success!</h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6">{message}</p>
              <Link
                to="/"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
              >
                Back to App
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6">{message}</p>
              <Link
                to="/"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
              >
                Back to App
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CheckoutSuccess;

