// Official links verified on 2026-09-24:
// https://github.com/HappDev/happ_su
// https://github.com/INCY-DEV/incy-platforms
// Linux opens official releases so users can choose their package/architecture.
export const clientDownloads = {
  happ: {
    ios: [
      { label: 'appStore', href: 'https://apps.apple.com/us/app/happ-proxy-utility/id6504287215' },
      { label: 'appStoreRu', href: 'https://apps.apple.com/ru/app/happ-lite/id6799917773' },
    ],
    android: [{ label: 'googlePlay', href: 'https://play.google.com/store/apps/details?id=com.happproxy' }],
    macos: [
      { label: 'appStore', href: 'https://apps.apple.com/us/app/happ-proxy-utility/id6504287215' },
      { label: 'appStoreRu', href: 'https://apps.apple.com/ru/app/happ-proxy-utility/id6783623643' },
    ],
    windows: [{ label: 'windowsX64', href: 'https://github.com/Happ-proxy/happ-desktop/releases/latest/download/setup-Happ.x64.exe' }],
    linux: [{ label: 'linuxDownloads', href: 'https://github.com/Happ-proxy/happ-desktop/releases/latest' }],
  },
  incy: {
    ios: [{ label: 'appStore', href: 'https://apps.apple.com/ru/app/incy/id6756943388' }],
    android: [{ label: 'googlePlay', href: 'https://play.google.com/store/apps/details?id=llc.itdev.incy' }],
    macos: [{ label: 'appStore', href: 'https://apps.apple.com/ru/app/incy/id6756943388' }],
    windows: [{ label: 'windowsDownload', href: 'https://github.com/INCY-DEV/incy-platforms/releases/latest/download/incy-windows-setup.exe' }],
    linux: [{ label: 'linuxDownloads', href: 'https://github.com/INCY-DEV/incy-platforms/releases/latest' }],
  },
}
