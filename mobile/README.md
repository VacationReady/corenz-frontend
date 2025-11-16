# Mobile App Setup

This is the React Native mobile app built with Expo for the HR Management System.

## Prerequisites

- Node.js 18+ installed
- Expo CLI (`npm install -g expo-cli`)
- For iOS: Xcode installed (Mac only)
- For Android: Android Studio installed

## Installation

1. **Install dependencies:**
   ```bash
   cd mobile
   npm install
   # or
   yarn install
   ```

2. **Configure environment variables:**
   
   Create a `.env` file in the `mobile/` directory with:
   ```env
   EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
   API_BASE_URL=http://localhost:3000
   ```

   - Only one base URL can be active at a time—`localhost` works for simulators/emulators that run on the same machine as the API server.
   - When testing on a physical device, change both values to your computer's LAN IP (for example, based on the `ipconfig` output you shared, you would use `http://192.168.18.23:3000`).
   - You can create alternate files such as `.env.device` with the LAN values and temporarily copy them over, or you can override at runtime with `EXPO_PUBLIC_API_BASE_URL=http://192.168.18.23:3000 API_BASE_URL=http://192.168.18.23:3000 npm start`.
   - For production, use your deployed Next.js app URL (e.g., `https://your-app.vercel.app`).

## Running the App

### Development

```bash
# Start Expo development server
npm start

# Run on iOS simulator (Mac only)
npm run ios

# Run on Android emulator
npm run android

# Run in web browser
npm run web
```

### Using Expo Go App

1. Install Expo Go on your phone from App Store or Play Store
2. Run `npm start`
3. Scan the QR code with your phone camera (iOS) or Expo Go app (Android)

## Features Implemented

### 🔐 Authentication
- ✅ Credentials-based login (email/password)
- ✅ Secure session storage using `expo-secure-store`
- ✅ Automatic session persistence
- ✅ Session validation on app start
- ✅ Sign out functionality

### 🏠 Home Dashboard
- ✅ Personalized greeting with user info
- ✅ Stats overview (action items, surveys, leave requests, events)
- ✅ Quick action buttons for common tasks
- ✅ Pending items summary
- ✅ Employee information display
- ✅ Real-time notifications badge

### 📅 Leave Management
- ✅ View leave balances by policy type
- ✅ Submit time-off requests with date picker
- ✅ Track request status (pending, approved, rejected)
- ✅ View leave history
- ✅ Multi-policy support
- ✅ Reason input and validation

### 👥 Team Directory
- ✅ View team members and direct reports
- ✅ Browse company directory
- ✅ Search employees by name, email, department
- ✅ Employee profiles with contact info
- ✅ Quick contact actions (email, call, message)
- ✅ Filter by team vs. full directory

### ✅ Action Items
- ✅ View all assigned action items
- ✅ Filter by pending/completed/all
- ✅ Priority indicators (urgent, high, medium, low)
- ✅ Mark items as complete
- ✅ Update item status (pending → in progress → completed)
- ✅ Due date tracking
- ✅ Category organization

### 📋 Surveys
- ✅ View pending surveys
- ✅ Complete surveys with multiple question types
- ✅ Support for text, radio, select, and rating questions
- ✅ Form validation for required fields
- ✅ View completed surveys
- ✅ Survey descriptions and due dates

### 📊 Performance Reviews
- ✅ View pending performance reviews
- ✅ Complete self-reviews
- ✅ Save draft progress
- ✅ View completed reviews with scores
- ✅ Track review periods and deadlines
- ✅ Reviewer information display

### 📆 Calendar & Events
- ✅ View upcoming company events
- ✅ Grouped by date with smart labels (Today, Tomorrow)
- ✅ Event categories with color coding
- ✅ All-day and timed events
- ✅ Recurring event indicators
- ✅ Event descriptions and attendees

### 🎨 Modern UI/UX
- ✅ Bottom tab navigation
- ✅ Stack navigation for feature screens
- ✅ Reusable components (Card, Button, Badge, EmptyState)
- ✅ Pull-to-refresh on all screens
- ✅ Loading states and error handling
- ✅ Beautiful color scheme and typography
- ✅ Responsive design

## API Endpoints Used

The mobile app connects to the following Next.js API endpoints:

### Authentication
| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/callback/credentials` | Login with email/password |
| `GET /api/auth/session` | Get current session |
| `POST /api/auth/signout` | Sign out |

### Employee Data
| Endpoint | Purpose |
|----------|---------|
| `GET /api/employees` | Fetch employee data |
| `GET /api/employees/:id` | Get employee details |
| `GET /api/onboarding/instances/employee/:id` | Get onboarding progress |

### Leave Management
| Endpoint | Purpose |
|----------|---------|
| `GET /api/leave-request?scope=my` | Fetch my leave requests |
| `GET /api/leave-request?scope=balances` | Get leave balances |
| `POST /api/leave-request` | Submit leave request |
| `GET /api/leave-policies` | Get leave policies |

### Action Items
| Endpoint | Purpose |
|----------|---------|
| `GET /api/action-items?scope=my` | Get my action items |
| `PATCH /api/action-items/:id` | Update action item status |

### Surveys
| Endpoint | Purpose |
|----------|---------|
| `GET /api/surveys?scope=assigned&status=active` | Get pending surveys |
| `GET /api/surveys?scope=completed` | Get completed surveys |
| `GET /api/surveys/:id` | Get survey details |
| `POST /api/surveys/:id/responses` | Submit survey response |

### Performance Reviews
| Endpoint | Purpose |
|----------|---------|
| `GET /api/performance/reviews?scope=my` | Get my performance reviews |
| `GET /api/performance/reviews/:id` | Get review details |
| `POST /api/performance/reviews/:id/self-review` | Submit self-review |
| `GET /api/objectives?scope=my` | Get my objectives |

### Calendar
| Endpoint | Purpose |
|----------|---------|
| `GET /api/calendar-events` | Get calendar events |

All endpoints automatically scope data by `session.user.companyId` for multi-tenant isolation.

## Project Structure

```
mobile/
├── src/
│   ├── api/
│   │   ├── auth.ts              # Authentication helpers
│   │   ├── hr-data.ts           # HR data fetching
│   │   ├── leave.ts             # Leave management API
│   │   ├── surveys.ts           # Surveys API
│   │   ├── performance.ts       # Performance reviews API
│   │   ├── action-items.ts      # Action items API
│   │   ├── calendar.ts          # Calendar events API
│   │   └── team.ts              # Team/employee directory API
│   ├── components/
│   │   ├── Card.tsx             # Reusable card component
│   │   ├── Button.tsx           # Button with variants
│   │   ├── Badge.tsx            # Status badges
│   │   ├── EmptyState.tsx       # Empty state placeholder
│   │   └── LoadingState.tsx     # Loading indicator
│   ├── navigation/
│   │   └── AppNavigator.tsx     # Tab & stack navigation
│   └── screens/
│       ├── LoginScreen.tsx      # Login UI
│       ├── HomeScreen.tsx       # Dashboard home
│       ├── LeaveScreen.tsx      # Leave management
│       ├── TeamScreen.tsx       # Team directory
│       ├── MoreScreen.tsx       # More menu
│       ├── ActionItemsScreen.tsx    # Action items
│       ├── SurveysScreen.tsx    # Surveys
│       ├── PerformanceScreen.tsx    # Performance reviews
│       └── CalendarScreen.tsx   # Calendar & events
├── App.tsx                      # Root component
├── package.json
├── tsconfig.json
└── .env                         # Environment config (create this)
```

## Troubleshooting

### Blank White Screen

If you see a blank white screen:
1. Check that `.env` file exists with `EXPO_PUBLIC_API_BASE_URL` set
2. Verify your Next.js backend is running
3. Check the terminal for error messages
4. Shake device and open Expo error overlay

### Network Issues

If API calls fail:
1. For physical devices, use your computer's IP address, not `localhost`
2. Ensure your phone and computer are on the same WiFi network
3. Check firewall settings aren't blocking connections
4. Verify the Next.js app is accessible from your device's browser

### Session Not Persisting

If you keep getting logged out:
1. Check that `expo-secure-store` is installed
2. Verify the session cookie is being returned by the API
3. Check console logs for errors in `auth.ts`

## Next Steps

### Planned Features
- [ ] Document uploads and viewing
- [ ] Push notifications for action items
- [ ] Offline support with local caching
- [ ] Biometric authentication (Face ID/Touch ID)
- [ ] Dark mode support
- [ ] Profile editing
- [ ] Payroll information viewing
- [ ] Real-time chat/messaging
- [ ] News feed integration
- [ ] Org chart visualization

### Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_BASE_URL` | Main API base URL (public) | `http://192.168.1.100:3000` |
| `API_BASE_URL` | Fallback API base URL | `http://192.168.1.100:3000` |

Note: Variables prefixed with `EXPO_PUBLIC_` are embedded in the client bundle and safe to access.

### Diagnosing "Network request timed out" errors

If you see `TypeError: Network request timed out` in the Expo logs when logging in:

1. **Verify the backend is reachable from your device.** Start the Next.js app with `npm run dev` (binds to `0.0.0.0`) and, from the phone or emulator browser, open `http://<your-ip>:3000/api/auth/csrf`. If it does not load, the Expo client will not be able to authenticate either.
2. **Double‑check the `.env` values inside `mobile/`.** Only a single origin can be active at a time, so use `http://localhost:3000` for same-machine simulators, or `http://192.168.18.23:3000` (replace with your LAN IP) for physical devices.
3. **Allow Node.js through Windows Firewall (or your OS firewall).** The login call originates from the phone; if inbound connections to port `3000` are blocked the request will time out even though the backend is running locally.
4. **Use the in-app API connectivity indicator.** The login screen now renders a panel that pings `/api/auth/csrf` and reports whether the device can talk to the configured base URL. Tap “Retry connectivity check” after changing Wi‑Fi networks or `.env` values to confirm everything is wired up before attempting to sign in again.

## Support

For issues or questions:
1. Check the console output for errors
2. Verify environment variables are set correctly
3. Ensure the Next.js backend is running and accessible
4. Check that you're using compatible versions of dependencies
