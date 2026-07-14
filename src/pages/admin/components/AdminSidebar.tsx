import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Users, CheckCircle2, ShoppingCart, Layers, Trophy,
  ChevronDown, ChevronRight, FileText, Diamond, Target, Bell,
  Link2, X, Settings, GitMerge, Flag, BookOpen
} from 'lucide-react';

const ADMIN_MENU_SECTIONS = [
  {
    title: 'Games & Events',
    items: [
      { id: 'leagues', label: 'Leagues', icon: Target, path: '/admin/leagues' },
      {
        id: 'matchups',
        label: 'Matchups',
        icon: CheckCircle2,
        subItems: [
          { id: 'matchups-all', label: 'All Matchups', path: '/admin/matchups' },
          { id: 'matchups-picks', label: 'Picks', path: '/admin/picks' },
          { id: 'matchups-create', label: 'Create Matchup', path: '/admin/matchups/create' },
          { id: 'matchups-pga', label: 'PGA Builder', path: '/admin/pga-builder' },
          { id: 'matchups-scraper', label: 'Scraper Settings', path: '/admin/settings/scraper' }
        ]
      },
      { id: 'pickem', label: "Pick'em", icon: Layers, path: '/admin/pickem' },
      { id: 'brackets', label: 'Brackets', icon: GitMerge, path: '/admin/brackets' },
      { id: 'link4', label: 'Link4', icon: Target, path: '/admin/link4' },
      { id: 'challenges', label: 'Challenges', icon: Target, path: '/admin/challenges' },
    ]
  },
  {
    title: 'Community & Users',
    items: [
      {
        id: 'users',
        label: 'Users',
        icon: Users,
        subItems: [
          { id: 'users-all', label: 'All Users', path: '/admin/users' },
          { id: 'users-premium', label: 'Premium Status', path: '/admin/premium' },
          { id: 'users-cosmetics', label: 'User Cosmetics', path: '/admin/users/cosmetics' },
          { id: 'users-links', label: 'Manage Links', path: '/admin/users/links' },
          { id: 'logs-transactions', label: 'Link Transactions', path: '/admin/logs/transactions' },
          { id: 'users-referrals', label: 'Referrals', path: '/admin/referrals' },
        ]
      },
      { id: 'announcements', label: 'Announcements', icon: FileText, path: '/admin/announcements' },
      { id: 'notifications', label: 'Notifications', icon: Bell, path: '/admin/notifications' },
    ]
  },
  {
    title: 'Economy & Prizes',
    items: [
      { id: 'monthly-prize', label: 'Monthly Prize', icon: Trophy, path: '/admin/prize' },
      {
        id: 'shopItems',
        label: 'Shop',
        icon: Link2,
        subItems: [
          { id: 'shopItems-all', label: 'All Shop Items', path: '/admin/shopItems' },
          { id: 'shopItems-create', label: 'Create Shop Item', path: '/admin/shopItems/create' }
        ]
      },
      {
        id: 'achievements',
        label: 'Achievements',
        icon: Trophy,
        subItems: [
          { id: 'achievements-all', label: 'All Achievements', path: '/admin/achievements' },
          { id: 'achievements-create', label: 'Create Achievement', path: '/admin/achievements/create' },
          { id: 'achievements-award', label: 'Award Achievement', path: '/admin/achievements/award' }
        ]
      },
      {
        id: 'sponsors',
        label: 'Sponsors',
        icon: Diamond,
        subItems: [
          { id: 'sponsors-all', label: 'All Sponsors', path: '/admin/sponsors' },
          { id: 'sponsors-create', label: 'Create Sponsor', path: '/admin/sponsors/create' },
        ]
      },
    ]
  },
  {
    title: 'System',
    items: [
      { id: 'guide', label: 'Operating Guide', icon: BookOpen, path: '/admin/guide' },
    ]
  }
];

export function AdminSidebar({ open, setOpen }: { open: boolean; setOpen: (val: boolean) => void }) {
  const location = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ matchups: true });

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className={`fixed md:relative top-0 left-0 h-full z-50 w-64 border-r border-zinc-800 bg-[#121212] flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-[4.5rem] flex items-center justify-between px-6 border-b border-zinc-800">
           <div className="font-display font-extrabold text-xl text-zinc-100 tracking-wide">
             Admin
           </div>
           <button className="md:hidden text-zinc-400 hover:text-white" onClick={() => setOpen(false)}>
             <X className="w-6 h-6" />
           </button>
        </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1 custom-scrollbar">
        <Link to="/play" className="px-3 py-2 text-sm text-zinc-400 hover:text-white pb-4 border-b border-zinc-800/50 mb-2">← Back to App</Link>

        {ADMIN_MENU_SECTIONS.map(section => (
          <div key={section.title} className="mb-4">
            <div className="px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              {section.title}
            </div>
            {section.items.map(item => {
              const isActive = location.pathname === item.path || (item.subItems && item.subItems.some(sub => location.pathname === sub.path));

              if (item.subItems) {
                const isExpanded = expanded[item.id];
                return (
                  <div key={item.id} className="mb-1">
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'text-zinc-100 font-medium' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-[18px] h-[18px]" />
                        <span className="text-[15px]">{item.label}</span>
                      </div>
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    {isExpanded && (
                      <div className="ml-9 mt-1 flex flex-col gap-1 border-l border-zinc-800/80 pl-2">
                        {item.subItems.map(subItem => {
                          const isSubActive = location.pathname === subItem.path;
                          return (
                            <Link
                              key={subItem.id}
                              to={subItem.path}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isSubActive ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'}`}
                            >
                              <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                              {subItem.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              } else {
                return (
                  <Link
                    key={item.id}
                    to={item.path!}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors mb-1 ${isActive ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                    <span className="text-[15px]">{item.label}</span>
                  </Link>
                );
              }
            })}
          </div>
        ))}
      </div>
      </div>
    </>
  );
}
