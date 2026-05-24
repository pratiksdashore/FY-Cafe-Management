// server.js

const express = require("express");
const cors = require("cors");
const HybridScheduler = require("./scheduler.cjs");
const MarketingScheduler = require("./marketing-scheduler.cjs");
const AIRecommendationEngine = require("./airecommendation.cjs");
const { createClient } = require("@supabase/supabase-js");
const Razorpay = require("razorpay");
const { Twilio } = require("twilio");
const { exec } = require("child_process");
const path = require("path");
require("dotenv").config({ path: "../.env" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const app = express();
app.use(cors({
  origin: [
    "http://localhost:8080",
    "http://localhost:5174",
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());

// Razorpay instance (uses test credentials from .env)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YA0NM1vzMXoK7n',
  key_secret: process.env.RAZORPAY_SECRET || 'TYbQmsU1f0kuJU3VQZlUx9sA',
});

// In-memory recommendation engine (for demo)
let recommendationEngine = null;

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;


const twilioClient = accountSid && authToken ? new Twilio(accountSid, authToken) : null;

// Initialize Marketing Scheduler
const marketingScheduler = twilioClient ? new MarketingScheduler(supabase, twilioClient, twilioPhoneNumber) : null;
if (marketingScheduler) {
  marketingScheduler.start();
}

// Helper function to format phone number
const formatPhoneNumber = (phone) => {
  return phone.startsWith('+91') ? phone : `+91${phone}`;
};

/* =========================
   HYBRID SCHEDULER ROUTE
========================= */
app.post("/schedule", (req, res) => {
  const { processes, initialQuantum } = req.body;

  if (!processes || !Array.isArray(processes)) {
    return res.status(400).json({ error: "Invalid processes array" });
  }

  const scheduler = new HybridScheduler(processes, {
    initialQuantum: initialQuantum || 2
  });

  const result = scheduler.run();

  res.json({
    message: "Hybrid Scheduling Complete",
    result
  });
});

/* =========================
   INITIALIZE RECOMMENDER
========================= */
app.post("/recommend/init", (req, res) => {
  const { items, epsilon } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: "Invalid items array" });
  }

  recommendationEngine = new AIRecommendationEngine(items, { epsilon });

  res.json({ message: "Recommendation engine initialized" });
});

/* =========================
   GET RECOMMENDATION
========================= */
app.get("/recommend", (req, res) => {
  if (!recommendationEngine) {
    return res.status(400).json({ error: "Engine not initialized" });
  }

  const recommendation = recommendationEngine.recommend();

  res.json({
    recommendation
  });
});

/* =========================
   SEND FEEDBACK (REWARD)
========================= */
app.post("/recommend/feedback", (req, res) => {
  const { itemId, reward } = req.body;

  if (!recommendationEngine) {
    return res.status(400).json({ error: "Engine not initialized" });
  }

  recommendationEngine.update(itemId, reward);

  res.json({
    message: "Feedback recorded",
    stats: recommendationEngine.getStats()
  });
});

/* =========================
   XGBOOST RECOMMENDATION
========================= */
app.post("/api/recommendations", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }


    // 1. Fetch user orders and current menu
    const [ordersRes, menuRes] = await Promise.all([
      supabase.from("orders").select("order_items(menu_item_data)").eq("user_id", userId),
      supabase.from("menu_items").select("name, is_available")
    ]);

    if (ordersRes.error) throw ordersRes.error;
    if (menuRes.error) throw menuRes.error;

    const orders = ordersRes.data || [];
    const menuItems = menuRes.data || [];

    // 2. Identify ordered items
    const orderedItems = new Set();
    orders.forEach(order => {
      if (order.order_items) {
        order.order_items.forEach(item => {
          if (item.menu_item_data?.name) {
            orderedItems.add(item.menu_item_data.name.toLowerCase());
          }
        });
      }
    });

    // 3. Map to features (0 or 1)
    // Features: [pizza_ordered, burger_ordered, pasta_ordered, 
    //            pizza_available, burger_available, pasta_available]
    const foodTypes = ["pizza", "burger", "pasta"];
    const features = [];

    // Ordered features
    foodTypes.forEach(type => {
      const wasOrdered = Array.from(orderedItems).some(name => name.includes(type)) ? 1 : 0;
      features.push(wasOrdered);
    });

    // Available features
    foodTypes.forEach(type => {
      const isAvailable = menuItems.some(item =>
        item.name.toLowerCase().includes(type) && item.is_available
      ) ? 1 : 0;
      features.push(isAvailable);
    });


    // 4. Call Python wrapper
    const scriptPath = path.join(__dirname, "..", "recomendation", "predict_wrapper.py");
    const cmd = `python "${scriptPath}" ${features.join(" ")}`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Exec error: ${error.message}`);
        return res.status(500).json({ error: "Execution failed" });
      }
      if (stderr) {
        console.error(`Python stderr: ${stderr}`);
      }

      const predictionIndex = parseInt(stdout.trim());
      if (isNaN(predictionIndex)) {
        return res.status(500).json({ error: "Invalid prediction from model" });
      }

      const predictedName = foodTypes[predictionIndex];

      // 5. Find the actual menu item objects matching the prediction
      const recommendations = menuItems
        .filter(item => item.name.toLowerCase().includes(predictedName) && item.is_available)
        .slice(0, 2);

      res.json({
        recommendations: recommendations.map(r => r.name),
        source: "xgboost"
      });
    });

  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;

/* =========================
   DYNAMIC WAIT TIME ROUTE
========================= */
app.post("/calculate-wait-time", async (req, res) => {
  try {
    const {
      currentOrders = [],
      newOrder,
      historicalWaitFactor = 1.0,
      initialQuantum = 5
    } = req.body;

    if (!newOrder) {
      return res.status(400).json({ error: "No new order provided" });
    }

    // Fetch available chefs from database
    const { data: chefs, error: chefError } = await supabase
      .from('chefs')
      .select('id, name')
      .eq('is_available', true);

    if (chefError) {
      console.error('Error fetching chefs:', chefError);
    }

    const chefIds = chefs && chefs.length > 0 ? chefs.map(c => c.id) : ['default_chef'];

    // Combine existing orders with the new one for simulation
    const allProcesses = [...currentOrders, newOrder].map((o, index) => ({
      id: o.id || `order_${index}`,
      burstTime: o.burstTime || 15,
      chef_id: o.chef_id || null, // Include chef assignment
      isNew: o === newOrder
    }));

    const scheduler = new HybridScheduler(allProcesses, {
      numChefs: chefIds.length,
      chefIds: chefIds,
      initialQuantum,
      historicalWaitFactor
    });

    const result = scheduler.run();

    // Find the completion time of the new order
    const newOrderResult = result.completed.find(p => p.isNew);
    const estimatedWaitMinutes = newOrderResult ? newOrderResult.completionTime : result.totalHospitalityTime;

    res.json({
      estimatedWaitMinutes: Math.ceil(estimatedWaitMinutes),
      totalKitchenLoad: result.totalHospitalityTime,
      individualOrders: result.completed
    });
  } catch (error) {
    console.error('Wait time calculation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* =========================
   RAZORPAY – CREATE ORDER
========================= */
app.post("/api/payment/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const options = {
      amount: Math.round(amount), // amount in paise (already converted by frontend)
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1, // auto-capture
    };

    const order = await razorpay.orders.create(options);

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    res.status(500).json({ error: error.message || "Failed to create payment order" });
  }
});

/* =========================
   SMS SERVICE ENDPOINTS
========================= */

// Send order confirmation SMS
app.post("/api/sms/order-confirmation", async (req, res) => {
  try {
    if (!twilioClient) {
      return res.status(500).json({
        success: false,
        error: 'Twilio not configured'
      });
    }

    const { to, tokenNumber, waitMinutes, totalAmount, itemsCount } = req.body;

    if (!to || !tokenNumber || !waitMinutes || !totalAmount || !itemsCount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const formattedPhone = formatPhoneNumber(to);
    const message = `🍔 QuickBite Order Confirmed!
📋 Token: #${tokenNumber}
⏱️ Ready in: ${waitMinutes} mins
💰 Total: ₹${totalAmount}
📦 Items: ${itemsCount}
Thank you for your order!`;

    const result = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: formattedPhone,
    });

    console.log('Order confirmation SMS sent:', result.sid);
    res.json({ success: true, messageId: result.sid });

  } catch (error) {
    console.error('Failed to send order confirmation SMS:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send order ready notification
app.post("/api/sms/order-ready", async (req, res) => {
  try {
    if (!twilioClient) {
      return res.status(500).json({
        success: false,
        error: 'Twilio not configured'
      });
    }

    const { to, tokenNumber } = req.body;

    if (!to || !tokenNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const formattedPhone = formatPhoneNumber(to);
    const message = `🎉 Your QuickBite order is ready!
📋 Token: #${tokenNumber}
Please collect your order from the counter. Enjoy your meal!`;

    const result = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: formattedPhone,
    });

    console.log('Order ready SMS sent:', result.sid);
    res.json({ success: true, messageId: result.sid });

  } catch (error) {
    console.error('Failed to send order ready SMS:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send order completed notification
app.post("/api/sms/order-completed", async (req, res) => {
  try {
    if (!twilioClient) {
      return res.status(500).json({
        success: false,
        error: 'Twilio not configured'
      });
    }

    const { to, tokenNumber } = req.body;

    if (!to || !tokenNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const formattedPhone = formatPhoneNumber(to);
    const message = `✅ Your QuickBite order #${tokenNumber} has been completed.
Thank you for dining with us! How was your experience? Rate us on the app!`;

    const result = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: formattedPhone,
    });

    console.log('Order completed SMS sent:', result.sid);
    res.json({ success: true, messageId: result.sid });

  } catch (error) {
    console.error('Failed to send order completed SMS:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post("/api/sms/todays-special", async (req, res) => {
  try {
    if (!twilioClient) {
      return res.status(500).json({
        success: false,
        error: 'Twilio not configured'
      });
    }

    const { phoneNumbers, itemName, price, description } = req.body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || !itemName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: phoneNumbers (array), itemName'
      });
    }

    console.log(`Sending Today's Special SMS to ${phoneNumbers.length} customers for ${itemName}`);

    const results = await Promise.allSettled(
      phoneNumbers.map(async (to) => {
        const formattedPhone = formatPhoneNumber(to);
        const message = `🌟 TODAY'S SPECIAL 🌟

We're serving: ${itemName}
${price ? `Price: ₹${price}` : ''}
${description ? `Info: ${description}` : ''}

Check it out on the app now! 😋`;

        return twilioClient.messages.create({
          body: message,
          from: twilioPhoneNumber,
          to: formattedPhone,
        });
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected');

    // Log each failure reason
    failed.forEach((r, i) => console.error(`  Today's Special fail #${i + 1}:`, r.reason?.message));

    console.log(`Bulk SMS complete: ${successful} sent, ${failed.length} failed`);
    res.json({
      success: true,
      sentCount: successful,
      failedCount: failed.length
    });

  } catch (error) {
    console.error('Failed to send marketing SMS:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post("/api/sms/discount-alert", async (req, res) => {
  try {
    if (!twilioClient) {
      return res.status(500).json({
        success: false,
        error: 'Twilio not configured'
      });
    }

    const { phoneNumbers, itemName, discountPercent, originalPrice, newPrice } = req.body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || !itemName || !discountPercent) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: phoneNumbers, itemName, discountPercent'
      });
    }

    console.log(`Sending Discount Alert SMS to ${phoneNumbers.length} customers for ${itemName}`);

    const results = await Promise.allSettled(
      phoneNumbers.map(async (to) => {
        const formattedPhone = formatPhoneNumber(to);
        const message = `🔥 MEGA DISCOUNT ALERT 🔥

We've slashed the price on: ${itemName}
Discount: ${discountPercent}% OFF!
${originalPrice ? `Original: ₹${originalPrice}` : ''}
${newPrice ? `SALE PRICE: ₹${newPrice}` : ''}

Grab it now before it's gone! 🏃💨`;

        return twilioClient.messages.create({
          body: message,
          from: twilioPhoneNumber,
          to: formattedPhone,
        });
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected');

    failed.forEach((r, i) => console.error(`  Discount fail #${i + 1}:`, r.reason?.message));

    console.log(`Discount Bulk SMS complete: ${successful} sent, ${failed.length} failed`);
    res.json({
      success: true,
      sentCount: successful,
      failedCount: failed.length
    });

  } catch (error) {
    console.error('Failed to send discount SMS:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});



// Test SMS
app.post("/api/sms/test", async (req, res) => {
  try {
    if (!twilioClient) {
      return res.status(500).json({
        success: false,
        error: 'Twilio not configured'
      });
    }

    const { to } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    const formattedPhone = formatPhoneNumber(to);
    const message = `🧪 QuickBite SMS Test
This is a test message from QuickBite ordering system.
SMS notifications are working correctly!`;

    const result = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: formattedPhone,
    });

    console.log('Test SMS sent:', result.sid);
    res.json({ success: true, messageId: result.sid });

  } catch (error) {
    console.error('Failed to send test SMS:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post("/api/sms/execute-scheduled-blast", async (req, res) => {
  try {
    if (!marketingScheduler) {
      return res.status(500).json({ error: 'Marketing scheduler not initialized' });
    }

    console.log('[Cron] Manual blast trigger received');
    await marketingScheduler.checkAndSend();
    res.json({ success: true, message: 'Blast check completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Marketing Settings
app.get("/api/marketing/settings", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("marketing_settings")
      .select("*")
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    res.json(data || { daily_notification_time: "12:00:00", is_enabled: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/marketing/settings", async (req, res) => {
  try {
    const { daily_notification_time, is_enabled } = req.body;

    // Try to update the first row
    const { data: existing } = await supabase.from("marketing_settings").select("id").limit(1).single();

    let result;
    if (existing) {
      result = await supabase
        .from("marketing_settings")
        .update({
          daily_notification_time,
          is_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("marketing_settings")
        .insert({
          daily_notification_time,
          is_enabled,
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/api/sms/health", (req, res) => {
  res.json({
    status: 'ok',
    twilioConfigured: !!twilioClient,
    timestamp: new Date().toISOString()
  });
});

/* =========================
   PRE-ORDER PROCESSOR
   Runs every 60s — finds pre-orders whose scheduled_at has passed,
   marks them READY, and sends the "order ready" SMS.
========================= */
const processPreOrders = async () => {
  try {
    const now = new Date().toISOString();
    console.log(`[PreOrder] Checking at ${now}`);

    // First check if scheduled_at column exists by doing a safe query
    const { data: dueOrders, error } = await supabase
      .from('orders')
      .select('id, token_number, phone, scheduled_at, status')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', now)
      .in('status', ['PLACED', 'PREPARING']);

    if (error) {
      console.error('[PreOrder] Fetch error:', error.message, '— Did you run database/add_preorder_column.sql?');
      return;
    }

    console.log(`[PreOrder] Due orders found: ${dueOrders?.length ?? 0}`);
    if (dueOrders?.length) console.log('[PreOrder] Orders:', JSON.stringify(dueOrders));

    if (!dueOrders || dueOrders.length === 0) return;

    for (const order of dueOrders) {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'READY', updated_at: new Date().toISOString() })
        .eq('id', order.id);

      if (updateError) {
        console.error(`[PreOrder] Failed to update order ${order.id}:`, updateError.message);
        continue;
      }

      console.log(`[PreOrder] Order ${order.id} (Token #${order.token_number}) → READY`);

      if (order.phone && twilioClient) {
        try {
          const formattedPhone = formatPhoneNumber(order.phone);
          await twilioClient.messages.create({
            body: `🎉 Your QuickBite pre-order is ready!\n📋 Token: #${order.token_number}\nPlease collect your order from the counter. Enjoy your meal!`,
            from: twilioPhoneNumber,
            to: formattedPhone,
          });
          console.log(`[PreOrder] SMS sent to ${order.phone} for token #${order.token_number}`);
        } catch (smsErr) {
          console.error(`[PreOrder] SMS failed for order ${order.id}:`, smsErr.message);
        }
      }
    }
  } catch (err) {
    console.error('[PreOrder] Unexpected error:', err.message);
  }
};

// Manual trigger endpoint — hit GET /api/preorder/process to run immediately
app.get('/api/preorder/process', async (req, res) => {
  await processPreOrders();
  res.json({ success: true, message: 'Pre-order processing triggered', time: new Date().toISOString() });
});

// Debug endpoint — shows all pending pre-orders and current server time
app.get('/api/preorder/debug', async (req, res) => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('orders')
    .select('id, token_number, status, scheduled_at, phone')
    .not('scheduled_at', 'is', null)
    .order('scheduled_at', { ascending: true });
  res.json({ serverTime: now, orders: data, error: error?.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Twilio configured: ${!!twilioClient}`);

  // Start pre-order processor after server is ready
  console.log('[PreOrder] Processor starting...');
  processPreOrders();
  setInterval(processPreOrders, 60 * 1000);
});