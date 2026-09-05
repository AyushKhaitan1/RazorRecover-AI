import React, { useState, useEffect } from 'react';
import { X, Send, PhoneCall, Check, CheckCheck, ExternalLink, ShieldCheck, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function WhatsAppSandboxModal({ txn, onClose, onPaymentSettled }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState('whatsapp'); // 'whatsapp' | 'voice'
  const [isSending, setIsSending] = useState(false);
  const [stoppingRuleActive, setStoppingRuleActive] = useState(null);

  // Initialize initial message from merchant
  useEffect(() => {
    if (!txn) return;
    const initialText = txn.dunningPreview?.message || 
      `Namaste ${txn.customer.name.split(' ')[0]} ji! 🙏\n\nAapka ${txn.merchant} ka ₹${txn.amount} ka subscription payment bank network timeout ki wajah se complete nahi ho paya.\n\nFikar mat kijiye, neeche diye gaye secure Razorpay link se 1-click me complete kar lijiye:`;

    setMessages([
      {
        id: 'msg_1',
        sender: 'merchant',
        text: initialText,
        time: 'Just now',
        ctaUrl: txn.activePaymentLink?.shortUrl || `https://rzp.io/i/test_${txn.id}`,
        ctaText: `Pay ₹${txn.amount} via Razorpay`
      }
    ]);
  }, [txn]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim() || isSending) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsSending(true);

    try {
      const res = await fetch(`http://localhost:5000/api/transactions/${txn.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();

      setTimeout(() => {
        const replyMsg = {
          id: `mer_${Date.now()}`,
          sender: 'merchant',
          text: data.reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          intentDetected: data.intent,
          stoppingRule: data.stoppingRuleEnforced
        };
        setMessages(prev => [...prev, replyMsg]);
        if (data.stoppingRuleEnforced) {
          setStoppingRuleActive(data.stoppingRuleEnforced);
        }
        setIsSending(false);
      }, 500);
    } catch (err) {
      console.error(err);
      setIsSending(false);
    }
  };

  const handleSimulatePayment = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/transactions/${txn.id}/pay`, {
        method: 'POST'
      });
      const data = await res.json();
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      const receiptMsg = {
        id: `pay_${Date.now()}`,
        sender: 'merchant',
        text: `✅ Payment of ₹${txn.amount} received via Razorpay! Payment ID: ${data.transaction?.razorpayPaymentId || 'pay_test_verified'}. Aapka subscription successfully activate ho gaya hai. Dhanyawad! 🎉`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, receiptMsg]);
      if (onPaymentSettled) onPaymentSettled(txn.id);
    } catch (err) {
      console.error(err);
    }
  };

  if (!txn) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="glass-card modal-pop-in" 
        onClick={(e) => e.stopPropagation()} 
        style={{
          width: '420px',
          maxWidth: '95vw',
          height: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '24px',
          border: '1px solid rgba(51, 149, 255, 0.3)',
          background: '#0B101B',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
        }}
      >
        {/* Phone Header */}
        <div style={{
          background: '#075E54',
          color: '#FFFFFF',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#128C7E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem'
            }}>
              {txn.merchant.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {txn.merchant}
                <ShieldCheck size={14} color="#34D399" />
              </div>
              <div style={{ fontSize: '0.7rem', color: '#A7F3D0' }}>
                Razorpay Verified Business Account
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setActiveTab(activeTab === 'whatsapp' ? 'voice' : 'whatsapp')}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#FFFFFF',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <PhoneCall size={12} />
              {activeTab === 'whatsapp' ? 'Voice Script' : 'Chat'}
            </button>
            <button 
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '4px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Stopping Rule Notification Banner if triggered */}
        {stoppingRuleActive && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '8px 12px',
            fontSize: '0.75rem',
            color: '#FCA5A5',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <AlertTriangle size={14} color="#EF4444" />
            <span><strong>Stopping Rule Triggered:</strong> {stoppingRuleActive}. Outreach halted.</span>
          </div>
        )}

        {/* View content based on activeTab */}
        {activeTab === 'voice' ? (
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#0F172A' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.8rem', color: '#3395FF', fontWeight: 600 }}>AI Hinglish Voice Concierge</div>
              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Synthesized phone agent script for high-value recovery</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ background: 'rgba(51, 149, 255, 0.1)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #3395FF' }}>
                <span style={{ fontSize: '0.72rem', color: '#60A5FA', fontWeight: 700 }}>AI Concierge:</span>
                <p style={{ fontSize: '0.8rem', color: '#E2E8F0', marginTop: '2px' }}>
                  "Namaste {txn.customer.name.split(' ')[0]} ji! Main {txn.merchant} ki billing care team se bol raha hoon."
                </p>
              </div>

              <div style={{ background: 'rgba(51, 149, 255, 0.1)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #3395FF' }}>
                <span style={{ fontSize: '0.72rem', color: '#60A5FA', fontWeight: 700 }}>AI Concierge:</span>
                <p style={{ fontSize: '0.8rem', color: '#E2E8F0', marginTop: '2px' }}>
                  "Aapka ₹{txn.amount} ka payment bank network downtime ki wajah se atak gaya tha. Agar aap busy na ho, toh kya main instant WhatsApp link bhej doon?"
                </p>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #64748B' }}>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700 }}>Customer:</span>
                <p style={{ fontSize: '0.8rem', color: '#E2E8F0', marginTop: '2px' }}>
                  "Haan WhatsApp bhej dijiye, main kal salary aate hi kar dunga."
                </p>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #10B981' }}>
                <span style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 700 }}>AI Response & Action:</span>
                <p style={{ fontSize: '0.8rem', color: '#E2E8F0', marginTop: '2px' }}>
                  "Bilkul! Humne kal tak ke liye retry pause kar diya hai aur WhatsApp par Razorpay link send kar diya hai. Dhanyawad!"
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* WhatsApp Chat Body */
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 0)',
            backgroundSize: '24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {messages.map((m) => {
              const isMerchant = m.sender === 'merchant';
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: isMerchant ? 'flex-start' : 'flex-end',
                    maxWidth: '85%',
                    background: isMerchant ? '#1F2C34' : '#005C4B',
                    color: '#E9EDEF',
                    borderRadius: isMerchant ? '0 12px 12px 12px' : '12px 0 12px 12px',
                    padding: '10px 12px',
                    fontSize: '0.82rem',
                    lineHeight: '1.4',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    position: 'relative'
                  }}
                >
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>

                  {/* 1-Click Pay CTA button if provided in merchant message */}
                  {m.ctaUrl && (
                    <div style={{ marginTop: '10px' }}>
                      <button
                        onClick={handleSimulatePayment}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #3395FF 0%, #0066FF 100%)',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 8px rgba(0,102,255,0.3)'
                        }}
                      >
                        <ExternalLink size={13} />
                        {m.ctaText || 'Pay Now via Razorpay'}
                      </button>
                    </div>
                  )}

                  {/* Message timestamp and ticks */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '3px', marginTop: '4px', fontSize: '0.65rem', color: '#8696A0' }}>
                    <span>{m.time}</span>
                    <CheckCheck size={12} color="#53BDEB" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick evaluation test chips */}
        <div style={{ padding: '8px 12px', background: '#111B21', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '6px', overflowX: 'auto' }}>
          <button
            onClick={() => handleSendMessage('Paise kal dunga')}
            style={{
              background: 'rgba(51, 149, 255, 0.1)',
              color: '#60A5FA',
              border: '1px solid rgba(51, 149, 255, 0.25)',
              borderRadius: '999px',
              padding: '4px 10px',
              fontSize: '0.72rem',
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >
            💬 "Paise kal dunga"
          </button>
          <button
            onClick={() => handleSendMessage('Subscription cancel kardo, nahi chahiye')}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#F87171',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '999px',
              padding: '4px 10px',
              fontSize: '0.72rem',
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >
            🛑 "Cancel subscription"
          </button>
          <button
            onClick={() => handleSendMessage('Account se cut gaya hai par error aaya')}
            style={{
              background: 'rgba(245, 158, 11, 0.1)',
              color: '#FBBF24',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '999px',
              padding: '4px 10px',
              fontSize: '0.72rem',
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >
            ⚠️ "Already paid"
          </button>
        </div>

        {/* Message Input Box */}
        <div style={{
          padding: '10px 12px',
          background: '#1F2C34',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <input
            type="text"
            placeholder="Type customer reply in Hinglish or English..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            style={{
              flex: 1,
              background: '#2A3942',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 12px',
              color: '#FFFFFF',
              fontSize: '0.82rem',
              outline: 'none'
            }}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isSending || !inputText.trim()}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#00A884',
              color: '#FFFFFF',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: inputText.trim() ? 1 : 0.6
            }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
