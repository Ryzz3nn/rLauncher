import { useState } from 'react';
import type { Game, GameFilter, Collection, AppPage, Account } from '../types';
import bannerImg from '../assets/banner.png';

interface SidebarProps {
  filter: GameFilter;
  page: AppPage;
  onFilterChange: (filter: GameFilter) => void;
  onPageChange: (page: AppPage) => void;
  counts: { all: number; steam: number; epic: number; gog: number; ea: number; custom: number; favorites: number; recent: number };
  collections: Collection[];
  accounts: Account[];
  activeAccountId: string;
  onSwitchAccount: (id: string) => void;
  onAddCustomGame: (game: Game) => void;
  onRescan: () => void;
}

function IconGrid() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><rect x="1" y="1" width="7" height="7" rx="1.5"/><rect x="10" y="1" width="7" height="7" rx="1.5"/><rect x="1" y="10" width="7" height="7" rx="1.5"/><rect x="10" y="10" width="7" height="7" rx="1.5"/></svg>;
}
function IconStar() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><path d="M9 1.5l2.25 4.57 5.04.73-3.65 3.55.86 5.03L9 13.13l-4.5 2.25.86-5.03L1.71 6.8l5.04-.73z"/></svg>;
}
function IconRecent() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="9" cy="9" r="7.5"/><path d="M9 4.5V9l3.5 2"/></svg>;
}
function IconSteam() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="9" cy="9" r="7.5"/><circle cx="9" cy="7" r="2.5"/><path d="M4 14l3.5-4"/></svg>;
}
function IconEpic() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3" y="2" width="12" height="14" rx="2"/><path d="M7 6h4M7 9h4M7 12h2"/></svg>;
}
function IconGog() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="9" cy="9" r="7.5"/><circle cx="9" cy="9" r="3"/></svg>;
}
function IconEa() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="4" width="14" height="10" rx="2"/><path d="M6 8h6M6 11h4"/></svg>;
}
function IconCustom() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="3" width="14" height="12" rx="2"/><path d="M6 3V1.5M12 3V1.5"/></svg>;
}
function IconSettings() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="9" cy="9" r="2.5"/><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.4 3.4l1.4 1.4M13.2 13.2l1.4 1.4M3.4 14.6l1.4-1.4M13.2 4.8l1.4-1.4"/></svg>;
}
function IconRefresh() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M1.5 7a5.5 5.5 0 019.5-3.5M12.5 7a5.5 5.5 0 01-9.5 3.5"/><path d="M11 1v3h-3M3 10v3h3"/></svg>;
}

function IconCollection({ color }: { color: string }) {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill={color} opacity="0.9"><rect x="2" y="3" width="14" height="12" rx="3"/></svg>;
}

export function Sidebar({ filter, page, onFilterChange, onPageChange, counts, collections, accounts, activeAccountId, onSwitchAccount, onAddCustomGame, onRescan }: SidebarProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0];

  const mainNav = [
    { id: 'all' as const, label: 'All Games', icon: <IconGrid />, count: counts.all },
    { id: 'favorites' as const, label: 'Favorites', icon: <IconStar />, count: counts.favorites },
    { id: 'recent' as const, label: 'Recently Played', icon: <IconRecent />, count: counts.recent },
  ];

  const sourceNav = [
    counts.steam > 0 && { id: 'steam' as const, label: 'Steam', icon: <IconSteam />, count: counts.steam },
    counts.epic > 0 && { id: 'epic' as const, label: 'Epic', icon: <IconEpic />, count: counts.epic },
    counts.gog > 0 && { id: 'gog' as const, label: 'GOG', icon: <IconGog />, count: counts.gog },
    counts.ea > 0 && { id: 'ea' as const, label: 'EA', icon: <IconEa />, count: counts.ea },
    counts.custom > 0 && { id: 'custom' as const, label: 'Custom', icon: <IconCustom />, count: counts.custom },
  ].filter(Boolean) as { id: any; label: string; icon: JSX.Element; count: number }[];

  function navClick(source: GameFilter['source']) {
    onPageChange('library');
    onFilterChange({ ...filter, source, collectionId: undefined });
  }

  function collectionClick(colId: string) {
    onPageChange('library');
    onFilterChange({ ...filter, source: 'all', collectionId: colId });
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        {accounts.length > 1 && activeAccount && (
          <div className="avatar-switcher-wrap">
            <button className="avatar-switcher-btn" onClick={() => setShowAccountDropdown(!showAccountDropdown)}>
              {activeAccount.avatar ? (
                <img src={activeAccount.avatar} alt={activeAccount.name} className="avatar-switcher-img" />
              ) : (
                <span className="avatar-switcher-img avatar-switcher-placeholder" style={{ background: activeAccount.color }}>
                  {activeAccount.name.charAt(0).toUpperCase()}
                </span>
              )}
            </button>
            {showAccountDropdown && (
              <div className="avatar-dropdown">
                {accounts.map(acct => (
                  <button key={acct.id}
                    className={`avatar-dropdown-item ${acct.id === activeAccountId ? 'active' : ''}`}
                    onClick={() => { onSwitchAccount(acct.id); setShowAccountDropdown(false); }}>
                    {acct.avatar ? (
                      <img src={acct.avatar} alt={acct.name} className="avatar-dropdown-img" />
                    ) : (
                      <span className="avatar-dropdown-img avatar-switcher-placeholder" style={{ background: acct.color }}>
                        {acct.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span>{acct.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <img src={bannerImg} alt="rLauncher" className="logo-banner" />
      </div>

      {/* intentionally empty — avatar is in sidebar-logo */}

      <nav className="sidebar-nav">
        <div className="nav-section-label">Library</div>
        {mainNav.map(item => (
          <button
            key={item.id}
            className={`nav-item ${page === 'library' && filter.source === item.id && !filter.collectionId ? 'active' : ''}`}
            onClick={() => navClick(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            <span className="nav-count">{item.count}</span>
          </button>
        ))}

        {sourceNav.length > 0 && <div className="nav-section-label" style={{ marginTop: 12 }}>Sources</div>}
        {sourceNav.map(item => (
          <button
            key={item.id}
            className={`nav-item ${page === 'library' && filter.source === item.id && !filter.collectionId ? 'active' : ''}`}
            onClick={() => navClick(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            <span className="nav-count">{item.count}</span>
          </button>
        ))}

        {collections.length > 0 && <div className="nav-section-label" style={{ marginTop: 12 }}>Collections</div>}
        {collections.map(col => (
          <button
            key={col.id}
            className={`nav-item ${page === 'library' && filter.collectionId === col.id ? 'active' : ''}`}
            onClick={() => collectionClick(col.id)}
          >
            <span className="nav-icon"><IconCollection color={col.color} /></span>
            <span className="nav-label">{col.name}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-row">
          <button className="add-game-btn" onClick={() => setShowAddModal(true)} style={{ flex: 1 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
              <line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/>
            </svg>
            Add Game
          </button>
          <button className="icon-btn" onClick={onRescan} title="Rescan libraries">
            <IconRefresh />
          </button>
        </div>
        <button
          className={`nav-item settings-btn ${page === 'settings' ? 'active' : ''}`}
          onClick={() => onPageChange('settings')}
          style={{ marginTop: 8 }}
        >
          <span className="nav-icon"><IconSettings /></span>
          <span className="nav-label">Settings</span>
        </button>
      </div>

      {showAddModal && (
        <AddGameModal
          onClose={() => setShowAddModal(false)}
          onAdd={game => { onAddCustomGame(game); setShowAddModal(false); }}
        />
      )}
    </aside>
  );
}

function AddGameModal({ onClose, onAdd }: { onClose: () => void; onAdd: (game: Game) => void }) {
  const [name, setName] = useState('');
  const [executablePath, setExecutablePath] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      id: `custom-${Date.now()}`,
      name: name.trim(),
      source: 'custom',
      executablePath: executablePath.trim() || undefined,
      coverUrl: coverUrl.trim() || undefined,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Add Custom Game</h2>
        <form onSubmit={handleSubmit}>
          <label>Name *<input value={name} onChange={e => setName(e.target.value)} placeholder="Game name" required /></label>
          <label>Executable Path<input value={executablePath} onChange={e => setExecutablePath(e.target.value)} placeholder="C:\path\to\game.exe" /></label>
          <label>Cover Image URL<input value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://..." /></label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Add Game</button>
          </div>
        </form>
      </div>
    </div>
  );
}
