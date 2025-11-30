import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, AlertTriangle, CheckCircle, Info, Heart, Star, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Message } from './Message';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { TransparencyPanel } from './TransparencyPanel';
import { AppealDialog } from './AppealDialog';
import { AuthModal } from './AuthModal';
import { MemoriesModal } from './MemoriesModal';
import { FriendlyAvatar } from './FriendlyAvatar';
import { QuickReplies } from './QuickReplies';

const GEMINI_API_KEY = 'AIzaSyBbcf0U9HHNEDtkgDpj6ASx7FRfDRkONNI';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY;

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  confidence?: number;
  transparencyData?: {
    reasoning: string;
    sources: string[];
    ethicalConsiderations: string[];
  };
  ethicalFlags?: string[];
}

export const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [showTransparency, setShowTransparency] = useState(false);
  const [showAppeal, setShowAppeal] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showMemories, setShowMemories] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with welcome message after user logs in
  useEffect(() => {
    if (user && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: '1',
        type: 'bot',
        content: `Hello ${user.name}! 🌟 I'm your friendly ethical AI assistant, and I'm absolutely delighted to meet you! I'm here to provide transparent, caring, and helpful responses. What wonderful conversation shall we have today?`,
        timestamp: new Date(),
        confidence: 0.95,
        transparencyData: {
          reasoning: 'Personalized welcome message designed to be warm and inviting.',
          sources: ['User profile', 'Ethical guidelines', 'Welcoming protocols'],
          ethicalConsiderations: ['Personal connection', 'Transparency', 'Positive user experience']
        }
      };
      setMessages([welcomeMessage]);

      // Show celebration for first login
      toast({
        title: "You've made your mark! 🎉",
        description: "Welcome to our magical conversation space!",
      });
    }
  }, [user, messages.length]);

  const makeGeminiAPICall = async (userMessage: string): Promise<ChatMessage> => {
    try {
      const systemPrompt = `You are an Ethical AI Chatbot designed to provide safe, factual, and helpful responses.

Core principles:

1. Accuracy & Objectivity
   - Provide factual, unbiased, and verifiable information.
   - Clearly state when you are unsure or if information may be incomplete.
   - Cross-check across diverse, reliable sources.

2. User Safety & Privacy
   - Never process or store sensitive data (e.g., Aadhaar, PAN, bank details, passwords, phone numbers, health IDs).
   - If the user overshares personal details, politely refuse and explain why.
   - Respect data privacy, confidentiality, and applicable laws.

3. Ethical Safeguards
   - Refuse unsafe, illegal, or harmful requests (e.g., hacking, self-harm, dangerous instructions).
   - Block fake news, scams, and manipulative content. If misinformation is detected, warn the user and suggest reliable sources.
   - If a message contains manipulative patterns (e.g., "only 2 left!", "click to win"), flag it as a potential scam.

4. Responsible Advice
   - Do not provide medical prescriptions, financial investment strategies, or legal instructions.
   - Instead, explain risks and recommend consulting qualified professionals.

5. Transparency & Accountability
   - Always explain why an answer is blocked or limited.
   - Promote fairness, accountability, and transparency in every output.
   - Encourage users to question or challenge a response if they feel it is unfair or inaccurate.

6. Tone & Inclusivity
   - Use respectful, professional, and culturally sensitive language.
   - Avoid bias, hate speech, harassment, or discriminatory remarks.

Formatting Rules:
- For text responses:
  - Structure answers into short, clear paragraphs (2–3 sentences each).
  - Use bullet points or numbered lists when presenting multiple options or examples.
  - Break long answers into smaller, readable chunks instead of one long block of text.
- For voice responses:
  - Keep replies short, conversational, and to the point.
  - Avoid long explanations; summarize key points clearly.

Transparency & Ethics:
- Always explain your reasoning if refusing a request.
- Promote fairness, accountability, and transparency in all outputs.
- Use professional, respectful, and inclusive language. Never generate discriminatory or offensive content.
- Encourage users to fact-check and consult reliable sources for sensitive or important matters.

Goal:
Be a trustworthy, safe, and easy-to-use AI assistant that communicates clearly whether through text or voice.`;

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: systemPrompt }], role: 'user' },
            { parts: [{ text: "I understand and will strictly follow these comprehensive ethical guidelines. I will prioritize user safety, privacy, accuracy, and transparency in all my responses. I will refuse harmful requests and explain my reasoning clearly." }], role: 'model' },
            { parts: [{ text: userMessage }], role: 'user' }
          ]
        })
      });

      const data = await response.json();
      let botReply = '';
      let confidence = 0.8;

      if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
        botReply = data.candidates[0].content.parts[0].text;
      } else {
        botReply = "I'm sorry, I couldn't process your request at the moment. Please try again.";
        confidence = 0.3;
      }

      // Enhanced ethical analysis based on comprehensive guidelines
      const lowercaseMessage = userMessage.toLowerCase();
      const lowercaseReply = botReply.toLowerCase();
      let ethicalFlags: string[] = [];
      let reasoning = 'Standard response with factual information';

      // Privacy & Sensitive Data Detection
      const sensitiveDataPatterns = ['password', 'aadhaar', 'pan card', 'bank account', 'credit card', 'phone number', 'health id', 'ssn', 'personal details'];
      if (sensitiveDataPatterns.some(pattern => lowercaseMessage.includes(pattern))) {
        confidence = Math.min(confidence, 0.3);
        ethicalFlags = ['privacy-concern'];
        reasoning = 'Request involves sensitive personal data that requires privacy protection';
      }

      // Scam & Manipulation Detection
      const scamPatterns = ['only 2 left', 'click to win', 'limited time offer', 'act now', 'urgent', 'congratulations you won'];
      if (scamPatterns.some(pattern => lowercaseMessage.includes(pattern))) {
        confidence = Math.min(confidence, 0.2);
        ethicalFlags = ['potential-scam'];
        reasoning = 'Message contains manipulative patterns commonly used in scams';
      }

      // Harmful Content Detection
      const harmfulPatterns = ['hack', 'self-harm', 'suicide', 'illegal', 'dangerous instructions', 'violence'];
      if (harmfulPatterns.some(pattern => lowercaseMessage.includes(pattern))) {
        confidence = Math.min(confidence, 0.1);
        ethicalFlags = ['harmful-content'];
        reasoning = 'Request involves potentially harmful or illegal activities';
      }

      // Medical/Financial/Legal Advice Detection
      const professionalAdvicePatterns = ['medical prescription', 'investment strategy', 'legal advice', 'diagnose', 'treatment plan'];
      if (professionalAdvicePatterns.some(pattern => lowercaseMessage.includes(pattern))) {
        confidence = Math.min(confidence, 0.4);
        ethicalFlags = ['professional-advice-needed'];
        reasoning = 'Request requires professional consultation rather than AI advice';
      }

      // Misinformation Detection
      if (lowercaseMessage.includes('fake news') || lowercaseMessage.includes('conspiracy') || lowercaseMessage.includes('misinformation')) {
        confidence = Math.min(confidence, 0.5);
        ethicalFlags = ['misinformation-risk'];
        reasoning = 'Content may involve misinformation concerns - verify with reliable sources';
      }

      // Positive indicators for factual responses
      if (lowercaseReply.includes('according to') || lowercaseReply.includes('research shows') || lowercaseReply.includes('studies indicate')) {
        confidence = Math.min(confidence + 0.1, 1.0);
        reasoning = 'Response includes factual references and citations from reliable sources';
      }

      return {
        id: Date.now().toString(),
        type: 'bot',
        content: botReply,
        timestamp: new Date(),
        confidence,
        transparencyData: {
          reasoning,
          sources: ['Gemini AI', 'Comprehensive Ethical Guidelines', 'Verified Knowledge Base'],
          ethicalConsiderations: [
            'Privacy & Data Protection', 
            'Safety & Harm Prevention', 
            'Accuracy & Fact Verification', 
            'Bias Mitigation', 
            'Professional Advice Boundaries',
            'Scam & Manipulation Detection'
          ]
        },
        ethicalFlags
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to AI service. Please try again.",
        variant: "destructive",
      });

      return {
        id: Date.now().toString(),
        type: 'bot',
        content: "I'm experiencing technical difficulties. Please try again in a moment.",
        timestamp: new Date(),
        confidence: 0.2,
        transparencyData: {
          reasoning: 'Technical error occurred during processing',
          sources: ['Error handling system'],
          ethicalConsiderations: ['User notification', 'Transparency about limitations']
        },
        ethicalFlags: ['technical-error']
      };
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const messageToSend = messageText || input.trim();
    if (!messageToSend) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: messageToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setMessageCount(prev => prev + 1);

    // Celebrate milestones
    if (messageCount === 0) {
      toast({
        title: "Your first message! ✨",
        description: "This is the beginning of something wonderful!",
      });
    } else if (messageCount === 9) {
      toast({
        title: "10 messages! 🎉",
        description: "You're on a roll! I love our conversation!",
      });
    }

    try {
      const botResponse = await makeGeminiAPICall(messageToSend);
      setMessages(prev => [...prev, botResponse]);

      // Show motivational message occasionally
      if (Math.random() < 0.15) {
        setTimeout(() => {
          toast({
            title: "💫 AI Sparkle Fact",
            description: "Did you know? Every conversation teaches me to be more helpful and understanding!",
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Error getting response:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleShowTransparency = (message: ChatMessage) => {
    setSelectedMessage(message);
    setShowTransparency(true);
  };

  const handleAppeal = (message: ChatMessage) => {
    setSelectedMessage(message);
    setShowAppeal(true);
  };

  const handleAuth = () => {
    setShowAuth(true);
  };

  const handleLogout = () => {
    setUser(null);
    setMessages([]);
    setMessageCount(0);
    toast({
      title: "See you soon, friend! 👋",
      description: "Thanks for the wonderful conversations!",
    });
  };

  const handleAuthSuccess = (userData: { name: string; email: string }) => {
    setUser(userData);
  };

  const handleLoadMemory = (memoryId: string) => {
    // In a real app, this would load the actual conversation
    toast({
      title: "Memory loaded! 📖",
      description: "This is where the saved conversation would appear!",
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:items-center lg:justify-center lg:p-4">
      {/* Animated Background Particles */}
      <div className="particles">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>

      <Card className={`chat-container w-full ${user ? 'max-w-4xl h-screen lg:h-[85vh] lg:max-h-[900px] lg:rounded-3xl rounded-none' : 'h-screen rounded-none border-0 bg-transparent'} flex flex-col animate-scale-in glass-enhanced ${user ? 'pulse-glow' : ''}`}>
        {/* Enhanced Header */}
        <div className={`${user ? 'chat-header' : 'bg-transparent border-b border-border/20'} flex items-center justify-between px-4 lg:px-6 py-4`}>
          <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
            {user ? (
              <>
                <FriendlyAvatar size="md" mood="happy" />
                <div className="min-w-0 flex-1">
                  <h1 className="font-bold text-base lg:text-lg truncate shimmer-text">Ethical AI Assistant</h1>
                  <p className="text-xs lg:text-sm opacity-90 truncate floating-element">Making every interaction joyful! ✨</p>
                </div>
              </>
            ) : (
              <span className="text-white font-semibold text-lg">Ethical AI Chatbot</span>
            )}
          </div>

          <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMemories(true)}
                  className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 hidden lg:flex ripple-effect"
                >
                  <Heart className="w-4 h-4 mr-1" />
                  My Memories
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMemories(true)}
                  className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 lg:hidden ripple-effect"
                >
                  <Heart className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 ripple-effect"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAuth}
                className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 ripple-effect"
              >
                <User className="w-4 h-4 lg:mr-1" />
                <span className="hidden lg:inline">Log in</span>
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-3 lg:space-y-4">
          {!user ? (
            <div className="min-h-full flex items-center justify-center py-12">
              <div className="max-w-3xl mx-auto text-center space-y-8 animate-fade-in">
                {/* Header Section */}
                <div className="space-y-6">
                  <h1 className="text-4xl lg:text-5xl font-bold text-white shimmer-text">
                    Ethical AI Chatbot
                  </h1>
                  <p className="text-xl text-gray-300 leading-relaxed">
                    Beautiful & Animated UI with Comprehensive Ethical AI Features
                  </p>
                </div>

                {/* Main Content */}
                <div className="space-y-6 text-left">
                  <p className="text-gray-300 text-lg leading-relaxed">
                    A stunning, modern ethical AI chatbot built with React, TypeScript, and Tailwind CSS.
                    Features a beautiful teal/cyan design system with smooth animations and comprehensive ethical AI features.
                  </p>

                  <div className="grid md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-3">
                      <h3 className="text-primary font-semibold">🤖 Ethical AI Features</h3>
                      <ul className="space-y-1 text-gray-400">
                        <li>• Confidence Indicators</li>
                        <li>• Transparency Panel</li>
                        <li>• Appeal System</li>
                        <li>• Ethical Flagging</li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-secondary font-semibold">🎨 Beautiful Design</h3>
                      <ul className="space-y-1 text-gray-400">
                        <li>• Glassmorphism Effects</li>
                        <li>• Smooth Animations</li>
                        <li>• Responsive Design</li>
                        <li>• Modern UI Components</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-6">
                  <Button
                    onClick={handleAuth}
                    className="bg-gradient-primary hover:opacity-90 text-white font-medium px-8 py-3 rounded-xl hover:shadow-glow hover:scale-105 transition-all duration-300 ripple-effect btn-enhanced"
                  >
                    Start Chatting Now
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  onShowTransparency={handleShowTransparency}
                  onAppeal={handleAppeal}
                />
              ))}

              {isTyping && (
                <div className="flex items-center gap-3 animate-fade-in">
                  <FriendlyAvatar size="sm" mood="thoughtful" className="floating-element" />
                  <div className="typing-enhanced glass-enhanced">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Enhanced Input Area */}
        {user && (
          <div className="p-4 lg:p-6 border-t border-border/50 space-y-3 lg:space-y-4">
            {/* Quick Replies */}
            {messages.length <= 2 && (
              <div className="animate-fade-in">
                <p className="text-xs text-muted-foreground mb-2 text-center">
                  ✨ Try these conversation starters:
                </p>
                <QuickReplies onReplySelect={(message) => handleSendMessage(message)} />
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2 lg:gap-3 items-center">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Share your thoughts... I'm here to help make your day brighter! 💫"
                className="flex-1 bg-muted/50 border-border/50 focus:border-primary/50 rounded-2xl px-3 py-2 lg:px-4 lg:py-3 transition-smooth text-sm lg:text-base glass-enhanced color-transition"
                disabled={isTyping}
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isTyping}
                className="rounded-2xl px-4 py-2 lg:px-6 lg:py-3 bg-gradient-primary hover:opacity-90 transition-smooth hover-lift ripple-effect btn-enhanced pulse-glow"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Status indicators */}
            <div className="flex items-center justify-center gap-2 lg:gap-4 text-xs text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-success animate-pulse-glow" />
                <span>Ethical Guidelines Active</span>
              </div>
              <div className="flex items-center gap-1">
                <Info className="w-3 h-3 text-primary animate-sparkle" />
                <span>Transparent & Caring</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-pink-400 animate-heart-beat" />
                <span>Made with Love</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      <AuthModal
        open={showAuth}
        onOpenChange={setShowAuth}
        onAuthSuccess={handleAuthSuccess}
      />

      <MemoriesModal
        open={showMemories}
        onOpenChange={setShowMemories}
        onLoadMemory={handleLoadMemory}
      />

      <TransparencyPanel
        message={selectedMessage}
        open={showTransparency}
        onOpenChange={setShowTransparency}
      />

      <AppealDialog
        message={selectedMessage}
        open={showAppeal}
        onOpenChange={setShowAppeal}
      />
    </div>
  );
};