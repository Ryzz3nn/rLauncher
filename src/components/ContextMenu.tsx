import { useEffect, useRef } from 'react';
import type { Game, Collection } from '../types';

interface ContextMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  game: Game;
  isFavorite: boolean;
  collections: Collection[];
  gameCollections: string[];
  onClose: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onLaunch: (game: Game) => void;
  onToggleFavorite: (gameId: string) => void;
  onUninstall: (game: Game) => void;
  onShowDetail: (game: Game) => void;
  onToggleCollection: (gameId: string, colId: string) => void;
}

const I = {
  Play: () => <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M2 1l10 6-10 6z"/></svg>,
  Kill: () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="6"/><line x1="4" y1="4" x2="10" y2="10"/><line x1="10" y1="4" x2="4" y2="10"/></svg>,
  Folder: () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M1.5 3.5V11.5C1.5 12.05 1.95 12.5 2.5 12.5H11.5C12.05 12.5 12.5 12.05 12.5 11.5V5.5C12.5 4.95 12.05 4.5 11.5 4.5H7L5.5 2.5H2.5C1.95 2.5 1.5 2.95 1.5 3.5Z"/></svg>,
  Steam: () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="7" cy="7" r="5.5"/><circle cx="7" cy="5.5" r="2"/><path d="M3 11l2.5-3"/></svg>,
  Star: (p: { filled?: boolean }) => p.filled
    ? <svg width="14" height="14" viewBox="0 0 14 14" fill="#f59e0b"><path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.27 3.48 11.85l.67-3.93L1.3 5.14l3.94-.57z"/></svg>
    : <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.27 3.48 11.85l.67-3.93L1.3 5.14l3.94-.57z"/></svg>,
  Copy: () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="4.5" y="4.5" width="8" height="8" rx="1.5"/><path d="M9.5 4.5V2.5C9.5 1.95 9.05 1.5 8.5 1.5H2.5C1.95 1.5 1.5 1.95 1.5 2.5V8.5C1.5 9.05 1.95 9.5 2.5 9.5H4.5"/></svg>,
  Uninstall: () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M2 4h10M5 4V2.5h4V4M3 4v8.5h8V4"/><line x1="5.5" y1="6.5" x2="5.5" y2="10"/><line x1="8.5" y1="6.5" x2="8.5" y2="10"/></svg>,
  Detail: () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="7" cy="7" r="5.5"/><line x1="7" y1="6" x2="7" y2="10"/><circle cx="7" cy="4" r="0.5" fill="currentColor"/></svg>,
  Collection: ({ color }: { color: string }) => <svg width="14" height="14" viewBox="0 0 14 14" fill={color}><rect x="1.5" y="2.5" width="11" height="9" rx="2.5"/></svg>,
};

export function ContextMenu({ x, y, game, isFavorite, collections, gameCollections, onClose, onToast, onLaunch, onToggleFavorite, onUninstall, onShowDetail, onToggleCollection }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [onClose]);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const el = menuRef.current;
    if (rect.right > window.innerWidth) el.style.left = `${x - rect.width}px`;
    if (rect.bottom > window.innerHeight) el.style.top = `${y - rect.height}px`;
  }, [x, y]);

  const items: ContextMenuItem[] = [
    { label: 'Play', icon: <I.Play />, onClick: () => { onLaunch(game); onClose(); } },
    { label: 'Details', icon: <I.Detail />, onClick: () => { onShowDetail(game); onClose(); } },
    { label: isFavorite ? 'Remove from Favorites' : 'Add to Favorites', icon: <I.Star filled={isFavorite} />, onClick: () => { onToggleFavorite(game.id); onClose(); }, separator: true },
    ...(game.installDir ? [{ label: 'Open Install Folder', icon: <I.Folder />, onClick: () => { window.api.openInstallFolder(game.installDir!); onClose(); } }] : []),
    ...(game.source === 'steam' && game.appId ? [{ label: 'View on Steam', icon: <I.Steam />, onClick: () => { window.api.openSteamPage(game.appId!); onClose(); } }] : []),
    { label: 'Copy Name', icon: <I.Copy />, onClick: () => { navigator.clipboard.writeText(game.name); onClose(); }, separator: collections.length > 0 },
  ];

  // Collection submenu items
  if (collections.length > 0) {
    collections.forEach(col => {
      const inCol = gameCollections.includes(col.id);
      items.push({
        label: `${inCol ? 'Remove from' : 'Add to'} ${col.name}`,
        icon: <I.Collection color={col.color} />,
        onClick: () => { onToggleCollection(game.id, col.id); onClose(); },
      });
    });
  }

  items.push(
    { label: 'Force Kill Process', icon: <I.Kill />, onClick: async () => { const r = await window.api.killGameProcess({ name: game.name, installDir: game.installDir, gameId: game.id }); onToast(r.message, r.success ? 'success' : 'error'); onClose(); }, danger: true, separator: true },
    { label: game.source === 'custom' ? 'Remove Game' : 'Uninstall', icon: <I.Uninstall />, onClick: () => { onUninstall(game); onClose(); }, danger: true },
  );

  return (
    <div className="context-menu" ref={menuRef} style={{ left: x, top: y }}>
      {items.map((item, i) => (
        <div key={i}>
          {item.separator && i > 0 && <div className="context-menu-separator" />}
          <button className={`context-menu-item ${item.danger ? 'danger' : ''}`} onClick={item.onClick}>
            <span className="context-menu-icon">{item.icon}</span>
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}
