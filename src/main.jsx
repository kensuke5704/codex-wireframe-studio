import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowCounterClockwise,
  ArrowRight,
  Browser,
  Check,
  Copy,
  Cursor,
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
  Moon,
  Plus,
  Rectangle,
  Rows,
  SidebarSimple,
  Sparkle,
  Sun,
  TextAa,
  TextT,
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

const DRAW_TOOLS = [
  { id: 'select', label: '選択', icon: Cursor },
  { id: 'rectangle', label: '長方形', icon: Rectangle },
  { id: 'text', label: '文字', icon: TextT },
];

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

function FreeShape({ shape, active, tool, onSelect, onChange, onTextChange }) {
  const interaction = useRef(null);

  const beginMove = (event) => {
    if (tool !== 'select') return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    interaction.current = {
      mode: 'move',
      startX: event.clientX,
      startY: event.clientY,
      x: shape.x,
      y: shape.y,
    };
    onSelect();
  };

  const beginResize = (event) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    interaction.current = {
      mode: 'resize',
      startX: event.clientX,
      startY: event.clientY,
      width: shape.width,
      height: shape.height,
    };
  };

  const interact = (event) => {
    const current = interaction.current;
    if (!current) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (current.mode === 'move') {
      onChange({ x: Math.max(0, current.x + dx), y: Math.max(0, current.y + dy) });
    } else {
      onChange({ width: Math.max(36, current.width + dx), height: Math.max(24, current.height + dy) });
    }
  };

  return (
    <div
      className={`free-shape free-${shape.type} ${active ? 'is-active' : ''}`}
      style={{ left: shape.x, top: shape.y, width: shape.width, height: shape.height, background: shape.type === 'rectangle' ? shape.fill : 'transparent', borderColor: shape.border, color: shape.color, fontSize: shape.fontSize }}
      onPointerDown={beginMove}
      onPointerMove={interact}
      onPointerUp={() => { interaction.current = null; }}
      onClick={(event) => { if (tool === 'select') { event.stopPropagation(); onSelect(); } }}
      aria-label={shape.type === 'rectangle' ? '自由配置の長方形' : `自由配置テキスト: ${shape.text}`}
    >
      {shape.type === 'text' && (
        <span
          contentEditable={active && tool === 'select'}
          suppressContentEditableWarning
          onPointerDown={(event) => { if (active) event.stopPropagation(); }}
          onBlur={(event) => onTextChange(event.currentTarget.textContent || 'テキスト')}
        >{shape.text}</span>
      )}
      {active && tool === 'select' && <button className="resize-handle" onPointerDown={beginResize} onPointerMove={interact} onPointerUp={() => { interaction.current = null; }} aria-label="サイズを変更" />}
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
  const [tool, setTool] = useState('select');
  const [shapes, setShapes] = useState([]);
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [draftShape, setDraftShape] = useState(null);
  const drawOrigin = useRef(null);
  const selected = sections.find((section) => section.id === selectedId);
  const selectedShape = shapes.find((shape) => shape.id === selectedShapeId);

  const prompt = useMemo(() => {
    const lines = sections.map((section, index) => `${index + 1}. ${section.title}: ${section.note}`);
    const freeform = shapes.length
      ? shapes.map((shape, index) => `${index + 1}. ${shape.type === 'rectangle' ? '長方形' : `文字「${shape.text}」`}: x ${Math.round(shape.x)}, y ${Math.round(shape.y)}, 幅 ${Math.round(shape.width)}, 高さ ${Math.round(shape.height)}`).join('\n')
      : 'なし';
    return `「${projectName}」の${platform}向け画面を実装してください。\n\n画面構成:\n${lines.join('\n')}\n\n自由配置要素:\n${freeform}\n\n要件:\n- 情報の優先順位が伝わる明快なレイアウト\n- キーボード操作と十分なカラーコントラスト\n- モバイルとデスクトップのレスポンシブ対応\n- 各操作にホバー、フォーカス、エラー、空状態を用意\n- このワイヤーフレームの構造と自由配置要素の位置関係を保つ`;
  }, [sections, shapes, projectName, platform]);

  useEffect(() => {
    const removeWithKeyboard = (event) => {
      const tag = document.activeElement?.tagName;
      if (!selectedShapeId || tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      if (event.key === 'Delete' || event.key === 'Backspace') {
        setShapes((current) => current.filter((shape) => shape.id !== selectedShapeId));
        setSelectedShapeId(null);
      }
    };
    window.addEventListener('keydown', removeWithKeyboard);
    return () => window.removeEventListener('keydown', removeWithKeyboard);
  }, [selectedShapeId]);

  const addBlock = (block) => {
    const section = { id: nextId(), type: block.type, title: block.label, note: block.desc };
    setSections((current) => [...current, section]);
    setSelectedId(section.id);
    setSelectedShapeId(null);
    setMobilePanel(null);
  };

  const updateSelected = (field, value) => {
    setSections((current) => current.map((section) => section.id === selectedId ? { ...section, [field]: value } : section));
  };

  const updateShape = (id, patch) => {
    setShapes((current) => current.map((shape) => shape.id === id ? { ...shape, ...patch } : shape));
  };

  const selectTool = (nextTool) => {
    setTool(nextTool);
    if (nextTool !== 'select') {
      setSelectedId(null);
      setSelectedShapeId(null);
    }
    setMobilePanel(null);
  };

  const pointInLayer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startDrawing = (event) => {
    if (tool === 'select') {
      setSelectedShapeId(null);
      return;
    }
    const point = pointInLayer(event);
    if (tool === 'text') {
      const shape = { id: nextId(), type: 'text', x: point.x, y: point.y, width: 150, height: 34, text: 'テキストを入力', color: '#2d312b', border: '#8fba16', fontSize: 16 };
      setShapes((current) => [...current, shape]);
      setSelectedShapeId(shape.id);
      setTool('select');
      setRightTab('edit');
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drawOrigin.current = point;
    setDraftShape({ x: point.x, y: point.y, width: 1, height: 1 });
  };

  const continueDrawing = (event) => {
    if (tool !== 'rectangle' || !drawOrigin.current) return;
    const point = pointInLayer(event);
    const origin = drawOrigin.current;
    setDraftShape({
      x: Math.min(origin.x, point.x),
      y: Math.min(origin.y, point.y),
      width: Math.abs(point.x - origin.x),
      height: Math.abs(point.y - origin.y),
    });
  };

  const finishDrawing = () => {
    if (!draftShape || draftShape.width < 8 || draftShape.height < 8) {
      drawOrigin.current = null;
      setDraftShape(null);
      return;
    }
    const shape = { id: nextId(), type: 'rectangle', ...draftShape, fill: 'rgba(200, 240, 79, .28)', border: '#8fba16', color: '#2d312b', fontSize: 16 };
    setShapes((current) => [...current, shape]);
    setSelectedShapeId(shape.id);
    setDraftShape(null);
    drawOrigin.current = null;
    setTool('select');
    setRightTab('edit');
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
          <button className="icon-button" onClick={() => { setShapes((current) => current.slice(0, -1)); setSelectedShapeId(null); }} aria-label="最後の自由配置要素を取り消す"><ArrowCounterClockwise size={18} /></button>
          <span className="top-divider" />
          <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="テーマを切り替える">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
          <button className="secondary-button"><Eye size={17} /> <span>プレビュー</span></button>
          <button className="primary-button" onClick={() => setRightTab('export')}><Export size={17} /> <span>Codexへ渡す</span></button>
        </div>
      </header>

      <main className="workspace">
        <aside className={`left-panel ${mobilePanel === 'blocks' ? 'mobile-open' : ''}`}>
          <div className="panel-heading"><div><span>パーツ</span><small>クリックして追加</small></div><button className="mobile-close" onClick={() => setMobilePanel(null)}><X size={18} /></button></div>
          <div className="draw-library" aria-label="自由描画ツール">
            {DRAW_TOOLS.map((item) => {
              const Icon = item.icon;
              return <button key={item.id} className={tool === item.id ? 'active' : ''} onClick={() => selectTool(item.id)}><Icon size={18} /><span>{item.label}</span></button>;
            })}
          </div>
          <div className="library-label">セクション</div>
          <div className="block-library">
            {BLOCKS.map((block) => {
              const Icon = block.icon;
              return <button className="library-item" key={block.type} onClick={() => addBlock(block)}><span><Icon size={19} /></span><div><strong>{block.label}</strong><small>{block.desc}</small></div><Plus size={15} /></button>;
            })}
          </div>
          <div className="tip"><Sparkle size={16} weight="fill" /><p><strong>ヒント</strong>長方形はドラッグ、文字は配置したい場所をクリックします。</p></div>
        </aside>

        <section className="canvas-area">
          <div className="canvas-toolbar">
            <div className="toolbar-left">
              <div className="device-switch"><button className={platform === 'モバイル' ? 'active' : ''} onClick={() => setPlatform('モバイル')}><DeviceMobile size={16} /> モバイル</button><button className={platform === 'Web' ? 'active' : ''} onClick={() => setPlatform('Web')}><Browser size={16} /> Web</button></div>
              <div className="editor-tools">{DRAW_TOOLS.map((item) => { const Icon = item.icon; return <button key={item.id} className={tool === item.id ? 'active' : ''} onClick={() => selectTool(item.id)} title={item.label} aria-label={item.label}><Icon size={16} /></button>; })}</div>
            </div>
            <span>{sections.length} セクション / {shapes.length} 自由配置</span>
          </div>
          <div className={`device-stage ${platform === 'Web' ? 'web-stage' : ''}`}>
            <div className="device-frame">
              <div className="device-chrome">{platform === 'モバイル' ? <><span>9:41</span><i /></> : <><div><i /><i /><i /></div><span>app.local/dashboard</span></>}</div>
              <div className="screen">
                {sections.length ? sections.map((section) => <BlockPreview key={section.id} section={section} active={selectedId === section.id && !selectedShapeId} onSelect={() => { if (tool === 'select') { setSelectedId(section.id); setSelectedShapeId(null); } }} onRemove={() => removeSection(section.id)} />) : <div className="empty-canvas"><Layout size={32} /><strong>最初のパーツを追加</strong><span>左のパネルから画面を組み立てます。</span></div>}
                <button className="canvas-add" onClick={() => setMobilePanel('blocks')}><Plus size={15} weight="bold" /> セクションを追加</button>
                <div className={`free-layer ${tool !== 'select' ? 'is-drawing' : ''}`} onPointerDown={startDrawing} onPointerMove={continueDrawing} onPointerUp={finishDrawing}>
                  {shapes.map((shape) => <FreeShape key={shape.id} shape={shape} active={shape.id === selectedShapeId} tool={tool} onSelect={() => { setSelectedShapeId(shape.id); setSelectedId(null); setRightTab('edit'); }} onChange={(patch) => updateShape(shape.id, patch)} onTextChange={(text) => updateShape(shape.id, { text })} />)}
                  {draftShape && <div className="draft-rectangle" style={{ left: draftShape.x, top: draftShape.y, width: draftShape.width, height: draftShape.height }} />}
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className={`right-panel ${mobilePanel === 'settings' ? 'mobile-open' : ''}`}>
          <div className="right-tabs"><button className={rightTab === 'edit' ? 'active' : ''} onClick={() => setRightTab('edit')}>編集</button><button className={rightTab === 'export' ? 'active' : ''} onClick={() => setRightTab('export')}>Codex用</button><button className="mobile-close" onClick={() => setMobilePanel(null)}><X size={18} /></button></div>
          {rightTab === 'edit' ? (
            <div className="settings-body">
              <div className="settings-intro"><span className="selected-icon">{selectedShape?.type === 'rectangle' ? <Rectangle size={18} /> : <TextAa size={18} />}</span><div><small>選択中</small><strong>{selectedShape ? (selectedShape.type === 'rectangle' ? '長方形' : selectedShape.text) : selected?.title || '未選択'}</strong></div></div>
              <label>プロジェクト名<input value={projectName} onChange={(event) => setProjectName(event.target.value)} /></label>
              {selectedShape ? <>
                {selectedShape.type === 'text' && <label>文字<input value={selectedShape.text} onChange={(event) => updateShape(selectedShape.id, { text: event.target.value })} /></label>}
                <div className="coordinate-grid">
                  <label>X<input type="number" value={Math.round(selectedShape.x)} onChange={(event) => updateShape(selectedShape.id, { x: Number(event.target.value) })} /></label>
                  <label>Y<input type="number" value={Math.round(selectedShape.y)} onChange={(event) => updateShape(selectedShape.id, { y: Number(event.target.value) })} /></label>
                  <label>幅<input type="number" min="24" value={Math.round(selectedShape.width)} onChange={(event) => updateShape(selectedShape.id, { width: Number(event.target.value) })} /></label>
                  <label>高さ<input type="number" min="20" value={Math.round(selectedShape.height)} onChange={(event) => updateShape(selectedShape.id, { height: Number(event.target.value) })} /></label>
                </div>
                {selectedShape.type === 'rectangle' ? <div className="color-grid"><label>塗り<input type="color" value={selectedShape.fill.startsWith('#') ? selectedShape.fill : '#dff58f'} onChange={(event) => updateShape(selectedShape.id, { fill: event.target.value })} /></label><label>線<input type="color" value={selectedShape.border} onChange={(event) => updateShape(selectedShape.id, { border: event.target.value })} /></label></div> : <div className="color-grid"><label>文字色<input type="color" value={selectedShape.color} onChange={(event) => updateShape(selectedShape.id, { color: event.target.value })} /></label><label>文字サイズ<input type="number" min="8" max="72" value={selectedShape.fontSize} onChange={(event) => updateShape(selectedShape.id, { fontSize: Number(event.target.value) })} /></label></div>}
                <button className="danger-button" onClick={() => { setShapes((current) => current.filter((shape) => shape.id !== selectedShape.id)); setSelectedShapeId(null); }}><Trash size={16} /> この要素を削除</button>
              </> : selected ? <>
                <label>見出し<input value={selected.title} onChange={(event) => updateSelected('title', event.target.value)} /></label>
                <label>目的・補足<textarea rows="4" value={selected.note} onChange={(event) => updateSelected('note', event.target.value)} /></label>
                <div className="field-group"><span>余白</span><div className="segmented"><button>狭い</button><button className="active">標準</button><button>広い</button></div></div>
                <button className="danger-button" onClick={() => removeSection(selected.id)}><Trash size={16} /> このセクションを削除</button>
              </> : <div className="empty-settings"><SidebarSimple size={26} /><p>セクションまたは自由配置要素を選択してください。</p></div>}
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
