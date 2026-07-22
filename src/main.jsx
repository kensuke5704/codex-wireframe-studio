import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowCounterClockwise,
  Browser,
  Check,
  Circle,
  ClipboardText,
  Copy,
  Cursor,
  DeviceMobile,
  DownloadSimple,
  Export,
  GearSix,
  Layout,
  Moon,
  Rectangle,
  SidebarSimple,
  Sparkle,
  Sun,
  TextAa,
  TextT,
  Trash,
  X,
} from '@phosphor-icons/react';
import './styles.css';

const nextId = () => Date.now() + Math.floor(Math.random() * 1000);

const DRAW_TOOLS = [
  { id: 'select', label: '選択', description: '移動とサイズ変更', icon: Cursor },
  { id: 'rectangle', label: '長方形', description: 'ドラッグして描画', icon: Rectangle },
  { id: 'ellipse', label: '楕円', description: 'ドラッグして描画', icon: Circle },
  { id: 'text', label: '文字', description: 'クリックして配置', icon: TextT },
];

function FreeShape({ shape, active, tool, onSelect, onChange, onMove, onInteractionEnd, onTextChange }) {
  const interaction = useRef(null);

  const beginMove = (event) => {
    if (tool !== 'select') return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    interaction.current = {
      mode: 'move', startX: event.clientX, startY: event.clientY, x: shape.x, y: shape.y,
    };
    onSelect();
  };

  const beginResize = (event) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    interaction.current = {
      mode: 'resize', startX: event.clientX, startY: event.clientY, width: shape.width, height: shape.height,
    };
  };

  const interact = (event) => {
    const current = interaction.current;
    if (!current) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (current.mode === 'move') {
      onMove({ x: Math.max(0, current.x + dx), y: Math.max(0, current.y + dy) });
    } else {
      onChange({ width: Math.max(24, Math.round((current.width + dx) / 8) * 8), height: Math.max(20, Math.round((current.height + dy) / 8) * 8) });
    }
  };

  return (
    <div
      className={`free-shape free-${shape.type} ${active ? 'is-active' : ''}`}
      style={{
        left: shape.x,
        top: shape.y,
        width: shape.width,
        height: shape.height,
        background: shape.type === 'text' ? 'transparent' : shape.fill,
        borderColor: shape.border,
        color: shape.color,
        fontSize: shape.fontSize,
      }}
      onPointerDown={beginMove}
      onPointerMove={interact}
      onPointerUp={() => { interaction.current = null; onInteractionEnd(); }}
      onClick={(event) => { if (tool === 'select') { event.stopPropagation(); onSelect(); } }}
      aria-label={shape.type === 'text' ? `自由配置テキスト: ${shape.text}` : `自由配置の${shape.type === 'ellipse' ? '楕円' : '長方形'}`}
    >
      {shape.type === 'text' && (
        <span
          contentEditable={active && tool === 'select'}
          suppressContentEditableWarning
          onPointerDown={(event) => { if (active) event.stopPropagation(); }}
          onBlur={(event) => onTextChange(event.currentTarget.textContent || 'テキスト')}
        >{shape.text}</span>
      )}
      {active && tool === 'select' && (
        <button
          className="resize-handle"
          onPointerDown={beginResize}
          onPointerMove={interact}
          onPointerUp={() => { interaction.current = null; onInteractionEnd(); }}
          aria-label="サイズを変更"
        />
      )}
    </div>
  );
}

function App() {
  const [projectName, setProjectName] = useState('新しいワイヤーフレーム');
  const [platform, setPlatform] = useState('モバイル');
  const [theme, setTheme] = useState('light');
  const [rightTab, setRightTab] = useState('edit');
  const [copied, setCopied] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(null);
  const [tool, setTool] = useState('select');
  const [shapes, setShapes] = useState([]);
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [draftShape, setDraftShape] = useState(null);
  const [clipboardShape, setClipboardShape] = useState(null);
  const [snapGuides, setSnapGuides] = useState({ x: null, y: null });
  const drawOrigin = useRef(null);
  const selectedShape = shapes.find((shape) => shape.id === selectedShapeId);

  const prompt = useMemo(() => {
    const elements = shapes.length
      ? shapes.map((shape, index) => {
          const name = shape.type === 'text' ? `文字「${shape.text}」` : shape.type === 'ellipse' ? '楕円' : '長方形';
          return `${index + 1}. ${name}: x ${Math.round(shape.x)}, y ${Math.round(shape.y)}, 幅 ${Math.round(shape.width)}, 高さ ${Math.round(shape.height)}`;
        }).join('\n')
      : 'なし';
    return `「${projectName}」の${platform}向け画面を実装してください。\n\nワイヤーフレーム要素:\n${elements}\n\n要件:\n- 図形と文字の位置関係、サイズ、重なり順を保つ\n- キーボード操作と十分なカラーコントラストを用意\n- モバイルとデスクトップで自然に調整する\n- 図形の意図を推測し、実用的なUIコンポーネントへ変換する`;
  }, [shapes, projectName, platform]);

  useEffect(() => {
    const handleKeyboard = (event) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === 'c' && selectedShape) {
        event.preventDefault();
        const copied = { ...selectedShape };
        setClipboardShape(copied);
        navigator.clipboard?.writeText(`FRAMEKIT_SHAPE:${JSON.stringify(copied)}`).catch(() => {});
        return;
      }
      if (modifier && event.key.toLowerCase() === 'v' && clipboardShape) {
        event.preventDefault();
        const pasted = { ...clipboardShape, id: nextId(), x: clipboardShape.x + 12, y: clipboardShape.y + 12 };
        setShapes((current) => [...current, pasted]);
        setSelectedShapeId(pasted.id);
        return;
      }
      if (!selectedShapeId) return;
      if (event.key === 'Delete' || event.key === 'Backspace') {
        setShapes((current) => current.filter((shape) => shape.id !== selectedShapeId));
        setSelectedShapeId(null);
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [selectedShapeId, selectedShape, clipboardShape]);

  const updateShape = (id, patch) => {
    setShapes((current) => current.map((shape) => shape.id === id ? { ...shape, ...patch } : shape));
  };

  const moveShapeWithSnap = (shape, proposed) => {
    const threshold = 6;
    const others = shapes.filter((item) => item.id !== shape.id);
    let x = proposed.x;
    let y = proposed.y;
    let guideX = null;
    let guideY = null;
    let bestX = threshold + 1;
    let bestY = threshold + 1;
    const movingX = [{ value: x, offset: 0 }, { value: x + shape.width / 2, offset: shape.width / 2 }, { value: x + shape.width, offset: shape.width }];
    const movingY = [{ value: y, offset: 0 }, { value: y + shape.height / 2, offset: shape.height / 2 }, { value: y + shape.height, offset: shape.height }];

    others.forEach((item) => {
      const anchorsX = [item.x, item.x + item.width / 2, item.x + item.width];
      const anchorsY = [item.y, item.y + item.height / 2, item.y + item.height];
      movingX.forEach((moving) => anchorsX.forEach((anchor) => {
        const distance = Math.abs(moving.value - anchor);
        if (distance < bestX && distance <= threshold) {
          bestX = distance;
          x = anchor - moving.offset;
          guideX = anchor;
        }
      }));
      movingY.forEach((moving) => anchorsY.forEach((anchor) => {
        const distance = Math.abs(moving.value - anchor);
        if (distance < bestY && distance <= threshold) {
          bestY = distance;
          y = anchor - moving.offset;
          guideY = anchor;
        }
      }));
    });

    if (guideX === null) x = Math.round(x / 8) * 8;
    if (guideY === null) y = Math.round(y / 8) * 8;
    updateShape(shape.id, { x: Math.max(0, x), y: Math.max(0, y) });
    setSnapGuides({ x: guideX, y: guideY });
  };

  const copySelectedShape = () => {
    if (!selectedShape) return;
    const copied = { ...selectedShape };
    setClipboardShape(copied);
    navigator.clipboard?.writeText(`FRAMEKIT_SHAPE:${JSON.stringify(copied)}`).catch(() => {});
  };

  const pasteShape = () => {
    if (!clipboardShape) return;
    const pasted = { ...clipboardShape, id: nextId(), x: clipboardShape.x + 12, y: clipboardShape.y + 12 };
    setShapes((current) => [...current, pasted]);
    setSelectedShapeId(pasted.id);
  };

  const selectTool = (nextTool) => {
    setTool(nextTool);
    if (nextTool !== 'select') setSelectedShapeId(null);
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
      const shape = {
        id: nextId(), type: 'text', x: point.x, y: point.y, width: 150, height: 34,
        text: 'テキストを入力', color: '#2d312b', border: '#8fba16', fontSize: 16,
      };
      setShapes((current) => [...current, shape]);
      setSelectedShapeId(shape.id);
      setTool('select');
      setRightTab('edit');
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drawOrigin.current = point;
    setDraftShape({ type: tool, x: point.x, y: point.y, width: 1, height: 1 });
  };

  const continueDrawing = (event) => {
    if (!['rectangle', 'ellipse'].includes(tool) || !drawOrigin.current) return;
    const point = pointInLayer(event);
    const origin = drawOrigin.current;
    setDraftShape({
      type: tool,
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
    const shape = {
      id: nextId(), ...draftShape, fill: '#dff58f', border: '#8fba16', color: '#2d312b', fontSize: 16,
    };
    setShapes((current) => [...current, shape]);
    setSelectedShapeId(shape.id);
    setDraftShape(null);
    drawOrigin.current = null;
    setTool('select');
    setRightTab('edit');
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
          <button className="icon-button" onClick={() => { setShapes((current) => current.slice(0, -1)); setSelectedShapeId(null); }} aria-label="最後の図形を取り消す"><ArrowCounterClockwise size={18} /></button>
          <span className="top-divider" />
          <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="テーマを切り替える">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
          <button className="primary-button" onClick={() => setRightTab('export')}><Export size={17} /> <span>Codexへ渡す</span></button>
        </div>
      </header>

      <main className="workspace">
        <aside className={`left-panel ${mobilePanel === 'blocks' ? 'mobile-open' : ''}`}>
          <div className="panel-heading"><div><span>描画ツール</span><small>キャンバスへ直接描画</small></div><button className="mobile-close" onClick={() => setMobilePanel(null)}><X size={18} /></button></div>
          <div className="shape-tool-list">
            {DRAW_TOOLS.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} className={tool === item.id ? 'active' : ''} onClick={() => selectTool(item.id)}>
                  <span><Icon size={19} /></span>
                  <div><strong>{item.label}</strong><small>{item.description}</small></div>
                </button>
              );
            })}
          </div>
          <div className="clipboard-actions">
            <button onClick={copySelectedShape} disabled={!selectedShape}><Copy size={16} /> コピー <kbd>⌘C</kbd></button>
            <button onClick={pasteShape} disabled={!clipboardShape}><ClipboardText size={16} /> ペースト <kbd>⌘V</kbd></button>
          </div>
          <div className="tip"><Sparkle size={16} weight="fill" /><p><strong>描き始める</strong>長方形と楕円はドラッグ、文字は配置したい場所をクリックします。</p></div>
        </aside>

        <section className="canvas-area">
          <div className="canvas-toolbar">
            <div className="toolbar-left">
              <div className="device-switch"><button className={platform === 'モバイル' ? 'active' : ''} onClick={() => setPlatform('モバイル')}><DeviceMobile size={16} /> モバイル</button><button className={platform === 'Web' ? 'active' : ''} onClick={() => setPlatform('Web')}><Browser size={16} /> Web</button></div>
              <div className="editor-tools">{DRAW_TOOLS.map((item) => { const Icon = item.icon; return <button key={item.id} className={tool === item.id ? 'active' : ''} onClick={() => selectTool(item.id)} title={item.label} aria-label={item.label}><Icon size={16} /></button>; })}</div>
              <div className="clipboard-tools"><button onClick={copySelectedShape} disabled={!selectedShape} aria-label="図形をコピー"><Copy size={16} /></button><button onClick={pasteShape} disabled={!clipboardShape} aria-label="図形をペースト"><ClipboardText size={16} /></button></div>
            </div>
            <span>{shapes.length} 要素</span>
          </div>
          <div className={`device-stage ${platform === 'Web' ? 'web-stage' : ''}`}>
            <div className="device-frame">
              <div className="device-chrome">{platform === 'モバイル' ? <><span>9:41</span><i /></> : <><div><i /><i /><i /></div><span>app.local</span></>}</div>
              <div className="screen blank-screen" onPointerDown={() => { if (tool === 'select') setSelectedShapeId(null); }}>
                {!shapes.length && <div className="canvas-empty-hint"><Rectangle size={28} /><strong>最初の図形を追加</strong><span>長方形、楕円、文字を使って描き始めます。</span></div>}
                <div className={`free-layer ${tool !== 'select' ? 'is-drawing' : ''}`} onPointerDown={startDrawing} onPointerMove={continueDrawing} onPointerUp={finishDrawing}>
                  {shapes.map((shape) => <FreeShape key={shape.id} shape={shape} active={shape.id === selectedShapeId} tool={tool} onSelect={() => { setSelectedShapeId(shape.id); setRightTab('edit'); }} onChange={(patch) => updateShape(shape.id, patch)} onMove={(patch) => moveShapeWithSnap(shape, patch)} onInteractionEnd={() => setSnapGuides({ x: null, y: null })} onTextChange={(text) => updateShape(shape.id, { text })} />)}
                  {draftShape && <div className={`draft-rectangle ${draftShape.type === 'ellipse' ? 'is-ellipse' : ''}`} style={{ left: draftShape.x, top: draftShape.y, width: draftShape.width, height: draftShape.height }} />}
                  {snapGuides.x !== null && <div className="snap-guide vertical" style={{ left: snapGuides.x }} />}
                  {snapGuides.y !== null && <div className="snap-guide horizontal" style={{ top: snapGuides.y }} />}
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className={`right-panel ${mobilePanel === 'settings' ? 'mobile-open' : ''}`}>
          <div className="right-tabs"><button className={rightTab === 'edit' ? 'active' : ''} onClick={() => setRightTab('edit')}>編集</button><button className={rightTab === 'export' ? 'active' : ''} onClick={() => setRightTab('export')}>Codex用</button><button className="mobile-close" onClick={() => setMobilePanel(null)}><X size={18} /></button></div>
          {rightTab === 'edit' ? (
            <div className="settings-body">
              <div className="settings-intro"><span className="selected-icon">{selectedShape?.type === 'text' ? <TextAa size={18} /> : selectedShape?.type === 'ellipse' ? <Circle size={18} /> : <Rectangle size={18} />}</span><div><small>選択中</small><strong>{selectedShape ? (selectedShape.type === 'text' ? selectedShape.text : selectedShape.type === 'ellipse' ? '楕円' : '長方形') : '未選択'}</strong></div></div>
              <label>プロジェクト名<input value={projectName} onChange={(event) => setProjectName(event.target.value)} /></label>
              {selectedShape ? <>
                {selectedShape.type === 'text' && <label>文字<input value={selectedShape.text} onChange={(event) => updateShape(selectedShape.id, { text: event.target.value })} /></label>}
                <div className="coordinate-grid">
                  <label>X<input type="number" value={Math.round(selectedShape.x)} onChange={(event) => updateShape(selectedShape.id, { x: Number(event.target.value) })} /></label>
                  <label>Y<input type="number" value={Math.round(selectedShape.y)} onChange={(event) => updateShape(selectedShape.id, { y: Number(event.target.value) })} /></label>
                  <label>幅<input type="number" min="24" value={Math.round(selectedShape.width)} onChange={(event) => updateShape(selectedShape.id, { width: Number(event.target.value) })} /></label>
                  <label>高さ<input type="number" min="20" value={Math.round(selectedShape.height)} onChange={(event) => updateShape(selectedShape.id, { height: Number(event.target.value) })} /></label>
                </div>
                {selectedShape.type === 'text' ? <div className="color-grid"><label>文字色<input type="color" value={selectedShape.color} onChange={(event) => updateShape(selectedShape.id, { color: event.target.value })} /></label><label>文字サイズ<input type="number" min="8" max="72" value={selectedShape.fontSize} onChange={(event) => updateShape(selectedShape.id, { fontSize: Number(event.target.value) })} /></label></div> : <div className="color-grid"><label>塗り<input type="color" value={selectedShape.fill} onChange={(event) => updateShape(selectedShape.id, { fill: event.target.value })} /></label><label>線<input type="color" value={selectedShape.border} onChange={(event) => updateShape(selectedShape.id, { border: event.target.value })} /></label></div>}
                <button className="danger-button" onClick={() => { setShapes((current) => current.filter((shape) => shape.id !== selectedShape.id)); setSelectedShapeId(null); }}><Trash size={16} /> この要素を削除</button>
              </> : <div className="empty-settings"><SidebarSimple size={26} /><p>キャンバスへ図形を描き、選択すると詳細を編集できます。</p></div>}
            </div>
          ) : (
            <div className="export-body">
              <div className="export-heading"><span><Sparkle size={17} weight="fill" /></span><div><strong>Codex用プロンプト</strong><small>図形の配置から自動生成</small></div></div>
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
        <button onClick={() => setMobilePanel('blocks')}><Rectangle size={19} /><span>描画</span></button>
        <button onClick={() => setMobilePanel('settings')}><GearSix size={19} /><span>編集</span></button>
        <button onClick={() => { setRightTab('export'); setMobilePanel('settings'); }}><Export size={19} /><span>Codex</span></button>
      </nav>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
