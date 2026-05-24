import { useState, useEffect } from 'react';
import { Bell, Clock, Save, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { smsService } from '../lib/sms';
import { cn } from '../lib/utils';

export const MarketingSettings = () => {
    const [settings, setSettings] = useState({
        daily_notification_time: '12:00:00',
        is_enabled: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [istNow, setIstNow] = useState('');

    useEffect(() => {
        const getIST = () => {
            const now = new Date();
            const istOffset = 5.5 * 60 * 60 * 1000;
            const istTime = new Date(now.getTime() + istOffset);
            return istTime.toISOString().substring(11, 16);
        };

        setIstNow(getIST());
        const timer = setInterval(() => {
            setIstNow(getIST());
        }, 30000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await smsService.getMarketingSettings();
                if (data) {
                    // Extract HH:mm from HH:mm:ss
                    setSettings({
                        daily_notification_time: data.daily_notification_time.substring(0, 5),
                        is_enabled: data.is_enabled
                    });
                }
            } catch (error) {
                console.error('Failed to load marketing settings', error);
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            // 1. Update the settings in our table
            const result = await smsService.updateMarketingSettings({
                daily_notification_time: `${settings.daily_notification_time}:00`,
                is_enabled: settings.is_enabled
            });

            if (result) {
                // 2. Manage the pg_cron schedule via Supabase SQL
                // Note: The backend handles the IST to UTC comparison internally.

                setMessage({ type: 'success', text: 'Marketing settings updated successfully! Daily blast scheduled for ' + settings.daily_notification_time + ' IST.' });
            } else {
                setMessage({ type: 'error', text: 'Failed to update settings.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                <Loader2 className="w-10 h-10 animate-spin mb-3 text-orange-400" />
                <p>Loading settings...</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-8">
            <div className="bg-white rounded-3xl border shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-10 text-white">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <Sparkles className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold italic tracking-tight">Mood-Based Marketing</h2>
                            <p className="text-purple-100 text-sm opacity-90">Engagement alerts for your customers</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* Status Toggle */}
                    <div className="flex items-center justify-between p-6 bg-purple-50 rounded-2xl border border-purple-100">
                        <div>
                            <h3 className="font-bold text-gray-900 group flex items-center gap-2">
                                <Bell className="w-5 h-5 text-purple-600" />
                                Daily Smart Alerts
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Send a "mood-based" recommendation SMS every day.</p>
                        </div>
                        <button
                            onClick={() => setSettings(s => ({ ...s, is_enabled: !s.is_enabled }))}
                            className={cn(
                                'relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ring-offset-2 focus:ring-2 focus:ring-purple-500',
                                settings.is_enabled ? 'bg-purple-600' : 'bg-gray-200'
                            )}
                        >
                            <span
                                className={cn(
                                    'inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ease-in-out',
                                    settings.is_enabled ? 'translate-x-6' : 'translate-x-1'
                                )}
                            />
                        </button>
                    </div>

                    {/* Time Picker */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-purple-500" />
                                Daily Notification Time (IST)
                            </label>
                            <div className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-bold text-gray-500 flex items-center gap-1.5 border">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                SERVER TIME: {istNow} IST
                            </div>
                        </div>
                        <div className="relative group">
                            <input
                                type="time"
                                value={settings.daily_notification_time}
                                onChange={(e) => setSettings(s => ({ ...s, daily_notification_time: e.target.value }))}
                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-xl font-bold tracking-widest text-gray-800 outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-400 transition-all appearance-none"
                            />
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                                <Clock className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="text-xs text-info flex items-center gap-1.5 px-2">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Tip: Morning (10:00 AM IST) or Lunch (01:00 PM IST) work best!
                        </p>
                    </div>

                    {/* Preview Section */}
                    <div className="bg-gray-50 rounded-2xl p-6 border border-dashed border-gray-300">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Sample Notification</h4>
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                <span className="text-lg">💬</span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-purple-600 mb-1">QuickBite Special</p>
                                <p className="text-sm text-gray-700 leading-relaxed italic">
                                    "Hungry + Angry = Hangry. We have the cure for both. Click before you bite someone! 🍔 Get your Cheese Burger today!"
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Message Area */}
                    {message && (
                        <div className={cn(
                            "p-4 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2",
                            message.type === 'success' ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
                        )}>
                            {message.text}
                        </div>
                    )}

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-5 rounded-2xl shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};
