export type AlertLevel = 'danger' | 'warning' | 'caution';

export interface WeatherAlert {
  level: AlertLevel;
  label: string;
  title: string;
  detail: string;
}

export function getWeatherAlert(windSpeed: number, waveHeight: number): WeatherAlert | null {
  if (windSpeed >= 15 || waveHeight >= 3.5) {
    return {
      level: 'danger',
      label: '危険',
      title: '入水を見送ってください',
      detail: '荒天により全員が入水を見送るべき危険なコンディションです。沿岸・海岸線への近づきも危険です。',
    };
  }
  if (windSpeed >= 10 || waveHeight >= 2.5) {
    return {
      level: 'warning',
      label: '警戒',
      title: '強風・荒天注意',
      detail: '波が大きく危険なコンディションです。上級者以外は見送りを強く推奨します。',
    };
  }
  if (windSpeed >= 7 || waveHeight >= 2.0) {
    return {
      level: 'caution',
      label: '注意',
      title: '荒れ気味のコンディション',
      detail: '波やや高め・風強め。初心者・中級者は慎重に判断してください。',
    };
  }
  return null;
}

export const ALERT_STYLE: Record<AlertLevel, { bg: string; border: string; text: string; icon: string }> = {
  danger:  { bg: 'rgba(242,107,107,0.12)', border: 'rgba(242,107,107,0.45)', text: 'var(--red)',   icon: '🚨' },
  warning: { bg: 'rgba(250,179,71,0.10)',  border: 'rgba(250,179,71,0.45)',  text: 'var(--amber)', icon: '⚠️' },
  caution: { bg: 'rgba(250,179,71,0.07)',  border: 'rgba(250,179,71,0.28)',  text: 'var(--amber)', icon: '⚠️' },
};
