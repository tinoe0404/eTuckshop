# WhatsApp Cloud API Setup Guide

This guide walks you through setting up the Meta WhatsApp Cloud API integration for the eTuckshop chatbot.

## 📋 Prerequisites

- Meta Business Account
- WhatsApp Business Account
- Your backend deployed and accessible via HTTPS (required for webhooks)

---

## 🚀 Step-by-Step Setup

### Step 1: Create Meta App

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Click **"My Apps"** → **"Create App"**
3. Select **"Business"** as app type
4. Fill in app details:
   - **App Name:** eTuckshop WhatsApp Bot
   - **Contact Email:** Your email
   - **Business Account:** Select or create one

### Step 2: Add WhatsApp Product

1. In your app dashboard, click **"Add Product"**
2. Find **"WhatsApp"** and click **"Set Up"**
3. You'll be taken to the WhatsApp setup page

### Step 3: Get Credentials

#### A. Access Token

1. Go to **WhatsApp > API Setup**
2. Under **"Temporary access token"**, copy the token
   - **Note:** This token expires in 23 hours (for development)
3. For production, generate a permanent token:
   - Go to **App Settings > Basic > App Secret**
   - Use the System User token flow (see Meta docs)

**Copy this value to `.env`:**
```env
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxx
```

#### B. Phone Number ID

1. Still in **WhatsApp > API Setup**
2. Under **"Phone number ID"**, copy the ID
   - This is NOT your actual phone number
   - It's Meta's internal ID for your WhatsApp number

**Copy to `.env`:**
```env
WHATSAPP_PHONE_ID=123456789012345
```

#### C. App Secret (Optional but Recommended)

1. Go to **App Settings > Basic**
2. Click **"Show"** next to **App Secret**
3. Copy the secret

**Copy to `.env`:**
```env
WHATSAPP_APP_SECRET=abc123def456...
```

#### D. Verify Token (You Create This)

This is a random string you create yourself for webhook verification.

**Add to `.env`:**
```env
WHATSAPP_VERIFY_TOKEN=etuckshop_verify_2024
```

### Step 4: Set Up Webhook

#### A. Deploy Your Backend

Your backend **MUST** be accessible via HTTPS. Options:

1. **Render.com** (Free tier available)
2. **Railway.app**
3. **Heroku**
4. **Your own server with SSL**

**Example deployed URL:**
```
https://etuckshop-backend.onrender.com
```

#### B. Configure Webhook in Meta

1. Go to **WhatsApp > Configuration**
2. Under **"Webhook"**, click **"Edit"**
3. Enter your webhook URL:
   ```
   https://your-backend-domain.com/api/whatsapp/webhook
   ```
4. Enter your **Verify Token** (the one you created in `.env`)
5. Click **"Verify and Save"**

**What happens:**
- Meta sends a GET request to your webhook
- Your server returns the `hub.challenge` value
- If successful, webhook is verified ✅

#### C. Subscribe to Webhook Events

1. Still in **WhatsApp > Configuration**
2. Under **"Webhook fields"**, subscribe to:
   - ✅ `messages` (incoming messages)
   - ❌ `message_status` (optional - for read receipts)

### Step 5: Test Your Setup

#### A. Send a Test Message

1. In **WhatsApp > API Setup**, find **"To"**
2. Enter YOUR phone number (must be added to the app first)
3. Click **"Send message"**
4. Check your WhatsApp - you should receive a test message

#### B. Reply to Test Your Bot

1. Reply with **"Hi"** to the test message
2. Your bot should respond with the main menu
3. Check your server logs for:
   ```
   📨 Received message from 263771234567: "Hi"
   ✅ Message sent to 263771234567 (ID: wamid.xxx)
   ```

---

## 🔧 Troubleshooting

### Issue: Webhook Verification Fails

**Symptoms:**
- Meta shows "Webhook verification failed"
- Your logs show no GET request

**Solutions:**
1. ✅ Ensure backend is deployed and accessible via HTTPS
2. ✅ Check `WHATSAPP_VERIFY_TOKEN` matches in:
   - Your `.env` file
   - Meta webhook configuration
3. ✅ Test your GET endpoint manually:
   ```bash
   curl "https://your-domain.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=12345"
   # Should return: 12345
   ```

### Issue: Messages Not Received

**Symptoms:**
- You send a message, but bot doesn't respond
- No logs in your server

**Solutions:**
1. ✅ Check webhook is subscribed to `messages` event
2. ✅ Verify your phone number is added to the app (Development mode only allows 5 numbers)
3. ✅ Check server logs for errors
4. ✅ Ensure `WHATSAPP_ACCESS_TOKEN` is valid (not expired)

### Issue: Cannot Send Messages

**Symptoms:**
- Bot receives message (shows in logs)
- But doesn't send reply

**Solutions:**
1. ✅ Check `WHATSAPP_ACCESS_TOKEN` is valid
2. ✅ Check `WHATSAPP_PHONE_ID` is correct
3. ✅ Look for error in logs:
   ```
   ❌ WhatsApp API Error: 
   ```
4. ✅ Verify you're not rate-limited (1000 msg/day in dev mode)

### Issue: Duplicate Messages

**Symptoms:**
- Bot processes same message multiple times
- User receives multiple replies

**Solutions:**
- ✅ Idempotency is implemented - check Redis is working
- ✅ Ensure you return 200 OK quickly (within 3 seconds)
- ✅ Check `isMessageProcessed` function works

---

## 🧪 Testing Guide

### 1. Local Development

You can't test webhooks locally unless you use ngrok:

```bash
# Install ngrok
npm install -g ngrok

# Run ngrok
ngrok http 5000

# Use the HTTPS URL in Meta webhook config
https://abc123.ngrok.io/api/whatsapp/webhook
```

### 2. Production Testing Checklist

- [ ] Webhook verified successfully
- [ ] Can receive "Hi" and get main menu
- [ ] Can browse categories (reply "1")
- [ ] Can view product details
- [ ] Can add item to cart
- [ ] Can view cart
- [ ] Can complete checkout (test Paynow link)
- [ ] Idempotency works (send same message twice, only 1 reply)
- [ ] "Menu" command resets bot anytime
- [ ] "0" command goes back in navigation

---

## 📊 Rate Limits (Development Mode)

| Resource | Limit |
|----------|-------|
| **Messages sent** | 1,000/day |
| **Conversations** | 1,000/month (FREE) |
| **Test phone numbers** | 5 total |
| **API calls** | 80 calls/10 seconds |

**To remove limits:** Submit app for Business Verification

---

## 🚀 Moving to Production

### Step 1: Business Verification

1. Go to **App Settings > Basic**
2. Submit for **Business Verification**
3. Provide:
   - Business documents
   - Website
   - Privacy policy
   - Use case description

**Timeline:** 2-7 days

### Step 2: Request Advanced Access

1. After business verification, request **Advanced Access** for:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`

### Step 3: Update Token

Replace temporary token with permanent System User token:

1. **Business Settings > System Users**
2. Create system user
3. Assign WhatsApp permissions
4. Generate permanent token
5. Update `.env` with new token

### Step 4: Remove Phone Number Limits

After approval, you can message ANY WhatsApp number (no pre-registration needed).

---

## 📝 Environment Variables Reference

```env
# Required
WHATSAPP_ACCESS_TOKEN=     # From Meta API Setup
WHATSAPP_PHONE_ID=         # From Meta API Setup
WHATSAPP_VERIFY_TOKEN=     # You create this

# Optional
WHATSAPP_APP_SECRET=       # For signature verification
WHATSAPP_API_VERSION=v18.0 # Default: v18.0
```

---

## 🔗 Useful Links

- [Meta WhatsApp Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Webhook Setup Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks)
- [Pricing Calculator](https://developers.facebook.com/docs/whatsapp/pricing)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates)

---

## ✅ Setup Complete!

Once you've completed all steps, your chatbot is ready to handle real customers via WhatsApp! 🎉

**Next Steps:**
- Test all flows thoroughly
- Monitor logs for errors
- Track conversation usage
- Plan for scale (business verification)
