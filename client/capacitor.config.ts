import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nflpickem.app',
  appName: 'NFL Pick Em',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true,
    allowNavigation: ['192.168.1.18:3000', '192.168.1.18', '192.168.1.18:3000', '192.168.1.18', 'localhost:3000'],
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
