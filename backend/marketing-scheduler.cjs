// marketing-scheduler.cjs

const { GoogleGenerativeAI } = require('@google/generative-ai');

const MOOD_TEMPLATES = [
    {
        mood: 'stressed',
        text: "Feeling stressed? A cheesy {item} is the ultimate therapy session! 🍕 Order now on QuickBite!",
        keywords: ['pizza', 'cheese', 'burger', 'sandwich']
    },
    {
        mood: 'hangry',
        text: "Hungry + Angry = Hangry. We have the cure for both. Click before you bite someone! 🍔 Get your {item} today!",
        keywords: ['burger', 'sandwich', 'fries', 'roll']
    },
    {
        mood: 'good_mood',
        text: "Good moods deserve great food. Treat yourself because you’re the main character today! ✨ {item} is waiting for you!",
        keywords: ['dessert', 'beverage', 'cake', 'shake', 'ice cream']
    },
    {
        mood: 'tough_life',
        text: "Life is tough, but this {item} is tender. Let’s fix that mood? 🍲 Only on QuickBite!",
        keywords: ['biryani', 'curry', 'meat', 'chicken', 'paneer']
    }
];

class MarketingScheduler {
    constructor(supabase, twilioClient, twilioPhoneNumber) {
        this.supabase = supabase;
        this.twilioClient = twilioClient;
        this.twilioPhoneNumber = twilioPhoneNumber;
        this.interval = null;
        this.genAI = process.env.VITE_GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY) : null;
    }

    start() {
        console.log('Marketing Scheduler initialized. Checking every minute...');
        // Check immediately on start
        this.checkAndSend();
        // Then check every minute
        this.interval = setInterval(() => this.checkAndSend(), 60 * 1000);
    }

    stop() {
        if (this.interval) clearInterval(this.interval);
    }

    async getGeminiRecommendation(menuItems, mood = null) {
        if (!this.genAI) {
            console.log('[Marketing] Gemini AI not configured (missing VITE_GEMINI_API_KEY in .env)');
            return null;
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            
            const menuList = menuItems.map(item => `${item.name} (${item.category})`).join(', ');
            const moodContext = mood ? `for someone feeling ${mood}` : 'for general marketing';
            
            const prompt = `You are a marketing assistant for QuickBite food delivery app. 
Create a short, engaging SMS marketing message (under 160 characters) ${moodContext}.
Available menu items: ${menuList}
Guidelines:
- Keep it fun and casual
- Include 1-2 relevant emojis
- Mention a specific item from the menu
- End with a call to action
- Make it sound personal and mood-appropriate
- Do NOT include quotes in your response`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const message = response.text().trim();
            
            console.log(`[Marketing] Gemini AI generated recommendation: "${message}"`);
            return message;
            
        } catch (error) {
            console.error('[Marketing] Gemini AI recommendation failed:', error.message);
            return null;
        }
    }

    async checkAndSend() {
        // This method can now be used as an on-demand check if needed, 
        // but executeBlast is the primary trigger.
        try {
            // 1. Get settings
            const { data: settings, error: settingsError } = await this.supabase
                .from('marketing_settings')
                .select('*')
                .single();

            if (settingsError || !settings || !settings.is_enabled) {
                return;
            }

            // 2. Check if it's time
            const now = new Date();
            const istOffset = 5.5 * 60 * 60 * 1000;
            const istTime = new Date(now.getTime() + istOffset);
            const currentTimeIST = istTime.toISOString().split('T')[1].substring(0, 5); // "HH:mm" IST
            const scheduledTimeIST = settings.daily_notification_time.substring(0, 5);

            console.log(`[Marketing] Heartbeat check. Server (IST): ${currentTimeIST}, Scheduled: ${scheduledTimeIST} IST`);

            if (currentTimeIST !== scheduledTimeIST) {
                return;
            }

            // 3. Avoid duplicate sends (daily check)
            const lastSent = settings.last_sent_at ? new Date(settings.last_sent_at) : null;
            if (lastSent && lastSent.getUTCDate() === now.getUTCDate() && lastSent.getUTCMonth() === now.getUTCMonth()) {
                console.log(`Blast already sent today (${currentTimeIST} IST). Skipping.`);
                return;
            }

            console.log(`[Marketing] Triggering daily mood marketing blast at ${currentTimeIST} IST`);
            await this.executeBlast();

            // 4. Update last_sent_at
            await this.supabase
                .from('marketing_settings')
                .update({ last_sent_at: now.toISOString() })
                .eq('id', settings.id);

        } catch (err) {
            console.error('[Marketing] Scheduler error:', err.message);
        }
    }

    async executeBlast() {
        try {
            // 1. Check if enabled
            const { data: settings, error: settingsError } = await this.supabase
                .from('marketing_settings')
                .select('*')
                .single();

            if (settingsError || !settings || !settings.is_enabled) {
                console.log('[Marketing] Blast triggered but marketing is disabled. Skipping.');
                return;
            }

            // 2. Fetch phone numbers from orders
            const { data: orders, error: ordersErr } = await this.supabase
                .from('orders')
                .select('phone')
                .not('phone', 'is', null);

            if (ordersErr) throw ordersErr;

            const phones = Array.from(new Set(orders.map(o => o.phone).filter(Boolean)));
            if (phones.length === 0) {
                console.log('[Marketing] No phone numbers found. Aborting blast.');
                return;
            }

            // 3. Fetch available menu items
            const { data: menu, error: menuErr } = await this.supabase
                .from('menu_items')
                .select('name, category')
                .eq('is_available', true);

            if (menuErr) throw menuErr;
            if (menu.length === 0) {
                console.log('[Marketing] No available items found. Aborting blast.');
                return;
            }

            // 4. Select Template and Item
            const template = MOOD_TEMPLATES[Math.floor(Math.random() * MOOD_TEMPLATES.length)];

            let selectedItem = menu.find(item =>
                template.keywords.some(k => item.name.toLowerCase().includes(k) || item.category.toLowerCase().includes(k))
            );

            if (!selectedItem) {
                selectedItem = menu[Math.floor(Math.random() * menu.length)];
            }
            const traditionalMessage = template.text.replace('{item}', selectedItem.name);

            // 5. Try Gemini AI Recommendation
            let message = traditionalMessage;
            let messageSource = 'Traditional Template';
            
            try {
                const geminiMessage = await this.getGeminiRecommendation(menu, template.mood);
                if (geminiMessage) {
                    message = geminiMessage;
                    messageSource = 'Gemini AI';
                }
            } catch (error) {
                console.log('[Marketing] Using traditional template as fallback');
            }

            console.log(`[Marketing] Sending blast (${messageSource}): "${message}" to ${phones.length} customers`);

            // 6. Bulk send using Promise.allSettled
            const results = await Promise.allSettled(
                phones.map(phone => {
                    const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
                    return this.twilioClient.messages.create({
                        body: message,
                        from: this.twilioPhoneNumber,
                        to: formattedPhone
                    });
                })
            );

            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            console.log(`[Marketing] Blast complete: ${successful} sent, ${failed} failed.`);

            // 7. Update last_sent_at
            await this.supabase
                .from('marketing_settings')
                .update({ last_sent_at: new Date().toISOString() })
                .eq('id', settings.id);

        } catch (err) {
            console.error('[Marketing] Blast execution failed:', err.message);
        }
    }
}

module.exports = MarketingScheduler;
