import React, { useState } from 'react';
import { Plus, Search, ChevronDown, SlidersHorizontal, Monitor, X } from 'lucide-react';

// Orange asterisk SVG logo
const AsteriskLogo = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 5V15M20 25V35M5 20H15M25 20H35M9.5 9.5L16.5 16.5M23.5 23.5L30.5 30.5M9.5 30.5L16.5 23.5M23.5 16.5L30.5 9.5" stroke="#D97757" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

const NavItem = ({ icon: Icon, label, isActive, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 h-9 px-3 rounded-lg text-left transition-colors duration-150 ${
      isActive ? 'bg-border' : 'hover:bg-hover'
    }`}
  >
    <Icon size={18} className="text-muted" />
    <span className="text-[15px] flex-1">{label}</span>
    {badge && (
      <span className="text-xs text-link border border-border rounded-full px-2 py-0.5">
        {badge}
      </span>
    )}
  </button>
);

const ChatHistoryItem = ({ title, isActive, onClick, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`flex items-center gap-2 h-[34px] px-3 rounded-lg cursor-pointer transition-colors duration-150 ${
        isActive ? 'bg-border' : 'hover:bg-hover'
      }`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`w-2 h-2 rounded-full border ${isActive ? 'border-text bg-text' : 'border-muted'}`} />
      <span className="text-[14px] truncate flex-1">{title}</span>
      {isHovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={14} className="text-muted hover:text-text" />
        </button>
      )}
    </div>
  );
};

const Sidebar = ({ chats, currentChatId, onCreateNew, onSelectChat, onDeleteChat, onClose }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    if (chat.title?.toLowerCase().includes(query)) return true;
    return (chat.messages || []).some((m) => m.content?.toLowerCase().includes(query));
  });

  return (
    <div className="w-[288px] h-full bg-sidebar border-r border-border flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <AsteriskLogo size={28} />
            <span className="font-serif text-[22px]">Voice AI</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover transition-colors md:hidden"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <div className="px-3 space-y-1">
        <NavItem icon={Plus} label="New" isActive={true} onClick={onCreateNew} />
        <NavItem icon={Search} label="Search" onClick={() => {}} />
      </div>

      {/* Search bar */}
      <div className="px-3 mb-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-muted" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-[14px] bg-input-bg border border-border rounded-lg outline-none focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* Chats and tasks section */}
      <div className="mt-6 flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-muted">Chats and tasks</span>
            <ChevronDown size={14} className="text-muted" />
          </div>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-hover transition-colors"
          >
            <SlidersHorizontal size={14} className="text-muted" />
          </button>
        </div>

        {/* Chat history list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 space-y-0.5">
          {searchQuery && !filteredChats.length ? (
            <div className="text-[13px] text-muted text-center py-4">No matching chats</div>
          ) : (
            filteredChats.map(chat => (
              <ChatHistoryItem
                key={chat.id}
                title={chat.title}
                isActive={chat.id === currentChatId}
                onClick={() => onSelectChat(chat.id)}
                onDelete={() => onDeleteChat(chat.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#B91C1C] flex items-center justify-center">
              <span className="text-white text-sm font-medium">N</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[14px]">nargish</span>
              <span className="text-[12px] text-muted">Free</span>
            </div>
            <ChevronDown size={14} className="text-muted" />
          </div>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover transition-colors">
            <Monitor size={16} className="text-muted" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;