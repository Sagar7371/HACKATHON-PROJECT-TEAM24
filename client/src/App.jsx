import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeftRight, ArrowUp, ArrowUpRight, Award, Bell, Bookmark, BriefcaseBusiness, CalendarDays, Check, CheckCircle2, ChevronDown, Clock3, Eye, EyeOff, Languages, Menu, MessageCircle, Moon, Search, Settings, ShieldCheck, Sparkles, Star, Sun, Target, Repeat2, UserRound, UsersRound, Video, X, XCircle } from 'lucide-react';
import { blockUser, changePassword, createProfile, createVideoRoom, deleteAccount, forgotPassword, getGroups, getLeaderboard, getMessages, getNotifications, getRecommendations, getSkillMatches, getSkills, joinGroup, loginProfile, markMessageRead, markNotificationsRead, reportUser, resetPassword, scheduleExchange, sendMessage, sendVerification, updatePortfolio, updateProfile, verifyEmail } from './api';
import { connectChat } from './socket';

const categories = ['All', 'Technology', 'Creative', 'Food & home', 'Wellbeing'];
const people = [
  { name: 'Maya Chen', role: 'Brand photographer', city: 'Brooklyn, NY', skills: 'Photography · Branding', initials: 'MC', color: '#dbe8de' },
  { name: 'Arjun Mehta', role: 'Data analyst', city: 'Austin, TX', skills: 'Python · Excel', initials: 'AM', color: '#efe1c5' },
  { name: 'Lina Okafor', role: 'Mindfulness coach', city: 'London, UK', skills: 'Wellbeing · Journaling', initials: 'LO', color: '#d9e5ed' }
];

function App() {
  const [skills, setSkills] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [teachQuery, setTeachQuery] = useState('');
  const [wantsQuery, setWantsQuery] = useState('');
  const [location, setLocation] = useState('');
  const [format, setFormat] = useState('');
  const [level, setLevel] = useState('');
  const [availability, setAvailability] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState('relevance');
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skillsError, setSkillsError] = useState('');
  const [activeModal, setActiveModal] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [activePage, setActivePage] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('skillswap-theme') === 'dark');
  const [accent, setAccent] = useState(() => localStorage.getItem('skillswap-accent') || 'lime');
  const [language, setLanguage] = useState(() => localStorage.getItem('skillswap-language') || 'en');
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem('skillswap-user') || 'null'));
  const [accountOpen, setAccountOpen] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(() => localStorage.getItem('skillswap-notifications-read') === 'true');
  const [savedSkills, setSavedSkills] = useState(() => JSON.parse(localStorage.getItem('skillswap-saved-skills') || '[]'));
  const [toast, setToast] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(() => localStorage.getItem('skillswap-onboarding-done') !== 'true');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notificationHistory, setNotificationHistory] = useState([]);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('skillswap-theme', darkMode ? 'dark' : 'light');
    document.documentElement.dataset.accent = accent;
    localStorage.setItem('skillswap-accent', accent);
    document.documentElement.lang = language;
    localStorage.setItem('skillswap-language', language);
  }, [darkMode, accent, language]);

  useEffect(() => {
    if (activeModal === 'login' || activeModal === 'account-community' || activeModal === 'account-advanced') setMobileOpen(false);
  }, [activeModal]);

  useEffect(() => {
    const nav = document.querySelector('.main-nav');
    if (!nav) return undefined;
    const handleCommunityClick = (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      const isCommunity = ['Community', 'Comunidad', 'समुदाय'].some((label) => button.textContent.includes(label));
      const isLogin = button.classList.contains('login-link') || button.textContent.includes('Log in');
      const isAdvanced = ['Advanced', 'Avanzado', 'एडवांस्ड'].some((label) => button.textContent.includes(label));
      if (!isCommunity && !isLogin && !isAdvanced) return;
      window.setTimeout(() => {
        setMobileOpen(false);
        setActiveModal(null);
        window.setTimeout(() => setActiveModal(isLogin ? 'login' : isAdvanced ? 'account-advanced' : 'account-community'), 0);
      }, 0);
    };
    nav.addEventListener('click', handleCommunityClick);
    return () => nav.removeEventListener('click', handleCommunityClick);
  }, [language]);

  useEffect(() => {
    const cta = document.querySelector('.main-nav .nav-cta');
    if (!cta) return undefined;
    const textNode = [...cta.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.textContent = 'Sign in ';
    cta.setAttribute('aria-label', 'Sign in');
    const handleSignIn = () => {
      setMobileOpen(false);
      setActiveModal(null);
      window.setTimeout(() => setActiveModal('profile'), 0);
    };
    cta.addEventListener('click', handleSignIn);
    return () => cta.removeEventListener('click', handleSignIn);
  }, [activeModal, currentUser, language]);

  useEffect(() => {
    if (!currentUser) return undefined;
    const fields = [...document.querySelectorAll('input[type="password"]')].map((input) => {
      const form = input.closest('form');
      const toggle = document.createElement('button');
      toggle.className = 'password-toggle';
      toggle.type = 'button';
      toggle.setAttribute('aria-label', 'Show password');
      toggle.setAttribute('title', 'Show password');
      toggle.textContent = '◉';
      input.classList.add('password-input');
      form.classList.add('password-form');
      form.insertBefore(toggle, input.nextSibling);
      const position = () => { const field = input.closest('label') || input; toggle.style.top = `${field.offsetTop + (field.offsetHeight / 2) - 14}px`; };
      position();
      const update = () => {
        const visible = input.type === 'text';
        toggle.textContent = visible ? '◉' : '◉';
        toggle.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
        toggle.setAttribute('title', visible ? 'Hide password' : 'Show password');
      };
      toggle.addEventListener('click', () => { input.type = input.type === 'password' ? 'text' : 'password'; update(); input.focus(); });
      window.addEventListener('resize', position);
      return { input, form, toggle, position };
    });
    return () => fields.forEach(({ input, form, toggle, position }) => { toggle.remove(); input.classList.remove('password-input'); form.classList.remove('password-form'); window.removeEventListener('resize', position); });
  }, [activeModal, currentUser]);

  useEffect(() => localStorage.setItem('skillswap-saved-skills', JSON.stringify(savedSkills)), [savedSkills]);

  const toggleSavedSkill = (skill) => setSavedSkills((current) => current.some((item) => item._id === skill._id) ? current.filter((item) => item._id !== skill._id) : [skill, ...current]);
  const toggleSavedWithToast = (skill) => { const saved = savedSkills.some((item) => item._id === skill._id); toggleSavedSkill(skill); setToast(saved ? 'Removed from saved skills.' : 'Saved skill for later.'); };
  const openMessage = (recipient) => { if (!currentUser) { setToast('Log in to message another member.'); setActiveModal('login'); return; } setMessageRecipient(recipient); setActiveModal('contact'); };
  const labels = language === 'hi' ? { explore: 'कौशल खोजें', people: 'लोग खोजें', community: 'समुदाय', advanced: 'एडवांस्ड' } : language === 'es' ? { explore: 'Explorar habilidades', people: 'Encontrar personas', community: 'Comunidad', advanced: 'Avanzado' } : { explore: 'Explore skills', people: 'Find people', community: 'Community', advanced: 'Advanced' };

  useEffect(() => { setPage(1); }, [category, search, teachQuery, wantsQuery, location, format, level, availability, sort]);
  useEffect(() => { let cancelled = false; setSkillsLoading(true); setSkillsError(''); getSkills({ category, search, teach: teachQuery, wants: wantsQuery, location, format, level, availability, sort, page, limit: 8 }).then((result) => { if (!cancelled) { setSkills((current) => page === 1 ? result.items : [...current, ...result.items]); setHasMore(result.hasMore); } }).catch(() => { if (!cancelled) { setSkills([]); setSkillsError('We could not load the exchange board.'); } }).finally(() => { if (!cancelled) setSkillsLoading(false); }); return () => { cancelled = true; }; }, [category, search, teachQuery, wantsQuery, location, format, level, availability, sort, page]);
  useEffect(() => { getSkills({ category: 'All', search: '', page: 1, limit: 24 }).then((result) => setAllSkills(result.items)).catch(() => setAllSkills([])); }, []);
  useEffect(() => { if (!currentUser?.email) return undefined; getMessages(currentUser.email).then((items) => setUnreadMessages(items.filter((item) => !item.read && item.recipientEmail === currentUser.email).length)).catch(() => setUnreadMessages(0)); getNotifications(currentUser.email).then(setNotificationHistory).catch(() => setNotificationHistory([])); return undefined; }, [currentUser?.email]);
  useEffect(() => { if (!toast) return undefined; const timer = window.setTimeout(() => setToast(''), 2800); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => {
    if (!accountOpen) return undefined;
    const closeAccountMenu = (event) => {
      if (!event.target.closest('.user-menu')) setAccountOpen(false);
    };
    document.addEventListener('click', closeAccountMenu);
    return () => document.removeEventListener('click', closeAccountMenu);
  }, [accountOpen]);

  const sortedSkills = [...skills].sort((first, second) => sort === 'rating' ? second.teacher.rating - first.teacher.rating : sort === 'newest' ? String(second._id).localeCompare(String(first._id)) : sort === 'nearby' && location ? Number(second.teacher.location.toLowerCase().includes(location.toLowerCase())) - Number(first.teacher.location.toLowerCase().includes(location.toLowerCase())) : 0);
  const recommendedSkills = currentUser?.wants?.length ? allSkills.filter((skill) => currentUser.wants.some((want) => `${skill.title} ${skill.category} ${skill.wants}`.toLowerCase().includes(want.toLowerCase()))).slice(0, 3) : [];
  const similarPeople = currentUser?.teaches?.length ? people.filter((person) => currentUser.teaches.some((skill) => person.skills.toLowerCase().includes(skill.toLowerCase())) || currentUser.wants?.some((skill) => person.skills.toLowerCase().includes(skill.toLowerCase()))) : people;

  const scrollTo = (id) => {
    setActivePage(null);
    setActiveModal(null);
    setMobileOpen(false);
    window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }));
  };

  const verificationToken = new URLSearchParams(window.location.search).get('verify');
  const resetToken = new URLSearchParams(window.location.search).get('reset');
  if (verificationToken) return <VerificationGate token={verificationToken} />;
  if (resetToken) return <ResetPasswordGate token={resetToken} />;
  if (!currentUser) return <AuthGate onLogin={(user) => { setCurrentUser(user); localStorage.setItem('skillswap-user', JSON.stringify(user)); }} />;

  return <><div className={darkMode ? 'app-shell dark-mode' : 'app-shell'}>
    <header className="site-header">
      <a className="brand" href="#top" onClick={() => scrollTo('top')}><span className="brand-mark"><ArrowLeftRight size={17} strokeWidth={2.4} /></span> skillswap</a>
      <button className="menu-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
      <nav className={mobileOpen ? 'main-nav open' : 'main-nav'}>
        <button onClick={() => { setActivePage('explore'); setMobileOpen(false); }}>{labels.explore}</button><button onClick={() => { setActivePage('people'); setMobileOpen(false); }}>{labels.people}</button><button onClick={() => { setActivePage('how'); setMobileOpen(false); }}>How it works</button><button onClick={() => { setActivePage('stories'); setMobileOpen(false); }}>Stories</button><button onClick={() => { setActivePage('community'); setMobileOpen(false); }}>{labels.community}</button><button onClick={() => { setActivePage('advanced'); setMobileOpen(false); }}><Sparkles size={14} /> {labels.advanced}</button>
        <button className={darkMode ? 'theme-toggle is-dark' : 'theme-toggle'} onClick={() => setDarkMode(!darkMode)} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}><Moon className="theme-moon" size={14} /><span className="theme-knob"></span><Sun className="theme-sun" size={14} /></button>
        {currentUser ? <div className="user-menu"><button className="user-menu-trigger" onClick={() => setAccountOpen(!accountOpen)} aria-expanded={accountOpen}>{currentUser.avatar ? <img className="nav-avatar" src={currentUser.avatar} alt="" /> : <span className="nav-avatar nav-avatar-fallback">{currentUser.name?.slice(0, 2).toUpperCase()}</span>}<span className="signed-in-user">{currentUser.name}</span><ChevronDown size={14} /></button>{accountOpen && <div className="user-dropdown"><button onClick={() => { setActiveModal('account-profile'); setAccountOpen(false); }}><UserRound size={14} /> My profile</button><button onClick={() => { setActiveModal('account-messages'); setAccountOpen(false); }}><MessageCircle size={14} /> Messages {unreadMessages > 0 && <span className="menu-count">{unreadMessages}</span>}</button><button onClick={() => { setActiveModal('account-exchanges'); setAccountOpen(false); }}><Repeat2 size={14} /> My exchanges</button><button onClick={() => { setActiveModal('account-saved'); setAccountOpen(false); }}><Bookmark size={14} /> Saved skills</button><button onClick={() => { setActiveModal('account-settings'); setAccountOpen(false); }}><Settings size={14} /> Settings</button><button onClick={() => { setActiveModal('account-password'); setAccountOpen(false); }}><Settings size={14} /> Change password</button><button onClick={() => { setActiveModal('account-safety'); setAccountOpen(false); }}><ShieldCheck size={14} /> Trust & safety</button><span className="dropdown-divider"></span><button className="logout-item" onClick={() => { localStorage.removeItem('skillswap-user'); setCurrentUser(null); setAccountOpen(false); }}><ArrowUpRight size={14} /> Log out</button></div>}</div> : <button className="login-link" onClick={() => setActiveModal('login')}>Log in</button>}
        {currentUser && <button className="notification-button" onClick={() => setNotificationOpen(!notificationOpen)} aria-label="Notifications" aria-expanded={notificationOpen}><Bell size={17} />{notificationHistory.filter((item) => !item.read).length > 0 && <span>{notificationHistory.filter((item) => !item.read).length}</span>}</button>}
        {!currentUser && <button className="nav-cta" onClick={() => setActiveModal('profile')}>Create a profile <ArrowUpRight size={16} /></button>}
      </nav>
    </header>

    {activePage && <DedicatedPage page={activePage} currentUser={currentUser} skills={sortedSkills} similarPeople={similarPeople} search={search} setSearch={setSearch} category={category} setCategory={setCategory} sort={sort} setSort={setSort} teachQuery={teachQuery} setTeachQuery={setTeachQuery} wantsQuery={wantsQuery} setWantsQuery={setWantsQuery} location={location} setLocation={setLocation} format={format} setFormat={setFormat} level={level} setLevel={setLevel} availability={availability} setAvailability={setAvailability} savedSkills={savedSkills} onSave={toggleSavedWithToast} onDetails={setSelectedSkill} onClose={() => setActivePage(null)} onConnect={openMessage} />}
    <main id="top" className={activePage ? 'home-content-hidden' : ''}>
      <section className="hero section-pad">
        <div className="hero-copy reveal"><div className="eyebrow"><Sparkles size={15} /> skills worth sharing</div><h1>Trade what you know.<br /><em>Grow together.</em></h1><p className="hero-text">A community where your skills become someone else’s next chapter — and theirs become yours.</p><div className="hero-actions"><button className="button button-dark" onClick={() => scrollTo('explore')}>Explore the exchange <ArrowUpRight size={17} /></button><button className="text-button" onClick={() => scrollTo('how')}>See how it works <span>↓</span></button></div><div className="proof"><div className="avatar-stack"><span>MC</span><span>LO</span><span>AM</span><span>+</span></div><div><strong>2,400+ exchanges</strong><small>made with good intentions</small></div></div></div>
        <div className="hero-art reveal-delay exchange-visual">
          <div className="visual-grid"></div>
          <div className="visual-header"><span className="live-dot"></span> live exchange <span>04 / 12</span></div>
          <div className="exchange-card teach-card"><div className="card-kicker">Maya offers</div><div className="visual-avatar avatar-peach">MC</div><strong>Brand photography</strong><small>18 successful swaps</small><div className="skill-pill">Creative</div></div>
          <div className="swap-connector"><span>↔</span><small>matched</small></div>
          <div className="exchange-card learn-card"><div className="card-kicker">Arjun is looking for</div><div className="visual-avatar avatar-blue">AM</div><strong>Conversational Spanish</strong><small>Beginner friendly</small><div className="skill-pill">Language</div></div>
          <div className="visual-footer"><span>community powered</span><span className="sparkle-mark">✦</span><span>no money needed</span></div>
        </div>
      </section>

      <section className="ticker"><div>learn something new</div><span>✦</span><div>share what you know</div><span>✦</span><div>make a good trade</div><span>✦</span><div>learn something new</div></section>

      <section className="section-pad explore-section" id="explore"><div className="section-heading"><div><div className="eyebrow">the exchange board</div><h2>Find your next <em>good trade.</em></h2></div><button className="text-button" onClick={() => setCategory('All')}>View all skills <ArrowUpRight size={16} /></button></div><div className="explore-toolbar"><div className="category-tabs">{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="search-box"><Search size={17} /><input aria-label="Search skills" placeholder="Search skills" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="sort-select">Sort<select aria-label="Sort skills" value={sort} onChange={(event) => setSort(event.target.value)}><option value="relevance">Relevance</option><option value="rating">Top rated</option><option value="newest">Newest</option></select></label></div><div className="discovery-filters"><input aria-label="I teach" placeholder="I teach..." value={teachQuery} onChange={(event) => setTeachQuery(event.target.value)} /><input aria-label="I want to learn" placeholder="I want to learn..." value={wantsQuery} onChange={(event) => setWantsQuery(event.target.value)} /><input aria-label="Location" placeholder="Location" value={location} onChange={(event) => setLocation(event.target.value)} /><select aria-label="Format" value={format} onChange={(event) => setFormat(event.target.value)}><option value="">Any format</option><option>Online</option><option>Video call</option><option>In person</option></select><select aria-label="Skill level" value={level} onChange={(event) => setLevel(event.target.value)}><option value="">Any level</option><option>Beginner friendly</option><option>Intermediate</option><option>Advanced</option><option>All levels</option></select><select aria-label="Availability" value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="">Any availability</option><option>Weekdays</option><option>Weekends</option><option>Flexible</option></select></div>{skillsLoading && page === 1 ? <SkillSkeletons /> : skillsError ? <ErrorState message={skillsError} onRetry={() => setPage(1)} /> : sortedSkills.length ? <><div className="skill-grid">{sortedSkills.map((skill) => <SkillCard key={skill._id || skill.title} skill={skill} saved={savedSkills.some((item) => item._id === skill._id)} onSave={() => { toggleSavedWithToast(skill); }} onConnect={() => openMessage({ name: skill.teacher.name, email: skill.teacher.email || '' })} />)}</div>{hasMore && <button className="load-more-button" onClick={() => setPage((current) => current + 1)}>Load more skills <ArrowDown size={16} /></button>}</> : <EmptyState />}</section>

      {recommendedSkills.length > 0 && <section className="recommendation-section section-pad"><div className="eyebrow">picked for your profile</div><h2>Recommended <em>good trades.</em></h2><div className="recommendation-grid">{recommendedSkills.map((skill) => <SkillCard key={skill._id} skill={skill} saved={savedSkills.some((item) => item._id === skill._id)} onSave={() => toggleSavedWithToast(skill)} onConnect={() => openMessage({ name: skill.teacher.name, email: skill.teacher.email || '' })} />)}</div></section>}

      <section className="people-band section-pad" id="people"><div className="section-heading"><div><div className="eyebrow">people behind the skills</div><h2>{currentUser ? 'Suggested people.' : 'Good at something?'}<br /><em>Meet your people.</em></h2></div>{!currentUser && <button className="button button-light" onClick={() => setActiveModal('profile')}>Join the community <ArrowUpRight size={17} /></button>}</div><div className="people-grid">{similarPeople.map((person) => <div className="person-card" key={person.name}><div className="person-avatar" style={{ background: person.color }}>{person.initials}</div><div className="person-info"><h3>{person.name}</h3><p>{person.role}</p><small>{person.city}</small><div className="person-skills">{person.skills.split(' · ').map((skill) => <span key={skill}>{skill}</span>)}</div></div><ArrowUpRight className="person-arrow" size={19} /></div>)}</div></section>

      <section className="how-section section-pad" id="how"><div className="section-heading centered"><div><div className="eyebrow">no awkward barter math</div><h2>Three steps to a <em>better exchange.</em></h2></div></div><div className="steps"><Step number="01" title="Put it out there" text="Tell the community what you know, and what you are curious to learn next." /><Step number="02" title="Find the spark" text="Browse real people and specific skills until something clicks." /><Step number="03" title="Make the trade" text="Agree on a format, swap time and leave a little better than you arrived." /></div></section>

      <section className="story-section section-pad" id="stories"><div className="story-quote">“I came for the pottery lessons.<br /><em>I stayed for the community.</em>”</div><div className="story-footer"><div className="story-person"><div className="mini-avatar">JR</div><div><strong>Jules R.</strong><small>Member since 2024</small></div></div><div className="story-count"><strong>18</strong><span>skills exchanged<br />and counting</span></div></div></section>
    </main>

    <footer className="footer section-pad"><div className="brand footer-brand"><span className="brand-mark"><ArrowLeftRight size={17} strokeWidth={2.4} /></span> skillswap</div><p>Skill is more valuable when it moves.</p><div className="footer-links"><button onClick={() => setActiveModal('contact')}>Contact</button><button onClick={() => scrollTo('how')}>How it works</button>{!currentUser && <button onClick={() => setActiveModal('profile')}>Create profile</button>}</div></footer>
    <button className="back-to-top" onClick={() => scrollTo('top')} aria-label="Back to top" title="Back to top"><ArrowUp size={18} /></button>
    {notificationOpen && <NotificationsPanel notifications={notificationHistory} onMarkRead={() => { setNotificationsRead(true); if (currentUser?.email) markNotificationsRead(currentUser.email).then(() => setNotificationHistory((items) => items.map((item) => ({ ...item, read: true })))); setNotificationOpen(false); }} onClose={() => setNotificationOpen(false)} />}
    {showOnboarding && <OnboardingPanel onDone={() => { localStorage.setItem('skillswap-onboarding-done', 'true'); setShowOnboarding(false); }} />}
    {toast && <div className="toast" role="status"><Check size={15} /> {toast}</div>}
    {selectedSkill && <SkillDetailPanel skill={selectedSkill} currentUser={currentUser} onClose={() => setSelectedSkill(null)} onConnect={openMessage} onOffer={() => { setSelectedSkill(null); setActiveModal(currentUser ? 'account-edit' : 'profile'); }} />}
    {activeModal === 'account-advanced' && <AdvancedPanel user={currentUser} onClose={() => setActiveModal(null)} onSaved={(user) => { setCurrentUser(user); localStorage.setItem('skillswap-user', JSON.stringify(user)); }} />}
    {activeModal && (activeModal === 'account-edit' ? <EditProfilePanelEnhanced user={currentUser} onClose={() => setActiveModal(null)} onSaved={(user) => { setCurrentUser(user); localStorage.setItem('skillswap-user', JSON.stringify(user)); setActiveModal('account-profile'); }} /> : activeModal === 'account-community' ? <CommunityPanel user={currentUser} onClose={() => setActiveModal(null)} /> : activeModal === 'account-password' ? <PasswordPanel email={currentUser?.email} onClose={() => setActiveModal(null)} /> : activeModal === 'account-safety' ? <SafetyPanel user={currentUser} onClose={() => setActiveModal(null)} onDeleted={() => { localStorage.removeItem('skillswap-user'); setCurrentUser(null); setActiveModal(null); }} /> : activeModal === 'account-exchanges' ? <ExchangesPanel user={currentUser} onClose={() => setActiveModal(null)} /> : activeModal === 'account-messages' ? <MessagesPanel user={currentUser} onClose={() => setActiveModal(null)} /> : activeModal === 'account-saved' ? <SavedSkillsPanel skills={allSkills} savedSkills={savedSkills} onToggle={toggleSavedSkill} onConnect={openMessage} onClose={() => setActiveModal(null)} /> : activeModal === 'account-settings' ? <SettingsPanel darkMode={darkMode} setDarkMode={setDarkMode} accent={accent} setAccent={setAccent} language={language} setLanguage={setLanguage} onPassword={() => setActiveModal('account-password')} onClose={() => setActiveModal(null)} /> : activeModal.startsWith('account-') ? <AccountPanelEnhanced section={activeModal.replace('account-', '')} user={currentUser} onClose={() => setActiveModal(null)} onEdit={() => setActiveModal('account-edit')} /> : <Modal type={activeModal} recipient={messageRecipient} sender={currentUser} onClose={() => { setActiveModal(null); setStatus(''); }} status={status} setStatus={setStatus} onLogin={(user) => { setCurrentUser(user); localStorage.setItem('skillswap-user', JSON.stringify(user)); }} />)}
  </div></>;
}

function AuthGate({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', teaches: '', wants: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState('');
  const [resetLink, setResetLink] = useState('');
  const switchMode = (nextMode) => { setMode(nextMode); setForm({ name: '', email: '', password: '', teaches: '', wants: '' }); setError(''); setResetStatus(''); setResetLink(''); };
  const requestReset = async () => {
    if (!resetEmail.trim()) { setResetStatus('Please enter a valid email.'); return; }
    setResetLink('');
    setResetLoading(true);
    try {
      const result = await forgotPassword(resetEmail.trim());
      setResetStatus(result.message);
      if (result.developmentToken) {
        const resetUrl = `${window.location.origin}${window.location.pathname}?reset=${encodeURIComponent(result.developmentToken)}`;
        setResetLink(resetUrl);
        window.location.assign(resetUrl);
      }
    } catch (requestError) {
      setResetStatus(requestError.message || 'Could not start password reset.');
    } finally {
      setResetLoading(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const result = await createProfile({ ...form, teaches: form.teaches ? [form.teaches] : [], wants: form.wants ? [form.wants] : [] });
        setNotice(`${result.message} ${result.developmentToken ? `Development token: ${result.developmentToken}` : ''}`);
        setMode('login');
        setForm({ name: '', email: form.email, password: '', teaches: '', wants: '' });
      } else {
        const result = await loginProfile({ email: form.email, password: form.password });
        onLogin(result.profile);
      }
    } catch (requestError) {
      setError(requestError.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return <><div className="auth-gate"><div className="auth-panel"><div className="auth-brand"><span className="brand-mark"><ArrowLeftRight size={17} strokeWidth={2.4} /></span><strong>skillswap</strong></div><div className="auth-layout"><div className="auth-intro"><div className="eyebrow"><Sparkles size={14} /> skills worth sharing</div><h1>Trade what you know.<br /><em>Grow together.</em></h1><p>Join a community where every useful skill can become someone else’s next chapter.</p><div className="auth-proof"><span>2,400+</span><small>good exchanges already moving</small></div></div><div className="auth-card"><div className="auth-tabs"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Log in</button><button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>Sign in</button></div><div className="eyebrow">{mode === 'login' ? 'welcome back' : 'make your move'}</div><h2>{mode === 'login' ? 'Log in to SkillSwap.' : 'Create your profile.'}</h2><p>{mode === 'login' ? 'Pick up where your next good exchange left off.' : 'Put one skill on the table and meet your next exchange partner.'}</p><form onSubmit={submit}>{mode === 'signup' && <input required placeholder="Your name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />}<input required type="email" placeholder="Email address" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /><PasswordInput required minLength={mode === 'signup' ? 8 : undefined} placeholder={mode === 'signup' ? 'Password (8+ characters)' : 'Password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />{mode === 'signup' && <><input placeholder="What can you teach?" value={form.teaches} onChange={(event) => setForm({ ...form, teaches: event.target.value })} /><input placeholder="What do you want to learn?" value={form.wants} onChange={(event) => setForm({ ...form, wants: event.target.value })} /></>}{error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="auth-notice" role="status">{notice}</p>}<button className="button button-dark auth-submit" type="submit" disabled={loading}>{loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create profile'} <ArrowUpRight size={16} /></button></form>{mode === 'login' && <button type="button" className="forgot-password-link" onClick={() => { setResetEmail(form.email); setResetOpen(true); setError(''); }} disabled={loading}>Forgot password?</button>}<small className="auth-privacy">Your profile stays yours. No money, no pressure, just useful exchanges.</small></div></div></div></div>{resetOpen && <div className="modal-backdrop reset-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setResetOpen(false)} onClick={(event) => event.stopPropagation()}><div className="modal-panel reset-panel" role="dialog" aria-modal="true" aria-labelledby="reset-password-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setResetOpen(false)} aria-label="Close"><X size={19} /></button><div className="eyebrow">account recovery</div><h2 id="reset-password-title">Reset your password.</h2><p>Enter your account email and we will send a secure reset link.</p>{resetStatus && <p className="reset-result" role="alert">{resetStatus}</p>}<form onSubmit={(event) => { event.preventDefault(); requestReset(); }}><input required type="email" autoFocus placeholder="Email address" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} /><button className="button button-dark" type="submit" disabled={resetLoading}>{resetLoading ? 'Sending...' : 'Send reset link'} <ArrowUpRight size={16} /></button></form></div></div>}</>;
}

function VerificationGate({ token }) {
  const [status, setStatus] = useState('Verifying your email...');
  useEffect(() => { verifyEmail(token).then((result) => { setStatus(result.message); window.history.replaceState({}, '', window.location.pathname); }).catch((error) => setStatus(error.message)); }, [token]);
  return <div className="auth-gate"><div className="auth-card verification-card"><div className="account-panel-icon"><Check size={23} /></div><div className="eyebrow">email verification</div><h2>{status}</h2><p>Your SkillSwap account will be available after verification.</p><a className="button button-dark" href={window.location.pathname}>Continue to SkillSwap <ArrowUpRight size={16} /></a></div></div>;
}

function ResetPasswordGate({ token }) {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event) => { event.preventDefault(); setSaving(true); setStatus(''); try { const result = await resetPassword({ token, newPassword: password }); setStatus(result.message); window.history.replaceState({}, '', window.location.pathname); } catch (error) { setStatus(error.message); } finally { setSaving(false); } };
  return <div className="auth-gate"><div className="auth-card verification-card"><div className="account-panel-icon"><ShieldCheck size={23} /></div><div className="eyebrow">account recovery</div><h2>Choose a new password.</h2><p>Use at least 8 characters for your new SkillSwap password.</p><form onSubmit={submit}><PasswordInput required minLength={8} placeholder="New password (8+ characters)" value={password} onChange={(event) => setPassword(event.target.value)} /><button className="button button-dark auth-submit" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save new password'} <Check size={16} /></button></form>{status && <p className="auth-notice" role="status">{status}</p>}</div></div>;
}

function PasswordInput({ value, onChange, ...props }) {
  const [visible, setVisible] = useState(false);
  return <span className="password-input-shell"><input {...props} type={visible ? 'text' : 'password'} value={value} onChange={onChange} /><button type="button" className="password-icon-button" aria-label={visible ? 'Hide password' : 'Show password'} title={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible((current) => !current)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>;
}

function SkillCard({ skill, saved, onSave, onConnect, onDetails }) { return <article className="skill-card" onClick={(event) => { if (!event.target.closest('button')) onDetails?.(); }}><div className="card-top" style={{ background: skill.color }}><span className="card-category">{skill.category}</span><button className="save-skill-button" onClick={onSave} aria-label={saved ? `Remove ${skill.title} from saved skills` : `Save ${skill.title}`} title={saved ? 'Remove saved skill' : 'Save skill'}><Bookmark size={16} fill={saved ? 'currentColor' : 'none'} /></button><button className="round-arrow" onClick={onConnect} aria-label={`Connect with ${skill.teacher.name}`}><ArrowUpRight size={18} /></button><div className="skill-glyph">{skill.title.charAt(0)}</div></div><div className="card-body"><div className="card-title-row"><h3>{skill.title}</h3><div className="rating"><Star size={13} fill="currentColor" /> {skill.teacher.rating}</div></div><p>{skill.description}</p><div className="card-meta"><span>{skill.level}</span><span>{skill.format}</span></div><div className="trade-row"><div className="teacher"><span className="tiny-avatar">{skill.teacher.avatar}</span><span><strong>{skill.teacher.name}</strong><small>{skill.teacher.role}</small></span></div><span className="trade-icon">↔</span><span className="wants">{skill.wants}</span></div></div></article>; }
function SkillSkeletons() { return <div className="skill-grid" aria-label="Loading skills">{[1, 2, 3, 4].map((item) => <div className="skill-skeleton" key={item}><div className="skeleton-top"></div><div className="skeleton-line long"></div><div className="skeleton-line"></div><div className="skeleton-line short"></div></div>)}</div>; }
function ErrorState({ message, onRetry }) { return <div className="state-panel error-state" role="alert"><XCircle size={30} /><strong>{message}</strong><p>Check that the API is running, then try again.</p><button className="button button-dark" onClick={onRetry}>Try again</button></div>; }
function EmptyState() { return <div className="state-panel"><Search size={30} /><strong>No matching skills</strong><p>Try a different keyword or choose another category.</p></div>; }
function Step({ number, title, text }) { return <div className="step"><span className="step-number">{number}</span><h3>{title}</h3><p>{text}</p><span className="step-line"></span></div>; }

function AccountPanel({ section, user, onClose, onEdit }) { const content = { exchanges: ['My exchanges', 'Your active and completed skill swaps will appear here.'], saved: ['Saved skills', 'Save interesting skills from the exchange board to find them quickly later.'], settings: ['Settings', 'Manage your account preferences and privacy here.'] }[section]; const teachSkills = user?.teaches?.filter(Boolean) || []; const learnSkills = user?.wants?.filter(Boolean) || []; return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal-panel account-panel"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button>{section === 'profile' ? <><div className="profile-heading"><span className="profile-avatar">{user?.name?.slice(0, 2).toUpperCase()}</span><div><div className="eyebrow">your profile</div><h2>{user?.name}</h2><small>{user?.email}</small></div></div><div className="profile-about"><span className="profile-label">about you</span><p>{user?.bio || 'Tell the community what makes your skills and perspective useful.'}</p></div><div className="profile-columns"><div><span className="profile-label">i can teach</span><div className="profile-tags">{teachSkills.length ? teachSkills.map((skill) => <span key={skill}>{skill}</span>) : <span className="empty-tag">Add a skill</span>}</div></div><div><span className="profile-label">i want to learn</span><div className="profile-tags">{learnSkills.length ? learnSkills.map((skill) => <span key={skill}>{skill}</span>) : <span className="empty-tag">Add a goal</span>}</div></div></div><button className="button button-dark" onClick={onEdit}>Edit profile <ArrowUpRight size={16} /></button></> : <><div className="account-panel-icon"><UserRound size={23} /></div><div className="eyebrow">your account</div><h2>{content[0]}</h2><p>{content[1]}</p><div className="account-summary"><span className="account-summary-avatar">{user?.name?.slice(0, 2).toUpperCase()}</span><div><strong>{user?.name}</strong><small>{user?.email}</small></div></div><button className="button button-dark" onClick={onClose}>Done <Check size={16} /></button></>}</div></div>; }

function EditProfilePanel({ user, onClose, onSaved }) { const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', location: user?.location || '', bio: user?.bio || '', teaches: (user?.teaches || []).join(', '), wants: (user?.wants || []).join(', ') }); const [error, setError] = useState(''); const submit = async (event) => { event.preventDefault(); try { const updated = await updateProfile(user._id, { ...form, teaches: form.teaches.split(',').map((skill) => skill.trim()).filter(Boolean), wants: form.wants.split(',').map((skill) => skill.trim()).filter(Boolean) }); onSaved(updated); } catch (requestError) { setError(requestError.message); } }; return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal-panel edit-profile-panel"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button><div className="eyebrow">edit your profile</div><h2>Make it more you.</h2><p>Keep your exchange profile current so the right people can find you.</p><form onSubmit={submit}><input required value={form.name} placeholder="Your name" onChange={(event) => setForm({ ...form, name: event.target.value })} /><input required type="email" value={form.email} placeholder="Email address" onChange={(event) => setForm({ ...form, email: event.target.value })} /><input value={form.location} placeholder="Location" onChange={(event) => setForm({ ...form, location: event.target.value })} /><textarea value={form.bio} rows="3" placeholder="Short bio" onChange={(event) => setForm({ ...form, bio: event.target.value })}></textarea><input value={form.teaches} placeholder="Skills you teach, separated by commas" onChange={(event) => setForm({ ...form, teaches: event.target.value })} /><input value={form.wants} placeholder="Skills you want to learn, separated by commas" onChange={(event) => setForm({ ...form, wants: event.target.value })} />{error && <p className="form-error">{error}</p>}<button className="button button-dark" type="submit">Save changes <Check size={16} /></button></form></div></div>; }

function Modal({ type, recipient, sender, onClose, status, setStatus, onLogin }) { const isProfile = type === 'profile'; const isLogin = type === 'login'; const isContact = type === 'contact'; const [form, setForm] = useState({}); const submit = async (event) => { event.preventDefault(); try { if (isProfile) await createProfile(form); else if (isLogin) { const result = await loginProfile(form); onLogin(result.profile); } else if (isContact) { if (!sender) throw new Error('Please log in before messaging another member.'); await sendMessage({ senderName: sender.name, senderEmail: sender.email, recipientName: recipient?.name || 'SkillSwap member', recipientEmail: recipient?.email || '', message: form.message }); } setStatus(isProfile ? 'Profile saved. Welcome to the exchange.' : isLogin ? 'Welcome back to SkillSwap.' : 'Message sent to your exchange partner.'); } catch (error) { setStatus(error.message || 'Something went wrong. Please try again.'); } }; return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal-panel"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button>{status ? <div className="success-state"><div className="success-icon"><Check size={22} /></div><h2>{status}</h2><button className="button button-dark" onClick={onClose}>Close</button></div> : <><div className="eyebrow">{isProfile ? 'make your move' : isLogin ? 'welcome back' : 'say hello'}</div><h2>{isProfile ? 'Create your profile.' : isLogin ? 'Log in to SkillSwap.' : `Message ${recipient?.name || 'this member'}.`}</h2><p>{isProfile ? 'Put one skill on the table. You never know who has the thing you need.' : isLogin ? 'Pick up where your next good exchange left off.' : `Start a direct conversation with ${recipient?.name || 'your exchange partner'}.`}</p><form onSubmit={submit}>{isProfile ? <><input required placeholder="Your name" onChange={(e) => setForm({ ...form, name: e.target.value })} /><input required type="email" placeholder="Email address" onChange={(e) => setForm({ ...form, email: e.target.value })} /><input required type="password" minLength="8" placeholder="Password (8+ characters)" onChange={(e) => setForm({ ...form, password: e.target.value })} /><input placeholder="What can you teach?" onChange={(e) => setForm({ ...form, teaches: [e.target.value] })} /><input placeholder="What do you want to learn?" onChange={(e) => setForm({ ...form, wants: [e.target.value] })} /></> : isLogin ? <><input required type="email" placeholder="Email address" onChange={(e) => setForm({ ...form, email: e.target.value })} /><input required type="password" placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} /></> : <textarea required placeholder="Write your message" rows="5" onChange={(e) => setForm({ ...form, message: e.target.value })}></textarea>}<button className="button button-dark" type="submit">{isProfile ? 'Create profile' : isLogin ? 'Log in' : 'Send message'} <ArrowUpRight size={16} /></button></form></>}</div></div>; }

function AccountPanelEnhanced({ section, user, onClose, onEdit }) {
  const content = {
    exchanges: ['My exchanges', 'Your active and completed skill swaps will appear here.'],
    saved: ['Saved skills', 'Save interesting skills from the exchange board to find them quickly later.'],
    settings: ['Settings', 'Manage your account preferences and privacy here.'],
    advanced: ['Advanced workspace', 'Use your learning profile to find better exchanges.']
  }[section];
  const avatar = user?.avatar ? <img src={user.avatar} alt="Profile" /> : user?.name?.slice(0, 2).toUpperCase();
  const completion = Math.round(([user?.name, user?.email, user?.avatar, user?.bio, user?.location, user?.teaches?.length, user?.wants?.length].filter(Boolean).length / 7) * 100);

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className={`modal-panel account-panel ${section === 'profile' ? 'profile-view' : ''}`}>
    <button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
    {section === 'profile' ? <>
      <div className="profile-heading"><span className="profile-avatar">{avatar}</span><div><div className="eyebrow">your profile</div><h2>{user?.name} {user?.verified && <span className="verified-badge" title="Verified profile">✓</span>}</h2><span className="credential-label">login credential</span><small>{user?.email}</small>{user?.rating > 0 && <small className="profile-rating"><Star size={12} fill="currentColor" /> {user.rating} · {user.reviewCount || 0} reviews</small>}</div></div>
      <div className="profile-about"><span className="profile-label">about you</span><p>{user?.bio || 'Tell the community what makes your skills and perspective useful.'}</p></div>
      <div className="profile-columns"><div><span className="profile-label">i can teach</span><div className="profile-tags">{user?.teaches?.length ? user.teaches.map((skill) => <span key={skill}>{skill}</span>) : <span className="empty-tag">Add a skill</span>}</div></div><div><span className="profile-label">i want to learn</span><div className="profile-tags">{user?.wants?.length ? user.wants.map((skill) => <span key={skill}>{skill}</span>) : <span className="empty-tag">Add a goal</span>}</div></div></div>
      <div className="completion-block"><div><span>Profile completion</span><strong>{completion}%</strong></div><div className="completion-track"><span style={{ width: `${completion}%` }}></span></div></div><button className="button button-dark" onClick={onEdit}>Edit profile <ArrowUpRight size={16} /></button>
    </> : <><div className="account-panel-icon"><UserRound size={23} /></div><div className="eyebrow">your account</div><h2>{content[0]}</h2><p>{content[1]}</p><div className="account-summary"><span className="account-summary-avatar">{avatar}</span><div><strong>{user?.name}</strong><small>{user?.email}</small></div></div><button className="button button-dark" onClick={onClose}>Done <Check size={16} /></button></>}
  </div></div>;
}

function EditProfilePanelEnhanced({ user, onClose, onSaved }) {
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', location: user?.location || '', bio: user?.bio || '', teaches: (user?.teaches || []).join(', '), wants: (user?.wants || []).join(', ') });
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [error, setError] = useState('');
  const handleAvatar = (event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) { setError('Profile picture must be smaller than 2MB.'); return; } const reader = new FileReader(); reader.onload = () => setAvatarPreview(reader.result); reader.readAsDataURL(file); };
  const submit = async (event) => { event.preventDefault(); try { const updated = await updateProfile(user._id, { ...form, avatar: avatarPreview, teaches: form.teaches.split(',').map((skill) => skill.trim()).filter(Boolean), wants: form.wants.split(',').map((skill) => skill.trim()).filter(Boolean) }); onSaved(updated); } catch (requestError) { setError(requestError.message); } };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal-panel edit-profile-panel"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button><div className="eyebrow">edit your profile</div><h2>Make it more you.</h2><p>Keep your exchange profile current so the right people can find you.</p><form onSubmit={submit}><label className="avatar-upload"><span className="upload-avatar">{avatarPreview ? <img src={avatarPreview} alt="Selected profile" /> : user?.name?.slice(0, 2).toUpperCase()}</span><span><strong>Profile picture</strong><small>JPG, PNG or WebP · max 2MB</small></span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatar} /></label><input required value={form.name} placeholder="Your name" onChange={(event) => setForm({ ...form, name: event.target.value })} /><input required type="email" value={form.email} readOnly aria-readonly="true" title="Login email cannot be edited" placeholder="Email address" /><input value={form.location} placeholder="Location" onChange={(event) => setForm({ ...form, location: event.target.value })} /><textarea value={form.bio} rows="3" placeholder="Short bio" onChange={(event) => setForm({ ...form, bio: event.target.value })}></textarea><input value={form.teaches} placeholder="Skills you teach, separated by commas" onChange={(event) => setForm({ ...form, teaches: event.target.value })} /><input value={form.wants} placeholder="Skills you want to learn, separated by commas" onChange={(event) => setForm({ ...form, wants: event.target.value })} />{error && <p className="form-error">{error}</p>}<button className="button button-dark" type="submit">Save changes <Check size={16} /></button></form></div></div>;
}

function ExchangesPanel({ user, onClose }) {
  const [tab, setTab] = useState('active');
  const [pending, setPending] = useState(true);
  const [active, setActive] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal-panel exchanges-panel"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button><div className="eyebrow">your exchange desk</div><h2>My exchanges.</h2><p>Keep every skill swap moving in the right direction.</p><div className="exchange-tabs">{[['active', 'Active', 1], ['pending', 'Pending', pending ? 1 : 0], ['completed', 'Completed', 0]].map(([value, label, count]) => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}<span>{count}</span></button>)}</div>{tab === 'active' && active && <div className="exchange-item"><div className="exchange-item-top"><span className="status-pill status-active"><CheckCircle2 size={13} /> In progress</span><span className="exchange-date">Next: Sat, 7:00 PM</span></div><div className="exchange-match"><div className="exchange-person exchange-you"><span>{user?.name?.slice(0, 2).toUpperCase()}</span><strong>{user?.teaches?.[0] || 'Your skill'}</strong><small>You teach</small></div><div className="exchange-line"><Repeat2 size={19} /><small>good trade</small></div><div className="exchange-person"><span className="exchange-avatar-blue">AM</span><strong>Python</strong><small>Arjun teaches</small></div></div><div className="exchange-actions"><button onClick={() => {}}><MessageCircle size={15} /> Open chat</button><button onClick={() => setActive(false)}><Check size={15} /> Mark complete</button></div></div>}{tab === 'pending' && pending && <div className="exchange-item"><div className="exchange-item-top"><span className="status-pill status-pending"><Clock3 size={13} /> Awaiting response</span><span className="exchange-date">Received today</span></div><div className="pending-copy"><strong>Maya wants to learn {user?.teaches?.[0] || 'your skill'}</strong><p>She can trade conversational Spanish in return.</p></div><div className="exchange-actions"><button className="accept-action" onClick={() => { setPending(false); setTab('active'); }}><Check size={15} /> Accept request</button><button onClick={() => setPending(false)}><XCircle size={15} /> Decline</button></div></div>}{tab === 'completed' && <div className="empty-exchanges"><CheckCircle2 size={30} /><strong>No completed exchanges yet</strong><p>Your finished swaps and ratings will appear here.</p></div>}{tab === 'active' && !active && <div className="empty-exchanges"><CheckCircle2 size={30} /><strong>Exchange completed</strong><p>Nice work. Add a rating from your exchange history soon.</p><button className="button button-dark">Rate exchange <Star size={15} /></button></div>}</div></div>;
}

function SavedSkillsPanel({ skills, savedSkills, onToggle, onConnect, onClose }) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.toLowerCase().trim();
  const filtered = skills.filter((skill) => { const matches = skill.wants.toLowerCase().includes(normalizedQuery); return matches && (normalizedQuery || savedSkills.some((item) => item._id === skill._id)); });
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal-panel saved-panel"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button><div className="eyebrow">your shortlist</div><h2>Saved skills.</h2><p>{normalizedQuery ? 'Search the full exchange board and save something new.' : 'Keep the exchanges that caught your attention close by.'}</p><label className="search-box saved-search"><Search size={16} /><input placeholder="Search any skill" value={query} onChange={(event) => setQuery(event.target.value)} /></label>{filtered.length ? <div className="saved-list">{filtered.map((skill) => { const isSaved = savedSkills.some((item) => item._id === skill._id); return <div className="saved-item" key={skill._id}><div className="saved-item-icon" style={{ background: skill.color }}>{skill.title.charAt(0)}</div><div className="saved-item-copy"><strong>{skill.title}</strong><small>{skill.teacher.name} · {skill.category}</small></div><button className="saved-connect" onClick={() => onConnect({ name: skill.teacher.name, email: skill.teacher.email || '' })}>Start exchange</button><button className={isSaved ? 'saved-remove' : 'saved-add'} onClick={() => onToggle(skill)} aria-label={isSaved ? `Remove ${skill.title}` : `Save ${skill.title}`}>{isSaved ? <X size={15} /> : <Bookmark size={15} />}</button></div>; })}</div> : <div className="empty-exchanges saved-empty"><Bookmark size={30} /><strong>{normalizedQuery ? 'No matching skill found' : 'No saved skills yet'}</strong><p>{normalizedQuery ? 'Try another keyword, category or teacher name.' : 'Search any skill above or bookmark one from the exchange board.'}</p></div>}<button className="button button-dark" onClick={onClose}>Done <Check size={16} /></button></div></div>;
}

function SettingsPanel({ darkMode, setDarkMode, accent, setAccent, onPassword, onClose }) {
  const [settings, setSettings] = useState(() => JSON.parse(localStorage.getItem('skillswap-settings') || '{"profileVisible":true,"messages":true,"requests":true,"reminders":true,"format":"Online","availability":"Weekends"}'));
  const update = (key, value) => setSettings((current) => { const next = { ...current, [key]: value }; localStorage.setItem('skillswap-settings', JSON.stringify(next)); return next; });
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal-panel settings-panel"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button><div className="eyebrow">your preferences</div><h2>Settings.</h2><p>Shape how you learn, share and stay in touch.</p><div className="settings-section"><span className="settings-heading">Privacy</span><SettingToggle label="Profile visible to community" checked={settings.profileVisible} onChange={(value) => update('profileVisible', value)} /><SettingToggle label="Allow direct messages" checked={settings.messages} onChange={(value) => update('messages', value)} /></div><div className="settings-section"><span className="settings-heading">Notifications</span><SettingToggle label="Exchange requests" checked={settings.requests} onChange={(value) => update('requests', value)} /><SettingToggle label="Session reminders" checked={settings.reminders} onChange={(value) => update('reminders', value)} /></div><div className="settings-section"><span className="settings-heading">Exchange preferences</span><label className="settings-select">Preferred format<select value={settings.format} onChange={(event) => update('format', event.target.value)}><option>Online</option><option>In person</option><option>Both</option></select></label><label className="settings-select">Availability<select value={settings.availability} onChange={(event) => update('availability', event.target.value)}><option>Weekdays</option><option>Weekends</option><option>Flexible</option></select></label></div><div className="settings-section"><span className="settings-heading">Appearance</span><SettingToggle label="Dark mode" checked={darkMode} onChange={setDarkMode} /><label className="settings-select">Accent theme<select value={accent} onChange={(event) => setAccent(event.target.value)}><option value="lime">Lime</option><option value="coral">Coral</option><option value="sky">Sky</option></select></label></div><button className="button button-dark" onClick={onClose}>Done <Check size={16} /></button></div></div>;
}

function SettingToggle({ label, checked, onChange }) { return <label className="setting-row"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className="toggle-track"><span></span></span></label>; }

function PasswordPanel({ email, onClose }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [status, setStatus] = useState('');
  const submit = async (event) => { event.preventDefault(); try { const result = await changePassword({ email, ...form }); setStatus(result.message); } catch (error) { setStatus(error.message); } };
  const requestReset = async () => { try { const result = await forgotPassword(email); setStatus(result.developmentToken ? `${result.message} Dev token: ${result.developmentToken}` : result.message); } catch (error) { setStatus(error.message); } };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal-panel password-panel"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button><div className="eyebrow">account security</div><h2>Change password.</h2><p>Your login email is <strong>{email}</strong>. It cannot be edited here.</p><form onSubmit={submit}><input required type="password" placeholder="Current password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} /><input required minLength="8" type="password" placeholder="New password (8+ characters)" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} /><button className="button button-dark" type="submit">Save password <Check size={16} /></button></form><button className="forgot-password" onClick={requestReset}>Forgot password? Send reset instructions</button>{status && <p className="password-status" role="status">{status}</p>}</div></div>;
}

function OnboardingPanel({ onDone }) {
  const [step, setStep] = useState(0);
  const steps = [['Offer a skill', 'Put something you know on the exchange board.'], ['Find your match', 'Search for people who want to learn it and offer something you want in return.'], ['Make the trade', 'Message your match, schedule a session and grow together.']];
  return <div className="modal-backdrop onboarding-backdrop"><div className="modal-panel onboarding-panel"><div className="onboarding-mark"><ArrowLeftRight size={25} /></div><div className="eyebrow">welcome to skillswap</div><h2>{steps[step][0]}.</h2><p>{steps[step][1]}</p><div className="onboarding-progress">{steps.map((_, index) => <span className={index <= step ? 'active' : ''} key={index}></span>)}</div><div className="onboarding-actions">{step > 0 && <button className="text-button" onClick={() => setStep((value) => value - 1)}>Back</button>}<button className="button button-dark" onClick={() => step === steps.length - 1 ? onDone() : setStep((value) => value + 1)}>{step === steps.length - 1 ? 'Start exploring' : 'Next'} <ArrowUpRight size={16} /></button></div><button className="onboarding-skip" onClick={onDone}>Skip for now</button></div></div>;
}

function SafetyPanel({ user, onClose, onDeleted }) {
  const [reportedEmail, setReportedEmail] = useState('');
  const [reason, setReason] = useState('spam');
  const [status, setStatus] = useState('');
  const verify = async () => { try { const result = await sendVerification(user.email); setStatus(result.developmentToken ? `${result.message} Token: ${result.developmentToken}` : result.message); } catch (error) { setStatus(error.message); } };
  const report = async (event) => { event.preventDefault(); try { const result = await reportUser({ reporterEmail: user.email, reportedEmail, reason }); setStatus(result.message); } catch (error) { setStatus(error.message); } };
  const block = async () => { try { const result = await blockUser({ blockerEmail: user.email, blockedEmail: reportedEmail }); setStatus(result.message); } catch (error) { setStatus(error.message); } };
  const removeAccount = async () => { if (!window.confirm('Delete your SkillSwap account permanently?')) return; try { await deleteAccount(user.email); onDeleted(); } catch (error) { setStatus(error.message); } };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal-panel safety-panel"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button><div className="account-panel-icon"><ShieldCheck size={23} /></div><div className="eyebrow">trust & safety</div><h2>Stay in control.</h2><p>Verify your email, report unsafe behavior, block accounts and manage deletion.</p><div className="safety-section"><strong>Email verification</strong><small>{user.emailVerified ? 'Your email is verified.' : 'Your email is not verified yet.'}</small>{!user.emailVerified && <button className="button button-light" onClick={verify}>Send verification</button>}</div><div className="safety-section"><strong>Report or block a user</strong><form onSubmit={report}><input required type="email" placeholder="User email" value={reportedEmail} onChange={(event) => setReportedEmail(event.target.value)} /><select value={reason} onChange={(event) => setReason(event.target.value)}><option value="spam">Spam</option><option value="harassment">Harassment</option><option value="unsafe">Unsafe behavior</option><option value="other">Other</option></select><div className="safety-actions"><button className="button button-dark" type="submit">Report user</button><button className="button button-light" type="button" onClick={block}>Block user</button></div></form></div><div className="safety-section danger-zone"><strong>Delete account</strong><small>This permanently removes your profile and cannot be undone.</small><button className="danger-button" onClick={removeAccount}>Delete my account</button></div>{status && <p className="password-status" role="status">{status}</p>}<button className="button button-dark" onClick={onClose}>Done <Check size={16} /></button></div></div>;
}

function CommunityPanel({ user, onClose }) {
  const [groups, setGroups] = useState([]); const [leaders, setLeaders] = useState([]); const [joined, setJoined] = useState({}); const [room, setRoom] = useState('');
  useEffect(() => { getGroups().then(setGroups).catch(() => {}); getLeaderboard().then(setLeaders).catch(() => {}); }, []);
  const createRoom = async () => { try { const result = await createVideoRoom(); setRoom(result.url); } catch { setRoom('Video room unavailable.'); } };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal-panel community-panel"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button><div className="eyebrow">the wider exchange</div><h2>Community.</h2><p>Find your circle, learn together and celebrate generous skill-sharing.</p><div className="community-section"><span className="settings-heading">Groups</span>{groups.map((group) => <div className="group-row" key={group._id}><span className="group-icon"><UsersRound size={17} /></span><span><strong>{group.name}</strong><small>{group.description}</small></span><button onClick={async () => { const updated = await joinGroup(group._id); setJoined({ ...joined, [group._id]: true }); setGroups(groups.map((item) => item._id === group._id ? updated : item)); }}>{joined[group._id] ? 'Joined' : `Join · ${group.members}`}</button></div>)}</div><div className="community-section"><span className="settings-heading">Leaderboard</span>{leaders.length ? leaders.slice(0, 5).map((leader, index) => <div className="leader-row" key={leader.name}><b>#{index + 1}</b><span>{leader.name}</span><small>{leader.exchanges} exchanges · {leader.rating || 'New'} rating</small></div>) : <div className="community-empty">Complete exchanges to appear here.</div>}</div><div className="community-section"><span className="settings-heading">Video room</span><p className="community-small">Create a free Jitsi room for your next exchange.</p><button className="button button-dark" onClick={createRoom}>Create video room <CalendarDays size={16} /></button>{room && <a className="room-link" href={room} target="_blank" rel="noreferrer">Open meeting room</a>}</div><button className="button button-dark" onClick={onClose}>Done <Check size={16} /></button></div></div>;
}

function MessagesPanel({ user, onClose }) {
  const [messages, setMessages] = useState([{ name: 'Ishita Sen', initials: 'IS', preview: 'I would love to trade HTML for...', time: '2m ago', unread: true }, { name: 'Arjun Mehta', initials: 'AM', preview: 'Are you free this Saturday?', time: 'Yesterday', unread: false }]);
  const [draft, setDraft] = useState('');
  useEffect(() => { if (!user?.email) return undefined; getMessages(user.email).then((items) => setMessages(items.map((item) => ({ id: item._id, name: item.senderEmail === user.email ? item.recipientName : item.senderName, initials: (item.senderEmail === user.email ? item.recipientName : item.senderName).slice(0, 2).toUpperCase(), preview: item.message, time: new Date(item.createdAt).toLocaleDateString(), unread: !item.read && item.recipientEmail === user.email })))).catch(() => {}); const socket = connectChat(user.email, (message) => setMessages((current) => [{ name: message.senderName, initials: message.senderName.slice(0, 2).toUpperCase(), preview: message.message, time: 'now', unread: true }, ...current])); return () => socket.disconnect(); }, [user?.email]);
  const sendLiveMessage = () => { if (!draft.trim()) return; const socket = connectChat(user.email, () => {}); socket.emit('send-message', { senderName: user.name, senderEmail: user.email, recipientName: 'Ishita Sen', recipientEmail: '', message: draft.trim() }); socket.disconnect(); setMessages((current) => [{ name: 'Ishita Sen', initials: 'IS', preview: draft.trim(), time: 'now', unread: false }, ...current]); setDraft(''); };
  const markRead = (message) => { if (message.id) markMessageRead(message.id).catch(() => {}); setMessages((items) => items.map((item) => item.id === message.id ? { ...item, unread: false } : item)); };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal-panel messages-panel"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button><div className="eyebrow">your inbox</div><h2>Messages.</h2><p>Real-time conversations that could become your next good exchange.</p><div className="message-list">{messages.map((message, index) => <button className="message-row" key={`${message.name}-${index}`} onClick={() => markRead(message)}><span className="message-avatar">{message.initials}</span><span className="message-copy"><strong>{message.name}</strong><small>{message.preview}</small></span><span className="message-time">{message.time}{message.unread && <i />}</span></button>)}</div><div className="message-composer"><input aria-label="Write a message" placeholder="Write to Ishita..." value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendLiveMessage()} /><button onClick={sendLiveMessage} aria-label="Send message"><ArrowUpRight size={17} /></button></div><button className="button button-dark" onClick={onClose}>Done <Check size={16} /></button></div></div>;
}

function AdvancedPanel({ user, onClose, onSaved }) {
  const [matches, setMatches] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [portfolio, setPortfolio] = useState({ portfolioUrl: user?.portfolioUrl || '', resumeName: user?.resumeName || '', certificates: user?.certificates || [] });
  const [certificate, setCertificate] = useState({ title: '', issuer: '', year: '' });
  const [room, setRoom] = useState('');
  const [status, setStatus] = useState('');
  useEffect(() => { if (!user?.email) return undefined; getSkillMatches(user.email).then(setMatches).catch(() => setMatches([])); getRecommendations(user.email).then(setRecommendations).catch(() => setRecommendations([])); return undefined; }, [user?.email]);
  const save = async (event) => { event.preventDefault(); try { const updated = await updatePortfolio(user._id || user.email, portfolio); onSaved(updated); setStatus('Portfolio and credentials saved.'); } catch (error) { setStatus(error.message); } };
  const addCertificate = () => { if (!certificate.title.trim() || !certificate.issuer.trim()) return; setPortfolio((current) => ({ ...current, certificates: [...current.certificates, certificate] })); setCertificate({ title: '', issuer: '', year: '' }); };
  const createRoom = async () => { try { const result = await createVideoRoom(); setRoom(result.url); } catch (error) { setStatus(error.message); } };
  if (!user) return <div className="modal-backdrop"><div className="modal-panel advanced-panel"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button><div className="account-panel-icon"><Target size={23} /></div><div className="eyebrow">advanced workspace</div><h2>Build your learning signal.</h2><p>Log in to see AI matches, recommendations, credentials and your professional sharing tools.</p><button className="button button-dark" onClick={onClose}>Close <Check size={16} /></button></div></div>;
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal-panel advanced-panel"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button><div className="eyebrow"><Sparkles size={14} /> advanced workspace</div><h2>Your exchange advantage.</h2><p>Use your profile signals to find better trades and show the work behind your skills.</p><div className="advanced-grid"><section className="advanced-card"><div className="advanced-card-title"><Target size={18} /><strong>AI skill matching</strong></div>{matches.length ? matches.slice(0, 4).map((item) => <div className="match-row" key={item.skill._id || item.skill.title}><span><strong>{item.skill.title}</strong><small>{item.skill.teacher.name}</small></span><b>{item.matchScore}%</b></div>) : <small className="advanced-muted">Add teaching and learning goals to unlock matches.</small>}</section><section className="advanced-card"><div className="advanced-card-title"><Star size={18} /><strong>Recommended for you</strong></div>{recommendations.length ? recommendations.slice(0, 4).map((skill) => <div className="recommend-row" key={skill._id || skill.title}><span>{skill.title}</span><small>{skill.category}</small></div>) : <small className="advanced-muted">Recommendations will appear as your interests grow.</small>}</section></div><section className="advanced-card portfolio-card"><div className="advanced-card-title"><BriefcaseBusiness size={18} /><strong>Resume and portfolio</strong></div><form onSubmit={save} className="advanced-form"><input aria-label="Portfolio link" placeholder="Portfolio or LinkedIn URL" value={portfolio.portfolioUrl} onChange={(event) => setPortfolio({ ...portfolio, portfolioUrl: event.target.value })} /><label className="resume-input"><Award size={15} /><span>{portfolio.resumeName || 'Share a resume'}</span><input type="file" accept=".pdf,.doc,.docx" onChange={(event) => setPortfolio({ ...portfolio, resumeName: event.target.files?.[0]?.name || '' })} /></label><div className="certificate-form"><input aria-label="Certificate title" placeholder="Certificate title" value={certificate.title} onChange={(event) => setCertificate({ ...certificate, title: event.target.value })} /><input aria-label="Certificate issuer" placeholder="Issuer" value={certificate.issuer} onChange={(event) => setCertificate({ ...certificate, issuer: event.target.value })} /><input aria-label="Certificate year" placeholder="Year" value={certificate.year} onChange={(event) => setCertificate({ ...certificate, year: event.target.value })} /><button type="button" className="button button-light" onClick={addCertificate}>Add certificate <Award size={15} /></button></div>{portfolio.certificates.length > 0 && <div className="certificate-list">{portfolio.certificates.map((item, index) => <span key={`${item.title}-${index}`}><Award size={13} /> {item.title} · {item.issuer} {item.year && `(${item.year})`}</span>)}</div>}<button className="button button-dark" type="submit">Save credentials <Check size={16} /></button></form></section><section className="advanced-card video-card"><div className="advanced-card-title"><Video size={18} /><strong>Video exchange room</strong></div><p>Start a private Jitsi room for your next learning session.</p><button className="button button-light" onClick={createRoom}>Create room <Video size={15} /></button>{room && <a className="room-link" href={room} target="_blank" rel="noreferrer">Open your meeting room</a>}</section>{status && <p className="password-status" role="status">{status}</p>}<button className="button button-dark" onClick={onClose}>Done <Check size={16} /></button></div></div>;
}

function NotificationsPanel({ notifications, onMarkRead, onClose }) {
  return <div className="notification-popover"><div className="notification-popover-head"><strong>Notifications</strong><button onClick={onClose} aria-label="Close notifications"><X size={15} /></button></div>{notifications.length ? notifications.map((notification) => <div className="notification-item" key={notification._id}><span className="notification-icon"><MessageCircle size={15} /></span><span><strong>{notification.title}</strong><small>{new Date(notification.createdAt).toLocaleString()}</small></span></div>) : <div className="notification-empty">No notification history yet.</div>}<button className="notification-clear" onClick={onMarkRead}>Mark all as read</button></div>;
}

function SkillDetailPanel({ skill, currentUser, onClose, onConnect, onOffer }) {
  const teacher = skill.teacher;
  return <div className="modal-backdrop skill-detail-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><article className="modal-panel skill-detail-panel" role="dialog" aria-modal="true" aria-labelledby="skill-detail-title">
    <button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
    <div className="skill-detail-hero" style={{ background: skill.color }}><span>{skill.category}</span><strong>{skill.title.charAt(0)}</strong></div>
    <div className="eyebrow">skill exchange</div><h2 id="skill-detail-title">{skill.title}</h2><p>{skill.description}</p>
    <div className="skill-detail-teacher"><span className="detail-avatar">{teacher.avatar}</span><div><strong>{teacher.name}</strong><small>{teacher.role} · {teacher.location}</small></div><span className="detail-rating"><Star size={14} fill="currentColor" /> {teacher.rating}</span></div>
    <div className="skill-detail-facts"><span><b>Format</b>{skill.format}</span><span><b>Level</b>{skill.level}</span><span><b>Availability</b>{skill.availability || 'Flexible'}</span><span><b>Exchanges</b>{teacher.exchanges || 0} completed</span></div>
    <div className="skill-detail-expectation"><span className="profile-label">exchange expectation</span><strong>{skill.wants}</strong><small>Offer something useful in return and agree on a format together.</small></div>
    <div className="skill-detail-reviews"><span className="profile-label">reviews</span><p><Star size={13} fill="currentColor" /> {teacher.rating} average from {teacher.exchanges || 0} completed exchanges.</p></div>
    <div className="skill-detail-actions"><button className="button button-dark" onClick={() => onConnect({ name: teacher.name, email: teacher.email || '' })}>Start exchange <ArrowUpRight size={16} /></button><button className="button button-light" onClick={onOffer}>Offer your skill <Repeat2 size={16} /></button></div>
  </article></div>;
}

function DedicatedPage({ page, currentUser, skills, similarPeople, search, setSearch, category, setCategory, sort, setSort, teachQuery, setTeachQuery, wantsQuery, setWantsQuery, location, setLocation, format, setFormat, level, setLevel, availability, setAvailability, savedSkills, onSave, onDetails, onClose, onConnect }) {
  const pages = {
    explore: ['Explore skills', 'Find a skill exchange that fits the way you learn.'],
    people: ['Find people', 'Meet generous people with useful skills to share.'],
    how: ['How it works', 'A simple rhythm for turning curiosity into a good exchange.'],
    stories: ['Stories', 'Small trades can lead to meaningful new chapters.'],
    community: ['Community', 'Find your circle, learn together and celebrate skill-sharing.'],
    advanced: ['Advanced', 'Use your profile signals to make better exchanges.']
  };
  const [title, description] = pages[page];
  return <section className={`dedicated-page dedicated-page-${page}`} aria-labelledby="dedicated-page-title">
    <div className="dedicated-page-inner">
      <button className="dedicated-back" onClick={onClose}><ArrowLeftRight size={15} /> Back to exchange</button>
      <div className="eyebrow">skillswap workspace</div>
      <h1 id="dedicated-page-title">{title}.</h1>
      <p className="dedicated-intro">{description}</p>
      {page === 'explore' && <><div className="dedicated-explore-toolbar"><div className="category-tabs">{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="search-box"><Search size={17} /><input aria-label="Search skills, teachers or categories" placeholder="Search skills, teachers or categories" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select aria-label="Sort skills" value={sort} onChange={(event) => setSort(event.target.value)}><option value="relevance">Best match</option><option value="rating">Top rated</option><option value="newest">Recently added</option><option value="nearby">Nearby users</option></select></div><div className="discovery-filters"><input aria-label="I teach" placeholder="I teach..." value={teachQuery} onChange={(event) => setTeachQuery(event.target.value)} /><input aria-label="I want to learn" placeholder="I want to learn..." value={wantsQuery} onChange={(event) => setWantsQuery(event.target.value)} /><input aria-label="Location" placeholder="Location" value={location} onChange={(event) => setLocation(event.target.value)} /><select aria-label="Format" value={format} onChange={(event) => setFormat(event.target.value)}><option value="">Any format</option><option>Online</option><option>Video call</option><option>In person</option></select><select aria-label="Skill level" value={level} onChange={(event) => setLevel(event.target.value)}><option value="">Any level</option><option>Beginner friendly</option><option>Intermediate</option><option>Advanced</option></select><select aria-label="Availability" value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="">Any availability</option><option>Weekdays</option><option>Weekends</option><option>Flexible</option></select></div><div className="dedicated-skill-grid">{skills.length ? skills.map((skill) => <SkillCard key={skill._id || skill.title} skill={skill} saved={savedSkills.some((item) => item._id === skill._id)} onSave={() => onSave(skill)} onDetails={() => onDetails(skill)} onConnect={() => onConnect({ name: skill.teacher.name, email: skill.teacher.email || '' })} />) : <EmptyState />}</div></>}
      {page === 'people' && <div className="people-grid dedicated-people-grid">{similarPeople.map((person) => <div className="person-card" key={person.name}><div className="person-avatar" style={{ background: person.color }}>{person.initials}</div><div className="person-info"><h3>{person.name}</h3><p>{person.role}</p><small>{person.city}</small><div className="person-skills">{person.skills.split(' · ').map((skill) => <span key={skill}>{skill}</span>)}</div></div><ArrowUpRight className="person-arrow" size={19} /></div>)}</div>}
      {page === 'how' && <div className="steps dedicated-steps"><Step number="01" title="Put it out there" text="Tell the community what you know, and what you are curious to learn next." /><Step number="02" title="Find the spark" text="Browse real people and specific skills until something clicks." /><Step number="03" title="Make the trade" text="Agree on a format, swap time and leave a little better than you arrived." /></div>}
      {page === 'stories' && <div className="dedicated-story"><blockquote>“I came for the pottery lessons. I stayed for the community.”</blockquote><div className="story-person"><div className="mini-avatar">JR</div><div><strong>Jules R.</strong><small>Member since 2024</small></div></div></div>}
      {page === 'community' && <div className="dedicated-panels"><div><UsersRound size={22} /><h2>Find your circle.</h2><p>Join groups around shared interests and make learning feel social.</p></div><div><MessageCircle size={22} /><h2>Keep exchanges moving.</h2><p>Message your partners and create a video room for your next session.</p></div></div>}
      {page === 'advanced' && <div className="dedicated-panels"><div><Target size={22} /><h2>Better matches.</h2><p>Teaching and learning goals help surface exchanges that fit your profile.</p></div><div><BriefcaseBusiness size={22} /><h2>Show your work.</h2><p>Keep your portfolio, credentials and learning signal together.</p></div></div>}
      {currentUser && <p className="dedicated-member-note">Signed in as {currentUser.name}.</p>}
    </div>
  </section>;
}

export default App;
