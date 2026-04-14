import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Search, 
  Video, 
  Image as ImageIcon, 
  FileText, 
  Settings, 
  Mic, 
  Camera, 
  Wrench, 
  AlertTriangle,
  Send,
  User,
  Bot,
  ChevronRight,
  Menu,
  X,
  History,
  Info,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ExternalLink,
  Youtube,
  Printer,
  Loader2,
  Trash2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from 'react-markdown';
import { chatWithAI, extractMeterReading, predictMaintenance } from '@/src/services/gemini';
import { cn } from '@/src/lib/utils';

// --- Types ---
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MaintenanceAlert {
  issue: string;
  components: string[];
  steps: string[];
  urgency: 'Low' | 'Medium' | 'High';
  timeToFailure: string;
}

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-dark-bg text-white p-10 text-center">
          <AlertTriangle className="w-16 h-16 text-canon-red mb-6" />
          <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
          <p className="text-text-muted mb-8">The terminal encountered a critical error. Please reload the application.</p>
          <Button 
            className="bg-canon-red hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            Reload Terminal
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Components ---

const QuickAction = ({ icon: Icon, label, onClick, color = "bg-surface text-text-main", isLoading }: any) => (
  <Button 
    variant="outline" 
    className={cn("h-auto py-4 flex flex-col gap-2 items-center justify-center border-border-color shadow-sm hover:bg-canon-red/10 hover:border-canon-red/50 transition-all", color)}
    onClick={onClick}
    disabled={isLoading}
  >
    {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-canon-red" /> : <Icon className="w-6 h-6" />}
    <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
  </Button>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'alerts'>('chat');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello Engineer! I'm **Canon Delay AI Pro**. How can I help you solve a machine issue today? You can ask about error codes, spare parts, or upload a meter reading.",
      timestamp: new Date()
    }
  ]);
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [input, setInput] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchProactiveAlerts = async () => {
    setIsAnalyzing(true);
    setActiveTab('alerts');
    try {
      // Mock machine data for analysis
      const mockData = {
        model: "IR-ADV C5535i",
        meterCount: 450230,
        lastServiceDate: "2023-12-15",
        errorHistory: [
          { code: "E002-0001", date: "2024-01-10", count: 2 },
          { code: "E010-0001", date: "2024-02-05", count: 1 }
        ],
        componentWear: {
          fuserBelt: "82%",
          drumUnit: "45%",
          transferRoller: "91%",
          pickupRoller: "65%"
        }
      };
      const result = await predictMaintenance(mockData);
      setAlerts(result.alerts);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const response = await chatWithAI(messageText, history);
      
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || "I'm sorry, I couldn't process that. Please try again.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error("Chat Error:", error);
      const errorMessage = error.message || "An unexpected error occurred.";
      
      let displayMessage = errorMessage;
      if (errorMessage.includes("Quota exceeded")) {
        displayMessage = "### ⚠️ API Quota Exceeded\nYour Gemini API key has reached its limit or credits have expired.\n\n**How to fix:**\n1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).\n2. Check your billing status or create a new API Key.\n3. Update the `GEMINI_API_KEY` in your environment settings.";
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: displayMessage,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setIsLoading(true);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'user',
        content: "Uploading image for meter reading...",
        timestamp: new Date()
      }]);

      try {
        const reading = await extractMeterReading(base64);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Extracted Meter Reading: **${reading}**`,
          timestamp: new Date()
        }]);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const quickActions = [
    { icon: AlertTriangle, label: "Error Code", action: () => setInput("Explain error code: ") },
    { icon: Search, label: "Search Web", action: () => setInput("Search for: ") },
    { icon: Video, label: "Repair Video", action: () => setInput("Show repair video for: ") },
    { icon: ImageIcon, label: "View Images", action: () => setInput("Show diagrams for: ") },
    { icon: FileText, label: "Gen Report", action: () => handleSend("Generate a service report for the last fix.") },
    { icon: Printer, label: "Spare Parts", action: () => setInput("Find spare parts for: ") },
  ];

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-dark-bg text-text-main font-sans overflow-hidden">
        {/* Offline Notification */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div 
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              exit={{ y: -50 }}
              className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white text-[10px] font-bold py-1 px-4 text-center flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-3 h-3" />
              OFFLINE MODE ACTIVE - AI FEATURES MAY BE LIMITED
            </motion.div>
          )}
        </AnimatePresence>
      {/* Sidebar - Desktop */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 bg-sidebar-bg border-r border-border-color transition-transform duration-300 lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-4 flex items-center justify-between lg:hidden">
            <h1 className="text-lg font-bold tracking-tight">Canon Delay AI</h1>
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="px-5 py-4">
            <span className="text-[10px] font-bold uppercase tracking-[2px] text-white/30">AI Tools</span>
          </div>
          <nav className="flex-1 space-y-1">
            <Button 
              variant="ghost" 
              className={cn(
                "w-full justify-start gap-3 rounded-none px-5 py-6 transition-all",
                activeTab === 'chat' ? "bg-canon-red/10 text-white border-l-4 border-canon-red" : "text-text-muted hover:bg-white/5 hover:text-white"
              )}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare className="w-4 h-4" />
              Troubleshooting
            </Button>
            <Button 
              variant="ghost" 
              className={cn(
                "w-full justify-start gap-3 rounded-none px-5 py-6 transition-all",
                activeTab === 'alerts' ? "bg-canon-red/10 text-white border-l-4 border-canon-red" : "text-text-muted hover:bg-white/5 hover:text-white"
              )}
              onClick={fetchProactiveAlerts}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              Proactive Alerts
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 rounded-none px-5 py-6 text-text-muted hover:bg-white/5 hover:text-white">
              <Mic className="w-4 h-4" />
              Voice Assistant
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 rounded-none px-5 py-6 text-text-muted hover:bg-white/5 hover:text-white">
              <FileText className="w-4 h-4" />
              Report Generator
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 rounded-none px-5 py-6 text-text-muted hover:bg-white/5 hover:text-white">
              <Printer className="w-4 h-4" />
              Spare Parts Lookup
            </Button>
            
            <div className="px-5 py-4 mt-4">
              <span className="text-[10px] font-bold uppercase tracking-[2px] text-white/30">Reference</span>
            </div>
            <Button variant="ghost" className="w-full justify-start gap-3 rounded-none px-5 py-6 text-text-muted hover:bg-white/5 hover:text-white">
              <Wrench className="w-4 h-4" />
              Manuals Library
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 rounded-none px-5 py-6 text-text-muted hover:bg-white/5 hover:text-white">
              <ImageIcon className="w-4 h-4" />
              Wiring Diagrams
            </Button>
          </nav>

          <div className="p-5 mt-auto">
            <div className="bg-surface p-3 rounded-lg border border-border-color">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Offline Mode Ready</p>
              <p className="text-xs font-medium mt-1">32 Cached Solutions</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-[60px] bg-black border-b-[3px] border-canon-red flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden text-white" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-lg font-black tracking-tighter">CANON SERVICE</span>
              <Badge className="bg-canon-red hover:bg-canon-red text-[10px] font-bold uppercase py-0.5 px-2 rounded-sm">Delay AI Pro</Badge>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6 text-[11px] font-medium text-text-muted">
            <div className="flex items-center gap-2">
              <Input 
                placeholder="Enter Error Code, Model, or Symptom..." 
                className="h-9 w-80 bg-surface border-border-color text-white text-xs"
              />
            </div>
            <span>Engineer ID: <b className="text-white">ENG-7742</b></span>
            <span>Credits: <b className="text-success-green">Unlimited</b></span>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Chat Container */}
          <main className="flex-1 flex flex-col bg-[#1E1E1E] border-r border-border-color min-w-0">
            <div className="p-5 bg-[#252525] border-b border-border-color shrink-0 flex justify-between items-center gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold truncate">{activeTab === 'chat' ? 'Troubleshooting Terminal' : 'Proactive Maintenance'}</h2>
                <p className="text-xs text-text-muted mt-1 truncate">
                  {activeTab === 'chat' ? 'Active Session: Machine Diagnosis & Repair Guide' : 'AI-Powered Failure Prediction Engine'}
                </p>
              </div>
              
              {activeTab === 'chat' && (
                <div className="flex items-center gap-2">
                  <div className="relative w-64 hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                    <Input 
                      placeholder="Search chat history..." 
                      className="pl-9 h-9 bg-surface border-border-color text-xs focus:ring-canon-red/50"
                      value={chatSearchQuery}
                      onChange={(e) => setChatSearchQuery(e.target.value)}
                    />
                    {chatSearchQuery && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 hover:bg-transparent text-text-muted hover:text-white"
                        onClick={() => setChatSearchQuery('')}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-[10px] font-bold text-text-muted hover:text-canon-red hover:bg-canon-red/10"
                    onClick={() => setMessages([{ id: '1', role: 'assistant', content: "Chat history cleared. How can I help you with your Canon machine today?", timestamp: new Date() }])}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    CLEAR
                  </Button>
                </div>
              )}

              {activeTab === 'alerts' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-canon-red text-canon-red hover:bg-canon-red hover:text-white"
                  onClick={fetchProactiveAlerts}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : "Refresh Analysis"}
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1 h-full">
              <div className="max-w-3xl mx-auto p-5 space-y-6">
                {activeTab === 'chat' ? (
                  <>
                    {/* Quick Actions */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {quickActions.map((action, idx) => (
                        <QuickAction 
                          key={idx} 
                          {...action} 
                          onClick={action.action} 
                          isLoading={action.label === "Gen Report" && isLoading}
                        />
                      ))}
                    </div>

                    <div className="space-y-6">
                      {messages
                        .filter(m => m.content.toLowerCase().includes(chatSearchQuery.toLowerCase()))
                        .map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            "flex gap-4",
                            msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                          )}
                        >
                          <div className={cn(
                            "flex flex-col gap-1 max-w-[90%]",
                            msg.role === 'user' ? "items-end" : "items-start"
                          )}>
                            {msg.role === 'assistant' && (
                              <div className="flex items-center gap-2 mb-1">
                                <div className="bg-gradient-to-r from-canon-red to-[#FF4B2B] text-[10px] font-bold px-2 py-0.5 rounded-full text-white">AI COMPREHENSION</div>
                              </div>
                            )}
                        <div className={cn(
                          "p-3.5 rounded-2xl text-[13px] leading-relaxed border shadow-sm",
                          msg.role === 'user' 
                            ? "bg-canon-red text-white border-canon-red rounded-tr-none" 
                            : "bg-surface border-border-color text-text-main rounded-tl-none"
                        )}>
                          <div className={cn(
                            "prose prose-sm max-w-none",
                            msg.role === 'user' ? "prose-invert" : "prose-invert"
                          )}>
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                            <span className="text-[9px] text-text-muted font-mono mt-1">
                              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {isLoading && (
                      <div className="flex gap-4">
                        <div className="bg-surface border border-border-color p-4 rounded-lg">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-canon-red rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-1.5 h-1.5 bg-canon-red rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-1.5 h-1.5 bg-canon-red rounded-full animate-bounce" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                ) : (
                  <div className="space-y-4">
                    {isAnalyzing ? (
                      <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="w-12 h-12 border-4 border-canon-red border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm font-mono text-text-muted animate-pulse">ANALYZING_MACHINE_PATTERNS...</p>
                      </div>
                    ) : alerts.length > 0 ? (
                      alerts.map((alert, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                        >
                          <Card className="bg-surface border-border-color overflow-hidden">
                            <div className={cn(
                              "h-1 w-full",
                              alert.urgency === 'High' ? "bg-red-600" : alert.urgency === 'Medium' ? "bg-yellow-500" : "bg-blue-500"
                            )} />
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <CardTitle className="text-md font-bold text-white">{alert.issue}</CardTitle>
                                <Badge className={cn(
                                  "text-[10px] uppercase font-bold",
                                  alert.urgency === 'High' ? "bg-red-600" : alert.urgency === 'Medium' ? "bg-yellow-500 text-black" : "bg-blue-500"
                                )}>
                                  {alert.urgency} Priority
                                </Badge>
                              </div>
                              <CardDescription className="text-xs text-text-muted flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                Est. Failure: {alert.timeToFailure}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div>
                                <h4 className="text-[11px] font-bold text-white uppercase tracking-wider mb-2">Affected Components</h4>
                                <div className="flex flex-wrap gap-2">
                                  {alert.components.map((comp, i) => (
                                    <Badge key={i} variant="outline" className="border-border-color text-text-muted text-[10px]">{comp}</Badge>
                                  ))}
                                </div>
                              </div>
                              <Separator className="bg-border-color" />
                              <div>
                                <h4 className="text-[11px] font-bold text-white uppercase tracking-wider mb-2">Preventive Actions</h4>
                                <ul className="space-y-2">
                                  {alert.steps.map((step, i) => (
                                    <li key={i} className="flex gap-3 text-xs text-text-muted">
                                      <span className="text-canon-red font-bold">0{i+1}</span>
                                      {step}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-20">
                        <Info className="w-12 h-12 text-border-color mx-auto mb-4" />
                        <p className="text-text-muted text-sm">No critical failure patterns detected.</p>
                        <Button variant="link" className="text-canon-red text-xs mt-2" onClick={fetchProactiveAlerts}>Run Manual Analysis</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className={cn(
              "p-4 bg-black/40 backdrop-blur-md border-t border-border-color transition-all shrink-0",
              activeTab === 'alerts' ? "opacity-50 pointer-events-none grayscale" : ""
            )}>
              <div className="max-w-3xl mx-auto flex items-end gap-2">
                <div className="flex flex-col flex-1 bg-surface/50 backdrop-blur-sm border border-border-color rounded-xl focus-within:border-canon-red focus-within:ring-1 focus-within:ring-canon-red/50 transition-all">
                  <textarea
                    placeholder="Type a message or ask about a machine..."
                    className="w-full bg-transparent p-3 text-sm focus:outline-none resize-none min-h-[44px] max-h-48 text-white placeholder:text-text-muted/50"
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <div className="flex items-center justify-between px-2 pb-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-text-muted hover:text-canon-red hover:bg-canon-red/10" onClick={() => fileInputRef.current?.click()}>
                        <Camera className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-text-muted hover:text-canon-red hover:bg-canon-red/10">
                        <Mic className="w-4 h-4" />
                      </Button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </div>
                    <Button 
                      size="sm"
                      className="bg-canon-red hover:bg-red-700 text-white font-bold px-4 h-8 rounded-lg transition-all active:scale-95"
                      onClick={() => handleSend()}
                      disabled={!input.trim() || isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 mr-2" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* Media Panel - Desktop Only */}
          <aside className="hidden xl:flex w-80 bg-[#151515] flex-col overflow-hidden border-l border-border-color">
            <div className="p-5 border-b border-border-color">
              <h3 className="text-[11px] font-bold uppercase tracking-[2px] text-text-muted">Resources</h3>
            </div>
            <ScrollArea className="flex-1 p-5">
              <div className="space-y-6">
                <section>
                  <p className="text-[11px] font-bold text-white mb-3 uppercase tracking-wider">YouTube Repair Guides</p>
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="bg-surface rounded-lg border border-border-color overflow-hidden group cursor-pointer">
                        <div className="aspect-video bg-[#333] flex items-center justify-center relative">
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                          <Youtube className="w-8 h-8 text-white/20 group-hover:text-canon-red transition-colors" />
                        </div>
                        <div className="p-3">
                          <span className="text-[12px] font-bold block leading-tight mb-1">C5535i Fuser Disassembly Guide</span>
                          <span className="text-[10px] text-accent-blue font-bold uppercase tracking-wider">Play 12:04 Video &rarr;</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <p className="text-[11px] font-bold text-white mb-3 uppercase tracking-wider">Reference Diagrams</p>
                  <div className="bg-surface rounded-lg border border-border-color p-3 flex items-center gap-3 cursor-pointer hover:border-accent-blue transition-colors">
                    <div className="w-10 h-10 bg-black/30 rounded flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-text-muted" />
                    </div>
                    <div>
                      <span className="text-[12px] font-bold block">Wiring-Diag-V2.png</span>
                      <span className="text-[10px] text-accent-blue font-bold uppercase tracking-wider">View High-Res &rarr;</span>
                    </div>
                  </div>
                </section>

                <section>
                  <p className="text-[11px] font-bold text-white mb-3 uppercase tracking-wider">Canon Support Links</p>
                  <div className="space-y-2">
                    {["Official Technical Bulletin (TB-082)", "Download Driver v4.22", "Spare Parts Catalog"].map((link, i) => (
                      <a key={i} href="#" className="text-[12px] text-accent-blue hover:underline block font-medium">{link}</a>
                    ))}
                  </div>
                </section>
              </div>
            </ScrollArea>
          </aside>
        </div>

        {/* Status Bar */}
        <footer className="h-[30px] bg-black border-t border-border-color flex items-center justify-between px-5 text-[10px] font-mono text-text-muted shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-success-green rounded-full" />
              <span>SYSTEM ONLINE</span>
            </div>
            <span>LATENCY: 28MS</span>
            <span>ENGINE: GEMINI-3-FLASH</span>
          </div>
          <div className="hidden sm:block">
            REPORT GENERATED: {new Date().toISOString().replace('T', ' ').split('.')[0]} UTC
          </div>
        </footer>
      </div>
    </div>
    </ErrorBoundary>
  );
}

