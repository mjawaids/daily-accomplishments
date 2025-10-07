# Daily Wins - Track Your Accomplishments 🏆

A beautiful, production-ready Progressive Web App (PWA) for tracking daily accomplishments with offline functionality and real-time sync.

![Daily Wins Preview](https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&h=400&fit=crop&crop=center)

## ✨ Features

### 🎯 Core Functionality
- **Track Accomplishments**: Add, edit, and delete daily wins across multiple categories
- **Category Organization**: Work, Personal, Learning, and Health categories with color coding
- **Timeline View**: Beautiful chronological display of your achievements
- **Pagination**: Efficient browsing through your accomplishment history

### 📱 Progressive Web App
- **Offline First**: Works completely offline with local data storage
- **Background Sync**: Automatically syncs when connection is restored
- **Mobile Optimized**: Responsive design that works perfectly on all devices
- **Installable**: Can be installed as a native app on mobile and desktop
- **Push Notifications**: Ready for future notification features

### 🔐 Authentication & Security
- **Secure Authentication**: Email/password authentication via Supabase
- **Row Level Security**: Your data is protected and private
- **Real-time Sync**: Changes sync across all your devices instantly

### 🎨 Design & UX
- **Modern UI**: Clean, Apple-inspired design with smooth animations
- **Dark/Light Themes**: Adapts to system preferences
- **Micro-interactions**: Thoughtful hover states and transitions
- **Accessibility**: Built with accessibility best practices

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- A Supabase account (free tier available)

### 1. Clone the Repository
```bash
git clone https://github.com/mjawaids/daily-wins.git
cd daily-wins
npm install
```

### 2. Set Up Supabase
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your project URL and anon key
3. Copy `.env.example` to `.env` and add your credentials:
```bash
cp .env.example .env
```

### 3. Database Setup
The database schema is automatically created via Supabase migrations. The app includes:
- `accomplishments` table with RLS policies
- User authentication via Supabase Auth
- Automatic timestamps and user associations

### 4. Run the Development Server
```bash
npm run dev
```

Visit `http://localhost:5173` to see your app in action!

## 🏗️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling with custom design system
- **Vite** - Lightning-fast build tool and dev server
- **Lucide React** - Beautiful, consistent icons

### Backend & Database
- **Supabase** - Backend-as-a-Service with PostgreSQL
- **Row Level Security** - Database-level security policies
- **Real-time subscriptions** - Live data updates

### PWA & Offline
- **Service Worker** - Custom SW for caching and background sync
- **IndexedDB** - Local storage for offline functionality
- **Background Sync** - Automatic sync when connection returns
- **Web App Manifest** - Native app-like installation

## 📁 Project Structure

```
daily-wins/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   └── icons/                 # App icons
├── src/
│   ├── components/
│   │   ├── AccomplishmentApp.tsx  # Main app component
│   │   ├── AuthForm.tsx           # Authentication form
│   │   └── OfflineIndicator.tsx   # Offline status indicator
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client & types
│   │   └── offline.ts            # Offline manager with IndexedDB
│   ├── App.tsx                   # Root component
│   └── main.tsx                  # App entry point
├── supabase/
│   └── migrations/               # Database migrations
└── netlify.toml                  # Netlify deployment config
```

## 🔧 Development

### Available Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Environment Variables
Create a `.env` file with your Supabase credentials:
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GA_TRACKING_ID=your-google-analytics-id
```

### Database Schema
The app uses a single `accomplishments` table:
```sql
accomplishments (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  text text NOT NULL,
  category text CHECK (category IN ('work', 'personal', 'learning', 'health')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)
```

## 🚀 Deployment

### Netlify (Recommended)
1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy automatically on every push

### Manual Deployment
```bash
npm run build
# Upload dist/ folder to your hosting provider
```

### Environment Variables for Production
Set these in your hosting provider's dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GA_TRACKING_ID` (optional)

## 📱 PWA Installation

### Mobile (iOS/Android)
1. Open the app in your mobile browser
2. Tap the "Add to Home Screen" option
3. The app will install like a native app

### Desktop
1. Look for the install icon in your browser's address bar
2. Click to install the app
3. Access from your desktop like any other application

## 🔄 Offline Functionality

The app works completely offline with:
- **Local Storage**: All data cached in IndexedDB
- **Optimistic Updates**: Changes appear instantly
- **Background Sync**: Automatic sync when online
- **Conflict Resolution**: Smart handling of sync conflicts

## 🎨 Customization

### Colors & Themes
Modify the color scheme in `tailwind.config.js` and component files. The app uses a consistent design system with:
- Primary: Blue (`#2563eb`)
- Categories: Blue, Green, Purple, Pink
- Neutrals: Slate color palette

### Categories
Add new categories by:
1. Updating the database constraint
2. Adding colors in `categoryColors` object
3. Adding icons in `categoryIcons` object

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Bolt.new](https://bolt.new) - AI-powered full-stack development
- Icons by [Lucide](https://lucide.dev)
- Hosted on [Netlify](https://netlify.com)
- Backend by [Supabase](https://supabase.com)

## 📞 Support

If you have any questions or need help:
1. Check the [Issues](https://github.com/mjawaids/daily-accomplishments/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

---

**Built with ❤️ using modern web technologies**

*Start tracking your daily wins today and build momentum towards your goals!*
