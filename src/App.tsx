import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Globe, 
  Phone, 
  MapPin, 
  Sparkles, 
  Cpu, 
  Layers, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  Send, 
  RefreshCw, 
  Sliders, 
  Plus, 
  ArrowRight, 
  Info, 
  Lock, 
  Check, 
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { CompanyResearchResult, ApiConfig, DiscordConfig, ProgressStep } from './types';

export default function App() {
  // State for active view tab in sidebar
  const [sidebarTab, setSidebarTab] = useState<'api' | 'discord'>('api');

  // API Config State
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    openrouterKey: '',
    serperKey: '',
    aiModel: 'google/gemini-2.5-flash',
  });

  // Discord Config State
  const [discordConfig, setDiscordConfig] = useState<DiscordConfig>({
    botToken: '',
    channelId: '',
    applicantName: '',
    applicantEmail: '',
  });

  // Password masking toggles
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [showSerperKey, setShowSerperKey] = useState(false);
  const [showBotToken, setShowBotToken] = useState(false);

  // Status message for configuration savings
  const [apiSavedStatus, setApiSavedStatus] = useState(false);
  const [discordSavedStatus, setDiscordSavedStatus] = useState(false);

  // Search input state
  const [searchInput, setSearchInput] = useState('');

  // App UI States: 'welcome' | 'researching' | 'completed' | 'error'
  const [appState, setAppState] = useState<'welcome' | 'researching' | 'completed' | 'error'>('welcome');
  const [errorMessage, setErrorMessage] = useState('');

  // Active Progress Steps Tracker
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Research result data
  const [researchResult, setResearchResult] = useState<CompanyResearchResult | null>(null);
  
  // PDF download loading state
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Discord manually triggered delivery loading state
  const [discordPostLoading, setDiscordPostLoading] = useState(false);
  const [discordPostSuccess, setDiscordPostSuccess] = useState<boolean | null>(null);

  // Server-side environment key detection state
  const [serverHasSerper, setServerHasSerper] = useState(false);
  const [serverHasOpenRouter, setServerHasOpenRouter] = useState(false);

  // Load configuration from LocalStorage on mount
  useEffect(() => {
    const savedApi = localStorage.getItem('relu_research_api_config');
    if (savedApi) {
      try {
        const parsed = JSON.parse(savedApi);
        setApiConfig(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to parse API config from localstorage', e);
      }
    }

    const savedDiscord = localStorage.getItem('relu_research_discord_config');
    if (savedDiscord) {
      try {
        const parsed = JSON.parse(savedDiscord);
        setDiscordConfig(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to parse Discord config from localstorage', e);
      }
    }

    // Fetch server environment API key status
    fetch('/api/config-status')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Config status request failed (${res.status})`);
        }
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('Config status returned a non-JSON response');
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          setServerHasSerper(!!data.hasSerperKey);
          setServerHasOpenRouter(!!data.hasOpenRouterKey);
        }
      })
      .catch(err => console.error('Failed to fetch config status', err));
  }, []);

  // Handle API config save
  const handleSaveApi = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('relu_research_api_config', JSON.stringify(apiConfig));
    setApiSavedStatus(true);
    setTimeout(() => setApiSavedStatus(false), 2000);
  };

  // Handle Discord config save
  const handleSaveDiscord = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('relu_research_discord_config', JSON.stringify(discordConfig));
    setDiscordSavedStatus(true);
    setTimeout(() => setDiscordSavedStatus(false), 2000);
  };

  // Pre-load suggestion pills
  const handleSuggestionClick = (val: string) => {
    setSearchInput(val);
    triggerResearch(val);
  };

  // Step definition builder
  const buildProgressSteps = (hasDiscord: boolean): ProgressStep[] => [
    { id: 'resolve', label: 'Domain and DNS Resolution', status: 'idle' as const },
    { id: 'serper', label: 'Serper.dev Public Search Signals', status: 'idle' as const },
    { id: 'crawl', label: 'Cheerio Parallel Website Crawl', status: 'idle' as const },
    { id: 'llm', label: 'OpenRouter AI Model Synthesis', status: 'idle' as const },
    { id: 'pdf', label: 'PDF Report Formatting & Layout', status: 'idle' as const },
    ...(hasDiscord ? [{ id: 'discord', label: 'Discord Automation Gateway Post', status: 'idle' as const }] : []),
  ];

  // Initiate corporate research
  const triggerResearch = async (targetInput: string) => {
    const query = targetInput.trim();
    if (!query) return;

    // Reset previous states
    setErrorMessage('');
    setResearchResult(null);
    setDiscordPostSuccess(null);
    setAppState('researching');

    const hasDiscord = !!(discordConfig.botToken && discordConfig.channelId);
    const steps = buildProgressSteps(hasDiscord);
    setProgressSteps(steps);
    setActiveStepIndex(0);

    // Dynamic Step Simulation interval to show interactive status changes
    let currentIdx = 0;
    steps[0].status = 'loading';
    steps[0].message = 'Parsing URL structure or executing search lookup...';
    setProgressSteps([...steps]);

    const progressInterval = setInterval(() => {
      if (currentIdx < steps.length - 1) {
        // Mark previous success
        steps[currentIdx].status = 'success';
        steps[currentIdx].message = 'Completed successfully.';
        
        // Move to next step
        currentIdx++;
        steps[currentIdx].status = 'loading';
        
        // Context-specific messages
        if (steps[currentIdx].id === 'serper') {
          steps[currentIdx].message = 'Querying contact directories and competitor data...';
        } else if (steps[currentIdx].id === 'crawl') {
          steps[currentIdx].message = 'Discovering internal routes: About, Products, Solutions, Pricing...';
        } else if (steps[currentIdx].id === 'llm') {
          steps[currentIdx].message = `Synthesizing raw content via OpenRouter (${apiConfig.aiModel || 'Gemini 2.5 Flash'})...`;
        } else if (steps[currentIdx].id === 'pdf') {
          steps[currentIdx].message = 'Drafting Helvetica grid coordinates and margins...';
        } else if (steps[currentIdx].id === 'discord') {
          steps[currentIdx].message = 'Assembling multipart form buffers...';
        }

        setActiveStepIndex(currentIdx);
        setProgressSteps([...steps]);
      }
    }, 2800);

    try {
      // Execute the research POST
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: query,
          apiConfig,
          discordConfig,
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP Error ${response.status}`);
      }

      const data = await response.json();
      
      // Mark all active steps as success
      const completedSteps = steps.map(s => ({ ...s, status: 'success' as const, message: 'Done' }));
      setProgressSteps(completedSteps);

      setResearchResult(data.result);
      if (hasDiscord) {
        setDiscordPostSuccess(data.discordSuccess);
      }
      setAppState('completed');
    } catch (err: any) {
      clearInterval(progressInterval);
      
      // Update failing step in UI
      const failedSteps = [...steps];
      if (failedSteps[currentIdx]) {
        failedSteps[currentIdx].status = 'error';
        failedSteps[currentIdx].message = err.message;
      }
      setProgressSteps(failedSteps);

      setErrorMessage(err.message || 'An unknown network error occurred during research.');
      setAppState('error');
    }
  };

  // Download compiled PDF report from server
  const handleDownloadPdf = async () => {
    if (!researchResult) return;
    setDownloadingPdf(true);

    try {
      const response = await fetch('/api/download-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: researchResult }),
      });

      if (!response.ok) throw new Error('Failed to compile PDF buffer on server.');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const trigger = document.createElement('a');
      trigger.href = blobUrl;
      trigger.download = `${researchResult.companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_research_report.pdf`;
      document.body.appendChild(trigger);
      trigger.click();
      trigger.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      alert(`PDF Download Error: ${err.message}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Manually trigger Discord send if they didn't have it configured originally or want to re-push
  const handleManualDiscordPost = async () => {
    if (!researchResult) return;
    if (!discordConfig.botToken || !discordConfig.channelId) {
      alert('Please configure Discord Bot Token and Channel ID in the sidebar first!');
      return;
    }

    setDiscordPostLoading(true);
    setDiscordPostSuccess(null);

    try {
      const response = await fetch('/api/discord-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordConfig,
          result: researchResult
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Discord service rejected request.');
      }

      setDiscordPostSuccess(true);
    } catch (err: any) {
      alert(`Discord Post Failed: ${err.message}`);
      setDiscordPostSuccess(false);
    } finally {
      setDiscordPostLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0B0D17] text-slate-100 font-sans">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-80 flex-shrink-0 bg-[#111322] border-r border-slate-800/60 flex flex-col h-full">
        {/* Sidebar Header branding */}
        <div className="p-5 border-b border-slate-800/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold shadow-sm">
            <Check className="w-5.5 h-5.5 stroke-[3.5]" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white font-display">Relu Consultancy</h1>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Company Intelligence</p>
          </div>
        </div>

        {/* Start New Research Action */}
        <div className="px-4 py-3">
          <button 
            onClick={() => {
              setAppState('welcome');
              setSearchInput('');
              setResearchResult(null);
              setDiscordPostSuccess(null);
            }}
            className="w-full py-2 px-3 bg-transparent hover:bg-slate-800/40 border border-amber-500/50 hover:border-amber-400/70 rounded-lg text-xs font-medium text-amber-400 flex items-center justify-center gap-2 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            New Research
          </button>
        </div>

        {/* Configurations Tabs Switches */}
        <div className="px-4 pb-2">
          <div className="bg-[#0B0D17] p-1 rounded-lg flex border border-slate-800/40">
            <button
              onClick={() => setSidebarTab('api')}
              className={`flex-1 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-md transition ${sidebarTab === 'api' ? 'bg-indigo-900/70 text-amber-400 border border-indigo-700/50' : 'text-slate-400 hover:text-white'}`}
            >
              API
            </button>
            <button
              onClick={() => setSidebarTab('discord')}
              className={`flex-1 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-md transition ${sidebarTab === 'discord' ? 'bg-indigo-900/70 text-amber-400 border border-indigo-700/50' : 'text-slate-400 hover:text-white'}`}
            >
              Discord
            </button>
          </div>
        </div>

        {/* Settings Area Panel */}
        <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin">
          
          {/* TAB 1: API SETTINGS */}
          {sidebarTab === 'api' && (
            <form onSubmit={handleSaveApi} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5 flex items-center justify-between">
                  OpenRouter API Key
                  {serverHasOpenRouter ? (
                    <span className="text-emerald-400 font-mono text-[8px] uppercase font-bold bg-emerald-500/10 px-1 rounded">Server Active</span>
                  ) : (
                    <span className="text-slate-600 font-mono text-[9px] lowercase">or server env</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showOpenRouterKey ? 'text' : 'password'}
                    placeholder={serverHasOpenRouter ? "•••••••• [Configured on Server]" : "sk-or-v1-..."}
                    value={apiConfig.openrouterKey}
                    onChange={e => setApiConfig({ ...apiConfig, openrouterKey: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800/80 rounded-lg py-2 pl-3 pr-10 text-xs font-mono text-slate-200 placeholder-slate-500 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showOpenRouterKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5 flex items-center justify-between">
                  Serper.dev API Key
                  {serverHasSerper ? (
                    <span className="text-emerald-400 font-mono text-[8px] uppercase font-bold bg-emerald-500/10 px-1 rounded">Server Active</span>
                  ) : (
                    <span className="text-slate-600 font-mono text-[9px] lowercase">or server env</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showSerperKey ? 'text' : 'password'}
                    placeholder={serverHasSerper ? "•••••••• [Configured on Server]" : "Your Serper key..."}
                    value={apiConfig.serperKey}
                    onChange={e => setApiConfig({ ...apiConfig, serperKey: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800/80 rounded-lg py-2 pl-3 pr-10 text-xs font-mono text-slate-200 placeholder-slate-500 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSerperKey(!showSerperKey)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showSerperKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">
                  AI Model
                </label>
                <select
                  value={apiConfig.aiModel}
                  onChange={e => setApiConfig({ ...apiConfig, aiModel: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800/80 rounded-lg py-2 px-3 text-xs text-slate-200 outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 transition cursor-pointer"
                >
                  <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (Fast)</option>
                  <option value="meta-llama/llama-3-70b-instruct">Llama 3 70B (Analytical)</option>
                  <option value="google/gemini-2.5-pro">Gemini 2.5 Pro (Comprehensive)</option>
                  <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Premium)</option>
                  <option value="meta-llama/llama-3-8b-instruct:free">Llama 3 8B (Free / Light)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-yellow-500 text-slate-950 hover:bg-yellow-400 font-bold text-xs rounded-lg transition shadow-md shadow-yellow-500/10 hover:shadow-yellow-500/20 active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {apiSavedStatus ? <Check className="w-4.5 h-4.5" /> : null}
                {apiSavedStatus ? 'Configuration Saved' : 'Save Configuration'}
              </button>
            </form>
          )}

          {/* TAB 2: DISCORD AUTOMATION */}
          {sidebarTab === 'discord' && (
            <form onSubmit={handleSaveDiscord} className="space-y-4">
              <div className="bg-slate-950/40 border border-blue-500/20 rounded-lg p-3 text-[11px] leading-relaxed text-blue-300/90 flex flex-col gap-1">
                <span className="font-bold flex items-center gap-1.5 text-blue-300">
                  <Info className="w-3.5 h-3.5" /> Discord Bot Integration
                </span>
                After research completes, the report auto-sends to your configured channel.
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">
                  Bot Token
                </label>
                <div className="relative">
                  <input
                    type={showBotToken ? 'text' : 'password'}
                    placeholder="Bot token..."
                    value={discordConfig.botToken}
                    onChange={e => setDiscordConfig({ ...discordConfig, botToken: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800/80 rounded-lg py-2 pl-3 pr-10 text-xs font-mono text-slate-200 placeholder-slate-600 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBotToken(!showBotToken)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showBotToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">
                  Channel ID
                </label>
                <input
                  type="text"
                  placeholder="000000000000000000"
                  value={discordConfig.channelId}
                  onChange={e => setDiscordConfig({ ...discordConfig, channelId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800/80 rounded-lg py-2 px-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 outline-none transition"
                />
              </div>

              <div className="pt-2 border-t border-slate-800/40">
                <span className="block text-[9px] uppercase tracking-widest font-bold text-slate-500 mb-2">Applicant Details</span>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-400 mb-1">Full Name</label>
                    <input
                      type="text"
                      placeholder="Your full name"
                      value={discordConfig.applicantName}
                      onChange={e => setDiscordConfig({ ...discordConfig, applicantName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800/80 rounded-lg py-1.5 px-3 text-xs text-slate-200 placeholder-slate-600 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-400 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={discordConfig.applicantEmail}
                      onChange={e => setDiscordConfig({ ...discordConfig, applicantEmail: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800/80 rounded-lg py-1.5 px-3 text-xs text-slate-200 placeholder-slate-600 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 outline-none transition"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition shadow-md shadow-indigo-600/20 hover:shadow-indigo-500/30 active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {discordSavedStatus ? <Check className="w-4.5 h-4.5" /> : null}
                {discordSavedStatus ? 'Saved ✓' : 'Save Discord Config'}
              </button>
            </form>
          )}

        </div>

        {/* Dynamic workflow guide footer */}
        <div className="p-4 bg-slate-950/40 border-t border-slate-800/40 text-[11px]">
          <span className="block text-[9px] uppercase tracking-widest font-bold text-slate-500 mb-2">How it works</span>
          <ol className="space-y-1.5 text-slate-400 font-medium">
            <li className="flex gap-2"><span className="text-yellow-500 font-mono font-bold">1</span> Enter a company name or URL</li>
            <li className="flex gap-2"><span className="text-yellow-500 font-mono font-bold">2</span> Serper.dev searches and crawls it</li>
            <li className="flex gap-2"><span className="text-yellow-500 font-mono font-bold">3</span> OpenRouter AI generates insights</li>
            <li className="flex gap-2"><span className="text-yellow-500 font-mono font-bold">4</span> Download a professional PDF report</li>
          </ol>
        </div>

        {/* Small footer technology declarations */}
        <div className="px-5 py-2.5 bg-[#0B0D17] text-[9px] font-mono text-slate-600 flex justify-between tracking-tight border-t border-slate-900">
          <span>OPENROUTER · SERPER · JSPDF</span>
          <span>v1.0.0</span>
        </div>
      </aside>

      {/* --- MAIN INTERACTIVE INTERFACE PANEL --- */}
      <main className="flex-1 flex flex-col h-full bg-[#0B0D17] relative overflow-hidden">
        
        {/* Top Header Controls bar */}
        <header className="h-14 border-b border-slate-800/40 px-6 flex items-center justify-between bg-[#0B0D17]/90 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-display">Company Research</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest font-bold">Live</span>
          </div>
          <div className="flex items-center gap-3">
            {appState === 'completed' && researchResult && (
              <div className="text-xs bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                <span className="text-slate-400">Target:</span>
                <span className="font-semibold text-slate-200">{researchResult.companyName}</span>
              </div>
            )}
          </div>
        </header>

        {/* Core Screen Stage Router */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col relative z-0">
          
          {/* STATE 1: WELCOME SCREEN (IDLE) */}
          {appState === 'welcome' && (
            <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto text-center">
              
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 p-[1px] shadow-lg shadow-yellow-500/10 mb-6 flex items-center justify-center">
                <div className="w-full h-full bg-[#0B0D17] rounded-2xl flex items-center justify-center text-yellow-500">
                  <Sparkles className="w-6 h-6" />
                </div>
              </div>

              <span className="text-[10px] uppercase font-bold text-yellow-500 tracking-widest mb-3 block font-mono">AI-Powered Intelligence</span>
              
              <h2 className="text-4xl font-extrabold tracking-tight text-white font-display leading-tight">
                Know any company <br />
                <span className="bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">in minutes.</span>
              </h2>

              <p className="text-xs text-slate-400 mt-4 leading-relaxed max-w-md">
                Enter a company name or website URL to get AI-powered insights, competitor analysis, pain points, and a professional PDF report.
              </p>

              {/* Suggestions Grid */}
              <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-lg">
                {['stripe.com', 'Tesla', 'Microsoft', 'OpenAI', 'notion.so', 'Figma', 'Linear', 'Vercel'].map((pill) => (
                  <button
                    key={pill}
                    onClick={() => handleSuggestionClick(pill)}
                    className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-full text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    {pill}
                  </button>
                ))}
              </div>

              {/* Warning warning to get keys going */}
              {!((apiConfig.openrouterKey || serverHasOpenRouter) && (apiConfig.serperKey || serverHasSerper)) && (
                <div className="mt-10 pt-5 border-t border-slate-900 w-full text-slate-500 text-[11px] flex items-center justify-center gap-1.5 animate-pulse">
                  <Info className="w-4 h-4 text-slate-600" />
                  <span>Configure API keys in the sidebar to get started</span>
                </div>
              )}

            </div>
          )}

          {/* STATE 2: ACTIVE RESEARCHING PROGRESS SCREEN */}
          {appState === 'researching' && (
            <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full">
              
              <div className="w-full bg-[#111322] border border-slate-800/80 rounded-2xl p-6 shadow-xl mb-4 relative overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500 animate-spin">
                      <RefreshCw className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Research in Progress</h3>
                      <p className="text-[10px] text-slate-500 font-mono">Running parallel nodes</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-yellow-500 bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/20">
                    {Math.round(((activeStepIndex + 1) / progressSteps.length) * 100)}%
                  </span>
                </div>

                {/* Vertical Process Steps stack */}
                <div className="relative pl-6 space-y-6">
                  {/* Vertical bar line */}
                  <div className="absolute left-2.5 top-1 bottom-1 w-[1px] bg-slate-800"></div>

                  {progressSteps.map((step, idx) => {
                    const isIdle = step.status === 'idle';
                    const isLoading = step.status === 'loading';
                    const isSuccess = step.status === 'success';
                    const isError = step.status === 'error';

                    return (
                      <div key={step.id} className="relative flex flex-col gap-1 transition">
                        
                        {/* Bullet point nodes */}
                        <div className="absolute -left-[21px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center bg-[#111322] z-10">
                          {isIdle && <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>}
                          {isLoading && (
                            <div className="w-3 h-3 rounded-full border border-yellow-500 border-t-transparent animate-spin"></div>
                          )}
                          {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          {isError && <AlertCircle className="w-4 h-4 text-rose-500" />}
                        </div>

                        <div className="flex justify-between items-start pl-3">
                          <span className={`text-xs font-bold leading-tight ${isLoading ? 'text-yellow-500' : isSuccess ? 'text-slate-200' : isError ? 'text-rose-500' : 'text-slate-500'}`}>
                            {step.label}
                          </span>
                          <span className="text-[9px] font-mono uppercase font-bold text-slate-600">
                            {step.status}
                          </span>
                        </div>
                        
                        {step.message && (isLoading || isError) && (
                          <p className={`pl-3 text-[10px] ${isError ? 'text-rose-400/90 font-mono leading-relaxed bg-rose-500/5 p-2 rounded-lg border border-rose-500/10 mt-1' : 'text-slate-400 font-mono'}`}>
                            {step.message}
                          </p>
                        )}

                      </div>
                    );
                  })}
                </div>

              </div>

            </div>
          )}

          {/* STATE 3: RESEARCH COMPLETED DISPLAY BOARD */}
          {appState === 'completed' && researchResult && (
            <div className="max-w-4xl mx-auto w-full space-y-6">
              
              {/* Main Profile Header card */}
              <div className="bg-[#111322] border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-extrabold text-white tracking-tight font-display">{researchResult.companyName}</h2>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/20 rounded-full">
                        Research Complete
                      </span>
                    </div>
                    <a 
                      href={researchResult.website} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs text-yellow-500 hover:text-yellow-400 font-semibold hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      {researchResult.website}
                    </a>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleDownloadPdf}
                      disabled={downloadingPdf}
                      className="py-2 px-4 bg-yellow-500 text-slate-950 hover:bg-yellow-400 font-bold text-xs rounded-lg transition shadow-md shadow-yellow-500/10 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {downloadingPdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Download PDF Report
                    </button>

                    <button
                      onClick={handleManualDiscordPost}
                      disabled={discordPostLoading}
                      className={`py-2 px-4 border text-xs font-bold rounded-lg transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                        discordPostSuccess === true 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                          : discordPostSuccess === false
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {discordPostLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : discordPostSuccess === true ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {discordPostSuccess === true ? 'Sent to Discord' : discordPostSuccess === false ? 'Discord Failed (Retry)' : 'Send to Discord'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-800/60">
                  <div className="bg-[#0B0D17]/80 border border-slate-800 rounded-lg p-3">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-500">PHONE</span>
                    <span className="block text-xs font-semibold text-white mt-1">{researchResult.phone}</span>
                  </div>

                  <div className="bg-[#0B0D17]/80 border border-slate-800 rounded-lg p-3">
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-500">ADDRESS</span>
                    <span className="block text-xs font-semibold text-white mt-1">{researchResult.address}</span>
                  </div>
                </div>

                {/* Company summary */}
                <div className="mt-5 p-4 bg-[#0B0D17]/50 border border-slate-800/30 rounded-xl">
                  <span className="block text-xs uppercase tracking-wider font-bold text-yellow-500 mb-1.5">Executive Summary</span>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">{researchResult.summary}</p>
                </div>
              </div>

              {/* Products & Services section */}
              <div className="bg-[#111322] border border-slate-800/80 rounded-2xl p-6 shadow-lg">
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-500 block mb-3">Products & Services</span>
                <div className="flex flex-wrap gap-2">
                  {researchResult.products.length > 0 ? (
                    researchResult.products.map((p, i) => (
                      <span 
                        key={i} 
                        className="py-1.5 px-3 bg-slate-950 border border-slate-800/80 text-slate-200 text-xs font-semibold rounded-lg hover:border-yellow-500/20 hover:text-white transition"
                      >
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 font-mono">No products list collected.</span>
                  )}
                </div>
              </div>

              {/* AI Pain Points section */}
              <div className="bg-[#111322] border border-slate-800/80 rounded-2xl p-6 shadow-lg">
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-500 block mb-3">AI-Generated Pain Points</span>
                <div className="space-y-3">
                  {researchResult.painPoints.length > 0 ? (
                    researchResult.painPoints.map((point, i) => {
                      const colonIdx = point.indexOf(':');
                      if (colonIdx > -1) {
                        const title = point.substring(0, colonIdx);
                        const desc = point.substring(colonIdx + 1);
                        return (
                          <div key={i} className="p-3.5 bg-[#0B0D17]/60 border border-slate-800/40 rounded-xl flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0"></div>
                            <div className="text-xs">
                              <span className="font-bold text-yellow-500 block sm:inline mr-1">{title}:</span>
                              <span className="text-slate-300 font-medium leading-relaxed">{desc}</span>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={i} className="p-3.5 bg-[#0B0D17]/60 border border-slate-800/40 rounded-xl flex gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0"></div>
                          <span className="text-xs text-slate-300 font-medium leading-relaxed">{point}</span>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-500 font-mono">No specific pain points generated.</span>
                  )}
                </div>
              </div>

              {/* Competitors analysis grid */}
              <div className="bg-[#111322] border border-slate-800/80 rounded-2xl p-6 shadow-lg">
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-500 block mb-4">Competitors</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {researchResult.competitors.length > 0 ? (
                    researchResult.competitors.map((comp, i) => (
                      <div 
                        key={i} 
                        className="p-4 bg-[#0B0D17] border border-slate-800/60 hover:border-yellow-500/20 rounded-xl transition flex justify-between items-center group shadow-sm hover:shadow-md"
                      >
                        <div className="min-w-0 pr-3">
                          <span className="block font-bold text-sm text-slate-100 truncate group-hover:text-white transition">{comp.name}</span>
                          <span className="block text-[10px] font-mono text-yellow-600/90 hover:underline truncate mt-0.5">{comp.website}</span>
                        </div>
                        {comp.website && comp.website !== '#' && (
                          <a 
                            href={comp.website} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 group-hover:border-yellow-500/30 group-hover:bg-slate-850 flex items-center justify-center text-slate-400 group-hover:text-yellow-500 transition cursor-pointer"
                          >
                            <Globe className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="sm:col-span-2 text-center p-4 bg-[#0B0D17] rounded-xl text-xs text-slate-500 font-mono">
                      No competitors identified.
                    </div>
                  )}
                </div>
              </div>

              {/* Crawler trace logging panel */}
              {researchResult.crawledPages && researchResult.crawledPages.length > 0 && (
                <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl text-slate-500">
                  <span className="block text-[9px] uppercase tracking-widest font-bold text-slate-500 mb-2 font-mono">Crawl Node Trace</span>
                  <div className="flex flex-col gap-1.5">
                    {researchResult.crawledPages.map((cp, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row justify-between text-[10px] font-mono border-b border-slate-900 pb-1.5 last:border-0 last:pb-0">
                        <span className="text-slate-400 truncate max-w-sm sm:max-w-md">{cp.title}</span>
                        <span className="text-yellow-500/70 text-right">{cp.url}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* STATE 4: ERROR REPORT STATE */}
          {appState === 'error' && (
            <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto text-center">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-display">Research Interrupted</h3>
              <p className="text-xs text-rose-400 font-mono mt-2 leading-relaxed bg-rose-950/20 border border-rose-900/40 p-3 rounded-xl max-w-sm">
                {errorMessage}
              </p>
              
              {/* Manual retry or start over buttons */}
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => triggerResearch(searchInput)}
                  className="py-1.5 px-4 bg-yellow-500 text-slate-950 hover:bg-yellow-400 font-bold text-xs rounded-lg transition"
                >
                  Retry Analysis
                </button>
                <button
                  onClick={() => {
                    setAppState('welcome');
                    setSearchInput('');
                  }}
                  className="py-1.5 px-4 bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold text-xs rounded-lg transition"
                >
                  Clear & Reset
                </button>
              </div>
            </div>
          )}

        </div>

        {/* --- BOTTOM CHATGPT-STYLE SEARCH BAR CONTAINER --- */}
        <footer className="p-6 border-t border-slate-800/40 bg-[#111322]/80 backdrop-blur-sm relative z-10">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-center bg-slate-950 border border-slate-800 hover:border-slate-700 focus-within:border-yellow-500/50 rounded-xl transition p-1.5">
              
              {/* Input field */}
              <input
                type="text"
                placeholder="Enter a company name (e.g. Stripe) or website URL (e.g. https://stripe.com)..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchInput.trim()) {
                    triggerResearch(searchInput);
                  }
                }}
                className="flex-1 bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 px-3 outline-none py-1"
              />

              {/* Research action button */}
              <button
                onClick={() => {
                  if (searchInput.trim()) {
                    triggerResearch(searchInput);
                  }
                }}
                className="py-2 px-4 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-md shadow-yellow-500/5 active:scale-95 cursor-pointer"
              >
                Research →
              </button>
            </div>
            
            <div className="flex justify-between items-center mt-3 text-[10px] font-mono text-slate-500 px-1">
              <span>ENTER TO RESEARCH · SHIFT+ENTER FOR NEW LINE</span>
              <span>v1.0.0</span>
            </div>
          </div>
        </footer>

      </main>

    </div>
  );
}
