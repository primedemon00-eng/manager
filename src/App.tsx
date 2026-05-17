import React, { useEffect, useState, type ReactNode } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  limit 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./lib/firebase";
import { 
  Shield, 
  UserMinus, 
  UserX, 
  VolumeX, 
  Volume2, 
  UserPlus, 
  MessageSquareX, 
  Clock,
  ExternalLink,
  Bot,
  Settings,
  Activity,
  CheckCircle,
  Hash,
  UserCheck,
  Save,
  Send,
  AlertCircle,
  Loader2,
  Trophy,
  Zap,
  BarChart3,
  MessageSquare,
  Megaphone,
  Youtube,
  Video,
  AtSign,
  LogIn, 
  LogOut, 
  Trash2, 
  Edit2, 
  PlusCircle, 
  MinusCircle, 
  RotateCcw, 
  Mic, 
  Globe
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { setDoc, doc } from "firebase/firestore";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ModerationLog {
  id: string;
  guildId: string;
  guildName: string;
  userId: string;
  userName: string;
  moderatorId: string;
  moderatorName: string;
  action: "KICK" | "BAN" | "MUTE" | "UNBAN" | "UNMUTE" | "AUTOMOD_DELETE" | "AUTOMOD_WARN" | "AUTOMOD_KICK" | "AUTOMOD_BAN" | "JOIN" | "LEAVE" | "MESSAGE_DELETE" | "MESSAGE_EDIT" | "CHANNEL_CREATE" | "CHANNEL_DELETE" | "CHANNEL_UPDATE" | "ROLE_CREATE" | "ROLE_DELETE" | "ROLE_UPDATE" | "VOICE_JOIN" | "VOICE_LEAVE" | "VOICE_MOVE" | "GUILD_UPDATE" | "LOCK" | "UNLOCK" | "LOCK_ALL" | "UNLOCK_ALL";
  reason: string;
  timestamp: string;
}

const ACTION_CONFIG: Record<string, any> = {
  KICK: { icon: UserMinus, color: "text-orange-500", bg: "bg-orange-50", label: "Kick" },
  BAN: { icon: UserX, color: "text-red-500", bg: "bg-red-50", label: "Ban" },
  MUTE: { icon: VolumeX, color: "text-purple-500", bg: "bg-purple-50", label: "Mute" },
  UNMUTE: { icon: Volume2, color: "text-green-500", bg: "bg-green-50", label: "Unmute" },
  UNBAN: { icon: UserPlus, color: "text-blue-500", bg: "bg-blue-50", label: "Unban" },
  AUTOMOD_DELETE: { icon: MessageSquareX, color: "text-gray-500", bg: "bg-gray-50", label: "Auto-Mod" },
  AUTOMOD_WARN: { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50", label: "Auto-Warn" },
  AUTOMOD_KICK: { icon: UserMinus, color: "text-rose-500", bg: "bg-rose-50", label: "Auto-Kick" },
  AUTOMOD_BAN: { icon: UserX, color: "text-red-600", bg: "bg-red-100", label: "Auto-Ban" },
  JOIN: { icon: LogIn, color: "text-emerald-500", bg: "bg-emerald-50", label: "Join" },
  LEAVE: { icon: LogOut, color: "text-slate-500", bg: "bg-slate-50", label: "Leave" },
  MESSAGE_DELETE: { icon: Trash2, color: "text-rose-500", bg: "bg-rose-50", label: "Msg Del" },
  MESSAGE_EDIT: { icon: Edit2, color: "text-blue-400", bg: "bg-blue-50", label: "Msg Edit" },
  CHANNEL_CREATE: { icon: PlusCircle, color: "text-emerald-600", bg: "bg-emerald-50", label: "Ch Create" },
  CHANNEL_DELETE: { icon: MinusCircle, color: "text-rose-600", bg: "bg-rose-50", label: "Ch Delete" },
  CHANNEL_UPDATE: { icon: RotateCcw, color: "text-indigo-400", bg: "bg-indigo-50", label: "Ch Update" },
  ROLE_CREATE: { icon: PlusCircle, color: "text-emerald-400", bg: "bg-emerald-50", label: "Role Create" },
  ROLE_DELETE: { icon: MinusCircle, color: "text-rose-400", bg: "bg-rose-50", label: "Role Delete" },
  ROLE_UPDATE: { icon: RotateCcw, color: "text-indigo-400", bg: "bg-indigo-50", label: "Role Update" },
  VOICE_JOIN: { icon: Mic, color: "text-emerald-500", bg: "bg-emerald-50", label: "V Join" },
  VOICE_LEAVE: { icon: Mic, color: "text-rose-500", bg: "bg-rose-50", label: "V Leave" },
  VOICE_MOVE: { icon: Mic, color: "text-blue-500", bg: "bg-blue-50", label: "V Move" },
  GUILD_UPDATE: { icon: Globe, color: "text-indigo-600", bg: "bg-indigo-50", label: "Server" },
  LOCK: { icon: Trash2, color: "text-rose-600", bg: "bg-rose-50", label: "Lock" },
  UNLOCK: { icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50", label: "Unlock" },
  LOCK_ALL: { icon: Trash2, color: "text-rose-700", bg: "bg-rose-100", label: "Lock All" },
  UNLOCK_ALL: { icon: UserCheck, color: "text-emerald-700", bg: "bg-emerald-100", label: "Unlock All" },
};

interface GuildSettings {
  id: string;
  guildId: string;
  logChannelId?: string;
  autoRoleId?: string;
  verificationChannelId?: string;
  verifiedRoleId?: string;
  levelingEnabled?: boolean;
  levelUpMessage?: string;
  levelUpChannelId?: string;
  youtubeChannelId?: string;
  youtubeHandle?: string;
  youtubeLogo?: string;
  youtubeAnnouncementChannelId?: string;
  welcomeEnabled?: boolean;
  welcomeMessage?: string;
  welcomeChannelId?: string;
  inviteTrackingEnabled?: boolean;
  inviteMessage?: string;
  inviteChannelId?: string;
  automodEnabled?: boolean;
  bannedWords?: string[];
  automodAction?: "DELETE" | "WARN" | "KICK" | "BAN";
  spamMentionsThreshold?: number;
  spamMessageThreshold?: number;
  antiLinkEnabled?: boolean;
  antiInviteEnabled?: boolean;
  urlWhitelist?: string[];
  antiRaidEnabled?: boolean;
  antiRaidMinAge?: number;
  antiRaidJoinLimit?: number;
  antiRaidJoinWindow?: number;
  antiRaidAction?: "KICK" | "BAN" | "NOTIFY";
}

interface UserLevel {
  id: string;
  userId: string;
  xp: number;
  level: number;
}

export default function App() {
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [guildSettings, setGuildSettings] = useState<GuildSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"dashboard" | "settings">("dashboard");

  useEffect(() => {
    // Fetch Logs
    const logQ = query(
      collection(db, "logs"),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    const unsubscribeLogs = onSnapshot(
      logQ,
      (snapshot) => {
        const newLogs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ModerationLog[];
        setLogs(newLogs);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "logs");
      }
    );

    // Fetch Guild Settings
    const guildQ = query(collection(db, "guilds"));
    const unsubscribeGuilds = onSnapshot(
      guildQ,
      (snapshot) => {
        const newConfigs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as GuildSettings[];
        setGuildSettings(newConfigs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "guilds");
      }
    );

    return () => {
      unsubscribeLogs();
      unsubscribeGuilds();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      {/* Header Navigation */}
      <nav className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Shield size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight uppercase">ShieldBot</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setView("dashboard")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all",
                view === "dashboard" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Activity size={14} />
              Dashboard
            </button>
            <button 
              onClick={() => setView("settings")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all",
                view === "settings" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Settings size={14} />
              Settings
            </button>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700 font-mono tracking-tighter">ADMIN_PORTAL</span>
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-400">
              AD
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-8 overflow-hidden max-w-[1600px] mx-auto w-full">
        <AnimatePresence mode="wait">
          {view === "dashboard" ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.01 }}
              className="grid grid-cols-12 gap-8 h-full"
            >
              {/* Left Panel: Overview & Community */}
              <section className="col-span-12 lg:col-span-3 flex flex-col gap-6">
                <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-10">
                    <Shield size={120} />
                  </div>
                  <h3 className="text-xs font-semibold opacity-70 mb-1 uppercase tracking-widest">Bot Status</h3>
                  <div className="text-2xl font-black mb-1 tracking-tight">Active Protection</div>
                  <p className="text-[11px] opacity-80 leading-relaxed font-medium">
                    Auto-mod, Leveling, and YouTube sync are currently operational.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <UserPlus size={16} className="text-pink-500" />
                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Community Growth</h2>
                  </div>
                  <div className="space-y-4">
                    {guildSettings[0] ? (
                      <RecentWelcomesMini guildId={guildSettings[0].guildId} />
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">No guild detected.</p>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity size={16} className="text-indigo-500" />
                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Top Inviters</h2>
                  </div>
                  <div className="space-y-4">
                    {guildSettings[0] ? (
                      <InviteLeaderboardMini guildId={guildSettings[0].guildId} />
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">No guild detected.</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Center Panel: Live Activity Logs */}
              <section className="col-span-12 lg:col-span-6 bg-white border border-slate-200 rounded-3xl flex flex-col overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900 text-white rounded-xl">
                      <BarChart3 size={16} />
                    </div>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Live Moderation Feed</h2>
                  </div>
                  <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-black uppercase tracking-widest animate-pulse">Live</span>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-hide px-4">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                        <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">User</th>
                        <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Reason</th>
                        <th className="px-4 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      <AnimatePresence mode="popLayout">
                        {loading ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-12 text-center">
                              <Loader2 size={24} className="animate-spin mx-auto text-slate-200" />
                            </td>
                          </tr>
                        ) : logs.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-20 text-center text-slate-400">
                              <p className="text-xs font-medium uppercase tracking-widest opacity-50">Log quiet for now</p>
                            </td>
                          </tr>
                        ) : (
                          logs.map((log) => {
                            const config = ACTION_CONFIG[log.action] || ACTION_CONFIG.AUTOMOD_DELETE;
                            const Icon = config.icon;
                            
                            return (
                              <motion.tr 
                                key={log.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="group hover:bg-slate-50/50 transition-colors"
                              >
                                <td className="px-4 py-3">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight flex items-center gap-1.5 w-fit shadow-xs",
                                    config.bg,
                                    config.color
                                  )}>
                                    <Icon size={12} />
                                    {config.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black text-slate-800">@{log.userName}</span>
                                    <span className="text-[9px] font-mono text-slate-400 uppercase">{log.guildName}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="text-[11px] text-slate-500 line-clamp-1">
                                    {log.reason}
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="text-[10px] font-mono text-slate-400">
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </td>
                              </motion.tr>
                            );
                          })
                        )}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Right Panel: Commands & Quick Stats */}
              <section className="col-span-12 lg:col-span-3 flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Actions</p>
                    <div className="text-3xl font-black text-slate-900">{logs.length}</div>
                    <p className="text-[9px] text-emerald-500 font-bold mt-1 uppercase tracking-tighter">+12% from avg</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Guilds</p>
                    <div className="text-3xl font-black text-slate-900">{guildSettings.length}</div>
                    <p className="text-[9px] text-indigo-500 font-bold mt-1 uppercase tracking-tighter">Connected</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Staff Quick-Links</h2>
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-50 rounded-xl hover:bg-indigo-50 group transition-all cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600">Commands Wiki</span>
                        <ExternalLink size={12} className="text-slate-300 group-hover:text-indigo-600" />
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl hover:bg-emerald-50 group transition-all cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 group-hover:text-emerald-600">Bot Latency</span>
                        <span className="text-[10px] font-black text-emerald-600">42MS</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 text-white mt-auto overflow-hidden relative shadow-lg shadow-slate-200">
                  <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4">
                    <Bot size={120} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 opacity-60">System Version</p>
                  <p className="text-xs font-mono font-black">STABLE V2.4.1</p>
                  <button 
                    onClick={() => setView("settings")}
                    className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    System Config
                  </button>
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto w-full space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">System Settings</h2>
                  <p className="text-sm text-slate-500 font-medium tracking-tight">Configure automation and community protocols.</p>
                </div>
                <button 
                  onClick={() => setView("dashboard")}
                  className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-100 uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95"
                >
                  <Activity size={14} /> Back to dashboard
                </button>
              </div>

              {guildSettings.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-20 text-center flex flex-col items-center gap-6 shadow-sm">
                  <div className="p-5 bg-slate-50 rounded-2xl text-slate-200">
                    <Bot size={64} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">NO GUILDS INSTALLED</h3>
                    <p className="text-slate-500 font-medium max-w-sm mx-auto">Invite ShieldBot to your Discord server and use any command to initialize configuration.</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-8">
                  {guildSettings.map((guild: GuildSettings) => (
                    <React.Fragment key={guild.id}>
                      <GuildSettingsCard guild={guild} />
                    </React.Fragment>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

interface GuildChannel {
  id: string;
  name: string;
}

interface GuildRole {
  id: string;
  name: string;
}

function RoleSelector({ guildId, value, onChange, placeholder = "Select role..." }: { 
  guildId: string; 
  value: string; 
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [roles, setRoles] = useState<GuildRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/guilds/${guildId}/roles`)
      .then(res => res.json())
      .then(data => {
        setRoles(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [guildId]);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full mt-0.5 bg-white border border-slate-200 rounded-md px-2 py-1 text-sm font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em]"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
    >
      <option value="">{loading ? "Loading roles..." : placeholder}</option>
      {roles.map(r => (
        <option key={r.id} value={r.id}>{r.name}</option>
      ))}
    </select>
  );
}

function ChannelSelector({ guildId, value, onChange, placeholder = "Select channel..." }: { 
  guildId: string; 
  value: string; 
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/guilds/${guildId}/channels`)
      .then(res => res.json())
      .then(data => {
        setChannels(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [guildId]);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full mt-0.5 bg-white border border-slate-200 rounded-md px-2 py-1 text-sm font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em]"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
    >
      <option value="">{loading ? "Loading channels..." : placeholder}</option>
      {channels.map(c => (
        <option key={c.id} value={c.id}>#{c.name}</option>
      ))}
    </select>
  );
}

const GuildSettingsCard = ({ guild }: { guild: GuildSettings }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<GuildSettings>>(guild);
  const [saving, setSaving] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [resettingInvites, setResettingInvites] = useState(false);
  const [resettingLevels, setResettingLevels] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error", message: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await setDoc(doc(db, "guilds", guild.guildId), formData, { merge: true });
      setIsEditing(false);
      setStatus({ type: "success", message: "Settings saved successfully!" });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error(error);
      setStatus({ type: "error", message: "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const handleSendVerification = async () => {
    setSendingVerification(true);
    setStatus(null);
    try {
      const resp = await fetch("/api/guild/setup-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId: guild.guildId }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to send message");
      setStatus({ type: "success", message: "Verification message sent!" });
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) {
      console.error(error);
      setStatus({ type: "error", message: error.message });
    } finally {
      setSendingVerification(false);
    }
  };

  const handleResetInvites = async () => {
    if (!confirm("Are you sure you want to reset ALL invite counts for this server? This will also clear the unique invite cache.")) return;
    
    setResettingInvites(true);
    setStatus(null);
    try {
      const resp = await fetch(`/api/guilds/${guild.guildId}/reset-invites`, {
        method: "POST"
      });
      if (!resp.ok) throw new Error("Failed to reset invites");
      setStatus({ type: "success", message: "All invites have been reset!" });
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setResettingInvites(false);
    }
  };

  const handleResetLevels = async () => {
    if (!confirm("Are you sure you want to reset ALL member levels and XP for this server? This cannot be undone.")) return;
    
    setResettingLevels(true);
    setStatus(null);
    try {
      const resp = await fetch(`/api/guilds/${guild.guildId}/reset-levels`, {
        method: "POST"
      });
      if (!resp.ok) throw new Error("Failed to reset levels");
      setStatus({ type: "success", message: "All levels and XP have been reset!" });
      setTimeout(() => setStatus(null), 3000);
    } catch (error: any) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setResettingLevels(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Server ID: {guild.guildId}</h3>
            <span className="text-[10px] font-bold text-emerald-500 uppercase">Bot Active</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status && (
            <div className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-right-4",
              status.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            )}>
              {status.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {status.message}
            </div>
          )}
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => { setIsEditing(false); setFormData(guild); }}
                className="px-4 py-2 text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-slate-700 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-100 uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-lg shadow-slate-100 uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all"
            >
              <Settings size={14} />
              Manage Server
            </button>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Log Channel */}
        <SettingsField 
          icon={<Hash size={16} />} 
          label="Logging Channel" 
          value={formData.logChannelId} 
          isEditing={isEditing}
          guildId={guild.guildId}
          type="channel"
          onChange={(val) => setFormData({ ...formData, logChannelId: val })}
        />

        {/* Auto Role */}
        <SettingsField 
          icon={<UserCheck size={16} />} 
          label="Auto Role" 
          value={formData.autoRoleId} 
          isEditing={isEditing}
          guildId={guild.guildId}
          type="role"
          onChange={(val) => setFormData({ ...formData, autoRoleId: val })}
        />

        {/* Verification Channel */}
        <SettingsField 
          icon={<CheckCircle size={16} />} 
          label="Verification Channel" 
          value={formData.verificationChannelId} 
          isEditing={isEditing}
          guildId={guild.guildId}
          type="channel"
          onChange={(val) => setFormData({ ...formData, verificationChannelId: val })}
        />

        {/* Verified Role */}
        <SettingsField 
          icon={<Shield size={16} />} 
          label="Verified Role" 
          value={formData.verifiedRoleId} 
          isEditing={isEditing}
          guildId={guild.guildId}
          type="role"
          onChange={(val) => setFormData({ ...formData, verifiedRoleId: val })}
        />

        {/* Leveling System */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between col-span-full">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm">
              <Zap size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leveling System</p>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-slate-700">{formData.levelingEnabled ? "Enabled" : "Disabled"}</p>
                {formData.levelingEnabled && (
                  <button 
                    onClick={handleResetLevels}
                    disabled={resettingLevels}
                    className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[9px] font-black uppercase rounded border border-rose-100 transition-all disabled:opacity-50"
                  >
                    {resettingLevels ? "Resetting..." : "Reset Levels"}
                  </button>
                )}
              </div>
            </div>
          </div>
          {isEditing && (
            <button 
              onClick={() => setFormData({ ...formData, levelingEnabled: !formData.levelingEnabled })}
              className={cn(
                "px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all",
                formData.levelingEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
              )}
            >
              {formData.levelingEnabled ? "Disable" : "Enable"}
            </button>
          )}
        </div>

        {formData.levelingEnabled && (
          <div className="col-span-full space-y-4">
            <SettingsField 
              icon={<MessageSquare size={16} />} 
              label="Level Up Message" 
              value={formData.levelUpMessage} 
              isEditing={isEditing}
              onChange={(val) => setFormData({ ...formData, levelUpMessage: val })}
            />
            <SettingsField 
              icon={<Send size={16} />} 
              label="Level Up Channel (Optional)" 
              value={formData.levelUpChannelId} 
              isEditing={isEditing}
              guildId={guild.guildId}
              type="channel"
              onChange={(val) => setFormData({ ...formData, levelUpChannelId: val })}
            />
            
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={14} className="text-amber-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Top Contributors</span>
              </div>
              <LeaderboardMini guildId={guild.guildId} />
            </div>
          </div>
        )}

        {/* YouTube Notifications */}
        <div className="col-span-full mt-4">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-xl flex items-center justify-center ${formData.youtubeLogo ? 'bg-transparent shadow-sm' : 'bg-red-50 text-red-600'}`}>
              {formData.youtubeLogo ? (
                <img src={formData.youtubeLogo} alt="YT Logo" className="w-6 h-6 rounded-full object-cover ring-2 ring-red-100" referrerPolicy="no-referrer" />
              ) : (
                <Youtube size={20} />
              )}
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 tracking-tight uppercase">YouTube Notifications</h4>
              <p className="text-[10px] text-slate-500 font-medium">Auto-announce new video uploads with @everyone</p>
            </div>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <SettingsField 
                icon={<Video size={16} />} 
                label="YouTube Handle" 
                value={formData.youtubeHandle} 
                isEditing={isEditing}
                onChange={async (val) => {
                  setFormData({ ...formData, youtubeHandle: val });
                  if (val && val.length > 2) {
                    try {
                      const res = await fetch(`/api/youtube/resolve/${encodeURIComponent(val)}`);
                      if (res.ok) {
                        const { channelId, thumbnailUrl } = await res.json();
                        setFormData(prev => ({ 
                          ...prev, 
                          youtubeHandle: val, 
                          youtubeChannelId: channelId, 
                          youtubeLogo: thumbnailUrl 
                        }));
                      }
                    } catch (e) {
                      console.error("Resolve error:", e);
                    }
                  }
                }}
              />
              {formData.youtubeChannelId && isEditing && (
                <div className="px-4 text-[9px] font-bold text-emerald-600 flex items-center gap-1 uppercase tracking-tighter">
                  <CheckCircle size={10} /> Resolved to {formData.youtubeChannelId}
                </div>
              )}
            </div>
            <SettingsField 
              icon={<Megaphone size={16} />} 
              label="Announcement Channel" 
              value={formData.youtubeAnnouncementChannelId} 
              isEditing={isEditing}
              guildId={guild.guildId}
              type="channel"
              onChange={(val) => setFormData({ ...formData, youtubeAnnouncementChannelId: val })}
            />
          </div>
        </div>

        {/* Welcome System */}
        <div className="col-span-full mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-pink-50 text-pink-600 rounded-xl">
              <UserPlus size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 tracking-tight uppercase">Welcome System</h4>
              <p className="text-[10px] text-slate-500 font-medium">Greet new members with a community message</p>
            </div>
            {isEditing && (
              <button 
                onClick={() => setFormData({ ...formData, welcomeEnabled: !formData.welcomeEnabled })}
                className={cn(
                  "ml-auto px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all",
                  formData.welcomeEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                )}
              >
                {formData.welcomeEnabled ? "Active" : "Inactive"}
              </button>
            )}
          </div>

          {formData.welcomeEnabled && (
            <div className="grid sm:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
              <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custom Welcome Message</h5>
                  <div className="flex gap-2">
                    {["[@invited]", "[member_name]"].map(tag => (
                      <button 
                        key={tag}
                        type="button"
                        onClick={() => isEditing && setFormData({ ...formData, welcomeMessage: (formData.welcomeMessage || "") + " " + tag })}
                        className="text-[9px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                
                {isEditing ? (
                  <textarea 
                    value={formData.welcomeMessage || ""} 
                    onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                    placeholder="🎉 Welcome to the community!..."
                    className="w-full h-48 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-pink-500 outline-none resize-none scrollbar-hide"
                  />
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <pre className="text-xs font-medium text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
                      {formData.welcomeMessage || `🎉 Welcome to the official server of RealZyvok!
Thanks for joining the community 💙
This server is the place to:
✨ Hang out with other viewers
📢 Get notified about new uploads & livestreams
🎮 Join events and giveaways
💬 Chat, share ideas, and have fun
Please make sure to:
📜 Read the rules
👋 Introduce yourself
🔔 Grab your notification roles
Enjoy your stay and be awesome! 🚀`}
                    </pre>
                  </div>
                )}
              </div>
              
              <SettingsField 
                icon={<Hash size={16} />} 
                label="Welcome Channel" 
                value={formData.welcomeChannelId} 
                isEditing={isEditing}
                guildId={guild.guildId}
                type="channel"
                onChange={(val) => setFormData({ ...formData, welcomeChannelId: val })}
              />
              <div className="hidden sm:block p-4 border border-slate-100 rounded-xl bg-slate-50/50 flex items-center justify-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase text-center leading-relaxed">
                  Tip: Use [invited] to @ping the member<br/>and [member_name] for usernames.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Invite Tracking System */}
        <div className="col-span-full mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Activity size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 tracking-tight uppercase">Invite Tracking</h4>
              <p className="text-[10px] text-slate-500 font-medium">Log member attribution and growth stats</p>
            </div>
            {isEditing && (
              <button 
                onClick={() => setFormData({ ...formData, inviteTrackingEnabled: !formData.inviteTrackingEnabled })}
                className={cn(
                  "ml-auto px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all",
                  formData.inviteTrackingEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                )}
              >
                {formData.inviteTrackingEnabled ? "Active" : "Inactive"}
              </button>
            )}
          </div>

          {formData.inviteTrackingEnabled && (
            <div className="grid sm:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
              <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invite Log Message</h5>
                  <div className="flex gap-2">
                    {["[@invited]", "[inviter]", "[invites]"].map(tag => (
                      <button 
                        key={tag}
                        type="button"
                        onClick={() => isEditing && setFormData({ ...formData, inviteMessage: (formData.inviteMessage || "") + " " + tag })}
                        className="text-[9px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                
                {isEditing ? (
                  <textarea 
                    value={formData.inviteMessage || ""} 
                    onChange={(e) => setFormData({ ...formData, inviteMessage: e.target.value })}
                    placeholder="[@invited] has been invited by [inviter]..."
                    className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-sm font-medium text-slate-600">
                      {formData.inviteMessage || "[@invited] has been invited by [inviter] and has now [invites] invites."}
                    </p>
                  </div>
                )}
              </div>

              <ChannelSelector guildId={guild.guildId} value={formData.inviteChannelId || ""} onChange={(val) => setFormData({ ...formData, inviteChannelId: val })} />
              <div className="hidden sm:block p-4 border border-slate-100 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center gap-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase text-center leading-relaxed">
                  Unique tracking is active.<br/>Members only count once.
                </p>
                <button 
                  onClick={handleResetInvites}
                  disabled={resettingInvites}
                  className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[9px] font-black uppercase rounded-lg border border-rose-200 transition-all disabled:opacity-50"
                >
                  {resettingInvites ? "Resetting..." : "Reset All Invites"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Auto-Mod System */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between col-span-full">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm">
              <Shield size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Auto-Mod (Banned Words)</p>
              <p className="text-sm font-semibold text-slate-700">{formData.automodEnabled ? "Active" : "Inactive"}</p>
            </div>
          </div>
          {isEditing && (
            <button 
              onClick={() => setFormData({ ...formData, automodEnabled: !formData.automodEnabled })}
              className={cn(
                "px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all",
                formData.automodEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
              )}
            >
              {formData.automodEnabled ? "Deactivate" : "Activate"}
            </button>
          )}
        </div>

        {formData.automodEnabled && (
          <div className="col-span-full space-y-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 px-1">Action to take when keyword found</p>
              <div className="flex flex-wrap gap-2">
                {["DELETE", "WARN", "KICK", "BAN"].map((action) => (
                  <button
                    key={action}
                    onClick={() => setFormData({ ...formData, automodAction: action as any })}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border",
                      formData.automodAction === action 
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100" 
                        : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                    )}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
            
            <SettingsField 
              icon={<BarChart3 size={16} />} 
              label="Banned Keywords (Comma separated)" 
              value={formData.bannedWords?.join(", ")} 
              isEditing={isEditing}
              onChange={(val) => setFormData({ ...formData, bannedWords: val.split(",").map(w => w.trim()).filter(w => w) })}
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <SettingsField 
                 icon={<AtSign size={16} />} 
                 label="Max Mentions per Message" 
                 value={formData.spamMentionsThreshold?.toString()} 
                 isEditing={isEditing}
                 onChange={(val) => setFormData({ ...formData, spamMentionsThreshold: parseInt(val) || 0 })}
              />
              <SettingsField 
                 icon={<Zap size={16} />} 
                 label="Max Messages per 5s" 
                 value={formData.spamMessageThreshold?.toString()} 
                 isEditing={isEditing}
                 onChange={(val) => setFormData({ ...formData, spamMessageThreshold: parseInt(val) || 0 })}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
               <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ExternalLink size={16} className="text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700">Anti-Link</p>
                </div>
                {isEditing && (
                  <button 
                    onClick={() => setFormData({ ...formData, antiLinkEnabled: !formData.antiLinkEnabled })}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-black uppercase",
                      formData.antiLinkEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    )}
                  >
                    {formData.antiLinkEnabled ? "ON" : "OFF"}
                  </button>
                )}
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserPlus size={16} className="text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700">Anti-Discord-Invite</p>
                </div>
                {isEditing && (
                  <button 
                    onClick={() => setFormData({ ...formData, antiInviteEnabled: !formData.antiInviteEnabled })}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-black uppercase",
                      formData.antiInviteEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    )}
                  >
                    {formData.antiInviteEnabled ? "ON" : "OFF"}
                  </button>
                )}
              </div>
            </div>

            {/* Anti-Raid System */}
            <div className="col-span-full mt-8 p-6 bg-slate-900 rounded-3xl text-white shadow-xl shadow-slate-200 overflow-hidden relative">
              <div className="absolute right-0 top-0 p-8 opacity-10">
                <Shield size={120} />
              </div>
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 bg-indigo-500 rounded-xl text-white">
                  <Zap size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight uppercase">Anti-Raid Protection</h4>
                  <p className="text-[10px] text-slate-400 font-medium tracking-tight uppercase">Detect and block automated attacks & raids</p>
                </div>
                {isEditing && (
                  <button 
                    onClick={() => setFormData({ ...formData, antiRaidEnabled: !formData.antiRaidEnabled })}
                    className={cn(
                      "ml-auto px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-lg",
                      formData.antiRaidEnabled ? "bg-indigo-400 text-indigo-950" : "bg-white/10 text-white/50"
                    )}
                  >
                    {formData.antiRaidEnabled ? "System Active" : "System Offline"}
                  </button>
                )}
              </div>

              {formData.antiRaidEnabled && (
                <div className="grid sm:grid-cols-3 gap-6 relative z-10 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest px-1">Join Rate Limit</p>
                    <div className="grid grid-cols-2 gap-3">
                      <SettingsField 
                        icon={<LogIn size={14} />} 
                        label="Join Limit" 
                        value={formData.antiRaidJoinLimit?.toString() || "5"} 
                        isEditing={isEditing}
                        className="!bg-white/5 !border-white/10 !text-white"
                        onChange={(val) => setFormData({ ...formData, antiRaidJoinLimit: parseInt(val) || 0 })}
                      />
                      <SettingsField 
                        icon={<Clock size={14} />} 
                        label="Window (s)" 
                        value={formData.antiRaidJoinWindow?.toString() || "10"} 
                        isEditing={isEditing}
                        className="!bg-white/5 !border-white/10 !text-white"
                        onChange={(val) => setFormData({ ...formData, antiRaidJoinWindow: parseInt(val) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest px-1">Account Validation</p>
                    <SettingsField 
                      icon={<Clock size={16} />} 
                      label="Min Account Age (Days)" 
                      value={formData.antiRaidMinAge?.toString() || "0"} 
                      isEditing={isEditing}
                      className="!bg-white/5 !border-white/10 !text-white"
                      onChange={(val) => setFormData({ ...formData, antiRaidMinAge: parseInt(val) || 0 })}
                    />
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest px-1">Defensive Action</p>
                    {isEditing ? (
                      <div className="flex flex-wrap gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/10">
                        {["KICK", "BAN", "NOTIFY"].map((action) => (
                          <button
                            key={action}
                            onClick={() => setFormData({ ...formData, antiRaidAction: action as any })}
                            className={cn(
                              "flex-1 px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all",
                              formData.antiRaidAction === action 
                                ? "bg-indigo-500 text-white shadow-lg" 
                                : "text-white/40 hover:text-white/60"
                            )}
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-3 bg-white/5 rounded-2xl border border-dashed border-white/20">
                        <span className="text-xs font-mono font-bold text-white uppercase">{formData.antiRaidAction || "KICK"}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {formData.antiLinkEnabled && (
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL Whitelist</h5>
                  <p className="text-[9px] text-slate-400">Trusted domains bot will ignore</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(formData.urlWhitelist || []).map((url, i) => (
                    <span key={i} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-indigo-100">
                      {url}
                      {isEditing && (
                        <button 
                          onClick={() => {
                            const nl = [...(formData.urlWhitelist || [])];
                            nl.splice(i, 1);
                            setFormData({ ...formData, urlWhitelist: nl });
                          }}
                          className="hover:text-rose-500"
                        >
                          <UserX size={10} />
                        </button>
                      )}
                    </span>
                  ))}
                  {isEditing && (
                    <button 
                      onClick={() => {
                        const url = prompt("Enter domain to whitelist (e.g. google.com)");
                        if (url) {
                          const nl = [...(formData.urlWhitelist || []), url.toLowerCase().replace(/^https?:\/\//, "")];
                          setFormData({ ...formData, urlWhitelist: nl });
                        }
                      }}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] text-slate-500 font-bold border border-dashed border-slate-300"
                    >
                      + Add Domain
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AnnouncementSection guildId={guild.guildId} />

      {guild.verificationChannelId && guild.verifiedRoleId && !isEditing && (
        <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <CheckCircle size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-900 uppercase tracking-tight">Verification System Ready</p>
              <p className="text-[11px] text-indigo-700">Send the verification button to the configured channel.</p>
            </div>
          </div>
          <button 
            onClick={handleSendVerification}
            disabled={sendingVerification}
            className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-lg shadow-md shadow-indigo-200 uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {sendingVerification ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            Send Button
          </button>
        </div>
      )}

      {!isEditing && (
        <div className="mt-6 flex justify-end">
          <p className="text-[10px] font-bold text-slate-400 uppercase">
            Changes sync instantly to your Discord bot
          </p>
        </div>
      )}
    </div>
  );
}

function AnnouncementSection({ guildId }: { guildId: string }) {
  const [channelId, setChannelId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error", msg: string } | null>(null);

  const handleSend = async () => {
    if (!channelId || !content) {
      setStatus({ type: "error", msg: "Please fill in Channel ID and Message." });
      return;
    }

    setSending(true);
    setStatus(null);

    try {
      const res = await fetch("/api/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId, channelId, content, title })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send");
      }

      setStatus({ type: "success", msg: "Announcement broadcasted successfully!" });
      setContent("");
      setTitle("");
    } catch (err: any) {
      setStatus({ type: "error", msg: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-8 pt-8 border-t border-slate-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
          <Megaphone size={20} />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none">Announcements</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Broadcast messages directly through the bot</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Target Channel</label>
            <ChannelSelector 
              guildId={guildId} 
              value={channelId} 
              onChange={setChannelId} 
              placeholder="Select target channel"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Embed Title (Optional)</label>
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your message a header..."
              className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Message Content</label>
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your announcement here..."
            rows={4}
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-none"
          />
        </div>

        {status && (
          <div className={cn(
            "p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1",
            status.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          )}>
            {status.type === "error" && <AlertCircle size={14} />}
            {status.msg}
          </div>
        )}

        <button 
          onClick={handleSend}
          disabled={sending}
          className="w-full bg-slate-900 text-white rounded-xl py-3.5 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {sending ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <>
              <Send size={16} />
              Broadcast Announcement
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function LeaderboardMini({ guildId }: { guildId: string }) {
  const [leaders, setLeaders] = useState<UserLevel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "guilds", guildId, "levels"),
      orderBy("xp", "desc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserLevel[];
      setLeaders(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [guildId]);

  if (loading) return <div className="text-[10px] text-slate-400 italic">Syncing top users...</div>;
  if (leaders.length === 0) return <div className="text-[10px] text-slate-400 italic">No XP earned yet.</div>;

  return (
    <div className="space-y-2">
      {leaders.map((user, idx) => (
        <div key={user.id} className="flex items-center justify-between text-xs transition-transform hover:translate-x-1">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-slate-100 flex items-center justify-center font-bold text-[9px] text-slate-500">
              #{idx + 1}
            </span>
            <span className="font-semibold text-slate-600">ID: {user.userId}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-black text-[9px] uppercase">
              Lv {user.level}
            </span>
            <span className="font-mono text-slate-400 tabular-nums">{user.xp} XP</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function InviteLeaderboardMini({ guildId }: { guildId: string }) {
  const [leaders, setLeaders] = useState<UserLevel[] & { invites?: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "guilds", guildId, "levels"),
      orderBy("invites", "desc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      setLeaders(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [guildId]);

  if (loading) return <div className="text-[10px] text-slate-400 italic">Syncing inviters...</div>;
  if (leaders.length === 0) return <div className="text-[10px] text-slate-400 italic">No invites tracked.</div>;

  return (
    <div className="space-y-3">
      {leaders.map((user, idx) => (
        <div key={user.id} className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="shrink-0 w-4 h-4 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-[8px] text-indigo-500">
              {idx + 1}
            </span>
            <span className="text-[11px] font-bold text-slate-700 truncate">ID: {user.userId}</span>
          </div>
          <div className="flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded">
            <span className="text-[10px] font-black text-emerald-600 tabular-nums">{user.invites || 0}</span>
            <span className="text-[8px] font-black text-emerald-600/60 uppercase">Invites</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentWelcomesMini({ guildId }: { guildId: string }) {
  const [welcomes, setWelcomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "guilds", guildId, "welcomes"),
      orderBy("timestamp", "desc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWelcomes(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [guildId]);

  if (loading) return <div className="text-[10px] text-slate-400 italic">Syncing joins...</div>;
  if (welcomes.length === 0) return <div className="text-[10px] text-slate-400 italic">Waiting for first member...</div>;

  return (
    <div className="space-y-3">
      {welcomes.map((w) => (
        <div key={w.id} className="flex items-center justify-between group">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-700 truncate">@{w.userName}</span>
          </div>
          <span className="text-[9px] font-mono text-slate-300">
            {new Date(w.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ))}
    </div>
  );
}

function SettingsField({ icon, label, value, isEditing, onChange, type = "text", guildId, className }: { 
  icon: ReactNode, 
  label: string, 
  value?: string, 
  isEditing: boolean, 
  onChange: (val: string) => void,
  type?: "text" | "channel" | "role",
  guildId?: string,
  className?: string
}) {
  return (
    <div className={cn("p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-4 group transition-all hover:bg-slate-100/50", className)}>
      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        {isEditing ? (
          type === "channel" && guildId ? (
            <ChannelSelector guildId={guildId} value={value || ""} onChange={onChange} />
          ) : type === "role" && guildId ? (
            <RoleSelector guildId={guildId} value={value || ""} onChange={onChange} />
          ) : (
            <input 
              type="text" 
              value={value || ""} 
              onChange={(e) => onChange(e.target.value)}
              placeholder="Enter value..."
              className="w-full mt-0.5 bg-white border border-slate-200 rounded-md px-2 py-1 text-sm font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          )
        ) : (
          <p className="text-sm font-semibold text-slate-700 truncate">
            {value || <span className="text-slate-300 font-normal italic text-xs">Not Configured</span>}
          </p>
        )}
      </div>
    </div>
  );
}
