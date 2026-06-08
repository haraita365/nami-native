export const SPOTS = [
  // ── 北海道 ───────────────────────────────────────────
  {
    id: 'tomakomai',
    name: '苫小牧',
    area: '北海道',
    lat: 42.5720,
    lng: 141.5970,
    beachDirection: 150,
    baseCrowd: 8,
  },
  {
    id: 'yoichi',
    name: '余市',
    area: '北海道',
    lat: 43.1960,
    lng: 140.7850,
    beachDirection: 280,
    baseCrowd: 6,
  },

  // ── 東北 ────────────────────────────────────────────
  {
    id: 'arahama',
    name: '荒浜',
    area: '東北',
    lat: 38.1940,
    lng: 140.9750,
    beachDirection: 90,
    baseCrowd: 8,
  },
  {
    id: 'shichigahama',
    name: '七ヶ浜',
    area: '東北',
    lat: 38.2978,
    lng: 141.0628,
    beachDirection: 75,
    baseCrowd: 8,
  },
  {
    id: 'iwaki',
    name: 'いわき',
    area: '東北',
    lat: 36.9690,
    lng: 140.9270,
    beachDirection: 90,
    baseCrowd: 8,
  },
  {
    id: 'kamaishi',
    name: '釜石',
    area: '東北',
    lat: 39.2560,
    lng: 141.8830,
    beachDirection: 100,
    baseCrowd: 6,
  },

  // ── 茨城 ────────────────────────────────────────────
  {
    id: 'oarai',
    name: '大洗',
    area: '茨城',
    lat: 36.3097,
    lng: 140.5768,
    beachDirection: 90,
    baseCrowd: 12,
  },
  {
    id: 'ajigaura',
    name: '阿字ヶ浦',
    area: '茨城',
    lat: 36.3678,
    lng: 140.5885,
    beachDirection: 85,
    baseCrowd: 10,
  },

  // ── 千葉北 ───────────────────────────────────────────
  {
    id: 'shidashita',
    name: '釣ヶ崎・志田下',
    area: '千葉北',
    lat: 35.3608,
    lng: 140.3677,
    beachDirection: 45,
    baseCrowd: 15,
    isHome: true,
  },
  {
    id: 'ichinomiya',
    name: '一宮海岸',
    area: '千葉北',
    lat: 35.3705,
    lng: 140.3735,
    beachDirection: 45,
    baseCrowd: 10,
  },
  {
    id: 'torami',
    name: '東浪見',
    area: '千葉北',
    lat: 35.3488,
    lng: 140.3615,
    beachDirection: 50,
    baseCrowd: 12,
  },
  {
    id: 'taito',
    name: '太東',
    area: '千葉北',
    lat: 35.2842,
    lng: 140.3882,
    beachDirection: 70,
    baseCrowd: 8,
  },
  {
    id: 'kujukuri',
    name: '九十九里',
    area: '千葉北',
    lat: 35.4272,
    lng: 140.4625,
    beachDirection: 60,
    baseCrowd: 10,
  },

  // ── 千葉南 ───────────────────────────────────────────
  {
    id: 'onjuku',
    name: '御宿',
    area: '千葉南',
    lat: 35.1095,
    lng: 140.3938,
    beachDirection: 120,
    baseCrowd: 12,
  },
  {
    id: 'kamogawa',
    name: '鴨川',
    area: '千葉南',
    lat: 35.1020,
    lng: 140.0950,
    beachDirection: 155,
    baseCrowd: 10,
  },
  {
    id: 'okitsu',
    name: '興津',
    area: '千葉南',
    lat: 35.1265,
    lng: 140.4568,
    beachDirection: 110,
    baseCrowd: 9,
  },
  {
    id: 'katsuura',
    name: '勝浦・守谷',
    area: '千葉南',
    lat: 35.1468,
    lng: 140.3290,
    beachDirection: 130,
    baseCrowd: 8,
  },

  // ── 湘南 ────────────────────────────────────────────
  {
    id: 'oiso',
    name: '大磯',
    area: '湘南',
    lat: 35.3085,
    lng: 139.3152,
    beachDirection: 175,
    baseCrowd: 15,
  },
  {
    id: 'hiratsuka',
    name: '平塚',
    area: '湘南',
    lat: 35.3195,
    lng: 139.3500,
    beachDirection: 175,
    baseCrowd: 18,
  },
  {
    id: 'chigasaki',
    name: '茅ヶ崎',
    area: '湘南',
    lat: 35.3275,
    lng: 139.3940,
    beachDirection: 175,
    baseCrowd: 22,
  },
  {
    id: 'kugenuma',
    name: '鵠沼',
    area: '湘南',
    lat: 35.3222,
    lng: 139.4638,
    beachDirection: 175,
    baseCrowd: 25,
  },
  {
    id: 'tsujido',
    name: '辻堂',
    area: '湘南',
    lat: 35.3292,
    lng: 139.4540,
    beachDirection: 165,
    baseCrowd: 30,
  },
  {
    id: 'zushi-hayama',
    name: '逗子・葉山',
    area: '湘南',
    lat: 35.2740,
    lng: 139.5810,
    beachDirection: 170,
    baseCrowd: 15,
  },

  // ── 伊豆 ────────────────────────────────────────────
  {
    id: 'shirahama-izu',
    name: '白浜（伊豆）',
    area: '伊豆',
    lat: 34.6693,
    lng: 138.9349,
    beachDirection: 180,
    baseCrowd: 8,
  },
  {
    id: 'tatado',
    name: '多々戸浜',
    area: '伊豆',
    lat: 34.6952,
    lng: 138.8690,
    beachDirection: 190,
    baseCrowd: 10,
  },

  // ── 静岡 ────────────────────────────────────────────
  {
    id: 'omaezaki',
    name: '御前崎',
    area: '静岡',
    lat: 34.5970,
    lng: 138.2155,
    beachDirection: 210,
    baseCrowd: 8,
  },
  {
    id: 'katahama',
    name: '遠州菊川',
    area: '静岡',
    lat: 34.7058,
    lng: 137.7330,
    beachDirection: 180,
    baseCrowd: 7,
  },

  // ── 東海 ────────────────────────────────────────────
  {
    id: 'omotehama',
    name: '表浜（田原）',
    area: '東海',
    lat: 34.6190,
    lng: 137.2580,
    beachDirection: 165,
    baseCrowd: 10,
  },
  {
    id: 'mihama-mie',
    name: '御浜（三重）',
    area: '東海',
    lat: 33.9080,
    lng: 136.1500,
    beachDirection: 195,
    baseCrowd: 8,
  },

  // ── 南紀 ────────────────────────────────────────────
  {
    id: 'shirahama-wakayama',
    name: '南紀白浜',
    area: '南紀',
    lat: 33.6830,
    lng: 135.3690,
    beachDirection: 205,
    baseCrowd: 10,
  },
  {
    id: 'kushimoto',
    name: '串本',
    area: '南紀',
    lat: 33.4780,
    lng: 135.7650,
    beachDirection: 195,
    baseCrowd: 8,
  },

  // ── 四国 ────────────────────────────────────────────
  {
    id: 'hiwasa',
    name: '日和佐（大浜）',
    area: '四国',
    lat: 33.7290,
    lng: 134.5230,
    beachDirection: 190,
    baseCrowd: 8,
  },
  {
    id: 'irino',
    name: '入野（黒潮町）',
    area: '四国',
    lat: 32.8920,
    lng: 132.8970,
    beachDirection: 185,
    baseCrowd: 12,
  },
  {
    id: 'tosashimizu',
    name: '土佐清水',
    area: '四国',
    lat: 32.7800,
    lng: 132.7120,
    beachDirection: 190,
    baseCrowd: 7,
  },

  // ── 九州 ────────────────────────────────────────────
  {
    id: 'kizakihama',
    name: '木崎浜',
    area: '九州',
    lat: 31.8640,
    lng: 131.4370,
    beachDirection: 100,
    baseCrowd: 25,
  },
  {
    id: 'aoshima-miyazaki',
    name: '青島（宮崎）',
    area: '九州',
    lat: 31.8910,
    lng: 131.4650,
    beachDirection: 100,
    baseCrowd: 18,
  },
  {
    id: 'yonozu',
    name: '米水津（大分）',
    area: '九州',
    lat: 32.9300,
    lng: 131.8750,
    beachDirection: 125,
    baseCrowd: 10,
  },
  {
    id: 'kushikino',
    name: 'いちき串木野',
    area: '九州',
    lat: 31.7100,
    lng: 130.2780,
    beachDirection: 265,
    baseCrowd: 8,
  },
  {
    id: 'itoshima',
    name: '糸島',
    area: '九州',
    lat: 33.5800,
    lng: 130.1750,
    beachDirection: 320,
    baseCrowd: 12,
  },

  // ── 日本海 ───────────────────────────────────────────
  {
    id: 'oga',
    name: '男鹿',
    area: '日本海',
    lat: 39.9080,
    lng: 139.7600,
    beachDirection: 280,
    baseCrowd: 6,
  },
  {
    id: 'niigata',
    name: '新潟',
    area: '日本海',
    lat: 37.8950,
    lng: 139.0730,
    beachDirection: 310,
    baseCrowd: 8,
  },
  {
    id: 'fukui',
    name: '越前（福井）',
    area: '日本海',
    lat: 35.9630,
    lng: 136.1070,
    beachDirection: 300,
    baseCrowd: 7,
  },
  {
    id: 'uchinada',
    name: '内灘（石川）',
    area: '日本海',
    lat: 36.6480,
    lng: 136.6260,
    beachDirection: 295,
    baseCrowd: 10,
  },
  {
    id: 'tottori',
    name: '鳥取',
    area: '日本海',
    lat: 35.5300,
    lng: 134.2380,
    beachDirection: 345,
    baseCrowd: 8,
  },
  {
    id: 'nagato',
    name: '長門（山口）',
    area: '日本海',
    lat: 34.3700,
    lng: 131.1850,
    beachDirection: 345,
    baseCrowd: 6,
  },

  // ── 沖縄 ────────────────────────────────────────────
  {
    id: 'okinawa-main',
    name: '沖縄本島',
    area: '沖縄',
    lat: 26.3500,
    lng: 127.8750,
    beachDirection: 90,
    baseCrowd: 15,
  },
  {
    id: 'miyakojima',
    name: '宮古島',
    area: '沖縄',
    lat: 24.7200,
    lng: 125.3100,
    beachDirection: 155,
    baseCrowd: 8,
  },
  {
    id: 'ishigakijima',
    name: '石垣島',
    area: '沖縄',
    lat: 24.3400,
    lng: 124.2500,
    beachDirection: 110,
    baseCrowd: 8,
  },
] as const;

export type Spot = (typeof SPOTS)[number];

/** スポットIDが存在する有効なIDか確認（全48スポット対応済み） */
export function isAllowedSpotId(id: string): boolean {
  return SPOTS.some((s) => s.id === id);
}

export const AREA_ORDER = [
  '千葉北', '湘南', '茨城', '千葉南',
  '伊豆', '静岡', '東海', '南紀',
  '四国', '九州', '日本海', '沖縄', '東北', '北海道',
] as const;

export type AreaName = typeof AREA_ORDER[number];

export function isAllowedArea(area: string): boolean {
  return (AREA_ORDER as readonly string[]).includes(area);
}

export function getAreaSpots(area: string) {
  return SPOTS.filter((s) => s.area === area);
}

export function getAreaRepSpot(area: string) {
  return SPOTS.find((s) => s.area === area) ?? SPOTS[0];
}
