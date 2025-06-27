import React from 'react';
import { Calendar, CheckCircle2, Smartphone, Wifi, WifiOff, Users, Star, ArrowRight, ExternalLink } from 'lucide-react';

interface LandingPageProps {
  onShowAuth: (mode: 'signin' | 'signup') => void;
}

export function LandingPage({ onShowAuth }: LandingPageProps) {
  const features = [
    {
      icon: CheckCircle2,
      title: 'Track Daily Wins',
      description: 'Capture your accomplishments across work, personal, learning, and health categories with beautiful organization.'
    },
    {
      icon: Smartphone,
      title: 'Progressive Web App',
      description: 'Install on any device and use like a native app. Works perfectly on mobile, tablet, and desktop.'
    },
    {
      icon: WifiOff,
      title: 'Offline First',
      description: 'Continue tracking your wins even without internet. Everything syncs automatically when you\'re back online.'
    },
    {
      icon: Users,
      title: 'Secure & Private',
      description: 'Your data is protected with enterprise-grade security. Only you can see your accomplishments.'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Product Manager',
      content: 'Daily Wins helped me recognize my progress and stay motivated. The offline feature is a game-changer!',
      rating: 5
    },
    {
      name: 'Marcus Rodriguez',
      role: 'Software Engineer',
      content: 'Beautiful design and smooth experience. I love how it works seamlessly across all my devices.',
      rating: 5
    },
    {
      name: 'Emily Johnson',
      role: 'Entrepreneur',
      content: 'Finally, a simple way to track my daily achievements. The categories help me maintain work-life balance.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 dark:from-blue-400/10 dark:to-purple-400/10"></div>
        <div className="relative container mx-auto px-4 py-16 lg:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <Calendar className="w-12 h-12 text-blue-600 dark:text-blue-400 mr-4" />
              <h1 className="text-5xl lg:text-7xl font-bold text-slate-800 dark:text-white">
                Daily Wins
              </h1>
            </div>
            
            <p className="text-xl lg:text-2xl text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
              Transform your productivity by celebrating every achievement. 
              <br className="hidden sm:block" />
              Track, organize, and reflect on your daily wins.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button
                onClick={() => onShowAuth('signup')}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <span>Start Tracking Free</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => onShowAuth('signin')}
                className="px-8 py-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white border-2 border-slate-200 dark:border-slate-600 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl"
              >
                Sign In
              </button>
            </div>

            {/* Hero Image/Demo */}
            <div className="relative max-w-4xl mx-auto">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-lg px-4 py-2 text-sm text-slate-600 dark:text-slate-300">
                    dailywins.app
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-left">
                      <span className="text-slate-800 dark:text-white">Completed the quarterly presentation</span>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Work • 2:30 PM</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-left">
                      <span className="text-slate-800 dark:text-white">Had a great coffee chat with an old friend</span>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Personal • 11:15 AM</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-left">
                      <span className="text-slate-800 dark:text-white">Finished reading chapter 3 of "Atomic Habits"</span>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Learning • 9:45 AM</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-800 dark:text-white mb-4">
              Everything you need to track your wins
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Built with modern technology and designed for the way you work and live.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center group">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-800 dark:text-white mb-4">
              Loved by thousands of users
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300">
              See what people are saying about Daily Wins
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 dark:text-slate-300 mb-4 italic">
                  "{testimonial.content}"
                </p>
                <div>
                  <div className="font-semibold text-slate-800 dark:text-white">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to start celebrating your wins?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of people who are already tracking their daily accomplishments and building momentum towards their goals.
          </p>
          <button
            onClick={() => onShowAuth('signup')}
            className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 mx-auto"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-800 dark:bg-slate-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center space-y-6">
            <div className="flex items-center space-x-3">
              <Calendar className="w-8 h-8 text-blue-400" />
              <span className="text-2xl font-bold">Daily Wins</span>
            </div>
            
            <p className="text-slate-300 text-center max-w-md">
              Track your daily accomplishments and build momentum towards your goals.
            </p>

            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-8">
              <div className="text-slate-300">
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
                href="https://bolt.new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full text-sm font-medium hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span>Built with Bolt.new</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="text-slate-400 text-sm">
              © 2025 Daily Wins. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}