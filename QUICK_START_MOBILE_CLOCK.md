# 🚀 Quick Start: Mobile Clock In/Out

## ⚡ 30-Second Setup

```bash
# 1. Navigate to mobile directory
cd mobile

# 2. Set API URL (if not already done)
echo "EXPO_PUBLIC_API_BASE_URL=http://your-backend-url" > .env

# 3. Start the app
npm start

# 4. Open on device/simulator
# Scan QR code or press 'i' for iOS, 'a' for Android
```

## ✅ What You Get

### On Mobile Home Screen:
```
┌─────────────────────────────────────┐
│  [Icon]  Clock In          [→]     │
│          Tap to Start Your Shift    │
└─────────────────────────────────────┘
```

### When Clocked In:
```
┌─────────────────────────────────────┐
│  [✓]  Clocked In           [→]     │
│       ⏱ 02:34:15                   │
│       Tap to Clock Out              │
└─────────────────────────────────────┘
```

### On Desktop:
- Open `/timesheets`
- See mobile entries in real-time
- Approve/manage as normal

## 📱 User Instructions

**For Employees:**
1. Open mobile app
2. Tap blue "Clock In" button on home screen
3. Grant location permission if asked
4. See live timer counting up
5. Tap green "Clock Out" when done
6. View time worked

**That's it!** 🎉

## 🔧 Configuration

### Required:
- ✅ `EXPO_PUBLIC_API_BASE_URL` in `mobile/.env`
- ✅ Backend running and accessible

### Optional:
- GPS tracking (Settings → Time Tracking)
- Geofencing
- Photo verification
- Clock rounding

## 📊 Features

- ✅ One-tap clock in/out
- ✅ Live timer (HH:MM:SS)
- ✅ Beautiful gradient UI
- ✅ GPS location tracking
- ✅ Offline support
- ✅ Real-time desktop sync
- ✅ Bottom nav "Clock" tab
- ✅ Full-screen clock view

## 🎯 Files Changed

**New:**
- `mobile/src/components/ClockWidget.tsx`
- `mobile/src/api/time-tracking.ts`

**Modified:**
- `mobile/src/api/client.ts` (added apiClient)
- `mobile/src/screens/HomeScreen.tsx` (added widget)
- `mobile/src/navigation/AppNavigator.tsx` (added tab)

## 📖 Documentation

- **Setup:** `mobile/CLOCK_SETUP_GUIDE.md`
- **Features:** `mobile/CLOCK_FEATURE_SUMMARY.md`
- **Technical:** `MOBILE_CLOCK_IN_OUT_IMPLEMENTATION.md`
- **Architecture:** `docs/MOBILE_CLOCK_ARCHITECTURE.md`

## ✨ Key Benefits

- 🚀 **Fast:** One-tap operation
- 🎨 **Beautiful:** Modern gradient design
- 📍 **Accurate:** GPS verification
- 📱 **Reliable:** Works offline
- 🔄 **Integrated:** Real-time desktop sync
- 🔐 **Secure:** Session-based auth

## 🐛 Troubleshooting

**Widget not showing?**
- Check `ClockWidget` import in `HomeScreen.tsx`
- Verify API URL is correct
- Check console for errors

**Not syncing to desktop?**
- Verify backend is running
- Check network connectivity
- Ensure same company/tenant

**Location permission issues?**
- Enable location services on device
- Check app permissions in settings
- Try restarting app

## 🎊 You're Done!

The mobile clock in/out feature is ready to use. Employees can now track their time from their phones, and all entries sync automatically to your desktop system.

**No backend changes needed** - uses existing API endpoints!

---

**Need help?** Check the full documentation in:
- `mobile/CLOCK_SETUP_GUIDE.md`
- `MOBILE_CLOCK_IN_OUT_IMPLEMENTATION.md`
