// Web fallback for mmkvStorage. react-native-mmkv is a native-only Nitro module
// with no web build, so on web we back the same interface with localStorage.
// Metro resolves this file instead of mmkvStorage.ts when bundling for web.
const KEY_PREFIX = 'kettlecal:';

export const mmkvStorage = {
  setItem: (name: string, value: string) => localStorage.setItem(KEY_PREFIX + name, value),
  getItem: (name: string) => localStorage.getItem(KEY_PREFIX + name),
  removeItem: (name: string) => localStorage.removeItem(KEY_PREFIX + name),
};
