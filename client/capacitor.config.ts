import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nflpickem.app',
  appName: 'NFL Pick Em',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: ['nfl-pick-em-api.onrender.com'],
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
