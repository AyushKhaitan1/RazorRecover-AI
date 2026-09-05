/**
 * Hinglish Conversational Dunning & Voice Copilot
 * Generates culturally empathetic, high-converting WhatsApp recovery cards
 * and multi-turn conversational responses (e.g. Promise-to-Pay, Opt-out).
 */

function generateHinglishDunningCopy(transaction, paymentLink) {
  const firstName = transaction.customer.name.split(' ')[0];
  const merchant = transaction.merchant;
  const amountStr = `₹${transaction.amount.toLocaleString('en-IN')}`;
  const link = paymentLink?.shortUrl || `https://rzp.io/i/test_${transaction.id}`;

  switch (transaction.failureCode) {
    case 'BAD_REQUEST_INSUFFICIENT_FUNDS':
      return {
        channel: 'WhatsApp Interactive',
        language: 'Hinglish',
        headline: `⚠️ ${merchant} Subscription Renewal Alert`,
        message: `Namaste ${firstName} ji! 🙏\n\nAapka *${merchant}* ka ${amountStr} ka monthly subscription auto-debit complete nahi ho paya.\n\nFikar mat kijiye, aapki service band nahi hui hai. Bas neeche diye gaye secure Razorpay link se 1-click me payment complete kar lijiye:`,
        ctaText: `Pay ${amountStr} via Razorpay`,
        ctaUrl: link,
        footer: 'Agar aap kal pay karna chahte hain, toh reply kijiye "Kal dunga". Opt-out ke liye reply "STOP".'
      };

    case 'CUSTOMER_DROPPED_OFF':
    case 'PAYMENT_OTP_ABANDONED':
      return {
        channel: 'WhatsApp Interactive',
        language: 'Hinglish',
        headline: `🛍️ Order reserved on ${merchant}`,
        message: `Hi ${firstName}! ✨\n\nAapka *${amountStr}* ka order cart me reserve kar ke rakha hai. Lagta hai payment ke waqt screen slip ho gayi thi!\n\nInventory khatam hone se pehle yahan se bina kisi jhanjhat ke complete karein:`,
        ctaText: `Complete Payment (${amountStr})`,
        ctaUrl: link,
        footer: 'Razorpay 100% Buyer Protected Checkout 🛡️'
      };

    case 'MANDATE_EXPIRED_OR_PAUSED':
      return {
        channel: 'WhatsApp Interactive',
        language: 'Hinglish',
        headline: `🔄 ${merchant} Mandate Re-approval`,
        message: `Namaste ${firstName} ji! Aapka UPI AutoPay mandate cycle complete ho gaya tha. Seamless access continue rakhne ke liye sirf ek touch me verify karein:`,
        ctaText: `Re-authorise AutoPay`,
        ctaUrl: link,
        footer: 'Powered by NPCI UPI AutoPay & Razorpay'
      };

    case 'INVOICE_OVERDUE_B2B':
      return {
        channel: 'B2B Enterprise Dunning',
        language: 'Formal Hinglish & English',
        headline: `Invoice Outstanding: ${merchant}`,
        message: `Dear ${firstName},\n\nHope you are having a productive week. This is a gentle follow-up regarding Invoice #${transaction.id} for *${amountStr}* with ${merchant}.\n\nIf the remittance is already scheduled in your weekly batch, please share the UTR or reply with the expected payment date. Direct settlement link:`,
        ctaText: `View & Settle Invoice`,
        ctaUrl: link,
        footer: 'Accounts Receivable Automation | Razorpay Verified'
      };

    default:
      return {
        channel: 'WhatsApp Interactive',
        language: 'Hinglish',
        headline: `Update from ${merchant}`,
        message: `Hi ${firstName}, aapka ${amountStr} ka payment process nahi ho paya. Please check this link to retry securely:`,
        ctaText: `Complete Payment`,
        ctaUrl: link,
        footer: 'Razorpay Secure'
      };
  }
}

function processConversationalReply(transaction, userMessage) {
  const normalized = userMessage.toLowerCase().trim();

  // 1. Opt-out / Cancellation detection
  if (normalized.includes('stop') || normalized.includes('cancel') || normalized.includes('band karo') || normalized.includes('nahi chahiye')) {
    return {
      intent: 'OPT_OUT',
      action: 'CANCEL_MANDATE_AND_HALT',
      reply: 'Aapka request note kar liya gaya hai. Subscription cancel kar di gayi hai aur aapko koi further reminders nahi aayenge. Thank you!',
      stoppingRuleEnforced: 'CUSTOMER_OPT_OUT'
    };
  }

  // 2. Promise to Pay detection (e.g. "kal dunga", "friday ko", "salary aane do", "next week")
  if (
    normalized.includes('kal') ||
    normalized.includes('tomorrow') ||
    normalized.includes('salary') ||
    normalized.includes('pay later') ||
    normalized.includes('friday') ||
    normalized.includes('somwar') ||
    normalized.includes('next week')
  ) {
    return {
      intent: 'PROMISE_TO_PAY',
      action: 'PAUSE_RETRIES_SCHEDULE_DATE',
      promisedDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      reply: 'Dhanyawad batane ke liye! 🙏 Humne aapka Promise-to-Pay record kar liya hai. Automated retries kal tak pause kar diye gaye hain. Link aapke pass ready hai.',
      stoppingRuleEnforced: 'PROMISE_TO_PAY_COOLDOWN'
    };
  }

  // 3. Already paid / dispute detection
  if (normalized.includes('ho gaya') || normalized.includes('already paid') || normalized.includes('paise kat gaye') || normalized.includes('utr')) {
    return {
      intent: 'DISPUTE_OR_ALREADY_PAID',
      action: 'FLAG_FOR_RECON_VERIFICATION',
      reply: 'Agar aapke account se paise kat gaye hain, toh chinta mat kijiye! Humare system me reconciliation check trigger kar diya gaya hai. 15 minutes me update mil jayega.',
      stoppingRuleEnforced: 'AUTO_PAUSE_DISPUTE'
    };
  }

  // Default clarification
  return {
    intent: 'GENERAL_QUERY',
    action: 'PROVIDE_PAYMENT_HELP',
    reply: 'Kya aapko payment karne me koi pareshani aa rahi hai? Aap UPI, Cards, ya Netbanking kisi se bhi 1-click me pay kar sakte hain: https://rzp.io/i/test_' + transaction.id,
    stoppingRuleEnforced: null
  };
}

function generateVoiceScript(transaction) {
  const firstName = transaction.customer.name.split(' ')[0];
  const merchant = transaction.merchant;
  const amount = transaction.amount.toLocaleString('en-IN');

  return {
    agentRole: 'RazorRecover AI Voice Concierge',
    language: 'Conversational Hinglish',
    script: [
      { speaker: 'AI', text: `Namaste ${firstName} ji! Main ${merchant} ki billing team se bol raha hoon.` },
      { speaker: 'AI', text: `Aapka ₹${amount} ka payment bank network issue ki wajah se stuck ho gaya tha.` },
      { speaker: 'AI', text: `Agar aap abhi free hain, toh kya main aapke WhatsApp par instant 1-click Razorpay link bhej doon?` },
      { speaker: 'Customer (Simulated)', text: `Haan, WhatsApp par bhej dijiye, main sham tak kar deta hoon.` },
      { speaker: 'AI', text: `Bilkul! Link WhatsApp par deliver kar diya gaya hai. Have a wonderful day!` }
    ]
  };
}

module.exports = {
  generateHinglishDunningCopy,
  processConversationalReply,
  generateVoiceScript
};
