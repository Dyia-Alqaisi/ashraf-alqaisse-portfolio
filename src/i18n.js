// English is the source text in index.html; Arabic mirrors it.
// Medical abbreviations (TEE, BLS, CCU, IMC, 2D) stay in Latin script.
const ar = {
  skip: 'انتقل إلى المحتوى',
  brand: 'أشرف القيسي',
  'nav.about': 'نبذة',
  'nav.expertise': 'الخبرات',
  'nav.career': 'المسيرة',
  'nav.teaching': 'التدريس',
  'nav.education': 'المؤهلات',
  'nav.contact': 'تواصل',

  'hero.eyebrow': 'تخطيط صدى القلب · عمّان، الأردن',
  'hero.name1': 'أشرف جمال جميل',
  'hero.name2': 'القيسي',
  'hero.title': 'رئيس مختبر القلب غير التداخلي<i>·</i>أخصائي أول في تخطيط صدى القلب<i>·</i>مدرّب سريري',
  'hero.scroll': 'مرّر للأسفل',

  'about.eyebrow': 'نبذة',
  'about.title': 'مسيرة مهنية مكرّسة لرعاية القلب',
  'about.p': 'متخصص في رعاية مرضى القلب بخبرة تزيد على 25 عامًا في المستشفيات، منها 16 عامًا في تخطيط صدى القلب و4 أعوام في رئاسة مختبر القلب غير التداخلي في مستشفى الأمير حمزة. يُجري تخطيط صدى القلب للبالغين والأطفال بجميع تقنياته: التصوير ثنائي الأبعاد (2D)، والدوبلر، والدوبلر الملوّن، وتخطيط الصدى بالجهد، وTEE، ويدرّب كوادر الإيكو منذ عام 2020.',
  'stat.1': 'عامًا في رعاية القلب في المستشفيات',
  'stat.2': 'عامًا في تخطيط صدى القلب',
  'stat.3': 'أعوام في رئاسة المختبر',
  'stat.4': 'أفراد في الفريق الذي يقوده',
  'stat.5.unit': ' أشهر',
  'stat.5': 'مدة دورات الإيكو التي يدرّسها',

  'exp.eyebrow': 'الخبرات',
  'exp.title': 'كل نافذة على القلب',
  'exp.sub': 'تخطيط صدى القلب للبالغين والأطفال بجميع تقنياته.',
  'exp.2d': 'تخطيط الصدى ثنائي الأبعاد',
  'exp.2d.t': 'تصوير آني لبنية القلب وحجراته وحركة جدرانه.',
  'exp.doppler': 'الدوبلر',
  'exp.doppler.t': 'قياس سرعات تدفق الدم وفروق الضغط بالدوبلر الطيفي.',
  'exp.color': 'الدوبلر الملوّن',
  'exp.color.t': 'خرائط ملوّنة لاتجاه تدفق الدم عبر الصمامات والحجرات.',
  'exp.stress': 'تخطيط الصدى بالجهد',
  'exp.stress.t': 'تقييم حركة جدار القلب في الراحة وتحت الجهد.',
  'exp.tee': 'TEE',
  'exp.tee.t': 'تخطيط صدى القلب عبر المريء لصور قريبة وعالية الدقة.',
  'exp.peds': 'إيكو الأطفال',
  'exp.peds.t': 'فحوصات الأطفال بشكل مستقل، مع الإحالة إلى أطباء قلب الأطفال.',

  'career.eyebrow': 'المسيرة المهنية',
  'career.title': 'إيقاع مسيرة مهنية',
  'c1.date': '2022 – الآن',
  'c1.role': 'رئيس مختبر القلب غير التداخلي',
  'c1.org': 'مستشفى الأمير حمزة',
  'c1.t': 'يقود فريقًا من 7 أفراد، ويشرف على توفير الأجهزة الطبية، ويدرّب الكوادر، ويدير احتياجات القسم.',
  'c2.date': 'تشرين الأول 2022 – تشرين الأول 2024',
  'c2.role': 'أخصائي تخطيط صدى القلب، عيادة تصوير القلب (دوام جزئي)',
  'c2.org': 'الهيئة الطبية الدولية (IMC)',
  'c2.t': 'أدار خدمة الإيكو للبالغين والأطفال للمرضى اللاجئين، وأعدّ تقارير أولية كاملة، وأحال حالات الأطفال إلى أطباء قلب الأطفال.',
  'c3.date': '2010 – 2022',
  'c3.role': 'أخصائي أول في تخطيط صدى القلب',
  'c3.org': 'مستشفى الأمير حمزة',
  'c3.t': 'جميع التقنيات (2D، والدوبلر، والدوبلر الملوّن، وتخطيط الصدى بالجهد، وTEE)؛ وإيكو الأطفال بشكل مستقل؛ وضمان الجودة؛ وتدريب أخصائيي التصوير وبرامج التعليم أثناء الخدمة.',
  'c4.date': '2005 – 2010',
  'c4.role': 'ممرض أول، وحدة العناية القلبية (CCU)',
  'c4.org': 'مستشفى الأمير حمزة',
  'c5.date': '2004 – 2005',
  'c5.role': 'رئيس تمريض، قسم الباطني والجراحة',
  'c5.org': 'المستشفى الأردني',
  'c6.date': '2000 – 2004',
  'c6.role': 'ممرض / ممرض مسؤول',
  'c6.org': 'المستشفى الأردني',

  'teach.eyebrow': 'التدريس',
  'teach.title': 'نقل الخبرة إلى الآخرين',
  't1.date': '2020 – الآن',
  't1.role': 'مدرّب سريري داخلي (تخطيط صدى القلب)',
  't1.org': 'مستشفى الأمير حمزة',
  't1.t': 'دورات إيكو مدتها 6 أشهر للكوادر المنضمّة إلى القسم، بمن فيهم متدرّبون من مستشفيات وزارة الصحة، وتدريب قائم على المحاكاة في إجراءات القلب.',
  't2.date': '2011 – 2013',
  't2.role': 'مدرّس علم وظائف الأعضاء (الفسيولوجيا)',
  't2.org': 'كلية رفيدة الأسلمية (وزارة الصحة)',

  'edu.eyebrow': 'التعليم والشهادات',
  'edu.title': 'المؤهلات',
  'e1.meta': '2021 – 2022 · 600 ساعة',
  'e1.title': 'دبلوم تدريبي، فني تخطيط صدى القلب المتقدّم',
  'e1.org': 'الجامعة الأردنية، مركز الاستشارات والتدريب، بالتعاون مع Health Appeal Society',
  'e2.title': 'ماجستير في علم وظائف الأعضاء (الفسيولوجيا)',
  'e2.org': 'كلية الطب، جامعة العلوم والتكنولوجيا الأردنية',
  'e2.t': 'محور البحث: تخطيط صدى القلب والقسطرة القلبية.',
  'e3.title': 'دبلوم متقدّم في إدارة الجودة في الرعاية الصحية',
  'e3.org': 'German Consultation Center',
  'e4.title': 'بكالوريوس التمريض',
  'e4.org': 'جامعة الزيتونة',
  'e5.title': 'مقدّم خدمة BLS (دعم الحياة الأساسي)',
  'e5.org': 'جمعية القلب الأمريكية',

  'contact.eyebrow': 'تواصل',
  'contact.title': 'يسعدني تواصلكم',
  'contact.email': 'البريد الإلكتروني',
  'contact.phone': 'الهاتف',
  'contact.wa': 'واتساب',
  'contact.wa.btn': 'راسلني عبر واتساب',
  'contact.cv': 'تحميل السيرة الذاتية (PDF)',
  footer: '© أشرف القيسي · عمّان، الأردن',
};

const META = {
  en: {
    title: 'Ashraf Al Qaisse · Head of Non-Invasive Cardiac Lab & Senior Echocardiographer',
    toggle: 'عربي',
    label: 'التبديل إلى العربية',
  },
  ar: {
    title: 'أشرف القيسي · رئيس مختبر القلب غير التداخلي وأخصائي أول في تخطيط صدى القلب',
    toggle: 'EN',
    label: 'Switch to English',
  },
};

const en = {}; // filled from the DOM on first run
const KEY = 'ashraf-lang';

export function initI18n(onChange) {
  const nodes = [...document.querySelectorAll('[data-i18n]')];
  nodes.forEach((n) => { en[n.dataset.i18n] ??= n.innerHTML; });

  const btn = document.getElementById('lang-toggle');
  let lang = 'en';
  try { lang = localStorage.getItem(KEY) === 'ar' ? 'ar' : 'en'; } catch {}

  const apply = (next, first = false) => {
    lang = next;
    const dict = lang === 'ar' ? ar : en;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    nodes.forEach((n) => { const v = dict[n.dataset.i18n]; if (v !== undefined) n.innerHTML = v; });
    btn.textContent = META[lang].toggle;
    btn.setAttribute('aria-label', META[lang].label);
    btn.setAttribute('lang', lang === 'ar' ? 'en' : 'ar');
    document.title = META[lang].title;
    try { localStorage.setItem(KEY, lang); } catch {}
    onChange?.(lang, first);
  };

  btn.addEventListener('click', () => apply(lang === 'ar' ? 'en' : 'ar'));
  apply(lang, true);
  return () => lang;
}
