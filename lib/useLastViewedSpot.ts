import AsyncStorage from '@react-native-async-storage/async-storage';

export const LAST_SPOT_KEY = 'nami:lastViewedSpot';

export async function persistLastViewedSpot(spotId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SPOT_KEY, JSON.stringify(spotId));
  } catch {
    // ignore
  }
}
