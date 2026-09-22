/* 节日日期智能检测：按用户本地当前日期，检测「今日节日 / 近期将至节日」。
 * 农历使用浏览器内置 ICU 中文农历（ca-chinese），闰月可识别；
 * 公历固定日、清明区间、复活节、某月第 N 个周 X 直接计算。 */
(function () {
  'use strict';

  var DAY_MS = 86400000;
  var lunarFmt = null;
  var islamicFmt = null;

  function getLunarFmt() {
    if (!lunarFmt) {
      lunarFmt = new Intl.DateTimeFormat('en-u-ca-chinese', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
    }
    return lunarFmt;
  }

  function getIslamicFmt() {
    if (!islamicFmt) {
      islamicFmt = new Intl.DateTimeFormat('en-u-ca-islamic', {
        month: 'numeric',
        day: 'numeric'
      });
    }
    return islamicFmt;
  }

  // 公历 Date -> 农历 {month, day, isLeap}
  function solarToLunar(date) {
    var parts = {};
    getLunarFmt().formatToParts(date).forEach(function (p) {
      parts[p.type] = p.value;
    });
    var month = parts.month;
    var isLeap = false;
    if (typeof month === 'string' && month.slice(-3) === 'bis') {
      isLeap = true;
      month = month.slice(0, -3);
    }
    return { month: parseInt(month, 10), day: parseInt(parts.day, 10), isLeap: isLeap };
  }

  // 公历 Date -> 伊斯兰历 {month, day}
  function solarToIslamic(date) {
    var parts = {};
    getIslamicFmt().formatToParts(date).forEach(function (p) {
      parts[p.type] = p.value;
    });
    return { month: parseInt(parts.month, 10), day: parseInt(parts.day, 10) };
  }

  // 复活节（格里高利 computus，Meeus/Jones/Butcher）
  function easterDate(year) {
    var a = year % 19;
    var b = Math.floor(year / 100);
    var c = year % 100;
    var d = Math.floor(b / 4);
    var e = b % 4;
    var f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4);
    var k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31);
    var day = ((h + l - 7 * m + 114) % 31) + 1;
    return { month: month, day: day };
  }

  // 某年某月第 nth 个 weekday（0=周日）
  function nthWeekdayDate(year, month, weekday, nth) {
    var first = new Date(year, month - 1, 1).getDay();
    var day = 1 + ((weekday - first + 7) % 7) + (nth - 1) * 7;
    return { month: month, day: day };
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function diffDays(from, to) {
    var a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
    var b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.round((b - a) / DAY_MS);
  }

  // 节日在 year 年的公历出现日期（农历类型走扫描，不在此处理）
  function occurrencesInYear(match, y) {
    switch (match.type) {
      case 'solar':
        return [new Date(y, match.month - 1, match.day)];
      case 'solar-range':
        return match.days.map(function (d) { return new Date(y, match.month - 1, d); });
      case 'easter': {
        var e = easterDate(y);
        return [new Date(y, e.month - 1, e.day)];
      }
      case 'nth-weekday': {
        var d = nthWeekdayDate(y, match.month, match.weekday, match.nth);
        return [new Date(y, d.month - 1, d.day)];
      }
      default:
        return [];
    }
  }

  // 扫描未来 410 天（覆盖一个完整农历/伊斯兰历周期），建立「月-日 -> 最近公历日期」表
  function buildCalWindow(today, toCal, isValid) {
    var map = new Map();
    for (var i = 0; i < 410; i++) {
      var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      var lp;
      try {
        lp = toCal(d);
      } catch (err) {
        return null;
      }
      if (lp.month > 0 && (!isValid || isValid(lp))) {
        var key = lp.month + '-' + lp.day;
        if (!map.has(key)) map.set(key, d);
      }
    }
    return map;
  }

  // 挑选应景节日：
  // 今天恰逢节日 -> {mode:'today', selectId}
  // 未来 windowDays 天内最近的节日 -> {mode:'upcoming', selectId, daysUntil}
  // 否则 -> {mode:'none', selectId:null, next: 下一个最近的节日}
  function findActiveFestival(festivals, now, windowDays) {
    if (windowDays == null) windowDays = 7;
    var today = startOfDay(now);
    var hasLunar = false;
    var hasIslamic = false;
    for (var i = 0; i < festivals.length; i++) {
      var mt = festivals[i].match && festivals[i].match.type;
      if (mt === 'lunar') hasLunar = true;
      if (mt === 'islamic') hasIslamic = true;
      if (hasLunar && hasIslamic) break;
    }
    var lunarMap = hasLunar ? buildCalWindow(today, solarToLunar, function (lp) { return !lp.isLeap; }) : null;
    var islamicMap = hasIslamic ? buildCalWindow(today, solarToIslamic) : null;
    var next = null;

    for (var fi = 0; fi < festivals.length; fi++) {
      var f = festivals[fi];
      if (!f.match) continue;
      var cand = null;

      if (f.match.type === 'lunar') {
        if (!lunarMap) continue;
        var hit = lunarMap.get(f.match.month + '-' + f.match.day);
        if (hit) cand = { daysUntil: diffDays(today, hit), date: hit };
      } else if (f.match.type === 'islamic') {
        if (!islamicMap) continue;
        var ihit = islamicMap.get(f.match.month + '-' + f.match.day);
        if (ihit) cand = { daysUntil: diffDays(today, ihit), date: ihit };
      } else {
        var years = [today.getFullYear(), today.getFullYear() + 1];
        for (var yi = 0; yi < years.length; yi++) {
          var occs = occurrencesInYear(f.match, years[yi]);
          for (var oi = 0; oi < occs.length; oi++) {
            var du = diffDays(today, occs[oi]);
            if (du < 0) continue;
            if (!cand || du < cand.daysUntil) cand = { daysUntil: du, date: occs[oi] };
          }
        }
      }

      if (!cand) continue;
      if (cand.daysUntil === 0) {
        return {
          mode: 'today',
          daysUntil: 0,
          selectId: f.id,
          next: { id: f.id, name: f.name, daysUntil: 0, date: today }
        };
      }
      if (!next || cand.daysUntil < next.daysUntil) {
        next = { id: f.id, name: f.name, daysUntil: cand.daysUntil, date: cand.date };
      }
    }

    if (next && next.daysUntil <= windowDays) {
      return { mode: 'upcoming', daysUntil: next.daysUntil, selectId: next.id, next: next };
    }
    return { mode: 'none', daysUntil: next ? next.daysUntil : null, selectId: null, next: next };
  }

  window.FestivalDate = {
    findActiveFestival: findActiveFestival,
    solarToLunar: solarToLunar,
    solarToIslamic: solarToIslamic,
    easterDate: easterDate
  };
})();
