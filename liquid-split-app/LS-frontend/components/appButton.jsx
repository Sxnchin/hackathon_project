import React, { useState, useEffect } from 'react';

// --- Helper function to get the Operating System ---
const getOS = () => {
  // Make sure we're in a browser environment
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'other';
  }

  const userAgent = navigator.userAgent || navigator.vendor || window.opera;

  // Check for iOS (iPhone, iPad, iPod)
  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    return 'ios';
  }

  // Check for Android
  if (/android/i.test(userAgent)) {
    return 'android';
  }

  // Default to 'other' (desktop, etc.)
  return 'other';
};


// --- SVG Icons (Self-contained) ---

const AppleLogo = () => (
  <svg className="w-8 h-8 mr-2" fill="currentColor" viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 140.2 0 184.8 0 283.5c0 73.6 44.7 140.3 87.9 174.2 21.8 17.1 46.3 34.7 76.4 34.3 31.3-.4 42.6-20.7 79.3-20.7 35.8 0 46.5 20.7 79.3 20.7 30.2.4 53.1-17.1 73.8-34.3 24.1-19.9 31.1-47.2 31.6-47.7-.4-.4-17.1-20.3-17.1-53.3zM281.3 90.1c-15.1-16.3-33-28.7-53.7-33C213 49.3 189 40 160.7 40c-35.8 0-66.2 13.1-88.5 35.8-22.3 22.7-34.3 50-34.3 81.3 0 14.2 3.1 28.2 9.4 41.2-1.1-1.2 1.6-2.6 3.5-4.1 19.3-15.2 41.2-24.1 66.8-24.1 26.9 0 49.4 9.4 66.8 24.1 20.7 16.3 33.5 40 33.5 66.8 0 30.2-14.2 56.4-33.5 73.8-19.3 17.3-42.6 25.7-66.8 25.7-25.6 0-47.5-8.6-66.8-24.1-2-1.6-3.7-3.1-5.1-4.9-1.3 1.6-2.6 3.3-3.7 5.1-11.4 18.2-25.7 34.7-42.6 48.9-16.8 14.2-34.7 26.9-53.7 37.9 15.1 16.3 33 28.7 53.7 33 19.2 4 42.6 1.6 66.8-6.9 22.7-7.9 44.6-20.7 66.8-36.9 22.3-16.3 39-31.1 53.1-47.7 14.2-16.8 24.1-34.7 30.2-53.7 6.2-19.2 7.9-39.1 1.6-59.9-6.4-20.7-18.4-40.6-34.7-57.5z" />
  </svg>
);

const GooglePlayLogo = () => (
  <svg className="w-7 h-7 mr-2" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zM104.6 499l280.8-161.2-60.1-60.1L104.6 499zM384.9 256l60.1-60.1c16.1-8.7 28.5-21.7 35.3-35.3l-256.6 256 60.1 60.1c8.7-16.1 21.7-28.5 35.3-35.3l125.8-125.7z" fill="currentColor" />
  </svg>
);


// --- Styled Button Components ---

// NOTE: Replace these placeholder URLs with your actual store links
const appleStoreUrl = 'https://apps.apple.com/us/app/your-app-name/id123456789';
const googlePlayUrl = 'https://play.google.com/store/apps/details?id=com.your.app.id';

const AppleButton = () => (
  <a
    href={appleStoreUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center justify-center bg-black text-white rounded-lg px-4 py-2 m-2 transition duration-300 ease-in-out hover:bg-gray-800"
    aria-label="Download on the App Store"
  >
    <AppleLogo />
    <div className="text-left">
      <div className="text-xs">Download on the</div>
      <div className="text-xl font-semibold">App Store</div>
    </div>
  </a>
);

const GoogleButton = () => (
  <a
    href={googlePlayUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center justify-center bg-black text-white rounded-lg px-4 py-2 m-2 transition duration-300 ease-in-out hover:bg-gray-800"
    aria-label="Get it on Google Play"
  >
    <GooglePlayLogo />
    <div className="text-left">
      <div className="text-xs uppercase">Get it on</div>
      <div className="text-xl font-semibold">Google Play</div>
    </div>
  </a>
);


// --- Main Export Component ---
// This component detects the OS and renders the correct button(s).

export default function AppStoreButtons() {
  const [os, setOs] = useState('other');

  useEffect(() => {
    // We run this in useEffect so it only runs in the browser
    setOs(getOS());
  }, []);

  // Show only the relevant button for the mobile OS
  if (os === 'ios') {
    return <AppleButton />;
  }

  if (os === 'android') {
    return <GoogleButton />;
  }

  // Show both buttons for desktop or unknown OS
  return (
    <div className="flex flex-col sm:flex-row justify-center">
      <AppleButton />
      <GoogleButton />
    </div>
  );
}
