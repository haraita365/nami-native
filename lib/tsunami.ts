// 津波警報・注意報 共通ロジック
// Web版・ネイティブ版共通。DOM/Web専用APIに依存しない純ロジック。

export type TsunamiLevel = 'major' | 'warning' | 'advisory';

export interface TsunamiWarning {
  areaCode: number;
  areaName: string;
  level: TsunamiLevel;
  label: string; // '大津波警報' | '津波警報' | '津波注意報'
}

export interface TsunamiAlertResult {
  level: TsunamiLevel;
  label: string;
  areaNames: string[];
}

// スポットID → 気象庁津波予報区コード のマッピング
// コード出典: 気象庁防災情報発表区域データセット (geoshape.ex.nii.ac.jp/jma/resource/AreaTsunami/)
// 全66予報区から各スポットの海岸に該当する予報区を割り当てる
const SPOT_AREA_CODES: Record<string, number[]> = {
  // ── 北海道 ──────────────────────────────────────────────────
  tomakomai:              [101], // 北海道太平洋沿岸中部（胆振・苫小牧）
  yoichi:                 [111], // 北海道日本海沿岸南部（後志・余市）

  // ── 東北 ────────────────────────────────────────────────────
  kamaishi:               [210], // 岩手県
  arahama:                [220], // 宮城県
  shichigahama:           [220], // 宮城県
  iwaki:                  [250], // 福島県

  // ── 茨城 ────────────────────────────────────────────────────
  oarai:                  [300], // 茨城県
  ajigaura:               [300], // 茨城県

  // ── 千葉北 ──────────────────────────────────────────────────
  shidashita:             [310], // 千葉県九十九里・外房
  ichinomiya:             [310], // 千葉県九十九里・外房
  torami:                 [310], // 千葉県九十九里・外房
  taito:                  [310], // 千葉県九十九里・外房
  kujukuri:               [310], // 千葉県九十九里・外房

  // ── 千葉南 ──────────────────────────────────────────────────
  onjuku:                 [310], // 千葉県九十九里・外房（御宿・外房）
  kamogawa:               [310], // 千葉県九十九里・外房（鴨川・外房）
  okitsu:                 [310], // 千葉県九十九里・外房（興津・外房）
  katsuura:               [310], // 千葉県九十九里・外房（勝浦・外房）

  // ── 湘南 ────────────────────────────────────────────────────
  oiso:                   [330], // 相模湾・三浦半島
  hiratsuka:              [330], // 相模湾・三浦半島
  chigasaki:              [330], // 相模湾・三浦半島
  kugenuma:               [330], // 相模湾・三浦半島
  tsujido:                [330], // 相模湾・三浦半島
  'zushi-hayama':         [330], // 相模湾・三浦半島

  // ── 伊豆 ────────────────────────────────────────────────────
  'shirahama-izu':        [380], // 静岡県（南伊豆）
  tatado:                 [380], // 静岡県（南伊豆）

  // ── 静岡 ────────────────────────────────────────────────────
  omaezaki:               [380], // 静岡県（御前崎）
  katahama:               [380], // 静岡県（遠州灘）

  // ── 東海 ────────────────────────────────────────────────────
  omotehama:              [390], // 愛知県外海（渥美半島・表浜）
  'mihama-mie':           [400], // 三重県南部（熊野灘・御浜）

  // ── 南紀 ────────────────────────────────────────────────────
  'shirahama-wakayama':   [530], // 和歌山県（南紀白浜）
  kushimoto:              [530], // 和歌山県（串本）

  // ── 四国 ────────────────────────────────────────────────────
  hiwasa:                 [580], // 徳島県（美波町・日和佐）
  irino:                  [610], // 高知県（黒潮町・入野）
  tosashimizu:            [610], // 高知県（土佐清水）

  // ── 九州 ────────────────────────────────────────────────────
  kizakihama:             [760], // 宮崎県（木崎浜）
  'aoshima-miyazaki':     [760], // 宮崎県（青島）
  yonozu:                 [751], // 大分県豊後水道沿岸（米水津・佐伯市）
  kushikino:              [773], // 鹿児島県西部（いちき串木野・薩摩半島西岸）
  itoshima:               [711], // 福岡県日本海沿岸（糸島・玄界灘）

  // ── 日本海 ──────────────────────────────────────────────────
  oga:                    [230], // 秋田県（男鹿）
  niigata:                [340], // 新潟県上中下越（新潟）
  uchinada:               [361], // 石川県加賀（内灘）
  fukui:                  [370], // 福井県（越前）
  tottori:                [540], // 鳥取県（鳥取）
  nagato:                 [700], // 山口県日本海沿岸（長門）

  // ── 沖縄 ────────────────────────────────────────────────────
  'okinawa-main':         [800], // 沖縄本島地方
  miyakojima:             [802], // 宮古島・八重山地方
  ishigakijima:           [802], // 宮古島・八重山地方
};

export function getTsunamiAreaCodes(spotId: string): number[] {
  return SPOT_AREA_CODES[spotId] ?? [];
}

/** 単一スポットに対して活性中の最上位津波警報を返す。なければ null。*/
export function getTsunamiAlertForSpot(
  spotId: string,
  warnings: TsunamiWarning[],
): TsunamiAlertResult | null {
  const areaCodes = getTsunamiAreaCodes(spotId);
  if (areaCodes.length === 0) return null;

  const relevant = warnings.filter((w) => areaCodes.includes(w.areaCode));
  if (relevant.length === 0) return null;

  return buildResult(relevant);
}

/** 複数スポット（エリア一覧など）に対してまとめて判定する。*/
export function getTsunamiAlertForSpots(
  spotIds: string[],
  warnings: TsunamiWarning[],
): TsunamiAlertResult | null {
  const relevant = warnings.filter((w) => {
    for (const id of spotIds) {
      if (getTsunamiAreaCodes(id).includes(w.areaCode)) return true;
    }
    return false;
  });
  if (relevant.length === 0) return null;
  return buildResult(relevant);
}

function buildResult(relevant: TsunamiWarning[]): TsunamiAlertResult {
  let level: TsunamiLevel = 'advisory';
  for (const w of relevant) {
    if (w.level === 'major') { level = 'major'; break; }
    if (w.level === 'warning') level = 'warning';
  }
  const label =
    level === 'major' ? '大津波警報' :
    level === 'warning' ? '津波警報' : '津波注意報';
  const seen = new Set<string>();
  const areaNames: string[] = [];
  for (const w of relevant) {
    if (!seen.has(w.areaName)) { seen.add(w.areaName); areaNames.push(w.areaName); }
  }
  return { level, label, areaNames };
}
