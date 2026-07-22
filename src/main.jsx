import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowCounterClockwise,
  ArrowRight,
  Browser,
  Check,
  Copy,
  CursorClick,
  DeviceMobile,
  DotsSixVertical,
  DownloadSimple,
  Export,
  Eye,
  GearSix,
  ImageSquare,
  Layout,
  List,
  Minus,
  Moon,
  Plus,
  Rows,
  SidebarSimple,
  Sparkle,
  Sun,
  TextAa,
  Trash,
  X,
} from '@phosphor-icons/react';
import './styles.css';

const BLOCKS = [
  { type: 'header', label: 'ヘッダー', desc: 'ロゴとナビゲーション', icon: Layout },
  { type: 'hero', label: 'ヒーロー', desc: '見出しとメイン操作', icon: Sparkle },
  { type: 'cards', label: 'カード一覧', desc: '情報を並べて表示', icon: Rows },
  { type: 'list', label: 'リスト', desc: '縦方向の項目一覧', icon: List },
  { type: 'image', label: '画像', desc: 'ビジュアル領域', icon: ImageSquare },
  { type: 'cta', label: 'CTA', desc: '次の操作を促す', icon: CursorClick },
];

const DEFAULT_SECTIONS = [
  { id: 1, type: 'header', title: 'ホーム', note: 'ロゴ、検索、プロフィールを配置' },
  { id: 2, type: 'hero', title: 'おかえりなさい', note: '今日の進捗と主要アクションを表示' },
  { id: 3, type: 'cards', title: '最近のプロジェクト', note: '更新順に3件を表示' },
  { id: 4, type: 'cta', title: '新しいプロジェクト', note: '作成フローを開始する' },
];

const nextId = () => Date.now() + Math.floor(Math.random() * 1000);

function BlockPreview({ section, active, onSelect, onRemove }) {
  const common = { onClick: onSelect, className: `wire-block ${active ? 'is-active' : ''}` };
  const remove = (
    <button className="block-remove" onClick={(event) => { event.stopPropagation(); onRemove(); }} aria-label={`${section.title}を削除`}>
      <X size={13} weight="bold" />
    </button>
  );

  if (section.type === 'header') return (
    <div {...common}>
      <DotsSixVertical className="drag-handle" size={16} />
      <div className="mock-logo">F</div>
      <div className="mock-nav"><i /><i /><i /></div>
      <div className="mock-avatar" />
      {remove}
    </div>
  );
  if (section.type === 'hero') return (
    <div {...common}>
      <DotsSixVertical className="drag-handle" size={16} />
      <span className="mock-kicker">DASHBOARD</span>
      <strong>{section.title}</strong>
      <span className="mock-copy">{section.note}</span>
      <button type="button">プロジェクトを見る <ArrowRight size={12} /></button>
      {remove}
    </div>
  );
  if (section.type === 'cards') return (
    <div {...common}>
      <DotsSixVertical className="drag-handle" size={16} />
      <div className="mock-section-title"><strong>{section.title}</strong><span>すべて見る</span></div>
      <div className="mock-card-grid">{[1,2,3].map((item) => <div className="mock-card" key={item}><div /><b /><span /></div>)}</div>
      {remove}
    </div>
  );
  if (section.type === 'list') return (
    <div {...common}>
      <DotsSixVertical className="drag-handle" size={16} />
      <strong>{section.title}</strong>
      <div className="mock-list">{[1,2,3].map((item) => <div key={item}><i /><span><b /><small /></span><ArrowRight size={12} /></div>)}</div>
      {remove}
    </div>
  );
  if (section.type === 'image') return (
    <div {...common}>
      <DotsSixVertical className="drag-handle" size={16} />
      <div className="mock-image"><ImageSquare size={28} /><span>{section.title}</span></div>
      {remove}
    </div>
  );
  return (
    <div {...common}>
      <DotsSixVertical className="drag-handle" size={16} />
      <div className="mock-cta"><div><strong>{section.title}</strong><span>{section.note}</span></div><button type="button"><Plus size={13} weight="bold" /> 作成する</button></div>
      {remove}
    </div>
  );
}

function App() {
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [selectedId, setSelectedId] = useState(2);
  const [projectName, setProjectName] = useState('プロジェクト管理アプリ');
  const [platform, setPlatform] = useState('モバイル');
  const [theme, setTheme] = useState('light');
  const [rightTab, setRightTab] = useState('edit');
  const [copied, setCopied] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(null);
  const selected = sections.find((section) => section.id === selectedId);

  const prompt = useMemo(() => {
    const lines = sections.map((section, index) => `${index + 1}. ${section.title}: ${section.note}`);
    return `「${projectName}」の${platform}向け画面を実装してください。\n\n画面構成:\n${lines.join('\n')}\n\n要件:\n- 情報の優先順位が伝わる明快なレイアウト\n- キーボード操作と十分なカラーコントラスト\n- モバイルとデスクトップのレスポンシブ対応\n- 各操作にホバー、フォーカス、エラー、空状態を用意\n- このワイヤーフレームの構造を保ちつつ、実用的な文言と余白に調整`;
  }, [sections, projectName, platform]);

  const addBlock = (block) => {
    const section = { id: nextId(), type: block.type, title: block.label, note: block.desc };
    setSections((current) => [...current, section]);
    setSelectedId(section.id);
    setMobilePanel(null);
  };

  const updateSelected = (field, value) => {
    setSections((current) => current.map((section) => section.id === selectedId ? { ...section, [field]: value } : section));
  };

  const removeSection = (id) => {
    setSections((current) => current.filter((section) => section.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className={theme === 'dark' ? 'app dark' : 'app'}>
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Layout size={18} weight="fill" /></span><span>Framekit</span></div>
        <div className="project-title"><span>{projectName}</span><small>保存済み</small></div>
        <div className="top-actions">
          <button className="icon-button" aria-label="元に戻す"><ArrowCounterClockwise size={18} /></button>
          <span className="top-divider" />
          <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="テーマを切り替える">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
          <button className="secondary-button"><Eye size={17} /> <span>プレビュー</span></button>
          <button className="primary-button" onClick={() => setRightTab('export')}><Export size={17} /> <span>Codexへ渡す</span></button>
        </div>
      </header>

      <main className="workspace">
        <aside className={`left-panel ${mobilePanel === 'blocks' ? 'mobile-open' : ''}`}>
          <div className="panel-heading"><div><span>パーツ</span><small>クリックして追加</small></div><button className="mobile-close" onClick={() => setMobilePanel(null)}><X size={18} /></button></div>
          <div className="block-library">
            {BLOCKS.map((block) => {
              const Icon = block.icon;
              return <button className="library-item" key={block.type} onClick={() => addBlock(block)}><span><Icon size={19} /></span><div><strong>{block.label}</strong><small>{block.desc}</small></div><Plus size={15} /></button>;
            })}
          </div>
          <div className="tip"><Sparkle size={16} weight="fill" /><p><strong>ヒント</strong>パーツを選ぶと右側で内容を編集できます。</p></div>
        </aside>

        <section className="canvas-area">
          <div className="canvas-toolbar">
            <div className="device-switch"><button className={platform === 'モバイル' ? 'active' : ''} onClick={() => setPlatform('モバイル')}><DeviceMobile size={16} /> モバイル</button><button className={platform === 'Web' ? 'active' : ''} onClick={() => setPlatform('Web')}><Browser size={16} /> Web</button></div>
            <span>{sections.length} セクション</span>
          </div>
          <div className={`device-stage ${platform === 'Web' ? 'web-stage' : ''}`}>
            <div className="device-frame">
              <div className="device-chrome">{platform === 'モバイル' ? <><span>9:41</span><i /></> : <><div><i /><i /><i /></div><span>app.local/dashboard</span></>}</div>
              <div className="screen">
                {sections.length ? sections.map((section) => <BlockPreview key={section.id} section={section} active={selectedId === section.id} onSelect={() => setSelectedId(section.id)} onRemove={() => removeSection(section.id)} />) : <div className="empty-canvas"><Layout size={32} /><strong>最初のパーツを追加</strong><span>左のパネルから画面を組み立てます。</span></div>}
                <button className="canvas-add" onClick={() => setMobilePanel('blocks')}><Plus size={15} weight="bold" /> セクションを追加</button>
              </div>
            </div>
          </div>
        </section>

        <aside className={`right-panel ${mobilePanel === 'settings' ? 'mobile-open' : ''}`}>
          <div className="right-tabs"><button className={rightTab === 'edit' ? 'active' : ''} onClick={() => setRightTab('edit')}>編集</button><button className={rightTab === 'export' ? 'active' : ''} onClick={() => setRightTab('export')}>Codex用</button><button className="mobile-close" onClick={() => setMobilePanel(null)}><X size={18} /></button></div>
          {rightTab === 'edit' ? (
            <div className="settings-body">
              <div className="settings-intro"><span className="selected-icon"><TextAa size={18} /></span><div><small>選択中</small><strong>{selected?.title || '未選択'}</strong></div></div>
              <label>プロジェクト名<input value={projectName} onChange={(event) => setProjectName(event.target.value)} /></label>
              {selected ? <>
                <label>見出し<input value={selected.title} onChange={(event) => updateSelected('title', event.target.value)} /></label>
                <label>目的・補足<textarea rows="4" value={selected.note} onChange={(event) => updateSelected('note', event.target.value)} /></label>
                <div className="field-group"><span>余白</span><div className="segmented"><button>狭い</button><button className="active">標準</button><button>広い</button></div></div>
                <button className="danger-button" onClick={() => removeSection(selected.id)}><Trash size={16} /> このセクションを削除</button>
              </> : <div className="empty-settings"><SidebarSimple size={26} /><p>キャンバス上のセクションを選択してください。</p></div>}
            </div>
          ) : (
            <div className="export-body">
              <div className="export-heading"><span><Sparkle size={17} weight="fill" /></span><div><strong>Codex用プロンプト</strong><small>画面構成から自動生成</small></div></div>
              <pre>{prompt}</pre>
              <button className="copy-button" onClick={copyPrompt}>{copied ? <Check size={17} weight="bold" /> : <Copy size={17} />}{copied ? 'コピーしました' : 'プロンプトをコピー'}</button>
              <button className="download-button" onClick={() => {
                const blob = new Blob([prompt], { type: 'text/plain' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'codex-wireframe-prompt.txt';
                link.click();
                URL.revokeObjectURL(link.href);
              }}><DownloadSimple size={17} /> テキストで保存</button>
            </div>
          )}
        </aside>
      </main>

      <nav className="mobile-dock" aria-label="編集パネル">
        <button onClick={() => setMobilePanel('blocks')}><Plus size={19} /><span>追加</span></button>
        <button onClick={() => setMobilePanel('settings')}><GearSix size={19} /><span>編集</span></button>
        <button onClick={() => { setRightTab('export'); setMobilePanel('settings'); }}><Export size={19} /><span>Codex</span></button>
      </nav>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
