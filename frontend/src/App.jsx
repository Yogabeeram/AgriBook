import { useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const defaultFarmerForm = {
  full_name: '',
  phone: '',
  village: '',
  district: '',
  password: '',
};

const defaultCropForm = {
  crop_name: 'వరి',
  variety: 'పొన్ని',
  quantity_kg: 1200,
  expected_price: 2200,
};

const defaultLoginForm = {
  phone: '',
  password: '',
};

function App() {
  const [farmerForm, setFarmerForm] = useState(defaultFarmerForm);
  const [loginForm, setLoginForm] = useState(defaultLoginForm);
  const [cropForm, setCropForm] = useState(defaultCropForm);
  const [dashboard, setDashboard] = useState({
    stats: { farmers: 0, bookings: 0, revenue: 0, queue: 0 },
    farmers: [],
    bookings: [],
    crops: [],
  });
  const [farmer, setFarmer] = useState(() => {
    const saved = localStorage.getItem('kisanconnect_farmer');
    return saved ? JSON.parse(saved) : null;
  });
  const [queueSummary, setQueueSummary] = useState({
    total_waiting: 0,
    avg_wait_minutes: 0,
    next_booking: null,
    next_wait_minutes: 0,
    active_bookings: [],
  });
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'bot',
      text: 'నమస్కారం! నేను AgriBook ఏఐ. క్యూ టైమ్, చెల్లింపు స్థితి మరియు పంట కొనుగోళ్ల గురించి మీరు సహాయం చేయగలను.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const activeFarmerCrops = useMemo(
    () => dashboard.crops.filter((item) => item.farmer_id === farmer?.id),
    [dashboard.crops, farmer]
  );

  const latestBookings = useMemo(
    () =>
      (dashboard.bookings || [])
        .filter((item) => item.farmer_id === farmer?.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [dashboard.bookings, farmer]
  );

  const apiRequest = async (endpoint, options = {}) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.detail || 'Request failed');
    }
    return payload;
  };

  const refreshDashboard = async () => {
    try {
      const data = await apiRequest('/api/admin/dashboard');
      setDashboard(data);
      const queue = await apiRequest('/api/queue/summary');
      setQueueSummary(queue); 
    } catch (error) {
      console.error('Dashboard refresh failed:', error);
    }
  };

  useEffect(() => {
    refreshDashboard();
  }, []);

  useEffect(() => {
    if (farmer) {
      localStorage.setItem('kisanconnect_farmer', JSON.stringify(farmer));
    } else {
      localStorage.removeItem('kisanconnect_farmer');
    }
  }, [farmer]);

  const handleRegister = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const payload = await apiRequest('/api/farmers/register', {
        method: 'POST',
        body: JSON.stringify(farmerForm),
      });
      setStatusMessage(`రైతు నమోదు విజయవంతమైంది. మీ ID ${payload.farmer.farmer_id}.`);
      setFarmer(payload.farmer);
      setFarmerForm(defaultFarmerForm);
      await refreshDashboard();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const payload = await apiRequest('/api/farmers/login', {
        method: 'POST',
        body: JSON.stringify(loginForm),
      });
      setFarmer(payload.farmer);
      setStatusMessage(`మళ్లీ స్వాగతం, ${payload.farmer.full_name}!`);
      setLoginForm(defaultLoginForm);
      await refreshDashboard();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCropSubmit = async (event) => {
    event.preventDefault();
    if (!farmer) {
      setErrorMessage('పంటల నమోదుకు ముందుగా లాగిన్ చేయండి.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await apiRequest('/api/crops', {
        method: 'POST',
        body: JSON.stringify({ ...cropForm, farmer_id: farmer.id }),
      });
      setStatusMessage('పంట లాట్ విజయవంతంగా నమోదు చేయబడింది.');
      setCropForm(defaultCropForm);
      await refreshDashboard();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async (cropId) => {
    if (!farmer) {
      setErrorMessage('క్రయం టోకెన్ బుక్ చేసుకోవడానికి లాగిన్ చేయండి.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const payload = await apiRequest('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({ farmer_id: farmer.id, crop_id: cropId }),
      });
      setStatusMessage(`మీ టోకెన్ ${payload.booking.booking_code} బుక్ అయింది. క్యూ స్థానం: ${payload.booking.queue_number}.`);
      await refreshDashboard();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminStatusChange = async (bookingId, updates) => {
    try {
      await apiRequest(`/api/admin/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      setStatusMessage('బుకింగ్ విజయవంతంగా నవీకరించబడింది.');
      await refreshDashboard();
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const speakText = (text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'te-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  };

  const submitChatMessage = async (messageText) => {
    const trimmedMessage = messageText.trim();
    if (!trimmedMessage) return;

    const userMessage = { sender: 'user', text: trimmedMessage };
    setChatHistory((previous) => [...previous, userMessage]);
    setChatInput('');

    try {
      const payload = await apiRequest('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: trimmedMessage }),
      });
      const botMessage = { sender: 'bot', text: payload.reply };
      setChatHistory((previous) => [...previous, botMessage]);
      speakText(payload.reply);
    } catch (error) {
      const fallbackMessage = { sender: 'bot', text: 'నేను తాత్కాలికంగా సమస్యలో ఉన్నాను. దయచేసి కొద్దిసేపు తర్వాత మళ్లీ ప్రయత్నించండి.' };
      setChatHistory((previous) => [...previous, fallbackMessage]);
      speakText(fallbackMessage.text);
    }
  };

  const handleChatSubmit = async (event) => {
    event.preventDefault();
    await submitChatMessage(chatInput);
  };

  const logout = () => {
    setFarmer(null);
    localStorage.removeItem('kisanconnect_farmer');
    setStatusMessage('విజయవంతంగా లాగ్అవుట్ అయింది.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-gradient-to-r from-brand-green to-emerald-700 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white/15 ring-1 ring-white/30">
              <img src="/agri-logo.jpe" alt="AgriBook logo" className="h-full w-full object-cover" />
            </div>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">AgriBook</h1>
          </div>
          <nav className="hidden items-center gap-4 text-sm font-medium md:flex">
            <a href="#farmer" className="rounded-full px-3 py-2 text-emerald-50 transition hover:bg-white/10 hover:text-white">రైతు పోర్టల్</a>
            <a href="#admin" className="rounded-full px-3 py-2 text-emerald-50 transition hover:bg-white/10 hover:text-white">అడ్మిన్</a>
            <a href="#chatbot" className="rounded-full px-3 py-2 text-emerald-50 transition hover:bg-white/10 hover:text-white">ఏఐ చాట్‌బాట్</a>
          </nav>
          {farmer ? (
            <button
              onClick={logout}
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/20"
            >
              లాగ్అవుట్
            </button>
          ) : (
            <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/40">
              డెమో యాక్సెస్
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8">
        <section className="card overflow-hidden p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="badge bg-emerald-100 text-emerald-900">స్మార్ట్ కొనుగోలు నెట్‌వర్క్</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-slate-900 md:text-5xl">
                ప్రతి రైతుకి విశ్వసనీయ మార్కెట్ యాక్సెస్.
              </h2>
              <p className="mt-4 max-w-xl text-lg text-slate-600">
                పంట నమోదు, క్యూ ఆధారిత కొనుగోలు, పారదర్శక చెల్లింపు మరియు రైతు సహాయం అన్నీ ఒకే ప్లాట్‌ఫారమ్‌లో.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#farmer" className="rounded-full bg-brand-green px-5 py-3 font-semibold text-white hover:bg-green-800">
                  రైతు పోర్టల్
                </a>
                <a href="#admin" className="rounded-full border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:border-slate-400">
                  అడ్మిన్ డాష్‌బోర్డ్
                </a>
              </div>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-emerald-50 via-lime-50 to-amber-50 p-5 shadow-inner ring-1 ring-emerald-100">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm text-slate-500">సక్రియ రైతులు</p>
                  <p className="mt-2 text-3xl font-bold text-brand-green">{dashboard.stats.farmers}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm text-slate-500">క్యూ పరిమాణం</p>
                  <p className="mt-2 text-3xl font-bold text-amber-500">{queueSummary.total_waiting}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm text-slate-500">సగటు వేచిడి</p>
                  <p className="mt-2 text-3xl font-bold text-sky-600">{queueSummary.avg_wait_minutes} నిమిషాలు</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm text-slate-500">నేడు అంచనా ఆదాయం</p>
                  <p className="mt-2 text-3xl font-bold text-violet-600">₹{dashboard.stats.revenue}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {(statusMessage || errorMessage) && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${errorMessage ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {errorMessage || statusMessage}
          </div>
        )}

        <section id="farmer" className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6 md:p-7">
            <h3 className="section-title">రైతు నమోదు</h3>
            <form onSubmit={handleRegister} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">పూర్తి పేరు</span>
                  <input value={farmerForm.full_name} onChange={(e) => setFarmerForm({ ...farmerForm, full_name: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 focus:border-emerald-500 focus:outline-none" placeholder="ఉదాహరణ: రామేశ్ యాదవ్" required />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">ఫోన్ నంబర్</span>
                  <input value={farmerForm.phone} onChange={(e) => setFarmerForm({ ...farmerForm, phone: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 focus:border-emerald-500 focus:outline-none" placeholder="9876543210" required />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">గ్రామం</span>
                  <input value={farmerForm.village} onChange={(e) => setFarmerForm({ ...farmerForm, village: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 focus:border-emerald-500 focus:outline-none" placeholder="కోథపల్లి" required />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">జిల్లా</span>
                  <input value={farmerForm.district} onChange={(e) => setFarmerForm({ ...farmerForm, district: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 focus:border-emerald-500 focus:outline-none" placeholder="వరంగల్" required />
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">పాస్వర్డ్</span>
                <input type="password" value={farmerForm.password} onChange={(e) => setFarmerForm({ ...farmerForm, password: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 focus:border-emerald-500 focus:outline-none" placeholder="పాస్వర్డ్ నమోదు చేయండి" required />
              </label>
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-brand-green px-4 py-3 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? 'నమోదు జరుగుతోంది...' : 'రైతు ఖాతా సృష్టించండి'}
              </button>
            </form>
          </div>

          <div className="card p-6 md:p-7">
            <h3 className="section-title">రైతు లాగిన్</h3>
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">ఫోన్ నంబర్</span>
                <input value={loginForm.phone} onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 focus:border-emerald-500 focus:outline-none" placeholder="9876543210" required />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">పాస్వర్డ్</span>
                <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 focus:border-emerald-500 focus:outline-none" placeholder="పాస్వర్డ్" required />
              </label>
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? 'లాగిన్ జరుగుతోంది...' : 'సురక్షితంగా లాగిన్ చేయండి'}
              </button>
              <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
                డెమో అడ్మిన్ లాగిన్: admin@kisanconnect.in / admin123
              </div>
            </form>
          </div>
        </section>

        {farmer && (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="card p-6 md:p-7">
              <h3 className="section-title">పంట నమోదు</h3>
              <form onSubmit={handleCropSubmit} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">పంట</span>
                    <select value={cropForm.crop_name} onChange={(e) => setCropForm({ ...cropForm, crop_name: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 focus:border-emerald-500 focus:outline-none">
                      <option>వరి</option>
                      <option>పత్తి</option>
                      <option>మసాలా</option>
                      <option>వేరుశనగ</option>
                      <option>మొక్కజొన్న</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">రకం</span>
                    <input value={cropForm.variety} onChange={(e) => setCropForm({ ...cropForm, variety: e.target.value })} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 focus:border-emerald-500 focus:outline-none" required />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">మొత్తం (కిలోలు)</span>
                    <input type="number" value={cropForm.quantity_kg} onChange={(e) => setCropForm({ ...cropForm, quantity_kg: Number(e.target.value) })} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 focus:border-emerald-500 focus:outline-none" required />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">అంచనా ధర (₹/క్వింటాల్)</span>
                    <input type="number" value={cropForm.expected_price} onChange={(e) => setCropForm({ ...cropForm, expected_price: Number(e.target.value) })} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 focus:border-emerald-500 focus:outline-none" required />
                  </label>
                </div>

                <button type="submit" disabled={loading} className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? 'భద్రపరుస్తోంది...' : 'పంట లాట్‌ను నమోదు చేయండి'}
                </button>
              </form>

              <div className="mt-6">
                <h4 className="text-lg font-semibold text-slate-800">నా పంటల లాట్‌లు</h4>
                <div className="mt-3 space-y-3">
                  {activeFarmerCrops.length ? (
                    activeFarmerCrops.map((crop) => (
                      <div key={crop.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div>
                          <p className="font-semibold text-slate-800">{crop.crop_name} ({crop.variety})</p>
                          <p className="text-sm text-slate-500">{crop.quantity_kg} కేజీ · ₹{crop.expected_price}/క్వింటాల్</p>
                        </div>
                        <button onClick={() => handleBooking(crop.id)} className="rounded-full bg-brand-green px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-800">
                          టోకెన్ బుక్ చేయండి
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                      ఇంకా పంటలు నమోదు కాలేదు.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="card p-6 md:p-7">
              <h3 className="section-title">లైవ్ క్యూ స్థితి</h3>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                  <p className="text-sm text-emerald-700">ప్రస్తుత స్థానం</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-900">{queueSummary.next_booking?.queue_number || '—'}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
                  <p className="text-sm text-amber-700">అంచనా వేచిడి</p>
                  <p className="mt-2 text-3xl font-bold text-amber-900">{queueSummary.next_wait_minutes || 0} నిమిషాలు</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-sm text-slate-500">క్యూ అవలోకనం</p>
                <div className="mt-3 space-y-3">
                  {queueSummary.active_bookings.length ? (
                    queueSummary.active_bookings.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-center justify-between border-b border-slate-200 pb-2 last:border-none last:pb-0">
                        <div>
                          <p className="font-semibold text-slate-800">{item.booking_code}</p>
                          <p className="text-xs text-slate-500">{item.farmer_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-brand-green">#{item.queue_number}</p>
                          <p className="text-xs text-slate-500">{item.estimated_wait_minutes} నిమిషాలు</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">ఇప్పటికీ సక్రియ బుకింగ్లు ఉండవు.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <section id="admin" className="card p-6 md:p-7">
          <h3 className="section-title">అడ్మిన్ డాష్‌బోర్డ్</h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-slate-900 p-4 text-white">
              <p className="text-sm text-slate-300">రైతులు</p>
              <p className="mt-2 text-3xl font-bold">{dashboard.stats.farmers}</p>
            </div>
            <div className="rounded-2xl bg-emerald-600 p-4 text-white">
              <p className="text-sm text-emerald-100">బుకింగ్లు</p>
              <p className="mt-2 text-3xl font-bold">{dashboard.stats.bookings}</p>
            </div>
            <div className="rounded-2xl bg-amber-500 p-4 text-slate-900">
              <p className="text-sm text-amber-100">క్యూ</p>
              <p className="mt-2 text-3xl font-bold">{dashboard.stats.queue}</p>
            </div>
            <div className="rounded-2xl bg-violet-600 p-4 text-white">
              <p className="text-sm text-violet-100">ఆదాయం</p>
              <p className="mt-2 text-3xl font-bold">₹{dashboard.stats.revenue}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <div>
              <h4 className="text-xl font-semibold text-slate-800">బుకింగ్ క్యూ</h4>
              <div className="mt-4 space-y-3">
                {dashboard.bookings.length ? (
                  dashboard.bookings.map((booking) => (
                    <div key={booking.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-800">{booking.booking_code}</p>
                          <p className="text-sm text-slate-500">{booking.farmer_name} · {booking.crop_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-brand-green">#{booking.queue_number}</p>
                          <p className="text-xs text-slate-500">{booking.estimated_wait_minutes} నిమిషాలు</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <select value={booking.token_status || 'Queued'} onChange={(e) => handleAdminStatusChange(booking.id, { token_status: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
                          <option value="Queued">క్యూ చేయబడింది</option>
                          <option value="Checked In">చెక్ ఇన్</option>
                          <option value="Processing">ప్రాసెసింగ్</option>
                          <option value="Completed">పూర్తయింది</option>
                        </select>
                        <select value={booking.payment_status || 'Pending'} onChange={(e) => handleAdminStatusChange(booking.id, { payment_status: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
                          <option value="Pending">పెండింగ్</option>
                          <option value="Paid">చెల్లించబడింది</option>
                          <option value="Partial">పాక్షికంగా</option>
                        </select>
                        <select value={booking.procurement_status || 'Awaiting arrival'} onChange={(e) => handleAdminStatusChange(booking.id, { procurement_status: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
                          <option value="Awaiting arrival">వచ్చే వరకు వేచి ఉంది</option>
                          <option value="Weighing">తూకం</option>
                          <option value="Quality check">గుణనిర్ధారణ</option>
                          <option value="Transferred">బదిలీ అయింది</option>
                        </select>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">బుకింగ్లు అందుబాటులో లేవు.</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xl font-semibold text-slate-800">రైతు నమోదు</h4>
              <div className="mt-4 space-y-3">
                {dashboard.farmers.length ? (
                  dashboard.farmers.map((person) => (
                    <div key={person.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-800">{person.full_name}</p>
                          <p className="text-sm text-slate-500">{person.farmer_id}</p>
                        </div>
                        <span className="badge bg-emerald-100 text-emerald-800">{person.village}</span>
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        <p>{person.phone}</p>
                        <p>{person.district}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">ఇంకా రైతులు నమోదు కాలేదు.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="chatbot" className="card p-6 md:p-7">
          <h3 className="section-title">ఏఐ చాట్‌బాట్</h3>
          <p className="mt-2 text-sm text-slate-600">ఈ చాట్ క్యూ, పంటలు మరియు చెల్లింపుల గురించి తెలుగు మాత్రమే సహాయం చేస్తుంది.</p>
        </section>
      </main>
    </div>
  );
}

export default App;
