/* Factory books: shared code for books.html (accountant) and books-admin.html (manager). */
(function () {
  "use strict";
  const C = window.FACTORY_CONFIG || {};
  const ok = C.SUPABASE_URL && !/PASTE/.test(C.SUPABASE_URL) && C.SUPABASE_ANON_KEY && !/PASTE/.test(C.SUPABASE_ANON_KEY);
  const sb = ok && window.supabase ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;

  const pad = n => String(n).padStart(2, "0");
  const dayKey = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const today = () => dayKey(new Date());
  const addDays = (k, n) => { const d = new Date(k + "T00:00"); d.setDate(d.getDate() + n); return dayKey(d); };
  const monthStart = k => k.slice(0, 8) + "01";
  const num = v => Number(v) || 0;
  const r3 = v => Math.round(num(v) * 1000) / 1000;
  const money = (v, d = 3) => { if (v == null || v === "" || !isFinite(v)) return "–"; let x = Number(v); if (Math.abs(x) < 0.0005) x = 0;
    return x.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); };
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const TYPES = {
    sale: { ar: "مبيعات", en: "Sale" },
    sales_return: { ar: "مرتجع مبيعات", en: "Sales return" },
    collection: { ar: "تحصيل من عميل", en: "Customer payment" },
    customer_discount: { ar: "خصم لعميل", en: "Customer discount" },
    purchase: { ar: "مشتريات", en: "Purchase" },
    expense: { ar: "مصروف", en: "Expense" },
    supplier_payment: { ar: "دفعة لمورد", en: "Supplier payment" },
    other_income: { ar: "إيراد آخر", en: "Other income" },
    bank_deposit: { ar: "إيداع في البنك", en: "Bank deposit" },
    cash_withdrawal: { ar: "سحب من البنك", en: "Bank withdrawal" },
    cheque_collected: { ar: "تحصيل شيك", en: "Cheque cashed" },
    cheque_cleared: { ar: "صرف شيك صادر", en: "Our cheque cleared" },
    owner_in: { ar: "إيداع من الشريك", en: "Owner put in" },
    owner_out: { ar: "سحب للشريك", en: "Owner took out" },
    opening: { ar: "أرصدة افتتاحية", en: "Opening balances" },
    cheque_bounced: { ar: "شيك مرتجع", en: "Bounced cheque" },
    cheque_cancelled: { ar: "إلغاء شيك صادر", en: "Our cheque cancelled" },
    cash_short: { ar: "عجز في الصندوق", en: "Cash short" },
    cash_over: { ar: "زيادة في الصندوق", en: "Cash over" },
    advance: { ar: "سلفة لموظف", en: "Employee advance" },
    advance_return: { ar: "استرداد سلفة", en: "Advance repaid" },
    custody_out: { ar: "عهدة لموظف", en: "Custody given" },
    custody_return: { ar: "إرجاع عهدة", en: "Custody returned" },
    salary_payment: { ar: "دفع رواتب", en: "Salaries paid" },
    ss_payment: { ar: "دفع الضمان الاجتماعي", en: "Social security paid" },
    tax_payment: { ar: "دفع ضريبة", en: "Tax paid" },
    payroll: { ar: "رواتب الشهر", en: "Monthly payroll" },
    inventory_adjust: { ar: "تسوية المخزون", en: "Stock adjustment" },
    tax_close: { ar: "مقاصة ضريبة المبيعات", en: "Sales tax offset" },
    prepaid_expense: { ar: "مصروف مدفوع مقدماً", en: "Prepaid cost" },
    accrual: { ar: "مصروف مستحق (لم تصل فاتورته)", en: "Accrued cost" },
    bad_debt_writeoff: { ar: "شطب دين معدوم", en: "Bad debt write off" },
    eos_payment: { ar: "دفع مكافأة نهاية خدمة", en: "End of service paid" },
    depreciation: { ar: "استهلاك الأصول", en: "Depreciation" },
    prepaid_amort: { ar: "تحميل مصاريف مقدمة", en: "Prepaid spread" },
    accrual_reversal: { ar: "عكس مصاريف مستحقة", en: "Accrual reversed" },
    provision: { ar: "تعديل مخصص", en: "Provision" },
    year_close: { ar: "إقفال السنة", en: "Year close" },
    asset_disposal: { ar: "استبعاد أصل", en: "Asset sold or scrapped" },
    purchase_return: { ar: "مرتجع مشتريات لمورد", en: "Return to supplier" },
    import_cost: { ar: "تكاليف استيراد (جمارك وشحن)", en: "Import costs" },
    loan_received: { ar: "استلام قرض", en: "Loan received" },
    loan_payment: { ar: "قسط قرض", en: "Loan installment" },
    lc_margin: { ar: "هامش اعتماد أو كفالة", en: "LC or guarantee margin" },
    lc_margin_return: { ar: "استرداد هامش", en: "Margin released" },
    fx_revaluation: { ar: "إعادة تقييم العملات", en: "Currency revaluation" },
  };
  const CHQ = {
    held: { ar: "في الصندوق", sev: "warn" }, deposited: { ar: "مودع بانتظار التحصيل", sev: "warn" },
    issued: { ar: "صادر لم يُصرف", sev: "warn" }, cleared: { ar: "تم", sev: "good" }, bounced: { ar: "مرتجع", sev: "bad" },
    cancelled: { ar: "ملغى", sev: "" }, void: { ar: "ملغى بعكس القيد", sev: "" },
  };
  // which register action each story type means, and which cheques it can apply to
  const CHQ_ACTIONS = {
    cheque_deposited: { dir: "in", action: "deposit", from: ["held"], ar: "إيداع الشيك في البنك" },
    cheque_collected: { dir: "in", action: "clear", from: ["held", "deposited"], ar: "تحصيل الشيك" },
    cheque_bounced: { dir: "in", action: "bounce", from: ["held", "deposited"], ar: "شيك مرتجع", note: true },
    cheque_cleared: { dir: "out", action: "clear", from: ["issued"], ar: "صرف شيكنا" },
    cheque_cancelled: { dir: "out", action: "cancel", from: ["issued"], ar: "إلغاء شيكنا", note: true },
  };
  const METHODS = { cash: "نقداً", bank: "تحويل بنكي", cheque: "شيك", credit: "آجل (على الحساب)", custody: "من عهدة موظف" };
  const DOCS = { receipt: "سند قبض", payment: "سند صرف", invoice: "فاتورة مبيعات", journal: "قيد" };
  const STATUS = { posted: "مسجّل", pending: "بانتظار موافقة المدير", rejected: "مرفوض", reversed: "معكوس" };
  // which fields each type needs
  const NEEDS = {
    sale: { party: "customer", methods: ["cash", "bank", "cheque", "credit"], tax: true, fx: true },
    sales_return: { party: "customer", methods: ["cash", "bank", "cheque", "credit"], tax: true },
    collection: { party: "customer", req: true, methods: ["cash", "bank", "cheque"], fx: true },
    customer_discount: { party: "customer", req: true, methods: [] },
    purchase: { party: "supplier", methods: ["cash", "bank", "cheque", "credit", "custody"], tax: true, cat: "purchase", fx: true },
    expense: { party: "supplier", methods: ["cash", "bank", "cheque", "credit", "custody"], tax: true, cat: "expense" },
    advance: { party: "employee", req: true, methods: ["cash", "bank"] },
    advance_return: { party: "employee", req: true, methods: ["cash", "bank"] },
    custody_out: { party: "employee", req: true, methods: ["cash", "bank"] },
    custody_return: { party: "employee", req: true, methods: ["cash", "bank"] },
    salary_payment: { party: "employee", methods: ["cash", "bank", "cheque"] },
    ss_payment: { methods: ["cash", "bank", "cheque"] },
    tax_payment: { methods: ["cash", "bank", "cheque"], cat: "tax" },
    prepaid_expense: { party: "supplier", methods: ["cash", "bank", "cheque", "credit"], tax: true, cat: "expense", months: true },
    accrual: { party: "supplier", methods: [], cat: "expense" },
    bad_debt_writeoff: { party: "customer", req: true, methods: [] },
    eos_payment: { party: "employee", req: true, methods: ["cash", "bank", "cheque"] },
    purchase_return: { party: "supplier", methods: ["cash", "bank", "cheque", "credit"], tax: true, cat: "purchase" },
    import_cost: { party: "supplier", methods: ["cash", "bank", "cheque", "credit"], tax: true, cat: "purchase", po: true },
    loan_received: { methods: ["bank", "cash"], loan: true },
    loan_payment: { methods: ["bank", "cash", "cheque"], loan: true, principal: true },
    lc_margin: { methods: ["bank", "cash"] },
    lc_margin_return: { methods: ["bank", "cash"] },
    supplier_payment: { party: "supplier", req: true, methods: ["cash", "bank", "cheque"], fx: true },
    other_income: { methods: ["cash", "bank", "cheque"], tax: true },
    bank_deposit: { methods: [] }, cash_withdrawal: { methods: [] },
    owner_in: { methods: ["cash", "bank", "cheque"] }, owner_out: { methods: ["cash", "bank", "cheque"] },
  };
  const MONEY_OUT = ["expense", "purchase", "supplier_payment", "owner_out", "sales_return", "advance", "custody_out", "salary_payment", "ss_payment", "tax_payment", "prepaid_expense", "eos_payment", "import_cost", "loan_payment", "lc_margin"];
  // why an entry was held or marked for the manager
  const FLAGS = {
    over_limit: { ar: "أكبر من حد الموافقة", sev: "warn" },
    backdated: { ar: "بتاريخ قديم", sev: "warn" },
    negative_cash: { ar: "الصندوق سيصبح سالباً", sev: "bad" },
    duplicate_confirmed: { ar: "مشابه لقيد سابق (أكّده المحاسب)", sev: "warn" },
    duplicate_receipt: { ar: "نفس صورة إيصال سابق", sev: "bad" },
    new_party: { ar: "اسم عميل أو مورد جديد", sev: "warn" },
    bounced: { ar: "شيك مرتجع", sev: "bad" },
    cash_difference: { ar: "فرق عند عدّ الصندوق", sev: "bad" },
    custody_exceeded: { ar: "أكثر من العهدة المتاحة", sev: "bad" },
    payroll: { ar: "رواتب", sev: "warn" },
    no_po: { ar: "شراء بدون أمر شراء", sev: "warn" },
    po_mismatch: { ar: "الفاتورة لا تطابق المستلم", sev: "bad" },
    not_received: { ar: "فاتورة قبل استلام البضاعة", sev: "bad" },
    credit_limit: { ar: "تجاوز حد الائتمان", sev: "bad" },
    customer_overdue: { ar: "عميل متأخر بالدفع", sev: "bad" },
    write_off: { ar: "شطب دين", sev: "bad" },
    auto: { ar: "قيد آلي", sev: "" },
    erp_import: { ar: "من تقرير النظام القديم", sev: "" },
    inventory: { ar: "جرد المخزون", sev: "warn" },
  };
  const flagPills = f => (f || []).map(k => FLAGS[k] ? `<span class="pill ${FLAGS[k].sev}">${FLAGS[k].ar}</span>` : "").join(" ");
  // a fingerprint of a receipt file, so the same photo can be recognized later
  async function fileHash(blob) {
    const buf = await blob.arrayBuffer(); const h = await crypto.subtle.digest("SHA-256", buf);
    return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  /* ---------- amounts in Arabic words ---------- */
  const ONES = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const TEENS = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const HUNDREDS = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
  function under1000(n) {
    const h = Math.floor(n / 100), r = n % 100, parts = [];
    if (h) parts.push(HUNDREDS[h]);
    if (r) {
      if (r < 10) parts.push(ONES[r]);
      else if (r < 20) parts.push(TEENS[r - 10]);
      else { const o = r % 10, t = Math.floor(r / 10); parts.push(o ? `${ONES[o]} و${TENS[t]}` : TENS[t]); }
    }
    return parts.join(" و");
  }
  function scale(n, one, two, few, many) {
    if (n === 1) return one; if (n === 2) return two;
    if (n >= 3 && n <= 10) return `${under1000(n)} ${few}`;
    return `${under1000(n)} ${many}`;
  }
  function intWords(n) {
    if (n === 0) return "صفر";
    const m = Math.floor(n / 1e6), t = Math.floor((n % 1e6) / 1000), r = n % 1000, parts = [];
    if (m) parts.push(scale(m, "مليون", "مليونان", "ملايين", "مليون"));
    if (t) parts.push(scale(t, "ألف", "ألفان", "آلاف", "ألف"));
    if (r) parts.push(under1000(r));
    return parts.join(" و");
  }
  function amountWords(v) {
    const total = Math.round(Math.abs(num(v)) * 1000), jd = Math.floor(total / 1000), fils = total % 1000;
    let s = "فقط " + (jd ? `${intWords(jd)} دينار أردني` : "");
    if (fils) s += (jd ? " و" : "") + `${intWords(fils)} فلس`;
    if (!jd && !fils) s += "صفر دينار أردني";
    return s + " لا غير";
  }

  /* ---------- data ---------- */
  // Load every row, 1,000 at a time (the server's page size). Never stops early: a report must never use part of the data.
  // build() must order by a unique column so pages don't overlap.
  async function pageAll(build, max = Infinity) {
    const first = await build().range(0, 999);
    if (first.error) throw first.error;
    let out = first.data || [];
    if (out.length < 1000 || out.length >= max) return out;
    const total = typeof first.count === "number" ? Math.min(first.count, max) : null;
    if (total != null) {
      // we know how many rows there are: fetch the remaining pages a few at a time, in parallel
      const starts = []; for (let f = 1000; f < total; f += 1000) starts.push(f);
      for (let i = 0; i < starts.length; i += 6) {
        const res = await Promise.all(starts.slice(i, i + 6).map(f => build().range(f, f + 999)));
        for (const r of res) { if (r.error) throw r.error; out = out.concat(r.data || []); }
      }
      return out;
    }
    for (let from = 1000; ; from += 1000) {
      const { data, error } = await build().range(from, from + 999);
      if (error) throw error;
      out = out.concat(data || []);
      if (!data || data.length < 1000 || out.length >= max) break;
    }
    return out;
  }
  // The ledger is kept in memory and only new lines are fetched afterwards (posted lines never change).
  const LC = { rows: [], ids: new Set(), maxId: 0, p: null };
  const byDateNo = (a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.no - b.no) || (a.id - b.id);
  function ledgerAll() {
    if (LC.p) return LC.p;
    LC.p = (async () => {
      // look back a little before the last id we hold, in case a line was written just as we read
      const since = Math.max(0, LC.maxId - 500);
      const fresh = await pageAll(() => sb.from("acc_ledger").select("*", { count: "exact" }).gt("id", since).order("id"));
      let added = 0;
      for (const r of fresh) if (!LC.ids.has(r.id)) { LC.ids.add(r.id); LC.rows.push(r); added++; if (r.id > LC.maxId) LC.maxId = r.id; }
      if (added) LC.rows.sort(byDateNo);
      return LC.rows;
    })().finally(() => { LC.p = null; });
    return LC.p;
  }
  const Data = {
    accounts: async () => (await sb.from("acc_accounts").select("*").order("sort")).data || [],
    parties: async () => (await sb.from("acc_parties").select("*").order("name")).data || [],
    settings: async () => { const { data } = await sb.from("acc_settings").select("*"); const o = {}; (data || []).forEach(r => o[r.key] = r.value); return o; },
    employees: async () => (await sb.from("acc_employees").select("*, party:acc_parties(id,name)")).data || [],
    payrollRuns: async () => (await sb.from("acc_payroll_runs").select("*").order("id", { ascending: false }).limit(24)).data || [],
    invCounts: async () => (await sb.from("acc_inventory_counts").select("*").order("id", { ascending: false }).limit(12)).data || [],
    einvoices: async () => (await sb.from("acc_einvoices").select("entry_id,status,qr,message,icv,at")).data || [],
    loans: async () => (await sb.from("acc_loans").select("*").order("no")).data || [],
    recurring: async () => (await sb.from("acc_recurring").select("*").order("created_at")).data || [],
    pos: async () => (await sb.from("acc_po_summary").select("*").order("no", { ascending: false }).limit(300)).data || [],
    grns: async () => (await sb.from("acc_grns").select("*").order("no", { ascending: false }).limit(500)).data || [],
    assets: async () => (await sb.from("acc_assets").select("*").order("no")).data || [],
    assetDep: async () => (await sb.from("acc_asset_dep").select("*")).data || [],
    monthRuns: async () => (await sb.from("acc_month_runs").select("*").order("month", { ascending: false }).limit(24)).data || [],
    obligations: async () => (await sb.from("acc_obligations").select("*").order("sort")).data || [],
    obligationDone: async () => (await sb.from("acc_obligation_done").select("*")).data || [],
    budgets: async year => (await sb.from("acc_budgets").select("*").eq("year", year)).data || [],
    confirms: async () => (await sb.from("acc_confirms").select("*").order("id", { ascending: false }).limit(200)).data || [],
    cheques: () => pageAll(() => sb.from("acc_cheques").select("*, party:acc_parties(name,kind)", { count: "exact" }).order("due_date").order("id")),
    bankLines: () => pageAll(() => sb.from("acc_bank_lines").select("*", { count: "exact" }).order("date").order("seq")),
    recs: async () => (await sb.from("acc_bank_recs").select("*").order("id", { ascending: false }).limit(12)).data || [],
    counts: async () => (await sb.from("acc_cash_counts").select("*").order("id", { ascending: false }).limit(20)).data || [],
    ledger: async (from, to) => { const all = await ledgerAll(); return from || to ? all.filter(r => (!from || r.date >= from) && (!to || r.date <= to)) : all.slice(); },
    // entries by filter; without a limit, every matching entry is loaded
    entries: (opts = {}) => pageAll(() => {
      let q = sb.from("acc_entries").select("*, party:acc_parties(name,kind)", { count: "exact" }).order("no", { ascending: false });
      if (opts.date) q = q.eq("date", opts.date);
      if (opts.from) q = q.gte("date", opts.from);
      if (opts.status) q = q.eq("status", opts.status);
      if (opts.no) q = q.eq("no", opts.no);
      if (opts.doc) q = q.eq("doc", opts.doc);
      if (opts.party) q = q.eq("party_id", opts.party);
      if (opts.types) q = q.in("type", opts.types);
      if (opts.ids) q = q.in("id", opts.ids.length ? opts.ids : ["00000000-0000-0000-0000-000000000000"]);
      return q;
    }, opts.limit || Infinity),
    // the latest entries plus every one that pages need regardless of age (pending, opening, loans, payroll)
    entriesForPages: async (latest = 2000) => {
      const [a, b, c, d] = await Promise.all([Data.entries({ limit: latest }), Data.entries({ status: "pending" }), Data.entries({ types: ["opening", "loan_received", "loan_payment"] }),
        Data.entries({ types: ["payroll"] })]);
      const seen = new Set(), out = [];
      for (const e of [...a, ...b, ...c, ...d]) if (!seen.has(e.id)) { seen.add(e.id); out.push(e); }
      return out.sort((x, y) => y.no - x.no);
    },
  };

  /* ---------- reports (built from posted lines) ---------- */
  const bal = (rows, f) => rows.filter(f).reduce((a, r) => a + num(r.debit) - num(r.credit), 0);
  const Reports = {
    accountBalances(rows) { const o = {}; rows.forEach(r => o[r.account] = r3((o[r.account] || 0) + num(r.debit) - num(r.credit))); return o; },
    partyBalances(rows, kind) {
      const acc = kind === "customer" ? "1201" : "2101", o = {};
      rows.filter(r => r.account === acc && r.party_name).forEach(r => o[r.party_name] = r3((o[r.party_name] || 0) + num(r.debit) - num(r.credit)));
      return Object.entries(o).map(([name, v]) => ({ name, balance: kind === "customer" ? v : -v })).filter(x => Math.abs(x.balance) > 0.0005).sort((a, b) => b.balance - a.balance);
    },
    statement(rows, partyName, from, to) {
      const mine = rows.filter(r => r.party_name === partyName && (r.account === "1201" || r.account === "2101"));
      const kind = mine[0] ? mine[0].party_kind : null, sign = kind === "supplier" ? -1 : 1;
      const opening = sign * bal(mine, r => from && r.date < from);
      let run = opening;
      const lines = mine.filter(r => (!from || r.date >= from) && (!to || r.date <= to)).map(r => {
        run = r3(run + sign * (num(r.debit) - num(r.credit)));
        return { date: r.date, no: r.no, doc: r.doc, doc_no: r.doc_no, description: r.description || (TYPES[r.type] || {}).ar, debit: num(r.debit), credit: num(r.credit), balance: run };
      });
      return { kind, opening: r3(opening), lines, closing: r3(run) };
    },
    cashDay(rows, day) {
      const cash = rows.filter(r => r.account === "1101");
      const opening = r3(bal(cash, r => r.date < day));
      const lines = cash.filter(r => r.date === day).map(r => ({ no: r.no, doc: r.doc, doc_no: r.doc_no, type: r.type, description: r.description || (TYPES[r.type] || {}).ar, in: num(r.debit), out: num(r.credit) }));
      const tin = r3(lines.reduce((a, l) => a + l.in, 0)), tout = r3(lines.reduce((a, l) => a + l.out, 0));
      const other = acc => ({ in: r3(rows.filter(r => r.account === acc && r.date === day).reduce((a, r) => a + num(r.debit), 0)), out: r3(rows.filter(r => r.account === acc && r.date === day).reduce((a, r) => a + num(r.credit), 0)), balance: r3(bal(rows, r => r.account === acc && r.date <= day)) });
      return { opening, lines, tin, tout, closing: r3(opening + tin - tout), bank: other("1102"), cheques: other("1103") };
    },
    balanceSheet(rows, accounts, asOf) {
      const R = rows.filter(r => r.date <= asOf), by = {};
      R.forEach(r => by[r.account] = (by[r.account] || 0) + num(r.debit) - num(r.credit));
      const pick = (type, sign) => accounts.filter(a => a.type === type).map(a => ({ code: a.code, name: a.name_ar, v: r3(sign * (by[a.code] || 0)) })).filter(l => Math.abs(l.v) > 0.0005);
      const assets = pick("asset", 1), liab = pick("liability", -1), equity = pick("equity", -1);
      const profit = r3(-accounts.filter(a => a.type === "income" || a.type === "expense").reduce((x, a) => x + (by[a.code] || 0), 0));
      const ta = r3(assets.reduce((x, l) => x + l.v, 0)), tl = r3(liab.reduce((x, l) => x + l.v, 0)), te = r3(equity.reduce((x, l) => x + l.v, 0) + profit);
      return { assets, liab, equity, profit, ta, tl, te, balanced: Math.abs(ta - tl - te) < 0.0005 };
    },
    taxSummary(rows, from, to) {
      const inP = rows.filter(r => r.date >= from && r.date <= to);
      const out = r3(inP.filter(r => r.account === "2201" && ["sale", "sales_return", "other_income"].includes(r.type)).reduce((x, r) => x + num(r.credit) - num(r.debit), 0));
      const inp = r3(inP.filter(r => r.account === "1301" && ["purchase", "expense"].includes(r.type)).reduce((x, r) => x + num(r.debit) - num(r.credit), 0));
      const sales = r3(inP.filter(r => r.account === "4101" || r.account === "4102").reduce((x, r) => x + num(r.credit) - num(r.debit), 0));
      const owedNow = r3(-rows.filter(r => r.account === "2201").reduce((x, r) => x + num(r.debit) - num(r.credit), 0));
      const inputNow = r3(rows.filter(r => r.account === "1301").reduce((x, r) => x + num(r.debit) - num(r.credit), 0));
      return { from, to, out, inp, net: r3(out - inp), sales, owedNow, inputNow };
    },
    // How often the AI's draft was right before the accountant confirmed it (story box entries only)
    accuracy(entries, accounts) {
      const E = entries.filter(e => e.ai && !e.reverses && e.type !== "opening" && !(e.flags || []).includes("erp_import") && ["posted", "pending", "reversed"].includes(e.status));
      const name = c => (accounts.find(a => a.code === c) || {}).name_ar || c;
      const F = { type: 0, amount: 0, method: 0, party: 0, category: 0 }, N = { type: 0, amount: 0, method: 0, party: 0, category: 0 }, fixes = {}, secs = [];
      let allRight = 0;
      E.forEach(e => { const a = e.ai; let ok = true;
        const test = (k, good, applies = true) => { if (!applies) return; N[k]++; if (good) F[k]++; else ok = false; };
        test("type", a.type === e.type);
        test("amount", Math.abs(num(a.amount) - num(e.amount)) < 0.0005, !(e.meta && e.meta.currency));
        test("method", (a.method || null) === (e.method || null), !!e.method);
        test("party", (a.party_name || "").trim() === (e.party ? e.party.name : "") || (!a.party_name && !e.party), !!(e.party || a.party_name));
        test("category", a.category === e.category, !!e.category);
        if (e.category && a.category && a.category !== e.category) { const k = `${name(a.category)} ← ${name(e.category)}`; fixes[k] = (fixes[k] || 0) + 1; }
        if (a.type !== e.type) { const k = `النوع: ${(TYPES[a.type] || {}).ar || a.type} ← ${(TYPES[e.type] || {}).ar || e.type}`; fixes[k] = (fixes[k] || 0) + 1; }
        if (ok) allRight++;
        if (a.at && e.created_at) { const d = (new Date(e.created_at) - new Date(a.at)) / 1000; if (d >= 0 && d < 3600) secs.push(d); } });
      const pc = k => N[k] ? Math.round(F[k] / N[k] * 100) : null;
      secs.sort((x, y) => x - y);
      return { n: E.length, all: E.length ? Math.round(allRight / E.length * 100) : null, type: pc("type"), amount: pc("amount"), method: pc("method"), party: pc("party"), category: pc("category"),
        median: secs.length ? Math.round(secs[Math.floor(secs.length / 2)]) : null, fixes: Object.entries(fixes).sort((x, y) => y[1] - x[1]).slice(0, 8) };
    },
    // Where the cash came from and went (direct method): cash box + bank, by what each entry was
    cashFlow(rows, from, to) {
      const CASH = ["1101", "1102"], by = {};
      rows.filter(r => r.date >= from && r.date <= to && r.type !== "opening").forEach(r => (by[r.entry_id] = by[r.entry_id] || []).push(r));
      const G = { cust: 0, supp: 0, pay: 0, tax: 0, oth: 0, inv: 0, fin_loan: 0, fin_owner: 0, fin_oth: 0 };
      const CUST = ["sale", "sales_return", "collection", "cheque_collected", "other_income"], SUPP = ["purchase", "supplier_payment", "cheque_cleared", "import_cost", "purchase_return"];
      const PAY = ["salary_payment", "ss_payment", "advance", "advance_return", "eos_payment"];
      for (const L of Object.values(by)) {
        const c = r3(L.filter(r => CASH.includes(r.account)).reduce((a, r) => a + num(r.debit) - num(r.credit), 0)); if (!c) continue;
        const t = L[0].type, acc = new Set(L.map(r => r.account));
        if (acc.has("1501") || t === "asset_disposal") G.inv += c;
        else if (acc.has("2501")) G.fin_loan += c;
        else if (acc.has("3101")) G.fin_owner += c;
        else if (acc.has("1104")) G.fin_oth += c;
        else if (CUST.includes(t)) G.cust += c; else if (SUPP.includes(t)) G.supp += c; else if (PAY.includes(t)) G.pay += c; else if (t === "tax_payment") G.tax += c; else G.oth += c;
      }
      Object.keys(G).forEach(k => G[k] = r3(G[k]));
      const cashAt = d => r3(rows.filter(r => CASH.includes(r.account) && r.date <= d).reduce((a, r) => a + num(r.debit) - num(r.credit), 0));
      const op = r3(G.cust + G.supp + G.pay + G.tax + G.oth), fin = r3(G.fin_loan + G.fin_owner + G.fin_oth);
      // the opening balances entry counts as cash at the start, even when it is dated inside the period
      const opening = r3(cashAt(addDays(from, -1)) + rows.filter(r => CASH.includes(r.account) && r.type === "opening" && r.date >= from && r.date <= to).reduce((a, r) => a + num(r.debit) - num(r.credit), 0)), closing = cashAt(to);
      return { ...G, op, fin, net: r3(op + G.inv + fin), opening, closing, from, to, ok: Math.abs(opening + op + G.inv + fin - closing) < 0.01 };
    },
    // Health numbers for the manager
    ratios(rows, accounts, asOf, taxRate) {
      const kind = {}; accounts.forEach(a => kind[a.code] = a.kind);
      const bal = {}; rows.filter(r => r.date <= asOf).forEach(r => bal[r.account] = (bal[r.account] || 0) + num(r.debit) - num(r.credit));
      const sumK = (ks, sign = 1) => r3(Object.entries(bal).filter(([c]) => ks.includes(kind[c])).reduce((a, [, v]) => a + sign * v, 0));
      const ca = sumK(["cash", "bank", "cheques_in", "ar", "advances", "custody", "tax_in", "inventory", "prepaid", "deposits", "allowance"]);
      const cl = sumK(["ap", "cheques_out", "tax_out", "salaries_payable", "ss_payable", "tax_withheld", "accrued"], -1);
      const inv = sumK(["inventory"]), pre = sumK(["prepaid"]);
      const d90 = addDays(asOf, -90), R = rows.filter(r => r.date > d90 && r.date <= asOf && r.type !== "year_close");
      const sales90 = R.filter(r => r.account === "4101").reduce((a, r) => a + num(r.credit) - num(r.debit), 0) * (1 + num(taxRate) / 100);
      const buy90 = R.filter(r => ["purchase", "inventory"].includes(kind[r.account]) && ["purchase", "import_cost", "purchase_return"].includes(r.type)).reduce((a, r) => a + num(r.debit) - num(r.credit), 0);
      const cogs90 = R.filter(r => ["purchase", "inventory_change"].includes(kind[r.account])).reduce((a, r) => a + num(r.debit) - num(r.credit), 0);
      const ar = sumK(["ar", "cheques_in"]), ap = sumK(["ap", "cheques_out"], -1);
      const y0 = asOf.slice(0, 4) + "-01-01", P = this.profitLoss(rows, y0, asOf, accounts), M = this.profitLoss(rows, monthStart(asOf), asOf, accounts);
      const loans = -(bal["2501"] || 0), equity = r3(-Object.entries(bal).filter(([c]) => accounts.find(a => a.code === c && (a.type === "equity" || a.type === "income" || a.type === "expense"))).reduce((a, [, v]) => a + v, 0));
      return { dso: sales90 > 0 ? Math.round(ar / (sales90 / 90)) : null, dpo: buy90 > 0 ? Math.round(ap / (buy90 / 90)) : null,
        stockDays: cogs90 > 0 ? Math.round(inv / (cogs90 / 90)) : null, current: cl > 0 ? r3(ca / cl) : null, quick: cl > 0 ? r3((ca - inv - pre) / cl) : null,
        gmMonth: M.ti ? Math.round(M.gross / M.ti * 100) : null, gmYear: P.ti ? Math.round(P.gross / P.ti * 100) : null, nmYear: P.ti ? Math.round(P.net / P.ti * 100) : null,
        debtEquity: equity > 0 ? r3(loans / equity) : null, ca, cl, loans, equity };
    },
    // Who owes what, and how old it is. Payments settle the oldest invoices first.
    aging(rows, kind, parties, asOf) {
      const acct = kind === "supplier" ? "2101" : "1201", sign = kind === "supplier" ? -1 : 1, out = [];
      const by = {}; rows.filter(r => r.account === acct && r.party_id && r.date <= asOf).forEach(r => (by[r.party_id] = by[r.party_id] || []).push(r));
      for (const [pid, list] of Object.entries(by)) {
        const p = parties.find(x => x.id === pid) || { name: list[0].party_name }, terms = p.terms_days != null ? p.terms_days : 30;
        let paid = list.reduce((a, r) => a + (sign > 0 ? num(r.credit) : num(r.debit)), 0);
        const open = [];
        list.filter(r => (sign > 0 ? num(r.debit) : num(r.credit)) > 0).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.no - b.no).forEach(r => {
          const v = sign > 0 ? num(r.debit) : num(r.credit), use = Math.min(paid, v); paid -= use;
          if (v - use > 0.0005) open.push({ date: r.date, no: r.no, left: r3(v - use), age: Math.round((new Date(asOf) - new Date(r.date)) / 864e5), due: addDays(r.date, terms) });
        });
        const total = r3(open.reduce((a, x) => a + x.left, 0)); if (total < 0.0005 && paid < 0.0005) continue;
        const b = [0, 0, 0, 0]; open.forEach(x => b[x.age <= 30 ? 0 : x.age <= 60 ? 1 : x.age <= 90 ? 2 : 3] += x.left);
        const late = r3(open.filter(x => x.due < asOf).reduce((a, x) => a + x.left, 0));
        out.push({ id: pid, name: p.name, phone: p.phone, limit: p.credit_limit, terms, total: r3(total - paid), b: b.map(r3), late, oldest: open[0] ? open[0].date : null, open });
      }
      return out.sort((a, b) => b.late - a.late || b.total - a.total);
    },
    profitLoss(rows, from, to, accounts) {
      const inR = rows.filter(r => r.date >= from && r.date <= to && r.type !== "year_close" && (r.account_type === "income" || r.account_type === "expense"));
      const by = {}; inR.forEach(r => by[r.account] = (by[r.account] || 0) + num(r.credit) - num(r.debit));
      const line = a => ({ code: a.code, name: a.name_ar, v: r3(by[a.code] || 0) });
      const income = accounts.filter(a => a.type === "income").map(line).filter(l => l.v);
      const purchases = accounts.filter(a => a.kind === "purchase" || a.kind === "inventory_change").map(line).map(l => ({ ...l, v: -l.v })).filter(l => l.v);
      const expenses = accounts.filter(a => a.type === "expense" && a.kind !== "purchase" && a.kind !== "inventory_change").map(line).map(l => ({ ...l, v: -l.v })).filter(l => l.v);
      const ti = r3(income.reduce((a, l) => a + l.v, 0)), tp = r3(purchases.reduce((a, l) => a + l.v, 0)), te = r3(expenses.reduce((a, l) => a + l.v, 0));
      return { income, purchases, expenses, ti, tp, te, gross: r3(ti - tp), net: r3(ti - tp - te) };
    },
  };

  /* ---------- deadlines: which periods are due, done or late ---------- */
  function lastDay(y, m) { return new Date(y, m, 0).getDate(); }
  function ymd(y, m, d) { while (m > 12) { m -= 12; y++; } return `${y}-${String(m).padStart(2, "0")}-${String(Math.min(d, lastDay(y, m))).padStart(2, "0")}`; }
  function deadlines(obls, done, asOf, since) {
    const out = [], Y = +asOf.slice(0, 4), M = +asOf.slice(5, 7), isDone = (k, p) => done.find(d => d.key === k && d.period === p);
    const AR = ["", "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
    obls.filter(o => o.enabled).forEach(o => {
      const cands = [];
      if (o.freq === "yearly") { for (const y of [Y - 2, Y - 1, Y, Y + 1]) cands.push({ period: String(y), label: `سنة ${y}`, due: ymd(y + o.lag, o.due_month || 12, o.due_day) }); }
      else {
        const span = o.freq === "monthly" ? 1 : o.freq === "bimonthly" ? 2 : 3;
        for (let k = -14; k <= 2; k++) {
          let y = Y, m = M + k; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; }
          if (m % span !== 0) continue;   // m is the last month of the period
          const n = m / span, period = span === 1 ? `${y}-${String(m).padStart(2, "0")}` : `${y}-${span === 2 ? "B" : "Q"}${n}`;
          const label = span === 1 ? `${AR[m]} ${y}` : `${AR[m - span + 1]} و${AR[m]} ${y}`.replace(" و" + AR[m], span === 3 ? " إلى " + AR[m] : " و" + AR[m]);
          cands.push({ period, label, due: ymd(y, m + o.lag, o.due_day) });
        }
      }
      cands.forEach(c => {
        const d = isDone(o.key, c.period), days = Math.round((new Date(c.due) - new Date(asOf)) / 864e5);
        if (d) { if (days > -45 || d.done_on >= addDays(asOf, -30)) out.push({ ...c, o, status: "done", doneOn: d.done_on, note: d.note, days }); return; }
        if (since && c.due < since) return;   // before the books started
        if (days < -400 || days > (o.freq === "yearly" ? 60 : 35)) return;
        out.push({ ...c, o, status: days < 0 ? "late" : days <= 10 ? "soon" : "later", days });
      });
    });
    const rank = { late: 0, soon: 1, later: 2, done: 3 };
    return out.sort((a, b) => rank[a.status] - rank[b.status] || (a.due < b.due ? -1 : 1));
  }
  const DL = { late: ["متأخر", "bad"], soon: ["قريب", "warn"], later: ["قادم", ""], done: ["تم ✓", "good"] };
  // Asset book values from the depreciation history
  function assetBook(assets, deps) {
    return assets.map(a => { const acc = r3(deps.filter(d => d.asset_id === a.id).reduce((x, d) => x + num(d.amount), 0));
      return { ...a, accumulated: acc, book: r3(num(a.cost) - acc), monthly: r3((num(a.cost) - num(a.salvage)) / a.life_months) }; });
  }
  const ASSET_CATS = { machines: "آلات ومعدات", vehicles: "سيارات", buildings: "مباني", furniture: "أثاث", computers: "أجهزة حاسوب", other: "أخرى" };
  const PO_STATUS = { pending: ["بانتظار موافقة المدير", "warn"], open: ["مفتوح", ""], received: ["استُلم بالكامل", "good"], closed: ["مغلق", "good"], cancelled: ["ملغى", "bad"] };

  /* ---------- loans: the installment plan ---------- */
  function addMonths(k, n) { const d = new Date(k + "T00:00"); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, lastDay(d.getFullYear(), d.getMonth() + 1))); return dayKey(d); }
  function loanSchedule(loan) {
    const n = loan.installments || 0, P = num(loan.amount), i = num(loan.rate) / 100 * (loan.every_months || 1) / 12, out = []; let b = P;
    if (!n || !loan.first_due) return out;
    const ann = i > 0 ? P * i / (1 - Math.pow(1 + i, -n)) : P / n;
    for (let k = 0; k < n; k++) {
      const interest = r3(b * i), principal = k === n - 1 ? r3(b) : r3(loan.method === "equal" ? P / n : ann - interest);
      b = r3(b - principal); out.push({ k: k + 1, due: addMonths(loan.first_due, k * (loan.every_months || 1)), principal, interest, total: r3(principal + interest), balance: b });
    }
    return out;
  }
  // Balance and next installment of each loan, from the posted entries
  function loanStatus(loans, entries, asOf) {
    return loans.map(l => {
      const E = entries.filter(e => e.status === "posted" && !e.reverses && e.meta && e.meta.loan_id === l.id);
      const got = num(l.opening_balance) + E.filter(e => e.type === "loan_received").reduce((a, e) => a + num(e.amount), 0), paid = E.filter(e => e.type === "loan_payment");
      const balance = r3(got - paid.reduce((a, e) => a + num(e.meta.principal), 0)), sch = loanSchedule(l), next = sch[paid.length] || null;
      const alert = l.kind === "loan" ? (next && got ? next.due : null) : l.expiry;
      const days = alert ? Math.round((new Date(alert) - new Date(asOf)) / 864e5) : null;
      return { ...l, received: r3(got), balance, paidCount: paid.length, schedule: sch, next, alert, days };
    });
  }
  const LOAN_KIND = { loan: "قرض", overdraft: "جاري مدين", lc: "اعتماد مستندي", guarantee: "كفالة بنكية" };

  /* ---------- printable documents ---------- */
  function docShell(company, title, bodyHTML, meta) {
    const c = company || {};
    return `<div class="doc"><div class="doc-head"><div><div class="doc-co">${esc(c.name || "")}</div><div class="doc-small">${esc([c.address, c.phone].filter(Boolean).join(" · "))}${c.tax_no ? ` · الرقم الضريبي ${esc(c.tax_no)}` : ""}</div></div>
      <div class="doc-title">${esc(title)}${meta ? `<div class="doc-small">${meta}</div>` : ""}</div></div>${bodyHTML}</div>`;
  }
  const sig = (a, b) => `<div class="doc-sig"><div>${a}<span></span></div><div>${b}<span></span></div></div>`;
  function voucherHTML(e, company) {
    const isIn = e.doc === "receipt", who = e.party ? e.party.name : (e.description || "");
    const meta = `رقم ${e.doc_no} · التاريخ ${e.date}`;
    const body = `<table class="doc-kv">
      <tr><th>${isIn ? "استلمنا من" : "صرفنا إلى"}</th><td>${esc(who || "–")}</td></tr>
      <tr><th>المبلغ</th><td class="doc-amt">${money(e.amount)} دينار</td></tr>
      <tr><th>المبلغ كتابةً</th><td>${esc(amountWords(e.amount))}</td></tr>
      <tr><th>طريقة ${isIn ? "القبض" : "الدفع"}</th><td>${esc(METHODS[e.method] || "–")}${e.cheque && e.cheque.no ? ` · شيك رقم ${esc(e.cheque.no)}${e.cheque.bank ? " · " + esc(e.cheque.bank) : ""}${e.cheque.due_date ? " · تاريخ الاستحقاق " + esc(e.cheque.due_date) : ""}` : ""}</td></tr>
      <tr><th>وذلك عن</th><td>${esc(e.description || (TYPES[e.type] || {}).ar)}</td></tr></table>
      ${sig(isIn ? "المستلم (المحاسب)" : "المحاسب", isIn ? "الدافع" : "المستلم")}
      <div class="doc-small doc-foot">قيد رقم ${e.no}${e.status !== "posted" ? ` · ${STATUS[e.status]}` : ""}</div>`;
    return docShell(company, isIn ? "سند قبض" : "سند صرف", body, meta);
  }
  function qrImage(text) {
    try { if (!window.QRCode || !text) return ""; const d = document.createElement("div");
      new window.QRCode(d, { text: String(text), width: 150, height: 150, correctLevel: window.QRCode.CorrectLevel.L });
      const c = d.querySelector("canvas"); return c ? c.toDataURL("image/png") : ""; } catch (err) { return ""; }
  }
  function invoiceHTML(e, company, einv) {
    const items = Array.isArray(e.items) ? e.items : [];
    const rows = items.length ? items.map((it, i) => `<tr><td>${i + 1}</td><td>${esc(it.name)}</td><td class="n">${it.qty ?? ""}</td><td class="n">${it.unit_price != null ? money(it.unit_price) : ""}</td><td class="n">${it.qty != null && it.unit_price != null ? money(it.qty * it.unit_price) : ""}</td></tr>`).join("")
      : `<tr><td>1</td><td>${esc(e.description || "بضاعة")}</td><td></td><td></td><td class="n">${money(num(e.amount) - num(e.tax))}</td></tr>`;
    const body = `<table class="doc-kv"><tr><th>العميل</th><td>${esc(e.party ? e.party.name : "نقدي")}</td></tr><tr><th>طريقة الدفع</th><td>${esc(METHODS[e.method] || "–")}</td></tr></table>
      <table class="doc-tbl"><thead><tr><th>#</th><th>الصنف</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td colspan="4">المجموع قبل الضريبة</td><td class="n">${money(num(e.amount) - num(e.tax))}</td></tr>
      ${num(e.tax) ? `<tr><td colspan="4">ضريبة المبيعات</td><td class="n">${money(e.tax)}</td></tr>` : ""}
      <tr class="doc-total"><td colspan="4">الإجمالي (دينار)</td><td class="n">${money(e.amount)}</td></tr></tfoot></table>
      <div class="doc-small">${esc(amountWords(e.amount))}</div>${sig("البائع", "المستلم")}
      ${einv && einv.status === "SUBMITTED" ? `<div style="display:flex;gap:12px;align-items:center">${qrImage(einv.qr) ? `<img src="${qrImage(einv.qr)}" alt="QR" width="110" height="110">` : ""}<div class="doc-small">فاتورة ضريبية مُرسلة إلى نظام الفوترة الوطني (JoFotara) · العداد ${esc(einv.icv)}</div></div>`
        : `<div class="doc-small doc-foot">فاتورة داخلية وليست فاتورة ضريبية رسمية حتى تُرسل إلى نظام الفوترة الوطني (JoFotara). · قيد رقم ${e.no}</div>`}`;
    return docShell(company, "فاتورة مبيعات", body, `رقم ${e.doc_no} · التاريخ ${e.date}`);
  }
  function tableHTML(cols, rows, foot) {
    return `<table class="doc-tbl"><thead><tr>${cols.map(c => `<th>${c.t}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((v, i) => `<td class="${cols[i].n ? "n" : ""}">${cols[i].n && typeof v === "number" ? money(v) : esc(v)}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${cols.length}" class="doc-small">لا توجد حركات</td></tr>`}</tbody>${foot ? `<tfoot>${foot}</tfoot>` : ""}</table>`;
  }
  function statementHTML(s, name, from, to, company) {
    const docLabel = l => l.doc ? `${DOCS[l.doc] || ""} ${l.doc_no || ""}` : "";
    const body = `<table class="doc-kv"><tr><th>${s.kind === "supplier" ? "المورد" : "العميل"}</th><td>${esc(name)}</td></tr><tr><th>الرصيد الافتتاحي</th><td class="n">${money(s.opening)}</td></tr></table>`
      + tableHTML([{ t: "التاريخ" }, { t: "المستند" }, { t: "البيان" }, { t: "مدين", n: 1 }, { t: "دائن", n: 1 }, { t: "الرصيد", n: 1 }],
        s.lines.map(l => [l.date, docLabel(l), l.description, l.debit || "", l.credit || "", l.balance]),
        `<tr class="doc-total"><td colspan="5">الرصيد ${s.kind === "supplier" ? "المستحق للمورد" : "المستحق على العميل"}</td><td class="n">${money(s.closing)}</td></tr>`);
    return docShell(company, "كشف حساب", body, `${from || "من البداية"} إلى ${to || today()}`);
  }
  function cashDayHTML(c, day, company) {
    const body = `<table class="doc-kv"><tr><th>رصيد أول اليوم</th><td class="n">${money(c.opening)}</td></tr></table>`
      + tableHTML([{ t: "القيد" }, { t: "المستند" }, { t: "البيان" }, { t: "مقبوضات", n: 1 }, { t: "مدفوعات", n: 1 }],
        c.lines.map(l => [l.no, l.doc ? `${DOCS[l.doc]} ${l.doc_no}` : "", l.description, l.in || "", l.out || ""]),
        `<tr><td colspan="3">المجموع</td><td class="n">${money(c.tin)}</td><td class="n">${money(c.tout)}</td></tr><tr class="doc-total"><td colspan="4">رصيد الصندوق آخر اليوم</td><td class="n">${money(c.closing)}</td></tr>`)
      + `<table class="doc-kv"><tr><th>البنك</th><td>وارد ${money(c.bank.in)} · صادر ${money(c.bank.out)} · الرصيد ${money(c.bank.balance)}</td></tr>
         <tr><th>شيكات برسم التحصيل</th><td>واردة ${money(c.cheques.in)} · محصّلة ${money(c.cheques.out)} · الرصيد ${money(c.cheques.balance)}</td></tr></table>`
      + sig("المحاسب", "المدير");
    return docShell(company, "كشف حركة الصندوق اليومي", body, `التاريخ ${day}`);
  }
  function balancesHTML(cust, supp, company) {
    const t = (list, label) => tableHTML([{ t: label }, { t: "الرصيد (دينار)", n: 1 }], list.map(x => [x.name, x.balance]),
      `<tr class="doc-total"><td>الإجمالي</td><td class="n">${money(list.reduce((a, x) => a + x.balance, 0))}</td></tr>`);
    return docShell(company, "أرصدة العملاء والموردين", `<h4>مستحق لنا على العملاء</h4>${t(cust, "العميل")}<h4>مستحق علينا للموردين</h4>${t(supp, "المورد")}`, `حتى ${today()}`);
  }
  function plHTML(p, from, to, company) {
    const sec = (title, list) => list.length ? `<tr><th colspan="2">${title}</th></tr>` + list.map(l => `<tr><td>${esc(l.name)}</td><td class="n">${money(l.v)}</td></tr>`).join("") : "";
    const body = `<table class="doc-tbl"><tbody>${sec("الإيرادات", p.income)}<tr class="doc-total"><td>إجمالي الإيرادات</td><td class="n">${money(p.ti)}</td></tr>
      ${sec("المشتريات", p.purchases)}<tr class="doc-total"><td>مجمل الربح</td><td class="n">${money(p.gross)}</td></tr>
      ${sec("المصاريف", p.expenses)}<tr class="doc-total"><td>صافي ${p.net >= 0 ? "الربح" : "الخسارة"}</td><td class="n">${money(p.net)}</td></tr></tbody></table>
      <div class="doc-small">تكلفة البضاعة = المشتريات ± تغيّر المخزون حسب آخر جرد. لا يشمل الاستهلاك بعد. Cost of goods = purchases ± the stock change from the last count; depreciation is not included yet.</div>`;
    return docShell(company, "الأرباح والخسائر", body, `${from} إلى ${to}`);
  }
  function expensesHTML(rows, from, to, accounts, company) {
    const by = {}; rows.filter(r => r.date >= from && r.date <= to && r.account_type === "expense").forEach(r => by[r.account] = (by[r.account] || 0) + num(r.debit) - num(r.credit));
    const list = accounts.filter(a => by[a.code]).map(a => [a.name_ar, r3(by[a.code])]).sort((a, b) => b[1] - a[1]);
    return docShell(company, "المصاريف والمشتريات حسب النوع", tableHTML([{ t: "النوع" }, { t: "المبلغ (دينار)", n: 1 }], list,
      `<tr class="doc-total"><td>الإجمالي</td><td class="n">${money(list.reduce((a, x) => a + x[1], 0))}</td></tr>`), `${from} إلى ${to}`);
  }
  function entriesHTML(list, title, company) {
    return docShell(company, "قائمة القيود", tableHTML([{ t: "رقم" }, { t: "التاريخ" }, { t: "النوع" }, { t: "الطرف" }, { t: "المبلغ", n: 1 }, { t: "الحالة" }, { t: "المستند" }],
      list.map(e => [e.no, e.date, (TYPES[e.type] || {}).ar, e.party ? e.party.name : "", num(e.amount), STATUS[e.status], e.doc ? `${DOCS[e.doc]} ${e.doc_no}` : ""])), title);
  }

  // Cash forecast: cash + bank now, then cheques due in and out, week by week
  function forecast(bal, cheques, weeks = 8) {
    const start = r3((bal["1101"] || 0) + (bal["1102"] || 0)), t = today();
    const open = cheques.filter(c => ["held", "deposited", "issued"].includes(c.status));
    const rows = []; let run = start;
    const overdueIn = open.filter(c => c.direction === "in" && c.due_date < t), overdueOut = open.filter(c => c.direction === "out" && c.due_date < t);
    for (let w = 0; w < weeks; w++) {
      const from = addDays(t, w * 7), to = addDays(t, w * 7 + 6);
      const ins = open.filter(c => c.direction === "in" && c.due_date >= from && c.due_date <= to), outs = open.filter(c => c.direction === "out" && c.due_date >= from && c.due_date <= to);
      const a = r3(ins.reduce((x, c) => x + num(c.amount), 0) + (w === 0 ? overdueIn.reduce((x, c) => x + num(c.amount), 0) : 0));
      const b = r3(outs.reduce((x, c) => x + num(c.amount), 0) + (w === 0 ? overdueOut.reduce((x, c) => x + num(c.amount), 0) : 0));
      run = r3(run + a - b);
      rows.push({ from, to, ins: a, outs: b, closing: run, nIn: ins.length + (w === 0 ? overdueIn.length : 0), nOut: outs.length + (w === 0 ? overdueOut.length : 0) });
    }
    return { start, rows };
  }
  function chequesHTML(list, company) {
    const t = today();
    const sec = (title, l) => `<h4>${title}</h4>` + tableHTML([{ t: "الاستحقاق" }, { t: "رقم الشيك" }, { t: "البنك" }, { t: "الطرف" }, { t: "المبلغ", n: 1 }, { t: "الحالة" }],
      l.map(c => [c.due_date + (c.due_date < t && ["held", "issued"].includes(c.status) ? " (متأخر)" : ""), c.no, c.bank, c.party ? c.party.name : "", num(c.amount), (CHQ[c.status] || {}).ar || c.status]),
      `<tr class="doc-total"><td colspan="4">الإجمالي</td><td class="n">${money(l.reduce((a, c) => a + num(c.amount), 0))}</td><td></td></tr>`);
    const ins = list.filter(c => c.direction === "in" && ["held", "deposited"].includes(c.status)), outs = list.filter(c => c.direction === "out" && c.status === "issued");
    const bounced = list.filter(c => c.status === "bounced");
    return docShell(company, "كشف الشيكات", sec("شيكات واردة لم تُحصّل", ins) + sec("شيكات صادرة لم تُصرف", outs) + (bounced.length ? sec("شيكات مرتجعة", bounced) : ""), `حتى ${t}`);
  }

  function balanceSheetHTML(b, asOf, company) {
    const sec = (t, l) => `<tr><th colspan="2">${t}</th></tr>` + l.map(x => `<tr><td>${esc(x.name)}</td><td class="n">${money(x.v)}</td></tr>`).join("");
    return docShell(company, "الميزانية العمومية", `<table class="doc-tbl"><tbody>${sec("الأصول", b.assets)}<tr class="doc-total"><td>مجموع الأصول</td><td class="n">${money(b.ta)}</td></tr>
      ${sec("الالتزامات", b.liab)}<tr class="doc-total"><td>مجموع الالتزامات</td><td class="n">${money(b.tl)}</td></tr>
      ${sec("حقوق الملكية", b.equity)}<tr><td>${b.profit >= 0 ? "ربح" : "خسارة"} الفترة حتى تاريخه</td><td class="n">${money(b.profit)}</td></tr>
      <tr class="doc-total"><td>مجموع حقوق الملكية</td><td class="n">${money(b.te)}</td></tr>
      <tr class="doc-total"><td>الالتزامات + حقوق الملكية</td><td class="n">${money(b.tl + b.te)}</td></tr></tbody></table>
      <div class="doc-small">${b.balanced ? "✓ متوازنة" : "⚠ غير متوازنة"} · لا يشمل الاستهلاك بعد.</div>`, `كما في ${asOf}`);
  }
  function taxSummaryHTML(t, company) {
    return docShell(company, "ملخص ضريبة المبيعات", `<table class="doc-kv"><tr><th>المبيعات الخاضعة (صافي)</th><td class="n">${money(t.sales)}</td></tr>
      <tr><th>ضريبة على المبيعات</th><td class="n">${money(t.out)}</td></tr><tr><th>ضريبة مدفوعة على المشتريات</th><td class="n">${money(t.inp)}</td></tr>
      <tr><th>الصافي المستحق عن الفترة</th><td class="doc-amt">${money(t.net)}</td></tr></table>
      <div class="doc-small">للمراجعة قبل تقديم الإقرار. راجع المحاسب القانوني للتأكد من المواعيد والإعفاءات. For review before filing.</div>`, `${t.from} إلى ${t.to}`);
  }
  function payrollHTML(run, company) {
    const L = run.lines || [], T = run.totals || {};
    return docShell(company, "كشف الرواتب", tableHTML([{ t: "الموظف" }, { t: "الأساسي", n: 1 }, { t: "إضافي وعلاوات وعمولة", n: 1 }, { t: "خصم غياب", n: 1 }, { t: "الإجمالي", n: 1 },
      { t: "الضمان (الموظف)", n: 1 }, { t: "ضريبة الدخل", n: 1 }, { t: "سلفة", n: 1 }, { t: "الصافي", n: 1 }],
      L.map(l => [l.name, num(l.basic), num(l.allowances) + num(l.overtime) + num(l.additions) + num(l.commission), num(l.absence), num(l.gross), num(l.ss_employee), num(l.tax), num(l.advance), num(l.net)]),
      `<tr class="doc-total"><td>المجموع</td><td colspan="3"></td><td class="n">${money(T.gross)}</td><td class="n">${money(T.ss_employee)}</td><td class="n">${money(T.tax)}</td><td class="n">${money(T.advance)}</td><td class="n">${money(T.net)}</td></tr>`)
      + `<div class="doc-small">حصة الشركة من الضمان: ${money(T.ss_employer)} · نسب الضمان: الموظف ${run.rates.ss_employee}% والشركة ${run.rates.ss_employer}% بحد أعلى ${money(run.rates.ss_cap, 0)} دينار. تأكد من النسب الحالية مع مؤسسة الضمان ودائرة الضريبة.</div>` + sig("المحاسب", "المدير"), `شهر ${run.month}`);
  }
  function payslipHTML(run, l, company) {
    return docShell(company, "قسيمة راتب", `<table class="doc-kv"><tr><th>الموظف</th><td>${esc(l.name)}${l.job ? " · " + esc(l.job) : ""}</td></tr></table>
      <table class="doc-tbl"><tbody><tr><td>الراتب الأساسي</td><td class="n">${money(l.basic)}</td></tr><tr><td>العلاوات</td><td class="n">${money(l.allowances)}</td></tr>
      <tr><td>العمل الإضافي</td><td class="n">${money(l.overtime)}</td></tr>${num(l.commission) ? `<tr><td>عمولة مبيعات</td><td class="n">${money(l.commission)}</td></tr>` : ""}<tr><td>إضافات أخرى</td><td class="n">${money(l.additions)}</td></tr><tr><td>خصم غياب</td><td class="n">${money(-num(l.absence))}</td></tr>
      <tr class="doc-total"><td>الإجمالي</td><td class="n">${money(l.gross)}</td></tr><tr><td>اقتطاع الضمان الاجتماعي</td><td class="n">${money(-num(l.ss_employee))}</td></tr>
      <tr><td>ضريبة الدخل</td><td class="n">${money(-num(l.tax))}</td></tr><tr><td>استرداد سلفة</td><td class="n">${money(-num(l.advance))}</td></tr>
      <tr class="doc-total"><td>صافي الراتب</td><td class="n">${money(l.net)}</td></tr></tbody></table><div class="doc-small">${esc(amountWords(l.net))}</div>` + sig("المحاسب", "توقيع الموظف"), `شهر ${run.month}`);
  }
  function stockCountHTML(c, company) {
    return docShell(company, "محضر جرد المخزون", tableHTML([{ t: "الصنف" }, { t: "النوع" }, { t: "الوحدة" }, { t: "الكمية", n: 1 }, { t: "تكلفة الوحدة", n: 1 }, { t: "القيمة", n: 1 }],
      (c.items || []).map(i => [i.name, i.kind === "raw" ? "مادة خام" : "منتج جاهز", i.unit, num(i.qty), num(i.unit_cost), num(i.value)]),
      `<tr class="doc-total"><td colspan="5">قيمة المخزون</td><td class="n">${money(c.total)}</td></tr><tr><td colspan="5">حسب الدفاتر قبل الجرد</td><td class="n">${money(c.book_before)}</td></tr>`) + sig("أمين المستودع", "المحاسب"), `التاريخ ${c.date}`);
  }

  function poHTML(po, company) {
    return docShell(company, "أمر شراء", `<table class="doc-kv"><tr><th>المورد</th><td>${esc(po.supplier || "")}</td></tr></table>`
      + tableHTML([{ t: "الصنف" }, { t: "الوحدة" }, { t: "الكمية", n: 1 }, { t: "سعر الوحدة", n: 1 }, { t: "المجموع", n: 1 }],
        (po.items || []).map(i => [i.name, i.unit || "", num(i.qty), num(i.unit_price), r3(num(i.qty) * num(i.unit_price))]),
        `<tr class="doc-total"><td colspan="4">المجموع قبل الضريبة</td><td class="n">${money(po.total)}</td></tr>`)
      + (po.note ? `<div class="doc-small">${esc(po.note)}</div>` : "") + sig("المحاسب", "المدير"), `رقم ${po.no} · التاريخ ${po.date}`);
  }
  function grnHTML(g, po, company) {
    return docShell(company, "سند استلام بضاعة", `<table class="doc-kv"><tr><th>المورد</th><td>${esc(po.supplier || "")}</td></tr><tr><th>أمر الشراء</th><td>${po.no}</td></tr></table>`
      + tableHTML([{ t: "الصنف" }, { t: "الكمية المستلمة", n: 1 }], (g.items || []).map(i => [i.name, num(i.qty)]))
      + (g.note ? `<div class="doc-small">${esc(g.note)}</div>` : "") + sig("أمين المستودع", "المحاسب"), `رقم ${g.no} · التاريخ ${g.date}`);
  }
  function agingHTML(list, kind, asOf, company) {
    const T = list.reduce((a, x) => { x.b.forEach((v, i) => a[i] += v); a[4] += x.total; a[5] += x.late; return a; }, [0, 0, 0, 0, 0, 0]);
    return docShell(company, kind === "supplier" ? "أعمار ذمم الموردين" : "أعمار ذمم العملاء", tableHTML([{ t: kind === "supplier" ? "المورد" : "العميل" }, { t: "الهاتف" }, { t: "0 إلى 30 يوم", n: 1 }, { t: "31 إلى 60", n: 1 }, { t: "61 إلى 90", n: 1 }, { t: "أكثر من 90", n: 1 }, { t: "المجموع", n: 1 }, { t: "متأخر عن المدة", n: 1 }],
      list.map(x => [x.name, x.phone || "", ...x.b, x.total, x.late]),
      `<tr class="doc-total"><td colspan="2">المجموع</td>${T.map(v => `<td class="n">${money(v)}</td>`).join("")}</tr>`)
      + `<div class="doc-small">الدفعات تُسدّد أقدم الفواتير أولاً. «متأخر» = تجاوز مدة السداد المتفق عليها.</div>`, `حتى ${asOf}`);
  }
  function assetsHTML(list, asOf, company) {
    return docShell(company, "سجل الأصول الثابتة", tableHTML([{ t: "رقم" }, { t: "الأصل" }, { t: "النوع" }, { t: "الموقع" }, { t: "تاريخ التشغيل" }, { t: "التكلفة", n: 1 }, { t: "الاستهلاك المتراكم", n: 1 }, { t: "القيمة الدفترية", n: 1 }, { t: "آخر جرد" }, { t: "موجود؟" }],
      list.map(a => [String(a.no), a.name, ASSET_CATS[a.category] || a.category, a.location || "", a.in_service, num(a.cost), a.accumulated, a.book, a.last_verified || "–", ""]),
      `<tr class="doc-total"><td colspan="5">المجموع</td><td class="n">${money(list.reduce((x, a) => x + num(a.cost), 0))}</td><td class="n">${money(list.reduce((x, a) => x + a.accumulated, 0))}</td><td class="n">${money(list.reduce((x, a) => x + a.book, 0))}</td><td colspan="2"></td></tr>`)
      + sig("القائم بالجرد", "المحاسب"), `حتى ${asOf}`);
  }
  function confirmLetterHTML(p, bal, asOf, company) {
    const side = (p.kind === "supplier") === (bal >= 0) ? "مستحق لكم علينا" : "مستحق لنا عليكم";
    return docShell(company, "طلب مصادقة رصيد", `<p>السادة ${esc(p.name)} المحترمين،</p>
      <p>لأغراض تدقيق حساباتنا، نرجو التكرم بتأكيد رصيد حسابكم لدينا كما في ${asOf}، والبالغ حسب سجلاتنا <b>${money(Math.abs(bal))} دينار</b> ${side}.</p>
      <p>إذا كان الرصيد صحيحاً، يرجى التوقيع أدناه. وإن كان مختلفاً، يرجى ذكر الرصيد حسب سجلاتكم وإرفاق كشف الحساب، وإعادته مباشرة إلى المدقق.</p>
      <table class="doc-kv"><tr><th>الرصيد صحيح</th><td>☐</td></tr><tr><th>الرصيد حسب سجلاتنا</th><td>........................</td></tr></table>` + sig("ختم وتوقيع " + esc(p.name), "التاريخ"), `كما في ${asOf}`);
  }
  function employeeYearHTML(name, year, runs, company) {
    const L = runs.map(r => ({ month: r.month, l: (r.lines || []).find(x => x.name === name) })).filter(x => x.l);
    const sum = k => L.reduce((a, x) => a + num(x.l[k]), 0);
    return docShell(company, "كشف الرواتب والضريبة السنوي", `<table class="doc-kv"><tr><th>الموظف</th><td>${esc(name)}</td></tr></table>`
      + tableHTML([{ t: "الشهر" }, { t: "الإجمالي", n: 1 }, { t: "الضمان (الموظف)", n: 1 }, { t: "ضريبة الدخل", n: 1 }, { t: "الصافي", n: 1 }],
        L.map(x => [x.month, num(x.l.gross), num(x.l.ss_employee), num(x.l.tax), num(x.l.net)]),
        `<tr class="doc-total"><td>المجموع</td><td class="n">${money(sum("gross"))}</td><td class="n">${money(sum("ss_employee"))}</td><td class="n">${money(sum("tax"))}</td><td class="n">${money(sum("net"))}</td></tr>`)
      + sig("المحاسب", "المدير"), `سنة ${year}`);
  }

  function supplierPlanHTML(list, asOf, cashNow, chqOut, company) {
    const until = addDays(asOf, 7), bills = [];
    list.forEach(x => x.open.forEach(o => { if (o.due <= until) bills.push({ name: x.name, ...o }); }));
    bills.sort((a, b) => a.due < b.due ? -1 : 1);
    const tot = r3(bills.reduce((a, b) => a + b.left, 0));
    return docShell(company, "خطة الدفع للموردين", tableHTML([{ t: "المورد" }, { t: "تاريخ الفاتورة" }, { t: "تاريخ الاستحقاق" }, { t: "المبلغ", n: 1 }, { t: "" }],
        bills.map(b => [b.name, b.date, b.due, b.left, b.due < asOf ? "متأخر" : ""]),
        `<tr class="doc-total"><td colspan="3">المستحق حتى ${until}</td><td class="n">${money(tot)}</td><td></td></tr>`)
      + `<table class="doc-kv"><tr><th>المتوفر الآن (صندوق + بنك)</th><td class="n">${money(cashNow)}</td></tr><tr><th>شيكات صادرة تُصرف هذا الأسبوع</th><td class="n">${money(chqOut)}</td></tr>
         <tr><th>المتبقي بعد الدفع</th><td class="doc-amt">${money(cashNow - chqOut - tot)}</td></tr></table>
      <div class="doc-small">مدة السداد لكل مورد يحددها المدير (الافتراضي 30 يوماً). قرر ما تدفعه حسب الأولوية والسيولة.</div>`, `من ${asOf} إلى ${until}`);
  }
  // Month end checklist: what must be done before a month is closed
  function monthChecklist(month, d) {
    const start = month + "-01", end = ymd(+month.slice(0, 4), +month.slice(5, 7), 31), near = addDays(end, -3);
    const items = [];
    const pend = d.entries.filter(e => e.status === "pending" && e.date <= end).length;
    items.push({ k: "pending", ok: !pend, t: "لا قيود بانتظار الموافقة", s: pend ? `${pend} قيد بانتظار المدير` : "" });
    const rec = d.recs.find(r => r.as_of >= near && r.as_of <= addDays(end, 20));
    items.push({ k: "bank", ok: !!rec && num(rec.difference) === 0, t: "مطابقة البنك لنهاية الشهر", s: rec ? (num(rec.difference) === 0 ? `حتى ${rec.as_of}` : `فرق ${money(rec.difference)}`) : "لم تتم" });
    const cc = d.counts.find(c => String(c.at).slice(0, 10) >= near && String(c.at).slice(0, 10) <= addDays(end, 5));
    items.push({ k: "cash", ok: !!cc, t: "عدّ الصندوق في آخر الشهر", s: cc ? `فرق ${money(cc.difference)}` : "لم يتم" });
    const ic = d.invc.find(c => c.date >= addDays(end, -7) && c.date <= addDays(end, 10));
    items.push({ k: "stock", ok: !!ic, t: "جرد المخزون", s: ic ? ic.date : "لم يتم" });
    const pr = d.runs.find(r => r.month === month);
    items.push({ k: "payroll", ok: !!pr, t: "رواتب الشهر", s: pr ? "مُجهّزة" : "لم تُجهّز" });
    const chq = d.cheques.filter(c => c.direction === "in" && c.status === "held" && c.due_date <= end).length;
    items.push({ k: "cheques", ok: !chq, t: "الشيكات المستحقة أودعت", s: chq ? `${chq} شيك لم يودع` : "" });
    const late = d.dl.filter(x => x.status === "late").length;
    items.push({ k: "deadlines", ok: !late, t: "المواعيد الحكومية", s: late ? `${late} متأخر` : "" });
    if (d.held) items.push({ k: "held", ok: !d.held.length, t: "لا دفعات تنتظر إيصالها", s: d.held.length ? `${d.held.length} تنتظر` : "" });
    const run = d.monthRuns.find(r => r.month === month);
    items.push({ k: "run", ok: !!run, t: "تشغيل نهاية الشهر (الاستهلاك، المقدمة، المستحقة)", s: run ? "تم" : "لم يتم" });
    return { month, start, end, items, done: items.filter(i => i.ok).length, run };
  }

  function accuracyHTML(a) {
    if (!a.n) return `<div class="note">لا توجد قصص بعد. No story entries yet.</div>`;
    const t = (l, v, s2, c) => `<div class="kpi ${c || ""}"><span class="l">${l}</span><span class="v">${v == null ? "–" : v}</span><span class="s">${s2}</span></div>`;
    const lv = v => v == null ? "" : v >= 90 ? "good" : v < 75 ? "bad" : "";
    return `<div class="kpis">${t("صحيح من أول مرة", a.all == null ? null : a.all + "%", `${a.n} قصة`, lv(a.all))}${t("البند (النوع المحاسبي)", a.category == null ? null : a.category + "%", "اختار الذكاء الاصطناعي البند الصحيح", lv(a.category))}
      ${t("المبلغ", a.amount == null ? null : a.amount + "%", "", lv(a.amount))}${t("نوع القيد", a.type == null ? null : a.type + "%", "", lv(a.type))}${t("الطرف", a.party == null ? null : a.party + "%", "", lv(a.party))}
      ${t("طريقة الدفع", a.method == null ? null : a.method + "%", "", lv(a.method))}${t("وقت التأكيد", a.median == null ? null : a.median + " ث", "الوسيط من رد الذكاء الاصطناعي إلى التأكيد")}</div>
      ${a.fixes.length ? `<div class="sum" style="margin-top:6px">أكثر التصحيحات <span class="note">اقتراح الذكاء الاصطناعي ← ما اختاره المحاسب</span></div><table class="doc-tbl"><tbody>${a.fixes.map(([k, n]) => `<tr><td>${esc(k)}</td><td class="n">${n}</td></tr>`).join("")}</tbody></table>` : `<div class="note">لا تصحيحات ✓</div>`}`;
  }
  function cashFlowHTML(f, company) {
    const row = (t, v, b) => `<tr${b ? ' class="doc-total"' : ""}><td>${t}</td><td class="n">${money(v)}</td></tr>`;
    return docShell(company, "قائمة التدفقات النقدية", `<table class="doc-tbl"><tbody>
      <tr><th colspan="2">الأنشطة التشغيلية</th></tr>${row("مقبوضات من العملاء", f.cust)}${row("مدفوعات للموردين", f.supp)}${row("رواتب وضمان وسلف", f.pay)}${row("ضرائب مدفوعة", f.tax)}${row("مصاريف أخرى", f.oth)}${row("صافي النقد من التشغيل", f.op, 1)}
      <tr><th colspan="2">الأنشطة الاستثمارية</th></tr>${row("شراء وبيع أصول ثابتة", f.inv)}${row("صافي النقد من الاستثمار", f.inv, 1)}
      <tr><th colspan="2">الأنشطة التمويلية</th></tr>${row("قروض (استلام وسداد)", f.fin_loan)}${row("الشريك (إيداع وسحب)", f.fin_owner)}${row("هوامش اعتمادات وكفالات", f.fin_oth)}${row("صافي النقد من التمويل", f.fin, 1)}
      ${row("صافي التغير في النقد", f.net, 1)}${row("النقد في بداية الفترة (صندوق + بنك)", f.opening)}${row("النقد في نهاية الفترة", f.closing, 1)}</tbody></table>
      <div class="doc-small">${f.ok ? "✓ يطابق رصيد الصندوق والبنك" : "⚠ لا يطابق رصيد الصندوق والبنك"} · الطريقة المباشرة. الشيكات تُحسب عند تحصيلها أو صرفها.</div>`, `${f.from} إلى ${f.to}`);
  }
  function loanHTML(l, company) {
    return docShell(company, `جدول أقساط ${LOAN_KIND[l.kind]}`, `<table class="doc-kv"><tr><th>البنك</th><td>${esc(l.bank)}</td></tr><tr><th>المبلغ</th><td>${money(l.amount)}</td></tr><tr><th>الفائدة السنوية</th><td>${num(l.rate)}%</td></tr></table>`
      + tableHTML([{ t: "القسط" }, { t: "الاستحقاق" }, { t: "أصل", n: 1 }, { t: "فائدة", n: 1 }, { t: "المجموع", n: 1 }, { t: "الرصيد بعده", n: 1 }],
        l.schedule.map(x => [String(x.k), x.due, x.principal, x.interest, x.total, x.balance]))
      + `<div class="doc-small">الفائدة تقديرية حسب النسبة المدخلة؛ المبلغ الفعلي هو ما يظهر في إشعار البنك.</div>`);
  }

  /* ---------- load a library only when it is needed ---------- */
  const LIBS = { chart: "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js", xlsx: "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js" };
  const libP = {};
  function needLib(k) {
    if (k === "chart" && window.Chart) return Promise.resolve(); if (k === "xlsx" && window.XLSX) return Promise.resolve();
    return libP[k] || (libP[k] = new Promise((res, rej) => { const s = document.createElement("script"); s.src = LIBS[k]; s.onload = res; s.onerror = () => { libP[k] = null; rej(new Error("lib")); }; document.head.appendChild(s); }));
  }

  /* ---------- Excel export: every table of the books in one workbook ---------- */
  async function exportBooks(company) {
    await needLib("xlsx");
    // each table is ordered by a unique key, so pages never overlap or skip
    const all = async (t, order) => pageAll(() => { let q = sb.from(t).select("*", { count: "exact" }); (Array.isArray(order) ? order : order ? [order] : []).forEach(o => q = q.order(o)); return q; });
    const [accounts, parties, entries, ledger, cheques, assets, deps, runs, counts, invc, pos, grns, loans, audit, bank, recs, budgets, settings] = await Promise.all([
      all("acc_accounts", "code"), all("acc_parties", ["name", "id"]), all("acc_entries", "no"), all("acc_ledger", ["no", "id"]), all("acc_cheques", ["due_date", "id"]), all("acc_assets", "no"), all("acc_asset_dep", ["asset_id", "month"]),
      all("acc_payroll_runs", "id"), all("acc_cash_counts", "id"), all("acc_inventory_counts", "id"), all("acc_pos", "no"), all("acc_grns", "no"), all("acc_loans", "no"),
      all("acc_audit", "id"), all("acc_bank_lines", ["date", "seq"]), all("acc_bank_recs", "id"), all("acc_budgets", ["year", "account"]), all("acc_settings", "key")]);
    const pn = id => (parties.find(p => p.id === id) || {}).name || "";
    const bal = {}; ledger.forEach(r => bal[r.account] = (bal[r.account] || 0) + num(r.debit) - num(r.credit));
    const pbal = {}; ledger.filter(r => r.party_id).forEach(r => pbal[r.party_id] = (pbal[r.party_id] || 0) + num(r.debit) - num(r.credit));
    const S = {
      "ميزان المراجعة": accounts.map(a => ({ "الرقم": a.code, "الحساب": a.name_ar, "Account": a.name_en, "النوع": a.type, "مدين": bal[a.code] > 0 ? r3(bal[a.code]) : 0, "دائن": bal[a.code] < 0 ? r3(-bal[a.code]) : 0 })),
      "دفتر اليومية": ledger.map(r => ({ "قيد": r.no, "التاريخ": r.date, "النوع": (TYPES[r.type] || {}).ar || r.type, "الحالة": STATUS[r.status] || r.status, "الحساب": r.account, "اسم الحساب": r.account_name, "الطرف": r.party_name || "",
        "مدين": num(r.debit), "دائن": num(r.credit), "العملة": r.currency || "", "بالعملة": r.fx == null ? "" : num(r.fx), "البيان": r.description, "المستند": r.doc ? `${DOCS[r.doc] || r.doc} ${r.doc_no || ""}` : "" })),
      "القيود": entries.map(e => ({ "رقم": e.no, "التاريخ": e.date, "النوع": (TYPES[e.type] || {}).ar || e.type, "الحالة": STATUS[e.status] || e.status, "الطرف": pn(e.party_id), "المبلغ": num(e.amount), "الضريبة": num(e.tax),
        "الدفع": METHODS[e.method] || e.method || "", "البيان": e.description, "القصة": e.story, "تنبيهات": (e.flags || []).map(f => (FLAGS[f] || {}).ar || f).join("، "), "سجّله": e.created_by, "وافق/رفض": e.decided_by || "", "عكس قيد": e.reverses ? "نعم" : "" })),
      "العملاء والموردون": parties.map(p => ({ "الاسم": p.name, "النوع": { customer: "عميل", supplier: "مورد", employee: "موظف" }[p.kind], "الرصيد": r3(p.kind === "customer" ? (pbal[p.id] || 0) : -(pbal[p.id] || 0)), "حد الائتمان": p.credit_limit == null ? "" : num(p.credit_limit), "مدة السداد": p.terms_days == null ? "" : p.terms_days, "الرقم الضريبي": p.tax_no || "", "الهاتف": p.phone || "" })),
      "الشيكات": cheques.map(c => ({ "الاتجاه": c.direction === "in" ? "وارد" : "صادر", "رقم": c.no, "البنك": c.bank, "الطرف": pn(c.party_id), "الاستحقاق": c.due_date, "المبلغ": num(c.amount), "الحالة": (CHQ[c.status] || {}).ar || c.status })),
      "الأصول الثابتة": assetBook(assets, deps).map(a => ({ "رقم": a.no, "الأصل": a.name, "النوع": ASSET_CATS[a.category] || a.category, "التكلفة": num(a.cost), "المتراكم": a.accumulated, "الدفترية": a.book, "العمر (شهر)": a.life_months, "تاريخ التشغيل": a.in_service, "الموقع": a.location, "الحالة": a.status === "active" ? "قائم" : "مستبعد", "آخر جرد": a.last_verified || "" })),
      "الرواتب": runs.flatMap(r => (r.lines || []).map(l => ({ "الشهر": r.month, "الموظف": l.name, "الإجمالي": num(l.gross), "الضمان (الموظف)": num(l.ss_employee), "الضمان (الشركة)": num(l.ss_employer), "ضريبة الدخل": num(l.tax), "سلفة": num(l.advance), "عمولة": num(l.commission), "الصافي": num(l.net) }))),
      "عدّ الصندوق": counts.map(c => ({ "الوقت": String(c.at).slice(0, 16), "المتوقع": num(c.expected), "الموجود": num(c.counted), "الفرق": num(c.difference), "بواسطة": c.by })),
      "الجرد": invc.flatMap(c => (c.items || []).map(i => ({ "التاريخ": c.date, "الصنف": i.name, "الكمية": num(i.qty), "الوحدة": i.unit, "تكلفة الوحدة": num(i.unit_cost), "القيمة": num(i.value) }))),
      "أوامر الشراء": pos.map(p => ({ "رقم": p.no, "التاريخ": p.date, "المورد": pn(p.party_id), "المجموع": num(p.total), "الحالة": (PO_STATUS[p.status] || [p.status])[0], "الأصناف": (p.items || []).map(i => `${i.name} × ${i.qty}`).join("، ") })),
      "استلام البضاعة": grns.map(g => ({ "رقم": g.no, "أمر الشراء": (pos.find(p => p.id === g.po_id) || {}).no, "التاريخ": g.date, "القيمة": num(g.value), "الأصناف": (g.items || []).map(i => `${i.name} × ${i.qty}`).join("، ") })),
      "القروض": loans.map(l => ({ "رقم": l.no, "البنك": l.bank, "النوع": LOAN_KIND[l.kind], "المبلغ": num(l.amount), "الفائدة %": num(l.rate), "الأقساط": l.installments || "", "الانتهاء": l.expiry || "", "الحالة": l.status })),
      "كشوف البنك": bank.map(b => ({ "التاريخ": b.date, "البيان": b.description, "المرجع": b.ref, "المبلغ": num(b.amount), "مطابق": b.matched_line ? "نعم" : b.ignored ? "لا يحتاج قيد" : "لا" })),
      "مطابقات البنك": recs.map(r => ({ "حتى": r.as_of, "رصيد الكشف": num(r.statement_balance), "رصيد الدفاتر": num(r.book_balance), "الفرق": num(r.difference) })),
      "الموازنة": budgets.map(b => Object.assign({ "السنة": b.year, "الحساب": b.account }, ...(b.months || []).map((v, i) => ({ ["شهر " + (i + 1)]: num(v) })))),
      "سجل التدقيق": audit.map(a => ({ "الوقت": String(a.at).slice(0, 19), "بواسطة": a.by, "الإجراء": a.action, "التفاصيل": JSON.stringify(a.detail || {}).slice(0, 30000) })),
      "الإعدادات": settings.map(s2 => ({ "المفتاح": s2.key, "القيمة": JSON.stringify(s2.value) })),
    };
    const wb = XLSX.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] };
    Object.entries(S).forEach(([name, data]) => { const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ "لا توجد بيانات": "" }]);
      const keys = Object.keys(data[0] || { x: 1 }); ws["!cols"] = keys.map(k => ({ wch: Math.min(40, Math.max(10, k.length + 2, ...data.slice(0, 200).map(r => String(r[k] == null ? "" : r[k]).length + 1))) }));
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)); });
    const file = `books-${(company && company.name) || "factory"}-${today()}.xlsx`.replace(/[\\/:*?"<>|]/g, "-");
    XLSX.writeFile(wb, file);
    try { await sb.rpc("acc_export_log", { p_rows: ledger.length }); } catch (e) {}
    return { file, sheets: Object.keys(S).length, lines: ledger.length };
  }

  /* ---------- KPI dashboard (charts) ---------- */
  function vizColors() {
    const dark = document.documentElement.dataset.theme === "dark" || (document.documentElement.dataset.theme !== "light" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
    const cs = getComputedStyle(document.documentElement), v = (n, f) => (cs.getPropertyValue(n) || "").trim() || f;
    return { s1: dark ? "#3987e5" : "#2a78d6", s2: dark ? "#d95926" : "#eb6834", s3: dark ? "#199e70" : "#1baf7a", ink: v("--ink", "#1a2226"), muted: v("--muted", "#5b676d"), line: v("--line", "#dbe1e4"), surface: v("--surface", "#fff"), good: v("--good", "#1f8a4c"), bad: v("--bad", "#b42318") };
  }
  function monthsBack(n, asOf) { const out = []; let d = monthStart(asOf); for (let i = 0; i < n; i++) { out.unshift(d.slice(0, 7)); d = monthStart(addDays(d, -1)); } return out; }
  const AR_M = ["", "كانون2", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين1", "تشرين2", "كانون1"];
  const mLabel = m => `${AR_M[+m.slice(5, 7)]} ${m.slice(2, 4)}`;
  function dashData(rows, entries, parties, accounts, asOf, n) {
    const M = monthsBack(n, asOf), endOf = m => { const y = +m.slice(0, 4), mo = +m.slice(5, 7); const e = `${m}-${String(new Date(y, mo, 0).getDate()).padStart(2, "0")}`; return e > asOf ? asOf : e; };
    const R = rows.filter(r => r.type !== "year_close");
    const per = M.map(m => { const p = Reports.profitLoss(R, m + "-01", endOf(m), accounts); return { m, sales: p.ti, costs: r3(p.tp + p.te), net: p.net, gm: p.ti ? Math.round(p.gross / p.ti * 1000) / 10 : null }; });
    const cumAt = (accs, d) => r3(rows.filter(r => accs.includes(r.account) && r.date <= d).reduce((a, r) => a + num(r.debit) - num(r.credit), 0));
    const cash = M.map(m => cumAt(["1101", "1102"], endOf(m)));
    const ar = M.map(m => cumAt(["1201"], endOf(m)));
    const late = M.map(m => r3(Reports.aging(rows, "customer", parties, endOf(m)).reduce((a, x) => a + x.late, 0)));
    const coll = M.map(m => r3(rows.filter(r => r.account === "1201" && r.date.slice(0, 7) === m && (r.type === "collection")).reduce((a, r) => a + num(r.credit), 0)));
    const credit = M.map(m => r3(rows.filter(r => r.account === "1201" && r.date.slice(0, 7) === m && r.type === "sale").reduce((a, r) => a + num(r.debit), 0)));
    const cur = asOf.slice(0, 7), prev = M[M.length - 2];
    const expOf = m => { const p = Reports.profitLoss(R, m + "-01", endOf(m), accounts); const o = {}; [...p.purchases, ...p.expenses].forEach(l => o[l.name] = l.v); return o; };
    const eNow = expOf(cur), ePrev = prev ? expOf(prev) : {};
    const cats = Object.keys({ ...eNow, ...ePrev }).sort((a, b) => (eNow[b] || 0) - (eNow[a] || 0)).slice(0, 8);
    // the accountant's own work
    const E = entries.filter(e => e.date.slice(0, 7) === cur && !e.reverses), ai = E.filter(e => e.ai);
    const changed = ai.filter(e => e.ai && e.ai.amount != null && !(e.meta && e.meta.currency) && Math.abs(num(e.ai.amount) - num(e.amount)) > 0.0005).length;
    const weeks = [...Array(8)].map((_, i) => { const to = addDays(asOf, -7 * (7 - i)), from = addDays(to, -6); return { label: to.slice(5), n: entries.filter(e => !e.reverses && e.date >= from && e.date <= to && e.type !== "opening").length }; });
    return { M, labels: M.map(mLabel), per, cash, ar, late, coll, credit, cats, eNow, ePrev, prev, cur,
      work: { month: E.length, pending: entries.filter(e => e.status === "pending").length, unsure: ai.filter(e => e.ai.confidence === "low").length, changed, aiCount: ai.length,
              reversed: entries.filter(e => e.reverses && e.date.slice(0, 7) === cur).length, weeks } };
  }
  const charts = {};
  async function renderDashboard(el, d, opts = {}) {
    const C = vizColors(), last = a => a[a.length - 1], prevV = a => a[a.length - 2];
    const ch = (v, p) => p ? Math.round((v - p) / Math.abs(p) * 100) : null;
    const pct = x => x == null ? "" : `${x > 0 ? "▲" : x < 0 ? "▼" : ""} ${Math.abs(x)}% عن الشهر الماضي`;
    const P = d.per, cs = last(d.cash), arN = last(d.ar), lateN = last(d.late);
    const tiles = [
      ["النقد المتاح (صندوق + بنك)", money(cs, 0), pct(ch(cs, prevV(d.cash)))],
      ["مستحق على العملاء", money(arN, 0), lateN ? `منها متأخر ${money(lateN, 0)}` : "لا متأخرات", lateN > arN * 0.3 ? "bad" : ""],
      ["مبيعات الشهر", money(last(P).sales, 0), pct(ch(last(P).sales, prevV(P) && prevV(P).sales))],
      ["صافي الشهر", money(last(P).net, 0), last(P).net >= 0 ? "ربح" : "خسارة", last(P).net >= 0 ? "good" : "bad"],
      ["هامش الربح الإجمالي", last(P).gm == null ? "–" : last(P).gm + "%", "هذا الشهر"],
      ["قيود هذا الشهر", String(d.work.month), `${d.work.pending} بانتظار الموافقة`],
    ];
    const fig = (id, title, sub) => `<figure class="viz"><figcaption><b>${title}</b>${sub ? `<span>${sub}</span>` : ""}</figcaption><div class="viz-c"><canvas id="${id}" role="img" aria-label="${esc(title)}"></canvas></div><details class="viz-t"><summary>عرض كجدول</summary><div data-t="${id}"></div></details></figure>`;
    el.innerHTML = `<div class="kpis">${tiles.map(([l, v, s2, c]) => `<div class="kpi ${c || ""}"><span class="l">${l}</span><span class="v">${v}</span><span class="s">${esc(s2)}</span></div>`).join("")}</div>
      <div class="vizgrid">${fig("c_pl", "المبيعات والتكاليف وصافي الربح", "شهرياً، بالدينار")}${fig("c_cash", "النقد المتاح", "صندوق + بنك في نهاية كل شهر")}
      ${fig("c_ar", "ذمم العملاء", "الرصيد والمتأخر عن مدة السداد")}${fig("c_coll", "التحصيل مقابل البيع الآجل", "هل نحصّل بقدر ما نبيع بالآجل؟")}
      ${fig("c_gm", "هامش الربح الإجمالي %", "شهرياً")}${fig("c_exp", "التكاليف حسب البند", "هذا الشهر مقابل الشهر الماضي")}
      ${opts.work === false ? "" : fig("c_work", "عمل المحاسب", "عدد القيود أسبوعياً")}</div>
      ${opts.work === false ? "" : `<div class="kpis">${[["قيود سجلها الذكاء الاصطناعي", d.work.aiCount, "هذا الشهر"], ["غير متأكد", d.work.unsure, "راجعها المحاسب"], ["عدّل المحاسب المبلغ", d.work.changed, "عن اقتراح الذكاء الاصطناعي"], ["قيود تصحيح", d.work.reversed, "هذا الشهر", d.work.reversed > 3 ? "bad" : ""]]
        .map(([l, v, s2, c]) => `<div class="kpi ${c || ""}"><span class="l">${l}</span><span class="v">${v}</span><span class="s">${s2}</span></div>`).join("")}</div>`}`;
    const tbl = (id, head, rowsT) => { const t = el.querySelector(`[data-t="${id}"]`); if (t) t.innerHTML = `<table class="doc-tbl"><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rowsT.map(r => `<tr>${r.map((v, i) => `<td class="${i ? "n" : ""}">${typeof v === "number" ? money(v, 0) : esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`; };
    tbl("c_pl", ["الشهر", "المبيعات", "التكاليف", "الصافي"], P.map((p, i) => [d.labels[i], p.sales, p.costs, p.net]));
    tbl("c_cash", ["الشهر", "النقد"], d.cash.map((v, i) => [d.labels[i], v]));
    tbl("c_ar", ["الشهر", "الرصيد", "المتأخر"], d.ar.map((v, i) => [d.labels[i], v, d.late[i]]));
    tbl("c_coll", ["الشهر", "التحصيل", "البيع الآجل"], d.coll.map((v, i) => [d.labels[i], v, d.credit[i]]));
    tbl("c_gm", ["الشهر", "الهامش %"], P.map((p, i) => [d.labels[i], p.gm == null ? "–" : p.gm + "%"]));
    tbl("c_exp", ["البند", "هذا الشهر", "الشهر الماضي"], d.cats.map(c => [c, d.eNow[c] || 0, d.ePrev[c] || 0]));
    tbl("c_work", ["الأسبوع المنتهي", "القيود"], d.work.weeks.map(w => [w.label, String(w.n)]));
    try { await needLib("chart"); } catch (e) { el.querySelectorAll(".viz-c").forEach(x => x.innerHTML = '<div class="note">تعذر تحميل الرسوم. الأرقام متاحة في «عرض كجدول».</div>'); el.querySelectorAll(".viz-t").forEach(x => x.open = true); return; }
    const Ch = window.Chart; Ch.defaults.font.family = getComputedStyle(document.body).fontFamily; Ch.defaults.color = C.muted; Ch.defaults.borderColor = C.line;
    const fmt = v => Math.abs(v) >= 1000 ? (v / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "k" : v.toLocaleString("en-US", { maximumFractionDigits: 1 });
    const base = (yfmt, extra) => Object.assign({ responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: "index", intersect: false },
      plugins: { legend: { position: "top", align: "start", rtl: true, labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true, color: C.ink } },
        tooltip: { rtl: true, callbacks: { label: c => ` ${c.dataset.label}: ${yfmt ? yfmt(c.parsed.y ?? c.parsed.x) : money(c.parsed.y ?? c.parsed.x, 0)}` } } },
      scales: { x: { grid: { display: false }, ticks: { color: C.muted } }, y: { grid: { color: C.line }, border: { display: false }, ticks: { color: C.muted, callback: v => yfmt ? yfmt(v) : fmt(v) } } } }, extra || {});
    const bar = (label, data, color) => ({ type: "bar", label, data, backgroundColor: color, borderRadius: 4, borderSkipped: "start", maxBarThickness: 22, categoryPercentage: 0.7, barPercentage: 0.9, borderColor: C.surface, borderWidth: { left: 1, right: 1 } });
    const line = (label, data, color, fill) => ({ type: "line", label, data, borderColor: color, backgroundColor: fill ? color + "22" : color, fill: !!fill, borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: color, pointBorderColor: C.surface, pointBorderWidth: 2, tension: 0.25 });
    const make = (id, cfg) => { const cv = el.querySelector("#" + id); if (!cv) return; if (charts[id]) charts[id].destroy(); charts[id] = new Ch(cv, cfg); };
    make("c_pl", { data: { labels: d.labels, datasets: [bar("المبيعات", P.map(p => p.sales), C.s1), bar("التكاليف", P.map(p => p.costs), C.s2), line("صافي الربح", P.map(p => p.net), C.s3)] }, options: base() });
    make("c_cash", { data: { labels: d.labels, datasets: [line("النقد المتاح", d.cash, C.s1, true)] }, options: base(null, { plugins: { legend: { display: false }, tooltip: { rtl: true, callbacks: { label: c => ` ${money(c.parsed.y, 0)} دينار` } } } }) });
    make("c_ar", { data: { labels: d.labels, datasets: [line("رصيد العملاء", d.ar, C.s1), line("متأخر عن مدة السداد", d.late, C.s2)] }, options: base() });
    make("c_coll", { data: { labels: d.labels, datasets: [bar("التحصيل", d.coll, C.s1), bar("البيع الآجل", d.credit, C.s2)] }, options: base() });
    make("c_gm", { data: { labels: d.labels, datasets: [line("هامش الربح الإجمالي", P.map(p => p.gm), C.s1)] }, options: base(v => v == null ? "–" : v + "%", { scales: { x: { grid: { display: false }, ticks: { color: C.muted } }, y: { beginAtZero: true, suggestedMax: 60, grid: { color: C.line }, border: { display: false }, ticks: { color: C.muted, callback: v => v + "%" } } }, plugins: { legend: { display: false }, tooltip: { rtl: true, callbacks: { label: c => ` ${c.parsed.y}%` } } } }) });
    make("c_exp", { data: { labels: d.cats, datasets: [bar("هذا الشهر", d.cats.map(c => d.eNow[c] || 0), C.s1), bar("الشهر الماضي", d.cats.map(c => d.ePrev[c] || 0), C.s2)] },
      options: base(null, { indexAxis: "y", interaction: { mode: "index", axis: "y", intersect: false }, scales: { y: { grid: { display: false }, ticks: { color: C.ink } }, x: { grid: { color: C.line }, border: { display: false }, ticks: { color: C.muted, callback: v => fmt(v) } } },
        plugins: { legend: { position: "top", align: "start", rtl: true, labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true, color: C.ink } }, tooltip: { rtl: true, callbacks: { label: c => ` ${c.dataset.label}: ${money(c.parsed.x, 0)}` } } } }) });
    make("c_work", { data: { labels: d.work.weeks.map(w => w.label), datasets: [bar("القيود", d.work.weeks.map(w => w.n), C.s1)] }, options: base(v => String(v), { scales: { x: { grid: { display: false }, ticks: { color: C.muted } }, y: { beginAtZero: true, grid: { color: C.line }, border: { display: false }, ticks: { color: C.muted, precision: 0, stepSize: 1 } } }, plugins: { legend: { display: false }, tooltip: { rtl: true, callbacks: { label: c => ` ${c.parsed.y} قيد` } } } }) });
  }
  const DASH_CSS = `.vizgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:12px}
    figure.viz{margin:0;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px;display:grid;gap:8px;min-width:0}
    figure.viz figcaption{display:grid;gap:2px} figure.viz figcaption span{color:var(--muted);font-size:12.5px}
    .viz-c{position:relative;height:240px} .viz-t summary{cursor:pointer;color:var(--muted);font-size:12.5px} .viz-t .doc-tbl{font-size:12.5px}`;

  function printHTML(html) {
    let el = document.getElementById("print-area");
    if (!el) { el = document.createElement("div"); el.id = "print-area"; document.body.appendChild(el); }
    el.innerHTML = html; window.print();
  }

  // shared document styles, used on screen and on paper
  const DOC_CSS = `
  .doc{background:#fff;color:#111;border:1px solid #d7dbd8;border-radius:8px;padding:20px;display:grid;gap:12px;font-family:"IBM Plex Sans Arabic","Segoe UI",Tahoma,sans-serif;font-size:14px}
  .doc-head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;border-bottom:2px solid #111;padding-bottom:10px}
  .doc-co{font-weight:700;font-size:17px} .doc-title{font-weight:700;font-size:19px;text-align:left}
  .doc-small{font-size:11.5px;color:#555} .doc-foot{border-top:1px dashed #bbb;padding-top:8px}
  .doc h4{margin:6px 0 0;font-size:14px}
  .doc-kv{border-collapse:collapse;width:100%} .doc-kv th{text-align:start;width:150px;color:#444;font-weight:600;padding:6px 8px;vertical-align:top} .doc-kv td{padding:6px 8px;border-bottom:1px solid #e4e4e4}
  .doc-amt{font-family:"IBM Plex Mono",monospace;font-size:17px;font-weight:700;direction:ltr;text-align:right}
  .doc-tbl{border-collapse:collapse;width:100%;font-size:13px} .doc-tbl th,.doc-tbl td{border:1px solid #cfd3d0;padding:5px 7px;text-align:start}
  .doc-tbl th{background:#f1f3f1} .doc-tbl .n{font-family:"IBM Plex Mono",monospace;direction:ltr;text-align:right;white-space:nowrap}
  .doc-total td{font-weight:700;background:#f6f7f6}
  .doc-sig{display:flex;justify-content:space-between;gap:24px;margin-top:22px} .doc-sig div{flex:1;display:grid;gap:26px;font-size:12px;color:#444} .doc-sig span{border-bottom:1px solid #777;height:1px}
  #print-area{display:none}
  @media print{ body>*:not(#print-area){display:none!important} #print-area{display:block!important} .doc{border:0;padding:0} @page{size:A4;margin:14mm} }`;

  async function session() { if (!sb) return null; const { data } = await sb.auth.getSession(); return data.session; }
  async function roles() {
    const [b, m] = await Promise.all([sb.rpc("is_books_user"), sb.rpc("is_manager")]);
    return { books: !!b.data, manager: !!m.data };
  }
  function errText(e) {
    const m = String((e && (e.message || e.error_description)) || e || "");
    let x;
    if ((x = /duplicate_receipt: (\d+)/.exec(m))) return `هذه الصورة استُخدمت في القيد رقم ${x[1]}. لا يمكن استخدام الإيصال نفسه مرتين. This receipt photo was already used in entry #${x[1]}.`;
    if ((x = /possible_duplicate: (\d+)/.exec(m))) return `يوجد قيد مشابه جداً (رقم ${x[1]}): نفس النوع والمبلغ والطرف خلال 3 أيام. A very similar entry (#${x[1]}) exists.`;
    if ((x = /locked: ([\d-]+)/.exec(m))) return `الفترة مقفلة حتى ${x[1]}. لا يمكن التسجيل في تاريخ مقفل. The period is closed up to ${x[1]}.`;
    if (/pending entries in period/.test(m)) return "توجد قيود بانتظار الموافقة في هذه الفترة. وافق عليها أو ارفضها أولاً. Decide the waiting entries in this period first.";
    if (/before today/.test(m)) return "تاريخ الإقفال يجب أن يكون قبل اليوم. The lock date must be before today.";
    if (/not_received|purchase order not open/.test(m)) return "أمر الشراء غير مفتوح (بانتظار الموافقة أو مغلق). The purchase order isn't open.";
    if (/more than ordered/.test(m)) return "الكمية أكبر من المطلوب في أمر الشراء. More than was ordered.";
    if (/item not on the order/.test(m)) return "هذا الصنف ليس في أمر الشراء. That item isn't on the order.";
    if (/goods already received/.test(m)) return "استُلمت بضاعة على هذا الأمر؛ المدير فقط يغلقه. Goods were received; only the manager can close it.";
    if (/duplicate_erp/.test(m)) return `هذا السطر مستورد سابقاً (قيد رقم ${(m.match(/duplicate_erp:\s*(\d+)/) || [])[1] || "؟"}). Already imported.`;
    if (/name already used/.test(m)) return "هذا الاسم مستخدم لحساب آخر. That name is already used.";
    if (/code range/.test(m)) return "الرقم خارج المدى: المصاريف 6102 إلى 6198، المشتريات 5102 إلى 5198. Code out of range.";
    if (/code used/.test(m)) return "هذا الرقم مستخدم. That code is taken.";
    if (/more than the loan/.test(m)) return "المبلغ أكبر من قيمة القرض. More than the loan amount.";
    if (/invalid: loan/.test(m)) return "اختر القرض (يضيفه المدير من صفحته). Pick the loan; the manager adds loans.";
    if (/invalid: principal/.test(m)) return "أصل القسط لا يمكن أن يكون أكبر من القسط. Principal can't exceed the installment.";
    if (/invalid: currency/.test(m)) return "العملة غير معرّفة أو سعرها غير موجود. Unknown currency or no rate.";
    if (/rep unknown/.test(m)) return "المندوب غير موجود في قائمة الموظفين. The rep isn't on the employee list.";
    if (/month end already run/.test(m)) return "تم تشغيل نهاية هذا الشهر من قبل. This month end was already run.";
    if (/invalid: months/.test(m)) return "اكتب عدد الأشهر (من 2 إلى 60). Enter the number of months.";
    if (/year not finished/.test(m)) return "السنة لم تنتهِ بعد. The year hasn't ended.";
    if (/year already closed/.test(m)) return "هذه السنة مقفلة من قبل. That year is already closed.";
    if (/nothing to close/.test(m)) return "لا توجد إيرادات أو مصاريف في هذه السنة. Nothing to close.";
    if (/asset already registered/.test(m)) return "هذا الشراء مسجّل كأصل من قبل. Already in the register.";
    if (/no change/.test(m)) return "الرصيد الحالي يساوي المطلوب. No change needed.";
    if (/custodian required/.test(m)) return "اكتب اسم الموظف صاحب العهدة. Enter the employee who holds the custody.";
    if (/custodian unknown/.test(m)) return "هذا الموظف غير موجود في قائمة الموظفين. That employee isn't on the employee list.";
    if (/more than the balance/.test(m)) return "المبلغ أكبر من رصيد الموظف. The amount is more than the employee's balance.";
    if (/already prepared/.test(m)) return "رواتب هذا الشهر مُجهّزة مسبقاً. This month's payroll was already prepared.";
    if (/no active employees/.test(m)) return "لا يوجد موظفون نشطون. أضفهم من صفحة المدير. No active employees; the manager adds them.";
    if (/deductions exceed/.test(m)) return "الخصومات أكبر من الراتب لأحد الموظفين. Deductions exceed a salary.";
    if (/no input tax/.test(m)) return "لا توجد ضريبة مدفوعة على المشتريات لمقاصتها. There's no input tax to offset.";
    if (/cheque details/.test(m)) return "اكتب رقم الشيك وتاريخ استحقاقه. Enter the cheque number and due date.";
    if (/cheque already processed/.test(m)) return "لا يمكن عكس القيد لأن الشيك تم إيداعه أو تحصيله. The cheque was already processed.";
    if (/cheque action/.test(m)) return "لا يمكن تنفيذ هذا الإجراء على هذا الشيك في حالته الحالية. This action isn't possible for the cheque's current status.";
    if (/do not match/.test(m)) return "المبلغان غير متطابقين. The amounts don't match.";
    if (/receipt_required/.test(m)) return "يجب إرفاق صورة الإيصال لهذا المبلغ. A receipt photo is required for this amount.";
    if (/not_allowed/.test(m)) return "ليست لديك صلاحية لهذا الإجراء. You don't have permission for this.";
    if (/party required/.test(m)) return "اكتب اسم العميل أو المورد. Enter the customer or supplier name.";
    if (/category/.test(m)) return "اختر نوع المصروف أو المشتريات. Choose the expense or purchase type.";
    if (/method/.test(m)) return "اختر طريقة الدفع. Choose the payment method.";
    if (/tax/.test(m)) return "قيمة الضريبة غير صحيحة. The tax amount isn't valid.";
    if (/amount/.test(m)) return "المبلغ غير صحيح. The amount isn't valid.";
    if (/future/.test(m)) return "التاريخ في المستقبل. The date is in the future.";
    if (/already/.test(m)) return "الأرصدة الافتتاحية مُدخلة مسبقاً. Opening balances were already entered.";
    if (/reason/.test(m)) return "اكتب سبب التصحيح. Write the reason for the correction.";
    return "حدث خطأ، حاول مرة أخرى. Something went wrong; try again." + (m ? ` (${m.slice(0, 80)})` : "");
  }

  window.Books = { sb, ok, today, addDays, monthStart, num, r3, money, esc, TYPES, METHODS, DOCS, STATUS, NEEDS, MONEY_OUT, FLAGS, flagPills, fileHash, CHQ, CHQ_ACTIONS, forecast, chequesHTML,
    amountWords, Data, Reports, voucherHTML, accuracyHTML, exportBooks, dashData, renderDashboard, DASH_CSS, needLib, cashFlowHTML, loanHTML, loanSchedule, loanStatus, LOAN_KIND, supplierPlanHTML, monthChecklist, deadlines, DL, assetBook, ASSET_CATS, PO_STATUS, poHTML, grnHTML, agingHTML, assetsHTML, confirmLetterHTML, employeeYearHTML, invoiceHTML, balanceSheetHTML, taxSummaryHTML, payrollHTML, payslipHTML, stockCountHTML, statementHTML, cashDayHTML, balancesHTML, plHTML, expensesHTML, entriesHTML,
    printHTML, DOC_CSS, session, roles, errText };
})();
