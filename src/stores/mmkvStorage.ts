import { createMMKV } from 'react-native-mmkv';

const mmkv = createMMKV({ id: 'kettlecal' });

export const mmkvStorage = {
  setItem: (name: string, value: string) => mmkv.set(name, value),
  getItem: (name: string) => mmkv.getString(name) ?? null,
  removeItem: (name: string) => mmkv.remove(name),
};
