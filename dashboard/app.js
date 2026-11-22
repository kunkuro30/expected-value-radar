// Expected-Value Radar's dashboard. It reads window.RADAR (written beside dashboard/ by
// main.ts) and renders the ranked board, its filters, a per-protocol detail drawer and
// the live peer reference. The drawer recomputes each row's expected value from the
// row's own published parts (TVL x category multiple x size adjustment = launch value;
// launch value x odds = expected value), so the page and board.json are visibly the
// same arithmetic. No network: every byte it shows is in data.js.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('app');
  var params = new URLSearchParams(location.search);
  var state = {
    q: params.get('q') || '',
    category: params.get('category') || 'all',
    verdict: params.get('verdict') || 'all',
    wl: params.get('wl') === '1',
    tab: params.get('tab') || 'board',
    sort: params.get('sort') || 'rank',
    dir: 1,
    selected: params.get('detail') || null,
  };

  var usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd0.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  var V = DATA.validation;
  var C = DATA.counts;
  var S = V.shipped;
  var O = V.odds;

  // --- header ---------------------------------------------------------------
  var header = el('header', { class: 'top' },
    el('h1', null, 'EXPECTED-VALUE ', el('span', { class: 'x', text: 'RADAR' })),
    el('p', { class: 'tagline', text: 'Every pre-token protocol in the snapshot, ranked by what farming it is worth in expectation: a fitted launch price — what a token would be worth if it came — times fitted odds that one ever comes. Both models are fitted on the snapshot\u2019s own figures and graded below, on this page, before the board they produced.' }),
    el('div', { class: 'meta', text: 'model ' + DATA.version + ' · snapshot ' + DATA.as_of + ' · ' + C.protocols + ' protocols · ' + C.pretoken + ' record no token · board ranks by expected value = launch value \u00d7 odds' })
  );

  // --- the proof strip: the models grading themselves, on frame one ---------
  function proofCell(k, v, small, s) {
    var val = el('div', { class: 'v' }, v);
    if (small) val.appendChild(el('small', { text: ' ' + small }));
    return el('div', { class: 'cell' },
      el('div', { class: 'k', text: k }), val,
      el('div', { class: 's', text: s }));
  }
  var strip = el('section', { class: 'strip' },
    proofCell('Price error, leave-one-out', S.loo.toFixed(3), 'median |log10|',
      'flat baseline ' + S.baselineLoo.toFixed(3) + ' · within 2\u00d7 on ' + Math.round(S.within2x * 100) + '% of ' + V.peers + ' peers priced blind'),
    proofCell('Price error, time split', S.half.toFixed(3), 'older fits, newer priced',
      'flat baseline ' + S.baselineHalf.toFixed(3) + ' · the second holdout: a term ships only if it wins on both'),
    proofCell('Odds skill, held out', O.brier.toFixed(3), 'Brier score',
      'base rate ' + O.baseBrier.toFixed(3) + ' · AUC ' + O.auc.toFixed(3) + ' · fitted on ' + O.trainedOn + ' dated protocols, graded on ' + O.testOn + ' later ones'),
    proofCell('Universe accounted for', String(C.protocols), 'protocols',
      C.trading + ' already trade · ' + C.board + ' ranked here · ' + C.set_aside + ' set aside by the screen (' + C.set_aside_wrapper + ' of them wrapper, bridge or staking categories)'),
    proofCell('Worst miss, unsmoothed', S.worst.name + ' \u00d7' + S.worst.factor, null,
      'the model ' + (S.worst.direction === 'under' ? 'under' : 'over') + '-priced it on leave-one-out — read the rank ranges, not the points'),
    proofCell('Farm verdicts on this board', C.verdicts.FARM + ' FARM', null,
      C.verdicts.THIN + ' THIN · ' + C.verdicts.SKIP + ' SKIP · FARM needs $1M+ of expected value, 10%+ odds and 1,000\u00d7 the plan\u2019s all-in cost; THIN the same at $250K, 4% and 100\u00d7')
  );

  // --- the term table ---------------------------------------------------------
  var termBody = el('tbody');
  V.terms.forEach(function (t) {
    termBody.appendChild(el('tr', null,
      el('td', { text: t.model }),
      el('td', { class: 'num', text: t.loo.toFixed(3) }),
      el('td', { class: 'num', text: t.half.toFixed(3) }),
      el('td', null, el('span', { class: 'chip ' + t.verdict, text: t.verdict.toUpperCase() })),
      el('td', { class: 'note', text: t.note })));
  });
  termBody.appendChild(el('tr', null,
    el('td', { text: 'Odds = logistic on tokenless age, size and growth (multiplies the price)' }),
    el('td', { class: 'num', text: O.brier.toFixed(3) + ' Brier' }),
    el('td', { class: 'num', text: 'AUC ' + O.auc.toFixed(3) }),
    el('td', null, el('span', { class: 'chip kept', text: 'KEPT' })),
    el('td', { class: 'note', text: 'beats the base rate held out; age moves whether a launch comes, not what it is worth — so it lives here, not in the price' })));
  var terms = el('section', { class: 'terms' },
    el('h2', { text: 'Every term, tested twice — the ones that failed are out' }),
    el('table', null,
      el('thead', null, el('tr', null,
        el('th', { text: 'Candidate model' }),
        el('th', { class: 'num', text: 'Leave-one-out' }),
        el('th', { class: 'num', text: 'Time split' }),
        el('th', { text: 'Verdict' }),
        el('th', { text: 'Why' }))),
      termBody));

  // --- controls ---------------------------------------------------------------
  var search = el('input', { type: 'search', placeholder: 'Search protocols', value: state.q, 'aria-label': 'Search protocols' });
  search.addEventListener('input', function () { state.q = search.value; renderTable(); });
  var catSel = el('select', { 'aria-label': 'Category' });
  catSel.appendChild(el('option', { value: 'all', text: 'All categories' }));
  var cats = [];
  DATA.rows.forEach(function (r) { var c = r.category || 'Uncategorized'; if (cats.indexOf(c) < 0) cats.push(c); });
  cats.sort().forEach(function (c) { catSel.appendChild(el('option', { value: c, text: c })); });
  catSel.value = state.category;
  catSel.addEventListener('change', function () { state.category = catSel.value; renderTable(); });
  var verSel = el('select', { 'aria-label': 'Farm verdict' });
  [['all', 'All verdicts'], ['FARM', 'FARM'], ['THIN', 'THIN'], ['SKIP', 'SKIP']].forEach(function (pair) {
    verSel.appendChild(el('option', { value: pair[0], text: pair[1] }));
  });
  verSel.value = state.verdict;
  verSel.addEventListener('change', function () { state.verdict = verSel.value; renderTable(); });
  var wlBox = el('input', { type: 'checkbox' });
  wlBox.checked = state.wl;
  wlBox.addEventListener('change', function () { state.wl = wlBox.checked; renderTable(); });
  var tabBoard = el('button', { text: 'Pre-token board', onclick: function () { state.tab = 'board'; renderTable(); } });
  var tabLive = el('button', { text: 'Already trading', onclick: function () { state.tab = 'live'; renderTable(); } });
  var controls = el('div', { class: 'controls' },
    search, catSel, verSel,
    el('label', null, wlBox, ' watchlist only'),
    el('span', { class: 'tabs' }, tabBoard, tabLive));

  // --- tables -------------------------------------------------------------------
  var boardWrap = el('section', { class: 'boardwrap', id: 'board' });
  var drawerSlot = el('div');

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.wl && !r.watchlist) return false;
      if (state.category !== 'all' && (r.category || 'Uncategorized') !== state.category) return false;
      if (state.verdict !== 'all' && r.plan.verdict !== state.verdict) return false;
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.indexOf(q) < 0) return false;
      return true;
    });
  }
  function sortedRows(rows) {
    var key = state.sort;
    var val = function (r) {
      if (key === 'tvl') return r.tvl_usd;
      if (key === 'change') return r.change_7d === null ? -1e9 : r.change_7d;
      if (key === 'age') return r.age_days === null ? -1 : r.age_days;
      if (key === 'launch') return r.launch_value_usd;
      if (key === 'odds') return r.odds;
      if (key === 'expected') return r.implied_value_usd;
      return r.rank;
    };
    return rows.slice().sort(function (a, b) {
      var d;
      if (key === 'name') d = a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0;
      else if (key === 'rank') d = a.rank - b.rank;
      else d = val(b) - val(a);
      if (d === 0) d = a.rank - b.rank;
      return state.dir * d;
    });
  }
  function sortHead(label, key) {
    var th = el('th', { class: key === 'name' || key === 'rank' ? '' : 'num', text: label + (state.sort === key ? (state.dir > 0 ? ' \u25b2' : ' \u25bc') : '') });
    th.addEventListener('click', function () {
      if (state.sort === key) state.dir = -state.dir;
      else { state.sort = key; state.dir = 1; }
      renderTable();
    });
    return th;
  }
  function boardTable() {
    var rows = sortedRows(filtered());
    var table = el('table', null,
      el('thead', null, el('tr', null,
        sortHead('#', 'rank'), sortHead('Protocol', 'name'),
        el('th', { text: 'Category' }), el('th', { text: 'Chain' }),
        sortHead('TVL', 'tvl'), sortHead('7d', 'change'), sortHead('Age', 'age'),
        sortHead('Launch value', 'launch'), sortHead('Odds', 'odds'), sortHead('Expected', 'expected'),
        el('th', { class: 'num', text: 'Range' }), el('th', { text: 'Verdict' }))),
      el('tbody'));
    var body = table.querySelector('tbody');
    if (rows.length === 0) {
      body.appendChild(el('tr', null, el('td', { class: 'empty', colspan: '12', text: 'No protocol matches these filters.' })));
    }
    rows.forEach(function (r) {
      var tr = el('tr', { class: state.selected === r.slug ? 'sel' : '' },
        el('td', { class: 'num', text: String(r.rank) }),
        el('td', { class: 'name' }, r.name, el('span', { class: 'sub', text: r.slug + (r.watchlist ? ' · watchlist' : '') })),
        el('td', { text: r.category || 'Uncategorized' }),
        el('td', { text: r.chains[0] || '—' }),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num', text: fmtPct(r.change_7d) }),
        el('td', { class: 'num', text: fmtAge(r.age_days) }),
        el('td', { class: 'num', text: fmtUsd(r.launch_value_usd) }),
        el('td', { class: 'num', text: Math.round(r.odds * 100) + '%' }),
        el('td', { class: 'num', text: fmtUsd(r.implied_value_usd) }),
        el('td', { class: 'num', text: r.rank_lo + '–' + r.rank_hi }),
        el('td', null, el('span', { class: 'verdict ' + r.plan.verdict, text: r.plan.verdict })));
      tr.addEventListener('click', function () { state.selected = r.slug; renderTable(); });
      body.appendChild(tr);
    });
    return table;
  }
  function liveTable() {
    var table = el('table', null,
      el('thead', null, el('tr', null,
        el('th', { text: 'Protocol' }), el('th', { text: 'Category' }),
        el('th', { class: 'num', text: 'TVL' }), el('th', { class: 'num', text: 'Market cap' }),
        el('th', { class: 'num', text: 'Cap / TVL' }), el('th', { class: 'num', text: 'Priced blind (LOO)' }),
        el('th', { class: 'num', text: 'Miss' }))),
      el('tbody'));
    var body = table.querySelector('tbody');
    DATA.live.forEach(function (r) {
      body.appendChild(el('tr', null,
        el('td', { class: 'name' }, r.name + (r.symbol ? ' (' + r.symbol + ')' : '')),
        el('td', { text: r.category || 'Uncategorized' }),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num', text: fmtUsd(r.mcap_usd) }),
        el('td', { class: 'num', text: r.ratio === null ? 'n/a' : r.ratio.toFixed(2) + '\u00d7' }),
        el('td', { class: 'num', text: r.blind_usd === null ? '—' : fmtUsd(r.blind_usd) }),
        el('td', { class: 'num', text: r.blind_factor === null ? '—' : '\u00d7' + r.blind_factor })));
    });
    return table;
  }

  // --- the detail drawer ---------------------------------------------------------
  function drawer(row) {
    var recomputed = Math.round(row.tvl_usd * row.multiple * row.adjustment);
    var expected = Math.round(recomputed * row.odds);
    var steps = el('ol');
    row.farm_steps.forEach(function (s) { steps.appendChild(el('li', { text: s })); });
    return el('section', { class: 'drawer' },
      el('button', { class: 'x', text: '\u00d7', onclick: function () { state.selected = null; renderTable(); } }),
      el('h3', { text: row.name }),
      el('div', { class: 'sub', text: (row.category || 'Uncategorized') + ' · ' + (row.chains.join(', ') || 'no chain listed') + ' · ' + row.slug + (row.watchlist ? ' · on the house watchlist' : ' · below the watchlist floor, found by the radar') + ' · rank ' + row.rank + ' of ' + DATA.rows.length + ', range ' + row.rank_lo + '–' + row.rank_hi + ' across 150 pricing refits' }),
      el('div', { class: 'arith', text: 'TVL ' + fmtUsd(row.tvl_usd) + ' \u00d7 category multiple ' + row.multiple.toFixed(3) + ' \u00d7 size adjustment ' + row.adjustment.toFixed(3) + ' = launch value ' + fmtUsd(recomputed) + ' · \u00d7 odds ' + Math.round(row.odds * 100) + '% = expected ' + fmtUsd(expected) }),
      el('div', { class: 'sub', text: 'Odds from the record: a protocol of this age (' + fmtAge(row.age_days) + '), size and seven-day growth (' + fmtPct(row.change_7d) + ') carries fitted odds of ' + Math.round(row.odds * 100) + '% of ever listing a token.' }),
      el('h4', { text: 'Farm plan — ' + row.plan.verdict }),
      el('div', { class: 'planline', text: 'capital $' + row.plan.capital_usd + ' · hold ' + row.plan.hold_days + ' days · all-in cost $' + row.plan.cost_usd.toFixed(2) + ' (steps plus 5%/yr lockup) · ' + row.plan.minutes + ' minutes of work · expected value ' + fmtUsd(row.implied_value_usd) + ' = ' + Math.round(row.implied_value_usd / Math.max(1, row.plan.cost_usd)).toLocaleString('en-US') + '\u00d7 the plan\u2019s cost' }),
      steps);
  }

  function renderTable() {
    tabBoard.className = state.tab === 'board' ? 'on' : '';
    tabLive.className = state.tab === 'live' ? 'on' : '';
    boardWrap.textContent = '';
    boardWrap.appendChild(el('h2', { text: state.tab === 'board' ? 'The board — pre-token protocols by expected value' : 'Already trading — the peers the price was learned from, each priced blind' }));
    boardWrap.appendChild(state.tab === 'board' ? boardTable() : liveTable());
    drawerSlot.textContent = '';
    if (state.tab === 'board' && state.selected) {
      DATA.rows.forEach(function (r) { if (r.slug === state.selected) drawerSlot.appendChild(drawer(r)); });
    }
  }

  var foot = el('p', { class: 'foot', text: 'Method, in one breath: the price is TVL \u00d7 a shrunk category median of market cap / TVL over ' + V.peers + ' traded launch-type peers, adjusted by a robust size slope; the odds are a logistic fit on ' + O.trainedOn + ' dated protocols (age ' + (O.coef[1] >= 0 ? '+' : '') + O.coef[1].toFixed(2) + '/yr, size ' + (O.coef[2] >= 0 ? '+' : '') + O.coef[2].toFixed(2) + '/log10 TVL, growth ' + (O.coef[3] >= 0 ? '+' : '') + O.coef[3].toFixed(2) + '/10pts). Rank ranges come from 150 bootstrap refits of the peer set with the odds held at their full fit. Implied values are this entry\u2019s own claims, computed from the sealed snapshot alone; a protocol records no token — the snapshot does not prove it has none.' });

  app.appendChild(header);
  app.appendChild(strip);
  app.appendChild(terms);
  app.appendChild(controls);
  app.appendChild(drawerSlot);
  app.appendChild(boardWrap);
  app.appendChild(foot);
  app.setAttribute('aria-busy', 'false');
  renderTable();
})();
