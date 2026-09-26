/* 节日背景装饰元素：高保真 AI 生成透明 PNG（public/elements/*.png），
 * 每个节日绑定一组专属元素，切换节日时随机分布重绘。 */
(function () {
  'use strict';

  var SETS = {
    'teachers-day': ['apple', 'book', 'flower', 'star', 'sparkle'],
    'spring-festival': ['lantern', 'ingot', 'plum', 'firecracker', 'cloud'],
    'lantern': ['lantern', 'moon', 'cloud', 'sparkle'],
    'dragon-boat': ['boat', 'zongzi', 'leaf', 'cloud'],
    'qixi': ['bird', 'moon', 'sparkle', 'star'],
    'mid-autumn': ['moon', 'mooncake', 'rabbit', 'flower'],
    'double-ninth': ['chrysanthemum', 'cup', 'mountain', 'leaf'],
    'national-day': ['flag', 'star', 'sparkle', 'sun'],
    'qingming': ['kite', 'willow', 'leaf', 'cloud'],
    'new-year': ['balloon', 'sparkle', 'star', 'firecracker'],
    'christmas': ['tree', 'snowflake', 'gift', 'bell'],
    'thanksgiving': ['corn', 'leaf', 'heart', 'sun'],
    'halloween': ['pumpkin', 'bat', 'ghost', 'candle'],
    'valentines': ['heart', 'flower', 'star', 'balloon'],
    'easter': ['egg', 'rabbit', 'flower', 'sparkle'],
    'mothers-day': ['flower', 'heart', 'sparkle', 'sun'],
    'fathers-day': ['watch', 'gift', 'book', 'star'],
    'water-splashing': ['waterdrop', 'flower', 'flower-drum', 'sparkle'],
    'torch-festival': ['torch', 'star', 'sparkle', 'candle'],
    'san-yue-san': ['flower-drum', 'flower', 'kite', 'sun'],
    'naadam': ['horse', 'flag', 'sun', 'mountain'],
    'shoton': ['prayer-wheel', 'mountain', 'sun', 'cloud'],
    'eid-fitr': ['crescent', 'moon', 'star', 'sparkle'],
    'eid-al-adha': ['crescent', 'sun', 'star', 'sparkle'],
    'birthday': ['candle', 'balloon', 'gift', 'star', 'heart'],
    'love-anniversary': ['heart', 'flower', 'star', 'balloon'],
    'engagement': ['heart', 'sparkle', 'flower', 'cup'],
    'wedding-anniversary': ['heart', 'sparkle', 'bell', 'flower', 'cup'],
    'newborn': ['star', 'cloud', 'heart', 'bird', 'sparkle'],
    'full-moon': ['moon', 'star', 'cloud', 'rabbit'],
    'hundred-day': ['egg', 'gift', 'heart', 'star', 'sparkle'],
    'first-birthday': ['gift', 'balloon', 'star', 'heart'],
    'graduation': ['book', 'star', 'flower', 'sun'],
    'school-admission': ['book', 'star', 'sun', 'sparkle'],
    'promotion': ['star', 'sun', 'sparkle', 'gift'],
    'new-home': ['tree', 'flower', 'sun', 'lantern'],
    'business-opening': ['firecracker', 'ingot', 'lantern', 'star'],
    'retirement': ['flower', 'cup', 'sun', 'mountain'],
    'default': ['star', 'sparkle', 'heart', 'moon']
  };

  window.FestivalIcons = {
    sets: SETS,
    img: function (name) { return '/elements/' + name + '.png'; }
  };
})();
