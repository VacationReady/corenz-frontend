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
   
   - For development on a physical device, replace `localhost` with your computer's local IP address (e.g., `http://192.168.1.100:3000`)
   - For production, use your deployed Next.js app URL (e.g., `https://your-app.vercel.app`)

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

### Authentication
- ✅ Credentials-based login (email/password)
- ✅ Secure session storage using `expo-secure-store`
- ✅ Automatic session persistence
- ✅ Session validation on app start
- ✅ Sign out functionality

### HR Data Integration
- ✅ Fetch employee profile
- ✅ View onboarding progress
- ✅ Fetch pending leave requests
- ✅ Multi-tenant support (automatic companyId scoping)

### UI Components
- ✅ Login screen with validation
- ✅ Dashboard with user info
- ✅ Employee profile display
- ✅ Pull-to-refresh functionality
- ✅ Loading states

## API Endpoints Used

The mobile app connects to the following Next.js API endpoints:

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/callback/credentials` | Login with email/password |
| `GET /api/auth/session` | Get current session |
| `GET /api/employees` | Fetch employee data |
| `GET /api/onboarding/instances/employee/:id` | Get onboarding progress |
| `GET /api/leave-request` | Fetch leave requests |

All endpoints automatically scope data by `session.user.companyId` for multi-tenant isolation.

## Project Structure

```
mobile/
├── src/
│   ├── api/
│   │   ├── auth.ts          # Authentication helpers
│   │   └── hr-data.ts       # HR data fetching
│   └── screens/
│       ├── LoginScreen.tsx  # Login UI
│       └── DashboardScreen.tsx # Main dashboard
├── App.tsx                  # Root component
├── package.json
├── tsconfig.json
└── .env                     # Environment config (create this)
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
- [ ] React Navigation for multi-screen navigation
- [ ] Leave request submission
- [ ] Document uploads
- [ ] Push notifications
- [ ] Offline support
- [ ] Biometric authentication
- [ ] Dark mode support

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

## Support

For issues or questions:
1. Check the console output for errors
2. Verify environment variables are set correctly
3. Ensure the Next.js backend is running and accessible
4. Check that you're using compatible versions of dependencies
