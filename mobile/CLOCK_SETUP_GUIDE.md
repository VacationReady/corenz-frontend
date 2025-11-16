# Mobile Clock In/Out - Quick Setup Guide

## 🚀 Quick Start

The mobile clock in/out feature is now fully integrated and ready to use!

## ✅ What's Included

### 1. Home Screen Widget
- Beautiful gradient button on landing page
- Live timer when clocked in
- One-tap clock in/out

### 2. Dedicated Clock Tab
- Full-screen clock interface
- Real-time status updates
- Offline support

### 3. Full Integration
- Syncs directly to desktop `/timesheets`
- Uses existing API endpoints
- Location tracking support

## 📱 How to Use

### For Employees:

1. **Clock In:**
   - Open the app
   - Tap the blue "Clock In" button on home screen
   - Grant location permission if asked
   - You're clocked in! ✓

2. **View Time:**
   - See live timer on home screen widget
   - Or tap "Clock" tab for full view

3. **Clock Out:**
   - Tap the green "Clock Out" button
   - Confirm your time worked
   - Done!

### For Admins:

All mobile clock entries appear in:
- Desktop `/timesheets` page
- Time tracking reports
- Approval workflows

## 🔧 Configuration

### Required: Set API URL

Create or update `mobile/.env`:
```env
EXPO_PUBLIC_API_BASE_URL=https://your-backend-url.com
```

### Optional: Time Tracking Settings

Configure in desktop app under Settings → Time Tracking:
- GPS requirement
- Geofencing
- Photo verification
- Clock rounding rules

## 🧪 Testing

### Test the Widget:
```bash
cd mobile
npm start
```

1. Navigate to Home screen
2. Look for clock widget at top
3. Tap to clock in
4. Verify timer starts
5. Check desktop `/timesheets` for entry

### Test the Full Screen:
1. Tap "Clock" tab in bottom navigation
2. View full clock interface
3. Test clock in/out
4. Verify offline mode works

## 📦 Dependencies

All required dependencies are already in `package.json`:
- `expo-location` - GPS tracking
- `expo-linear-gradient` - Beautiful gradients
- `expo-secure-store` - Secure token storage
- `@react-navigation/bottom-tabs` - Navigation

## 🎨 Customization

### Change Colors:
Edit `mobile/src/components/ClockWidget.tsx`:
```typescript
colors={
  status.isClockedIn
    ? ['#10b981', '#059669']  // Green when clocked in
    : ['#3b82f6', '#2563eb']  // Blue when clocked out
}
```

### Change Widget Position:
Edit `mobile/src/screens/HomeScreen.tsx` to move `<ClockWidget />` component.

## 🐛 Troubleshooting

### Widget Not Showing?
- Check that `ClockWidget` is imported in `HomeScreen.tsx`
- Verify API URL is set correctly
- Check console for errors

### Location Permission Issues?
- Enable location services on device
- Check app permissions in device settings
- Try restarting the app

### Not Syncing to Desktop?
- Verify API URL is correct
- Check network connectivity
- Ensure you're logged in with same account

## 📊 Features

✅ One-tap clock in/out  
✅ Live timer display  
✅ Beautiful gradient UI  
✅ Location tracking  
✅ Offline support  
✅ Real-time sync to desktop  
✅ Error handling  
✅ Loading states  

## 🔐 Security

- HTTPS encryption
- Secure token storage
- Location verification
- Authentication required

## 📞 Support

If you encounter issues:
1. Check this guide
2. Review console logs
3. Verify API endpoints are accessible
4. Check authentication is working

## 🎉 You're All Set!

The mobile clock in/out feature is ready to use. Employees can now track their time directly from their phones, and all entries sync automatically to the desktop system.
