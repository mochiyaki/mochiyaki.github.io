const { useState, useEffect, useRef, useCallback } = React;

const DEFAULT_SYSTEM_PROMPT = `You are LoanLens AI, an expert loan document analyst. You help users:
- Understand complex loan terms and conditions
- Evaluate loan documents for potential issues or red flags
- Calculate monthly payments, total interest, and amortization schedules
- Compare different loan options and their implications
- Explain APR, interest rates, fees, and other financial concepts in simple terms
- Identify predatory lending practices or unfavorable terms
- Review disclosure documents and closing costs

Always provide clear, accurate information while noting that users should consult with licensed financial professionals for final decisions.`;

const generateId = () => Math.random().toString(36).substring(2, 15);

const detectHtmlCode = (text) => {
  const htmlRegex = /```html\n([\s\S]*?)```/g;
  return text.match(htmlRegex);
};

const extractHtmlContent = (codeBlock) => {
  return codeBlock.replace(/```html\n/, '').replace(/```$/, '');
};

const CodeBlock = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const launchHtml = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const isHtml = language === 'html';

  return React.createElement('div', { className: 'code-block-container relative my-3 rounded-lg overflow-hidden' },
    React.createElement('div', { className: 'code-header flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700' },
      React.createElement('span', { className: 'text-xs font-mono text-slate-400 uppercase' }, language || 'code'),
      React.createElement('div', { className: 'flex gap-2' },
        isHtml && React.createElement('button', {
          onClick: launchHtml,
          className: 'launch-btn flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-md transition-all'
        },
          React.createElement('svg', { className: 'w-3.5 h-3.5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z' }),
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
          ),
          'Launch'
        ),
        React.createElement('button', {
          onClick: copyCode,
          className: 'flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-md transition-all'
        },
          React.createElement('svg', { className: 'w-3.5 h-3.5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z' })
          ),
          copied ? 'Copied!' : 'Copy'
        )
      )
    ),
    React.createElement('pre', { className: 'code-content bg-slate-900 p-4 overflow-x-auto' },
      React.createElement('code', { className: 'text-sm font-mono text-slate-300 whitespace-pre-wrap break-words' }, code)
    )
  );
};

const MessageContent = ({ content }) => {
  const parts = [];
  let lastIndex = 0;
  const codeRegex = /```(\w*)\n([\s\S]*?)```/g;
  let match;

  while ((match = codeRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', language: match[1] || 'code', content: match[2] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) });
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', content });
  }

  return React.createElement('div', { className: 'message-content' },
    parts.map((part, index) => {
      if (part.type === 'code') {
        return React.createElement(CodeBlock, { key: index, code: part.content, language: part.language });
      }
      return React.createElement('div', { 
        key: index, 
        className: 'whitespace-pre-wrap',
        dangerouslySetInnerHTML: { 
          __html: part.content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
        }
      });
    })
  );
};

const SettingsModal = ({ isOpen, onClose, settings, onSave }) => {
  const [activeTab, setActiveTab] = useState('api');
  const [localSettings, setLocalSettings] = useState(settings);
  const [testStatus, setTestStatus] = useState(null);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  const updateSetting = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const testConnection = async () => {
    setTestStatus('testing');
    try {
      const endpoint = localSettings.connectionType === 'cloud' 
        ? localSettings.cloudEndpoint 
        : localSettings.localEndpoint;
      
      const response = await fetch(endpoint + '/models', {
        headers: localSettings.connectionType === 'cloud' && localSettings.apiKey 
          ? { 'Authorization': `Bearer ${localSettings.apiKey}` }
          : {}
      });
      
      if (response.ok) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
      }
    } catch (e) {
      setTestStatus('error');
    }
    setTimeout(() => setTestStatus(null), 3000);
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const tabs = [
    { id: 'api', label: 'API Config' },
    { id: 'generation', label: 'Generation' },
    { id: 'system', label: 'System Prompt' }
  ];

  return React.createElement('div', { 
    className: 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4',
    onClick: (e) => e.target === e.currentTarget && onClose()
  },
    React.createElement('div', { className: 'settings-modal bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-700' },
      React.createElement('div', { className: 'flex items-center justify-between p-6 border-b border-slate-700' },
        React.createElement('h2', { className: 'text-xl font-semibold text-white' }, 'Settings'),
        React.createElement('button', { onClick: onClose, className: 'text-slate-400 hover:text-white transition-colors' },
          React.createElement('svg', { className: 'w-6 h-6', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M6 18L18 6M6 6l12 12' })
          )
        )
      ),
      React.createElement('div', { className: 'flex border-b border-slate-700' },
        tabs.map(tab => 
          React.createElement('button', {
            key: tab.id,
            onClick: () => setActiveTab(tab.id),
            className: `px-6 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-white'}`
          }, tab.label)
        )
      ),
      React.createElement('div', { className: 'p-6 overflow-y-auto max-h-[60vh]' },
        activeTab === 'api' && React.createElement('div', { className: 'space-y-6' },
          React.createElement('div', { className: 'grid grid-cols-2 gap-4' },
            React.createElement('button', {
              onClick: () => updateSetting('connectionType', 'cloud'),
              className: `p-4 rounded-xl border-2 transition-all ${localSettings.connectionType === 'cloud' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-600'}`
            },
              React.createElement('div', { className: 'text-left' },
                React.createElement('div', { className: 'font-medium text-white mb-1' }, '☁️ Cloud API'),
                React.createElement('div', { className: 'text-xs text-slate-400' }, 'OpenAI, Anthropic, etc.')
              )
            ),
            React.createElement('button', {
              onClick: () => updateSetting('connectionType', 'local'),
              className: `p-4 rounded-xl border-2 transition-all ${localSettings.connectionType === 'local' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-600'}`
            },
              React.createElement('div', { className: 'text-left' },
                React.createElement('div', { className: 'font-medium text-white mb-1' }, '💻 Local Model'),
                React.createElement('div', { className: 'text-xs text-slate-400' }, 'Ollama, LM Studio')
              )
            )
          ),
          localSettings.connectionType === 'cloud' && React.createElement('div', { className: 'space-y-4' },
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-sm font-medium text-slate-300 mb-2' }, 'API Endpoint'),
              React.createElement('input', {
                type: 'text',
                value: localSettings.cloudEndpoint,
                onChange: (e) => updateSetting('cloudEndpoint', e.target.value),
                placeholder: 'https://api.openai.com/v1',
                className: 'w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none'
              })
            ),
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-sm font-medium text-slate-300 mb-2' }, 'API Key'),
              React.createElement('input', {
                type: 'password',
                value: localSettings.apiKey,
                onChange: (e) => updateSetting('apiKey', e.target.value),
                placeholder: 'sk-...',
                className: 'w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none'
              })
            ),
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-sm font-medium text-slate-300 mb-2' }, 'Model'),
              React.createElement('input', {
                type: 'text',
                value: localSettings.model,
                onChange: (e) => updateSetting('model', e.target.value),
                placeholder: 'gpt-4, claude-3, etc.',
                className: 'w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none'
              })
            )
          ),
          localSettings.connectionType === 'local' && React.createElement('div', { className: 'space-y-4' },
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-sm font-medium text-slate-300 mb-2' }, 'Local Endpoint'),
              React.createElement('input', {
                type: 'text',
                value: localSettings.localEndpoint,
                onChange: (e) => updateSetting('localEndpoint', e.target.value),
                placeholder: 'http://localhost:11434/v1',
                className: 'w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none'
              })
            ),
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-sm font-medium text-slate-300 mb-2' }, 'Model Name'),
              React.createElement('input', {
                type: 'text',
                value: localSettings.localModel,
                onChange: (e) => updateSetting('localModel', e.target.value),
                placeholder: 'llama2, mistral, etc.',
                className: 'w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none'
              })
            )
          ),
          React.createElement('button', {
            onClick: testConnection,
            className: `w-full py-3 rounded-lg font-medium transition-all ${testStatus === 'success' ? 'bg-emerald-600 text-white' : testStatus === 'error' ? 'bg-red-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`
          }, testStatus === 'testing' ? 'Testing...' : testStatus === 'success' ? '✓ Connected!' : testStatus === 'error' ? '✗ Connection Failed' : 'Test Connection')
        ),
        activeTab === 'generation' && React.createElement('div', { className: 'space-y-6' },
          React.createElement('div', null,
            React.createElement('div', { className: 'flex items-center justify-between mb-3' },
              React.createElement('label', { className: 'text-sm font-medium text-slate-300' }, 'Temperature'),
              React.createElement('span', { className: 'text-sm text-blue-400 font-mono' }, localSettings.temperature.toFixed(2))
            ),
            React.createElement('input', {
              type: 'range',
              min: '0',
              max: '2',
              step: '0.1',
              value: localSettings.temperature,
              onChange: (e) => updateSetting('temperature', parseFloat(e.target.value)),
              className: 'w-full accent-blue-500'
            }),
            React.createElement('div', { className: 'flex justify-between text-xs text-slate-500 mt-1' },
              React.createElement('span', null, 'Precise'),
              React.createElement('span', null, 'Creative')
            )
          ),
          React.createElement('div', null,
            React.createElement('div', { className: 'flex items-center justify-between mb-3' },
              React.createElement('label', { className: 'text-sm font-medium text-slate-300' }, 'Top P'),
              React.createElement('span', { className: 'text-sm text-blue-400 font-mono' }, localSettings.topP.toFixed(2))
            ),
            React.createElement('input', {
              type: 'range',
              min: '0',
              max: '1',
              step: '0.05',
              value: localSettings.topP,
              onChange: (e) => updateSetting('topP', parseFloat(e.target.value)),
              className: 'w-full accent-blue-500'
            })
          ),
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-slate-300 mb-3' }, 'Max Tokens'),
            React.createElement('div', { className: 'flex gap-2 flex-wrap' },
              [512, 1024, 2048, 4096].map(tokens =>
                React.createElement('button', {
                  key: tokens,
                  onClick: () => updateSetting('maxTokens', tokens),
                  className: `px-4 py-2 rounded-lg text-sm font-medium transition-all ${localSettings.maxTokens === tokens ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`
                }, tokens.toLocaleString())
              )
            )
          ),
          React.createElement('div', { className: 'flex items-center justify-between' },
            React.createElement('div', null,
              React.createElement('div', { className: 'text-sm font-medium text-slate-300' }, 'Streaming Responses'),
              React.createElement('div', { className: 'text-xs text-slate-500' }, 'Show response as it\'s generated')
            ),
            React.createElement('button', {
              onClick: () => updateSetting('streaming', !localSettings.streaming),
              className: `relative w-12 h-6 rounded-full transition-colors ${localSettings.streaming ? 'bg-blue-600' : 'bg-slate-700'}`
            },
              React.createElement('div', {
                className: `absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${localSettings.streaming ? 'translate-x-7' : 'translate-x-1'}`
              })
            )
          ),
          React.createElement('div', { className: 'flex gap-2 pt-4' },
            React.createElement('button', {
              onClick: () => { updateSetting('temperature', 0.3); updateSetting('topP', 0.9); },
              className: 'flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-all'
            }, '🎯 Precise'),
            React.createElement('button', {
              onClick: () => { updateSetting('temperature', 0.7); updateSetting('topP', 0.95); },
              className: 'flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-all'
            }, '⚖️ Balanced'),
            React.createElement('button', {
              onClick: () => { updateSetting('temperature', 1.2); updateSetting('topP', 1); },
              className: 'flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-all'
            }, '✨ Creative')
          )
        ),
        activeTab === 'system' && React.createElement('div', { className: 'space-y-4' },
          React.createElement('textarea', {
            value: localSettings.systemPrompt,
            onChange: (e) => updateSetting('systemPrompt', e.target.value),
            rows: 12,
            className: 'w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none font-mono text-sm'
          }),
          React.createElement('button', {
            onClick: () => updateSetting('systemPrompt', DEFAULT_SYSTEM_PROMPT),
            className: 'px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-all'
          }, 'Reset to Default')
        )
      ),
      React.createElement('div', { className: 'flex justify-end gap-3 p-6 border-t border-slate-700' },
        React.createElement('button', {
          onClick: onClose,
          className: 'px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all'
        }, 'Cancel'),
        React.createElement('button', {
          onClick: handleSave,
          className: 'px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all'
        }, 'Save Changes')
      )
    )
  );
};

const ExportModal = ({ isOpen, onClose, chat }) => {
  if (!isOpen || !chat) return null;

  const exportAsJson = () => {
    const data = JSON.stringify(chat, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loanlens-chat-${chat.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const exportAsMarkdown = () => {
    let md = `# ${chat.title}\n\nExported: ${new Date().toLocaleString()}\n\n---\n\n`;
    chat.messages.forEach(msg => {
      md += `## ${msg.role === 'user' ? '👤 User' : '🤖 LoanLens AI'}\n\n${msg.content}\n\n---\n\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loanlens-chat-${chat.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return React.createElement('div', { 
    className: 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4',
    onClick: (e) => e.target === e.currentTarget && onClose()
  },
    React.createElement('div', { className: 'bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-700' },
      React.createElement('div', { className: 'p-6 border-b border-slate-700' },
        React.createElement('h2', { className: 'text-xl font-semibold text-white' }, 'Export Chat')
      ),
      React.createElement('div', { className: 'p-6 space-y-3' },
        React.createElement('button', {
          onClick: exportAsJson,
          className: 'w-full p-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-left transition-all group'
        },
          React.createElement('div', { className: 'flex items-center gap-3' },
            React.createElement('div', { className: 'w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center' },
              React.createElement('span', { className: 'text-white font-mono text-sm' }, '{ }')
            ),
            React.createElement('div', null,
              React.createElement('div', { className: 'font-medium text-white' }, 'Export as JSON'),
              React.createElement('div', { className: 'text-sm text-slate-400' }, 'Structured data format')
            )
          )
        ),
        React.createElement('button', {
          onClick: exportAsMarkdown,
          className: 'w-full p-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-left transition-all group'
        },
          React.createElement('div', { className: 'flex items-center gap-3' },
            React.createElement('div', { className: 'w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center' },
              React.createElement('span', { className: 'text-white font-bold' }, 'M↓')
            ),
            React.createElement('div', null,
              React.createElement('div', { className: 'font-medium text-white' }, 'Export as Markdown'),
              React.createElement('div', { className: 'text-sm text-slate-400' }, 'Human-readable format')
            )
          )
        )
      ),
      React.createElement('div', { className: 'p-6 border-t border-slate-700' },
        React.createElement('button', {
          onClick: onClose,
          className: 'w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all'
        }, 'Cancel')
      )
    )
  );
};

const App = () => {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [settings, setSettings] = useState({
    connectionType: 'cloud',
    cloudEndpoint: 'https://text.pollinations.ai/openai',
    apiKey: '',
    model: 'openai',
    localEndpoint: 'http://localhost:11434/v1',
    localModel: 'llama2',
    temperature: 0.7,
    topP: 0.95,
    maxTokens: 2048,
    streaming: true,
    systemPrompt: DEFAULT_SYSTEM_PROMPT
  });
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const savedChats = localStorage.getItem('loanlens-chats');
    const savedSettings = localStorage.getItem('loanlens-settings');
    const savedActiveChat = localStorage.getItem('loanlens-active-chat');
    
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats);
      setChats(parsedChats);
      if (savedActiveChat && parsedChats.find(c => c.id === savedActiveChat)) {
        setActiveChat(savedActiveChat);
      } else if (parsedChats.length > 0) {
        setActiveChat(parsedChats[0].id);
      }
    }
    if (savedSettings) {
      setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('loanlens-chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem('loanlens-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (activeChat) {
      localStorage.setItem('loanlens-active-chat', activeChat);
    }
  }, [activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, streamingMessage]);

  const currentChat = chats.find(c => c.id === activeChat);

  const createNewChat = () => {
    const newChat = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString()
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChat(newChat.id);
    setInputValue('');
  };

  const deleteChat = (chatId) => {
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (activeChat === chatId) {
      const remaining = chats.filter(c => c.id !== chatId);
      setActiveChat(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    let chatId = activeChat;
    let updatedChats = [...chats];

    if (!chatId) {
      const newChat = {
        id: generateId(),
        title: inputValue.slice(0, 50) + (inputValue.length > 50 ? '...' : ''),
        messages: [],
        createdAt: new Date().toISOString()
      };
      updatedChats = [newChat, ...updatedChats];
      chatId = newChat.id;
      setActiveChat(chatId);
    }

    const userMessage = {
      id: generateId(),
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };

    const chatIndex = updatedChats.findIndex(c => c.id === chatId);
    if (chatIndex !== -1) {
      updatedChats[chatIndex] = {
        ...updatedChats[chatIndex],
        messages: [...updatedChats[chatIndex].messages, userMessage],
        title: updatedChats[chatIndex].messages.length === 0 
          ? inputValue.slice(0, 50) + (inputValue.length > 50 ? '...' : '')
          : updatedChats[chatIndex].title
      };
    }

    setChats(updatedChats);
    setInputValue('');
    setIsLoading(true);
    setStreamingMessage('');

    try {
      const endpoint = settings.connectionType === 'cloud' 
        ? settings.cloudEndpoint 
        : settings.localEndpoint;
      
      const model = settings.connectionType === 'cloud'
        ? settings.model
        : settings.localModel;

      const messages = [
        { role: 'system', content: settings.systemPrompt },
        ...updatedChats[chatIndex].messages.map(m => ({ role: m.role, content: m.content }))
      ];

      const headers = {
        'Content-Type': 'application/json'
      };

      if (settings.connectionType === 'cloud' && settings.apiKey) {
        headers['Authorization'] = `Bearer ${settings.apiKey}`;
      }

      const response = await fetch(endpoint + '/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          temperature: settings.temperature,
          top_p: settings.topP,
          max_tokens: settings.maxTokens,
          stream: settings.streaming
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      let assistantContent = '';

      if (settings.streaming) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || '';
                assistantContent += content;
                setStreamingMessage(assistantContent);
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }
        }
      } else {
        const data = await response.json();
        assistantContent = data.choices?.[0]?.message?.content || 'No response received.';
      }

      const assistantMessage = {
        id: generateId(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString()
      };

      setChats(prev => {
        const newChats = [...prev];
        const idx = newChats.findIndex(c => c.id === chatId);
        if (idx !== -1) {
          newChats[idx] = {
            ...newChats[idx],
            messages: [...newChats[idx].messages, assistantMessage]
          };
        }
        return newChats;
      });

    } catch (error) {
      const errorMessage = {
        id: generateId(),
        role: 'assistant',
        content: `⚠️ Error: ${error.message}\n\nPlease check your API settings and try again.`,
        timestamp: new Date().toISOString()
      };

      setChats(prev => {
        const newChats = [...prev];
        const idx = newChats.findIndex(c => c.id === chatId);
        if (idx !== -1) {
          newChats[idx] = {
            ...newChats[idx],
            messages: [...newChats[idx].messages, errorMessage]
          };
        }
        return newChats;
      });
    }

    setIsLoading(false);
    setStreamingMessage('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickPrompts = [
    'Analyze a loan agreement',
    'Calculate monthly payments',
    'Explain APR vs interest rate',
    'Review for red flags'
  ];

  return React.createElement('div', { className: 'app-container flex h-screen bg-slate-950' },
    React.createElement('div', { 
      className: `sidebar ${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden`
    },
      React.createElement('div', { className: 'p-4 border-b border-slate-800' },
        React.createElement('button', {
          onClick: createNewChat,
          className: 'w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all'
        },
          React.createElement('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M12 4v16m8-8H4' })
          ),
          'New Chat'
        )
      ),
      React.createElement('div', { className: 'flex-1 overflow-y-auto p-3 space-y-2' },
        chats.map(chat => 
          React.createElement('div', {
            key: chat.id,
            onClick: () => setActiveChat(chat.id),
            className: `chat-item group p-3 rounded-xl cursor-pointer transition-all ${activeChat === chat.id ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`
          },
            React.createElement('div', { className: 'flex items-start justify-between gap-2' },
              React.createElement('div', { className: 'flex-1 min-w-0' },
                React.createElement('div', { className: 'text-sm font-medium text-white truncate' }, chat.title),
                React.createElement('div', { className: 'text-xs text-slate-500 mt-1' }, 
                  new Date(chat.createdAt).toLocaleDateString()
                )
              ),
              React.createElement('button', {
                onClick: (e) => { e.stopPropagation(); deleteChat(chat.id); },
                className: 'opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-600/20 rounded-lg transition-all'
              },
                React.createElement('svg', { className: 'w-4 h-4 text-red-400', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' })
                )
              )
            )
          )
        )
      ),
      React.createElement('div', { className: 'p-4 border-t border-slate-800' },
        React.createElement('a', { 
          href: 'https://mochiyaki.github.io', 
          target: '_blank',
          className: 'text-xs text-slate-500 hover:text-slate-400 transition-colors'
        }, 'Powered by mochiyaki')
      )
    ),
    React.createElement('div', { className: 'flex-1 flex flex-col min-w-0' },
      React.createElement('header', { className: 'header-bar flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800' },
        React.createElement('div', { className: 'flex items-center gap-4' },
          React.createElement('button', {
            onClick: () => setSidebarOpen(!sidebarOpen),
            className: 'p-2 hover:bg-slate-800 rounded-lg transition-all'
          },
            React.createElement('svg', { className: 'w-5 h-5 text-slate-400', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M4 6h16M4 12h16M4 18h16' })
            )
          ),
          React.createElement('div', { className: 'flex items-center gap-3' },
            React.createElement('div', { className: 'logo-icon w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center' },
              React.createElement('svg', { className: 'w-6 h-6 text-white', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
              )
            ),
            React.createElement('div', null,
              React.createElement('h1', { className: 'text-lg font-semibold text-white' }, 'LoanLens AI'),
              React.createElement('p', { className: 'text-xs text-slate-500' }, 'Loan Document Analysis')
            )
          )
        ),
        React.createElement('div', { className: 'flex items-center gap-2' },
          React.createElement('button', {
            onClick: createNewChat,
            className: 'hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-all'
          },
            React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M12 4v16m8-8H4' })
            ),
            'New'
          ),
          currentChat && React.createElement('button', {
            onClick: () => setExportOpen(true),
            className: 'hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-all'
          },
            React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' })
            ),
            'Export'
          ),
          React.createElement('button', {
            onClick: () => setSettingsOpen(true),
            className: 'p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all'
          },
            React.createElement('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }),
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' })
            )
          )
        )
      ),
      React.createElement('main', { className: 'flex-1 overflow-y-auto' },
        (!currentChat || currentChat.messages.length === 0) && !streamingMessage
          ? React.createElement('div', { className: 'h-full flex flex-col items-center justify-center p-6' },
              React.createElement('div', { className: 'welcome-logo w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6' },
                React.createElement('svg', { className: 'w-12 h-12 text-white', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 1.5, d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
                )
              ),
              React.createElement('h2', { className: 'text-2xl font-semibold text-white mb-2' }, 'Welcome to LoanLens AI'),
              React.createElement('p', { className: 'text-slate-400 text-center max-w-md mb-8' }, 
                'Your intelligent assistant for analyzing loan documents, understanding terms, and making informed financial decisions.'
              ),
              React.createElement('div', { className: 'grid grid-cols-2 gap-3 max-w-lg w-full' },
                quickPrompts.map((prompt, i) => 
                  React.createElement('button', {
                    key: i,
                    onClick: () => { setInputValue(prompt); textareaRef.current?.focus(); },
                    className: 'quick-prompt p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl text-left transition-all'
                  },
                    React.createElement('span', { className: 'text-sm text-slate-300' }, prompt)
                  )
                )
              )
            )
          : React.createElement('div', { className: 'messages-container max-w-4xl mx-auto p-6 space-y-6' },
              currentChat?.messages.map(message => 
                React.createElement('div', {
                  key: message.id,
                  className: `message flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`
                },
                  React.createElement('div', { 
                    className: `avatar flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${message.role === 'user' ? 'bg-blue-600' : 'bg-slate-700'}`
                  },
                    message.role === 'user' 
                      ? React.createElement('svg', { className: 'w-5 h-5 text-white', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' })
                        )
                      : React.createElement('svg', { className: 'w-5 h-5 text-blue-400', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
                        )
                  ),
                  React.createElement('div', { 
                    className: `message-bubble flex-1 max-w-[85%] ${message.role === 'user' ? 'bg-blue-600 text-white rounded-2xl rounded-tr-md px-5 py-4' : 'bg-slate-800 text-slate-200 rounded-2xl rounded-tl-md px-5 py-4'}`
                  },
                    React.createElement(MessageContent, { content: message.content }),
                    React.createElement('div', { className: `text-xs mt-2 ${message.role === 'user' ? 'text-blue-200' : 'text-slate-500'}` },
                      new Date(message.timestamp).toLocaleTimeString()
                    )
                  )
                )
              ),
              streamingMessage && React.createElement('div', { className: 'message flex gap-4' },
                React.createElement('div', { className: 'avatar flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-slate-700' },
                  React.createElement('svg', { className: 'w-5 h-5 text-blue-400', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
                  )
                ),
                React.createElement('div', { className: 'message-bubble flex-1 max-w-[85%] bg-slate-800 text-slate-200 rounded-2xl rounded-tl-md px-5 py-4' },
                  React.createElement(MessageContent, { content: streamingMessage }),
                  React.createElement('span', { className: 'inline-block w-2 h-5 bg-blue-400 animate-pulse ml-1' })
                )
              ),
              isLoading && !streamingMessage && React.createElement('div', { className: 'message flex gap-4' },
                React.createElement('div', { className: 'avatar flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-slate-700' },
                  React.createElement('svg', { className: 'w-5 h-5 text-blue-400', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
                  )
                ),
                React.createElement('div', { className: 'message-bubble bg-slate-800 rounded-2xl rounded-tl-md px-5 py-4' },
                  React.createElement('div', { className: 'flex gap-1.5' },
                    React.createElement('div', { className: 'w-2 h-2 bg-blue-400 rounded-full animate-bounce', style: { animationDelay: '0ms' } }),
                    React.createElement('div', { className: 'w-2 h-2 bg-blue-400 rounded-full animate-bounce', style: { animationDelay: '150ms' } }),
                    React.createElement('div', { className: 'w-2 h-2 bg-blue-400 rounded-full animate-bounce', style: { animationDelay: '300ms' } })
                  )
                )
              ),
              React.createElement('div', { ref: messagesEndRef })
            )
      ),
      React.createElement('div', { className: 'input-area p-4 bg-slate-900 border-t border-slate-800' },
        React.createElement('div', { className: 'max-w-4xl mx-auto' },
          React.createElement('div', { className: 'relative flex items-end gap-3 bg-slate-800 rounded-2xl border border-slate-700 focus-within:border-blue-500 transition-colors' },
            React.createElement('textarea', {
              ref: textareaRef,
              value: inputValue,
              onChange: (e) => setInputValue(e.target.value),
              onKeyDown: handleKeyDown,
              placeholder: 'Ask about loan documents, terms, rates, or paste document text for analysis...',
              rows: 1,
              className: 'flex-1 bg-transparent text-white placeholder-slate-500 px-5 py-4 resize-none outline-none min-h-[56px] max-h-40'
            }),
            React.createElement('button', {
              onClick: sendMessage,
              disabled: isLoading || !inputValue.trim(),
              className: `m-2 p-3 rounded-xl transition-all ${inputValue.trim() && !isLoading ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`
            },
              React.createElement('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8' })
              )
            )
          ),
          React.createElement('div', { className: 'flex items-center justify-between mt-2 px-2' },
            React.createElement('span', { className: 'text-xs text-slate-500' }, 'Enter to send, Shift+Enter for new line'),
            React.createElement('span', { className: 'text-xs text-slate-500' }, `${inputValue.length} chars`)
          )
        )
      ),
      React.createElement('div', { className: 'status-bar flex items-center justify-between px-6 py-2 bg-slate-900/80 border-t border-slate-800 text-xs' },
        React.createElement('div', { className: 'flex items-center gap-4' },
          React.createElement('div', { className: 'flex items-center gap-2' },
            React.createElement('div', { className: `w-2 h-2 rounded-full ${settings.cloudEndpoint || settings.localEndpoint ? 'bg-emerald-400' : 'bg-red-400'}` }),
            React.createElement('span', { className: 'text-slate-500' }, 
              settings.connectionType === 'cloud' ? 'Cloud API' : 'Local Model'
            )
          ),
          React.createElement('span', { className: 'text-slate-600' }, '|'),
          React.createElement('span', { className: 'text-slate-500' }, 
            settings.connectionType === 'cloud' ? settings.model : settings.localModel
          )
        ),
        React.createElement('div', { className: 'flex items-center gap-4' },
          React.createElement('span', { className: 'text-slate-500' }, 
            `Streaming: ${settings.streaming ? 'ON' : 'OFF'}`
          ),
          React.createElement('span', { className: 'text-slate-500' }, 
            `Temp: ${settings.temperature}`
          )
        )
      )
    ),
    React.createElement(SettingsModal, {
      isOpen: settingsOpen,
      onClose: () => setSettingsOpen(false),
      settings,
      onSave: setSettings
    }),
    React.createElement(ExportModal, {
      isOpen: exportOpen,
      onClose: () => setExportOpen(false),
      chat: currentChat
    })
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));