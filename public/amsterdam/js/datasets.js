/**
 * 阿姆斯特丹開放地理資料：圖層目錄
 *
 * 資料來源：Gemeente Amsterdam Maps Data（https://maps.amsterdam.nl/open_geodata/）
 * 端點格式：geojson_lnglat.php?KAARTLAAG=<圖層代碼>&THEMA=<主題代碼>
 * 座標系：WGS84 經緯度（lnglat 版本，可直接餵給 Leaflet）
 *
 * 配色規則（依 dataviz 規範，已用 validate_palette.js 實測）：
 * 顏色只編碼「主題群」共3色（blue / orange / aqua），這組在淺色與深色模式
 * 的 all-pairs CVD 檢查全數通過；個別圖層的識別靠符號、圖例文字與 popup 標題，
 * 不單靠顏色。行政界線使用中性灰，不佔用 categorical slot。
 */
window.AMS = window.AMS || {};
(function (AMS) {
  'use strict';

  /** 主題群：顏色的唯一載體 */
  const THEMES = [
    { id: 'mobility', label: '移動與公共服務', nl: 'Mobiliteit & voorzieningen' },
    { id: 'living',   label: '生活、文化與遊憩', nl: 'Wonen, cultuur & recreatie' },
    { id: 'green',    label: '綠地、生態與氣候', nl: 'Groen, natuur & klimaat' },
  ];

  /** 淺色／深色兩套已驗證的色階（同樣三個色相，各自為該底色重新取階） */
  const PALETTE = {
    light: { mobility: '#2a78d6', living: '#eb6834', green: '#1baf7a', boundary: '#7d7c76' },
    dark:  { mobility: '#3987e5', living: '#d95926', green: '#199e70', boundary: '#8e8d86' },
  };

  /**
   * 15分鐘城市的機能領域。
   * 參考 Moreno et al. (2021)《Introducing the "15-Minute City"》的六大社會功能，
   * 依阿姆斯特丹開放資料實際可得的圖層調整命名。
   */
  const FUNCTIONS = [
    { id: 'supplying', label: '供給', nl: 'Supplying',  desc: '市場、食物倡議、社區堆肥' },
    { id: 'caring',    label: '照顧', nl: 'Caring',     desc: '社福據點、鄰里之家、圖書館' },
    { id: 'learning',  label: '學習', nl: 'Learning',   desc: '各級學校與教育場所' },
    { id: 'enjoying',  label: '享受', nl: 'Enjoying',   desc: '文化、運動、遊戲、游泳' },
    { id: 'moving',    label: '移動', nl: 'Moving',     desc: '電車與地鐵站' },
    { id: 'greening',  label: '綠意', nl: 'Greening',   desc: '公園、行道樹、綠屋頂' },
  ];

  /** MAATSCHAPPELIJKE_VZN 的 Domein 欄位 → 機能領域 */
  function domeinToFunction(props) {
    switch ((props && props.Domein) || '') {
      case 'Onderwijs':          return 'learning';
      case 'Jeugd en Zorg':      return 'caring';
      case 'Basisvoorzieningen': return 'caring';
      case 'Sport en Spelen':    return 'enjoying';
      case 'Kunst en Cultuur':   return 'enjoying';
      default:                   return null;
    }
  }

  /**
   * 圖層清單。
   * count / bytes 為 2026-09 實測值，僅用於載入前提示，不影響實際資料。
   * fn：該圖層對應的機能領域；給函式時代表逐筆依屬性判斷。
   */
  const LAYERS = [
    // ── 移動與公共服務 ───────────────────────────────────────────
    {
      id: 'trammetro_lijnen', kaartlaag: 'TRAMMETRO_LIJNEN_2026', thema: 'trammetro',
      name: '電車與地鐵路線', nl: 'Tram- en metrolijnen 2026',
      theme: 'mobility', render: 'line', icon: 'route', count: 214, bytes: 106701,
      title: (p) => (p.Modaliteit || '路線') + ' ' + (p.Lijn || ''),
      fields: [['Modaliteit', '運具'], ['Lijn', '路線編號']],
      facet: { key: 'Modaliteit', label: '運具' },
    },
    {
      id: 'trammetro_punten', kaartlaag: 'TRAMMETRO_PUNTEN_2026', thema: 'trammetro',
      name: '電車與地鐵站', nl: 'Tramhaltes en metrostations 2026',
      theme: 'mobility', render: 'icon', icon: 'tram', count: 240, bytes: 56561,
      fn: 'moving', title: (p) => p.Naam,
      fields: [['Modaliteit', '運具'], ['Lijn', '停靠路線']],
      facet: { key: 'Modaliteit', label: '運具' },
    },
    {
      id: 'maatschappelijk', kaartlaag: 'MAATSCHAPPELIJKE_VZN', thema: 'maatschappelijke_voorzieningen',
      name: '社會與教育設施', nl: 'Maatschappelijke voorzieningen',
      theme: 'mobility', render: 'dot', icon: 'community', count: 1462, bytes: 465139,
      fn: domeinToFunction, title: (p) => p.Naam,
      fields: [['Domein', '領域'], ['Categorie', '類別'], ['Adres', '地址'], ['Stadsdeel', '行政區']],
      facet: { key: 'Domein', label: '領域' },
      valueMap: {
        'Onderwijs': '教育', 'Jeugd en Zorg': '青少年與照護',
        'Basisvoorzieningen': '基礎生活設施', 'Sport en Spelen': '運動與遊戲',
        'Kunst en Cultuur': '藝術與文化',
      },
    },
    {
      id: 'toiletten', kaartlaag: 'OPENBARE_TOILETTEN', thema: 'openbare_toiletten',
      name: '公共廁所', nl: 'Openbare toiletten',
      theme: 'mobility', render: 'icon', icon: 'toilet', count: 106, bytes: 36380,
      title: (p) => p.Omschrijving || p.Soort,
      fields: [['Soort', '型式'], ['Prijs_per_gebruik', '單次費用（€）'], ['Openingstijden', '開放時間']],
      facet: { key: 'Soort', label: '型式' },
      valueMap: {
        'Amsterdamse krul': '阿姆斯特丹式鑄鐵小便亭', 'Openbaar toilet': '公共廁所',
        'Openbaar toilet, rolstoeltoegankelijk': '公共廁所（可輪椅通行）',
        'Toilet in parkeergarage': '停車場內廁所', 'Verzinkbaar urinoir': '可升降小便斗',
        'Overig urinoir': '其他小便斗',
      },
    },

    // ── 生活、文化與遊憩 ─────────────────────────────────────────
    {
      id: 'markten', kaartlaag: 'MARKTEN', thema: 'markten',
      name: '市集', nl: 'Markten',
      theme: 'living', render: 'icon', icon: 'market', count: 45, bytes: 22374,
      fn: 'supplying', title: (p) => p.Locatie,
      fields: [['Artikelen', '販售品項'], ['Dagen', '開市日'], ['Gemeente', '所屬市鎮']],
      facet: { key: 'Artikelen', label: '販售品項' },
      valueMap: {
        'Algemene waren': '綜合商品', 'Boerenmarkt / Bioversmarkt': '農夫與有機市集',
        'Kunst / Antiek en curiosa': '藝術、古董與珍玩', 'Bloemen en planten': '花卉與植栽',
        'Boeken': '書籍', 'Postzegels en munten': '郵票與錢幣',
      },
    },
    {
      id: 'voedsel', kaartlaag: 'VOEDSELINITIATIEVEN', thema: 'voedselinitiatieven',
      name: '食物倡議據點', nl: 'Voedselinitiatieven',
      theme: 'living', render: 'icon', icon: 'food', count: 181, bytes: 59281,
      fn: 'supplying', title: (p) => p.Naam,
      fields: [['Soort', '類型'], ['Locatie', '地點'], ['Adres', '地址'], ['Stadsdeel', '行政區']],
      facet: { key: 'Soort', label: '類型' },
      valueMap: {
        'Sociaal restaurant': '社會餐廳', 'Voedseluitgifte': '食物發放點',
        'Maaltijduitgifte': '餐食發放點', 'Voedselverbindingsplek': '食物連結據點',
        'Stadslandbouw': '都市農耕', 'Voedselhub': '食物集散中心',
        'Sociaal restaurant - Voedseluitgifte': '社會餐廳兼食物發放',
      },
    },
    {
      id: 'kunstcultuur', kaartlaag: 'KUNST_CULTUUR', thema: 'kunstencultuur',
      name: '藝術與文化場所', nl: 'Kunst en cultuur',
      theme: 'living', render: 'dot', icon: 'culture', count: 947, bytes: 603898,
      fn: 'enjoying', title: (p) => p.Naamorganisatie,
      fields: [['Kunstdiscipline', '藝術類別'], ['Type_ruimte_1', '空間型態'], ['Kaart_adres', '地址']],
      facet: { key: 'Kunstdiscipline', label: '藝術類別' },
      valueMap: {
        'Muziek': '音樂', 'Multidisciplinair': '跨領域', 'BeeldendeKunst_Fotografie': '視覺藝術與攝影',
        'Theater': '劇場', 'Erfgoed': '文化資產', 'Debat_Letteren': '論辯與文學', 'Dans': '舞蹈',
        'Film': '電影', 'CreatieveIndustrie_Ontwerp': '創意產業與設計', 'TV_Radio': '廣播電視',
      },
    },
    {
      id: 'sport', kaartlaag: 'SPORT_OPENBAAR', thema: 'sport',
      name: '公共運動場地', nl: 'Openbare sportplekken',
      theme: 'living', render: 'dot', icon: 'sport', count: 845, bytes: 331491,
      fn: 'enjoying', title: (p) => p.Naam || p.Sportvoorziening,
      fields: [['Sportvoorziening', '運動類型'], ['Locatie', '地點'], ['Ondergrond', '場地鋪面'], ['Verlichting', '照明']],
      facet: { key: 'Sportvoorziening', label: '運動類型' },
      valueMap: {
        'Voetbal': '足球', 'Basketbal': '籃球', 'Tafeltennis': '桌球', 'Fitness / Bootcamp': '健身',
        'Jeu de boules': '滾球', 'Tennis': '網球', 'Overig': '其他', 'Skate': '滑板', 'Beachvolley': '沙灘排球',
      },
    },
    {
      id: 'sportparken', kaartlaag: 'SPORTPARKEN', thema: 'sport',
      name: '運動公園', nl: 'Sportparken',
      theme: 'living', render: 'polygon', icon: 'sportpark', count: 56, bytes: 166670,
      fn: 'enjoying', title: (p) => p.Naam, fields: [['Naam', '名稱']],
    },
    {
      id: 'spelen', kaartlaag: 'TOEGANKELIJK_SPELEN', thema: 'toegankelijk_spelen',
      name: '無障礙遊戲場', nl: 'Toegankelijke speelvoorzieningen',
      theme: 'living', render: 'icon', icon: 'play', count: 68, bytes: 27289,
      fn: 'enjoying', title: (p) => p.Naam,
      fields: [['Type_speelplek', '遊戲場類型'], ['Adres', '地址'], ['Toelichting', '說明']],
      facet: { key: 'Type_speelplek', label: '遊戲場類型' },
      valueMap: { 'Speelplek': '開放遊戲空間', 'Speeltuin': '有人管理的遊戲園' },
    },
    {
      id: 'kinderboerderij', kaartlaag: 'KINDERBOERDERIJEN', thema: 'kinderboerderij',
      name: '兒童農場', nl: 'Kinder/stadsboerderijen',
      theme: 'living', render: 'icon', icon: 'farm', count: 17, bytes: 4062,
      fn: 'enjoying', title: (p) => p.Naam, fields: [['Adres', '地址'], ['Website', '網站']],
    },
    {
      id: 'zwemwater', kaartlaag: 'ZWEMWATER', thema: 'zwemwater',
      name: '開放水域泳點', nl: 'Zwemwater',
      theme: 'living', render: 'icon', icon: 'swim', count: 49, bytes: 8303,
      fn: 'enjoying', title: (p) => p.Naam_locatie,
      fields: [['Categorie', '類別']],
      facet: { key: 'Categorie', label: '類別' },
      valueMap: {
        'Zwemplek': '開放水域泳點', 'Peuterbadje': '幼兒戲水池', 'Binnenzwembad': '室內泳池',
        'Buitenzwembad': '戶外泳池', 'Waterspeeltuin': '親水遊戲場',
      },
    },

    // ── 綠地、生態與氣候 ─────────────────────────────────────────
    {
      id: 'parken', kaartlaag: 'PARKPLANTSOENGROEN', thema: 'stadsparken',
      name: '公園與綠地', nl: 'Park, plantsoen, recreatief groen',
      theme: 'green', render: 'polygon', icon: 'park', count: 125, bytes: 232703,
      fn: 'greening', title: (p) => p.Naam,
      fields: [['Stadsdeel', '行政區'], ['Stadspark', '市級公園'], ['Oppervlakte_m2', '面積（m²）']],
    },
    {
      id: 'daken', kaartlaag: 'DAKEN', thema: 'dakenlandschap',
      name: '綠屋頂與多功能屋頂', nl: 'Groene en multifunctionele daken',
      theme: 'green', render: 'dot', icon: 'roof', count: 512, bytes: 274469,
      fn: 'greening', title: (p) => p.Adres,
      fields: [['Dakkleur', '屋頂機能'], ['Totaal_m2', '總面積（m²）'], ['Groen_m2', '綠化面積（m²）'],
               ['Realisatiejaar', '完工年'], ['Daktype', '屋頂說明']],
      facet: { key: 'Dakkleur', label: '屋頂機能' },
      // 阿姆斯特丹用顏色標示屋頂承擔的機能（groen 植栽、blauw 蓄水、geel 太陽能、
      // rood 活動空間、paars 其他），一個屋頂可以同時具備多種
      valueSplit: ' - ',
      valueMap: { 'Groen': '植栽', 'Blauw': '蓄水', 'Geel': '太陽能',
                  'Rood': '活動空間', 'Paars': '其他' },
    },
    {
      id: 'compost', kaartlaag: 'BUURTCOMPOST', thema: 'buurtcompost',
      name: '社區堆肥點', nl: 'Buurtcompost',
      theme: 'green', render: 'icon', icon: 'compost', count: 131, bytes: 32320,
      fn: 'supplying', title: (p) => p.Naam || p.Adres,
      fields: [['Soort', '型式'], ['Adres', '地址']],
      facet: { key: 'Soort', label: '型式' },
      valueMap: { 'Wormenhotel': '蚯蚓堆肥箱', 'Draaicontainer': '旋轉式堆肥桶', 'Bokashi': 'Bokashi發酵堆肥' },
    },
    {
      id: 'honden', kaartlaag: 'HONDEN', thema: 'honden',
      name: '犬隻規範區（放養與禁入）', nl: 'Honden uitren- en verbodsgebieden',
      theme: 'green', render: 'polygon', icon: 'dog', count: 722, bytes: 728483,
      title: (p) => p.Soort,
      fields: [['Soort', '區域類型'], ['Speciale_regels', '特別規定']],
      facet: { key: 'Soort', label: '區域類型' },
      // 同一圖層混合了性質相反的區域，只靠顏色分不出來，務必用篩選器逐類檢視
      valueMap: { 'Losloopgebied': '可不繫繩區', 'Verbodsgebied': '禁止進入區', 'Speciale regels': '特別規定區' },
    },
    {
      id: 'bomen', kaartlaag: 'BOMEN_BIJZONDER', thema: 'bomen_bijzonder',
      name: '特殊樹木', nl: 'Bijzondere bomen',
      theme: 'green', render: 'dot', icon: 'tree', count: 5829, bytes: 3575307, heavy: true,
      fn: 'greening', title: (p) => p.Boomsoort_NL || p.Boomsoort,
      fields: [['Boomsoort_NL', '樹種（荷文）'], ['Boomsoort', '學名'], ['Plantjaar', '種植年'],
               ['Kroondiameter', '樹冠直徑（m）'], ['Stamomtrek', '胸圍（cm）'], ['Stadsdeel', '行政區']],
      facet: { key: 'Vastgestelde_status', label: '保護狀態' },
      valueMap: {
        'Beschermwaardige houtopstand': '具保護價值的樹木', 'Ander waardevol groen': '其他有價值綠資源',
        'Nog niet (opnieuw) vastgesteld': '尚未重新認定', 'Niet (opnieuw) opnemen in de lijst': '不列入名冊',
      },
    },
  ];

  /** 行政界線：非 categorical，一律中性灰 */
  const BOUNDARIES = [
    {
      id: 'stadsdelen', kaartlaag: 'INDELING_STADSDEEL_EXWATER', thema: 'gebiedsindeling',
      name: '行政區（Stadsdeel）', nl: 'Amsterdam Stadsdelen excl. water',
      nameField: 'Stadsdeel', areaField: 'Oppervlakte_m2', count: 9, bytes: 188438,
    },
    {
      id: 'buurten', kaartlaag: 'INDELING_BUURT_EXWATER', thema: 'gebiedsindeling',
      name: '鄰里（Buurt）', nl: 'Amsterdam Buurten excl. water',
      nameField: 'Buurt', areaField: 'Oppervlakte_m2', count: 518, bytes: 651036,
    },
  ];

  AMS.catalog = {
    THEMES, PALETTE, FUNCTIONS, LAYERS, BOUNDARIES,
    layerById: (id) => LAYERS.find((l) => l.id === id),
    themeById: (id) => THEMES.find((t) => t.id === id),
    functionById: (id) => FUNCTIONS.find((f) => f.id === id),
    /** 逐筆判斷該圖徵屬於哪個機能領域（無則回 null） */
    functionOf(layer, props) {
      if (!layer.fn) return null;
      return typeof layer.fn === 'function' ? layer.fn(props) : layer.fn;
    },
  };
})(window.AMS);
