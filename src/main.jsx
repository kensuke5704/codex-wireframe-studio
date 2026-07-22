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
  LineSegment,
  Plus,
  Rectangle,
  SidebarSimple,
  Sparkle,
  TextAa,
  TextT,
  Trash,
  X,
} from '@phosphor-icons/react';
import './styles.css';

const nextId = () => Date.now() + Math.floor(Math.random() * 1000);
const createPage = (name = 'ページ 1') => ({ id: nextId(), name, platform: 'モバイル', shapes: [], regions: [] });
const createProject = (name = '新しいワイヤーフレーム') => {
  const page = createPage();
  return { id: nextId(), name, pages: [page], activePageId: page.id };
};

const loadWorkspace = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('framekit-project'));
    if (saved?.projects?.length) return saved;
    if (saved?.pages?.length) {
      const project = { id: nextId(), name: saved.projectName || '新しいワイヤーフレーム', pages: saved.pages, activePageId: saved.activePageId || saved.pages[0].id };
      return { projects: [project], activeProjectId: project.id };
    }
  } catch {
    // 壊れた保存データは無視して、新しいプロジェクトを開く。
  }
  const project = createProject();
  return { projects: [project], activeProjectId: project.id };
};

const DRAW_TOOLS = [
  { id: 'select', label: '選択', description: '移動とサイズ変更', icon: Cursor },
  { id: 'rectangle', label: '長方形', description: 'ドラッグして描画', icon: Rectangle },
  { id: 'ellipse', label: '楕円', description: 'ドラッグして描画', icon: Circle },
  { id: 'line', label: '直線', description: '始点から終点へ描画', icon: LineSegment },
  { id: 'text', label: '文字', description: 'クリックして配置', icon: TextT },
];

function FreeShape({ shape, active, selectedCount, tool, zoom, onMoveStart, onContextMenu, onChange, onMove, onInteractionEnd, onTextChange }) {
  const interaction = useRef(null);

  const beginMove = (event) => {
    if (tool !== 'select' || event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    interaction.current = {
      mode: 'move', startX: event.clientX, startY: event.clientY, x: shape.x, y: shape.y,
    };
    onMoveStart(event);
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
    const dx = (event.clientX - current.startX) / zoom;
    const dy = (event.clientY - current.startY) / zoom;
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
        background: shape.type === 'text' || shape.type === 'line' || shape.fillEnabled === false ? 'transparent' : shape.fill,
        borderColor: shape.type === 'text' ? 'transparent' : shape.border,
        color: shape.color,
        fontSize: shape.fontSize,
        transform: shape.type === 'line' ? `rotate(${shape.rotation}deg)` : undefined,
        '--line-color': shape.border,
        '--line-width': `${shape.strokeWidth || 2}px`,
      }}
      onPointerDown={beginMove}
      onPointerMove={interact}
      onPointerUp={() => { interaction.current = null; onInteractionEnd(); }}
      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); onContextMenu(event); }}
      onClick={(event) => { if (tool === 'select') event.stopPropagation(); }}
      aria-label={shape.type === 'text' ? `自由配置テキスト: ${shape.text}` : `自由配置の${shape.type === 'ellipse' ? '楕円' : shape.type === 'line' ? '直線' : '長方形'}`}
    >
      {shape.type === 'text' && (
        <span
          style={{ color: shape.color }}
          contentEditable={active && selectedCount === 1 && tool === 'select'}
          suppressContentEditableWarning
          onPointerDown={(event) => { if (active && selectedCount === 1) event.stopPropagation(); }}
          onBlur={(event) => onTextChange(event.currentTarget.textContent || 'テキスト')}
        >{shape.text}</span>
      )}
      {active && selectedCount === 1 && tool === 'select' && (
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
  const initialWorkspace = useRef(loadWorkspace()).current;
  const [projects, setProjects] = useState(initialWorkspace.projects);
  const [activeProjectId, setActiveProjectId] = useState(initialWorkspace.activeProjectId);
  const [rightTab, setRightTab] = useState('edit');
  const [copied, setCopied] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(null);
  const [tool, setTool] = useState('select');
  const [selectedShapeIds, setSelectedShapeIds] = useState([]);
  const [draftShape, setDraftShape] = useState(null);
  const [clipboardShapes, setClipboardShapes] = useState([]);
  const [snapGuides, setSnapGuides] = useState({ x: null, y: null });
  const [selectionBox, setSelectionBox] = useState(null);
  const [selectionArea, setSelectionArea] = useState(null);
  const [selectedRegionIds, setSelectedRegionIds] = useState([]);
  const [layerMenu, setLayerMenu] = useState(null);
  const [zoom, setZoom] = useState(1);
  const drawOrigin = useRef(null);
  const selectionOrigin = useRef(null);
  const groupMove = useRef(null);
  const stageRef = useRef(null);
  const gestureZoomStart = useRef(1);
  const activeProject = projects.find((project) => project.id === activeProjectId) || projects[0];
  const projectName = activeProject.name;
  const pages = activeProject.pages;
  const activePageId = activeProject.activePageId;
  const setProjectName = (name) => setProjects((current) => current.map((project) => project.id === activeProjectId ? { ...project, name } : project));
  const setPages = (update) => setProjects((current) => current.map((project) => {
    if (project.id !== activeProjectId) return project;
    return { ...project, pages: typeof update === 'function' ? update(project.pages) : update };
  }));
  const setActivePageId = (pageId) => setProjects((current) => current.map((project) => project.id === activeProjectId ? { ...project, activePageId: pageId } : project));
  const activePage = pages.find((page) => page.id === activePageId) || pages[0];
  const shapes = activePage.shapes;
  const regions = activePage.regions;
  const platform = activePage.platform;
  const updateActivePage = (field, update) => {
    setPages((current) => current.map((page) => {
      if (page.id !== activePageId) return page;
      const value = typeof update === 'function' ? update(page[field]) : update;
      return { ...page, [field]: value };
    }));
  };
  const setShapes = (update) => updateActivePage('shapes', update);
  const setRegions = (update) => updateActivePage('regions', update);
  const setPlatform = (value) => updateActivePage('platform', value);
  const selectedShapes = shapes.filter((shape) => selectedShapeIds.includes(shape.id));
  const selectedShape = selectedShapes.length === 1 ? selectedShapes[0] : null;
  const selectedRegions = regions.filter((region) => selectedRegionIds.includes(region.id));
  const selectedRegion = selectedRegions.length === 1 ? selectedRegions[0] : null;
  const selectionBounds = useMemo(() => {
    if (selectedShapes.length < 2) return null;
    const left = Math.min(...selectedShapes.map((shape) => shape.x));
    const top = Math.min(...selectedShapes.map((shape) => shape.y));
    const right = Math.max(...selectedShapes.map((shape) => shape.x + shape.width));
    const bottom = Math.max(...selectedShapes.map((shape) => shape.y + shape.height));
    return { x: left, y: top, width: right - left, height: bottom - top };
  }, [selectedShapes]);

  const prompt = useMemo(() => {
    const pageDescriptions = pages.map((page, pageIndex) => {
      const elements = page.shapes.length
      ? page.shapes.map((shape, index) => {
          const name = shape.type === 'text' ? `文字「${shape.text}」` : shape.type === 'ellipse' ? '楕円' : shape.type === 'line' ? '直線' : '長方形';
          const layer = `重ね順 ${index + 1}/${page.shapes.length}（1が最背面）`;
          if (shape.type === 'text') return `${index + 1}. ${name}: x ${Math.round(shape.x)}, y ${Math.round(shape.y)}, 文字サイズ ${Math.round(shape.fontSize)}px, ${layer}`;
          const rotation = shape.type === 'line' ? `, 角度 ${Math.round(shape.rotation)}度` : '';
          return `${index + 1}. ${name}: x ${Math.round(shape.x)}, y ${Math.round(shape.y)}, 幅 ${Math.round(shape.width)}, 高さ ${Math.round(shape.height)}${rotation}, ${layer}`;
        }).join('\n')
      : 'なし';
      const intentions = page.regions.length
      ? page.regions.map((region, index) => `${index + 1}. 範囲 x ${Math.round(region.x)}, y ${Math.round(region.y)}, 幅 ${Math.round(region.width)}, 高さ ${Math.round(region.height)}: ${region.note || '説明未入力'}`).join('\n')
      : 'なし';
      return `ページ ${pageIndex + 1}: ${page.name}（${page.platform}）\n\nワイヤーフレーム要素:\n${elements}\n\n範囲ごとの設計意図:\n${intentions}`;
    }).join('\n\n---\n\n');
    return `「${projectName}」の複数ページ構成を実装してください。\n\n${pageDescriptions}\n\n共通要件:\n- ページ間の遷移を実装する\n- 図形と文字の位置関係、サイズ、重なり順を保つ\n- 範囲ごとの設計意図を実装へ反映する\n- キーボード操作と十分なカラーコントラストを用意\n- モバイルとデスクトップで自然に調整する`;
  }, [pages, projectName]);

  useEffect(() => {
    localStorage.setItem('framekit-project', JSON.stringify({ projects, activeProjectId }));
  }, [projects, activeProjectId]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const clampZoom = (value) => Math.min(2, Math.max(.5, value));
    const handleWheel = (event) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      setZoom((current) => clampZoom(current * Math.exp(-event.deltaY * .01)));
    };
    const handleGestureStart = (event) => {
      event.preventDefault();
      gestureZoomStart.current = zoom;
    };
    const handleGestureChange = (event) => {
      event.preventDefault();
      setZoom(clampZoom(gestureZoomStart.current * event.scale));
    };
    stage.addEventListener('wheel', handleWheel, { passive: false });
    stage.addEventListener('gesturestart', handleGestureStart, { passive: false });
    stage.addEventListener('gesturechange', handleGestureChange, { passive: false });
    return () => {
      stage.removeEventListener('wheel', handleWheel);
      stage.removeEventListener('gesturestart', handleGestureStart);
      stage.removeEventListener('gesturechange', handleGestureChange);
    };
  }, [zoom]);

  useEffect(() => {
    if (!layerMenu) return undefined;
    const dismissLayerMenu = (event) => {
      if (event.target instanceof Element && event.target.closest('.layer-menu')) return;
      setLayerMenu(null);
    };
    const dismissWithKeyboard = (event) => {
      if (event.key === 'Escape') setLayerMenu(null);
    };
    document.addEventListener('pointerdown', dismissLayerMenu);
    document.addEventListener('keydown', dismissWithKeyboard);
    return () => {
      document.removeEventListener('pointerdown', dismissLayerMenu);
      document.removeEventListener('keydown', dismissWithKeyboard);
    };
  }, [layerMenu]);

  useEffect(() => {
    const handleKeyboard = (event) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === 'c' && selectedShapes.length) {
        event.preventDefault();
        const copied = selectedShapes.map((shape) => ({ ...shape }));
        setClipboardShapes(copied);
        navigator.clipboard?.writeText(`FRAMEKIT_SHAPES:${JSON.stringify(copied)}`).catch(() => {});
        return;
      }
      if (modifier && event.key.toLowerCase() === 'v' && clipboardShapes.length) {
        event.preventDefault();
        const remappedGroups = new Map();
        const pasted = clipboardShapes.map((shape, index) => {
          if (shape.groupId && !remappedGroups.has(shape.groupId)) remappedGroups.set(shape.groupId, `group-${nextId()}-${index}`);
          return { ...shape, id: nextId() + index, groupId: shape.groupId ? remappedGroups.get(shape.groupId) : null, x: shape.x + 12, y: shape.y + 12 };
        });
        setShapes((current) => [...current, ...pasted]);
        setSelectedShapeIds(pasted.map((shape) => shape.id));
        return;
      }
      if (!selectedShapeIds.length) return;
      if (event.key === 'Delete' || event.key === 'Backspace') {
        setShapes((current) => current.filter((shape) => !selectedShapeIds.includes(shape.id)));
        setSelectedShapeIds([]);
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [selectedShapeIds, selectedShapes, clipboardShapes]);

  const updateShape = (id, patch) => {
    setShapes((current) => current.map((shape) => shape.id === id ? { ...shape, ...patch } : shape));
  };

  const updateRegion = (id, patch) => {
    setRegions((current) => current.map((region) => region.id === id ? { ...region, ...patch } : region));
  };

  const openLayerMenu = (shape, event) => {
    setSelectedShapeIds([shape.id]);
    setSelectedRegionIds([]);
    setLayerMenu({ kind: 'shape', shapeId: shape.id, x: event.clientX, y: event.clientY });
  };

  const selectRegion = (regionId, event) => {
    const additive = event.shiftKey || event.metaKey || event.ctrlKey;
    setSelectedRegionIds((current) => additive
      ? current.includes(regionId) ? current.filter((id) => id !== regionId) : [...current, regionId]
      : [regionId]);
    setSelectedShapeIds([]);
    setRightTab('edit');
  };

  const openRegionMenu = (regionId, event) => {
    event.preventDefault();
    event.stopPropagation();
    const ids = selectedRegionIds.includes(regionId) ? selectedRegionIds : [regionId];
    setSelectedRegionIds(ids);
    setSelectedShapeIds([]);
    setLayerMenu({ kind: 'region', regionIds: ids, x: event.clientX, y: event.clientY });
  };

  const deleteSelectedRegions = (ids = selectedRegionIds) => {
    setRegions((current) => current.filter((region) => !ids.includes(region.id)));
    setSelectedRegionIds([]);
    setLayerMenu(null);
  };

  const moveShapeLayer = (shapeId, direction) => {
    setShapes((current) => {
      const target = current.find((shape) => shape.id === shapeId);
      if (!target) return current;
      const rest = current.filter((shape) => shape.id !== shapeId);
      return direction === 'front' ? [...rest, target] : [target, ...rest];
    });
    setLayerMenu(null);
  };

  const startShapeMove = (shape, event) => {
    let ids;
    const groupIds = shape.groupId ? shapes.filter((item) => item.groupId === shape.groupId).map((item) => item.id) : [shape.id];
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      ids = groupIds.every((id) => selectedShapeIds.includes(id))
        ? selectedShapeIds.filter((id) => !groupIds.includes(id))
        : [...new Set([...selectedShapeIds, ...groupIds])];
      if (!ids.includes(shape.id)) ids = [shape.id];
    } else {
      ids = selectedShapeIds.includes(shape.id) ? selectedShapeIds : groupIds;
    }
    setSelectedShapeIds(ids);
    setSelectionArea(null);
    setSelectedRegionIds([]);
    setRightTab('edit');
    groupMove.current = {
      sourceId: shape.id,
      sourceX: shape.x,
      sourceY: shape.y,
      ids,
      origins: new Map(shapes.filter((item) => ids.includes(item.id)).map((item) => [item.id, { x: item.x, y: item.y }])),
    };
  };

  const moveSelectionWithSnap = (shape, proposed) => {
    const drag = groupMove.current;
    if (!drag) return;
    const threshold = 6;
    const others = shapes.filter((item) => !drag.ids.includes(item.id));
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
    const deltaX = Math.max(0, x) - drag.sourceX;
    const deltaY = Math.max(0, y) - drag.sourceY;
    setShapes((current) => current.map((item) => {
      const origin = drag.origins.get(item.id);
      return origin ? { ...item, x: Math.max(0, origin.x + deltaX), y: Math.max(0, origin.y + deltaY) } : item;
    }));
    setSnapGuides({ x: guideX, y: guideY });
  };

  const copySelectedShape = () => {
    if (!selectedShapes.length) return;
    const copied = selectedShapes.map((shape) => ({ ...shape }));
    setClipboardShapes(copied);
    navigator.clipboard?.writeText(`FRAMEKIT_SHAPES:${JSON.stringify(copied)}`).catch(() => {});
  };

  const pasteShape = () => {
    if (!clipboardShapes.length) return;
    const remappedGroups = new Map();
    const pasted = clipboardShapes.map((shape, index) => {
      if (shape.groupId && !remappedGroups.has(shape.groupId)) remappedGroups.set(shape.groupId, `group-${nextId()}-${index}`);
      return { ...shape, id: nextId() + index, groupId: shape.groupId ? remappedGroups.get(shape.groupId) : null, x: shape.x + 12, y: shape.y + 12 };
    });
    setShapes((current) => [...current, ...pasted]);
    setSelectedShapeIds(pasted.map((shape) => shape.id));
  };

  const groupSelectedShapes = () => {
    if (selectedShapeIds.length < 2) return;
    const groupId = `group-${nextId()}`;
    setShapes((current) => current.map((shape) => selectedShapeIds.includes(shape.id) ? { ...shape, groupId } : shape));
  };

  const ungroupSelectedShapes = () => {
    setShapes((current) => current.map((shape) => selectedShapeIds.includes(shape.id) ? { ...shape, groupId: null } : shape));
  };

  const alignSelectedShapes = (mode) => {
    if (selectedShapes.length < 2) return;
    const left = Math.min(...selectedShapes.map((shape) => shape.x));
    const right = Math.max(...selectedShapes.map((shape) => shape.x + shape.width));
    const center = (left + right) / 2;
    setShapes((current) => current.map((shape) => {
      if (!selectedShapeIds.includes(shape.id)) return shape;
      if (mode === 'left') return { ...shape, x: left };
      if (mode === 'right') return { ...shape, x: right - shape.width };
      return { ...shape, x: center - shape.width / 2 };
    }));
  };

  const selectTool = (nextTool) => {
    setTool(nextTool);
    if (nextTool !== 'select') {
      setSelectedShapeIds([]);
      setSelectedRegionIds([]);
      setSelectionArea(null);
    }
    setMobilePanel(null);
  };

  const pointInLayer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / zoom, y: (event.clientY - rect.top) / zoom };
  };

  const startDrawing = (event) => {
    if (tool === 'select') {
      setSelectedShapeIds([]);
      return;
    }
    const point = pointInLayer(event);
    if (tool === 'text') {
      const shape = {
        id: nextId(), type: 'text', x: point.x, y: point.y, width: 150, height: 34,
        text: 'テキストを入力', color: '#20221e', border: '#20221e', fontSize: 16,
      };
      setShapes((current) => [...current, shape]);
      setSelectedShapeIds([shape.id]);
      setTool('select');
      setRightTab('edit');
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drawOrigin.current = point;
    setDraftShape({ type: tool, x: point.x, y: point.y, width: 1, height: 1 });
  };

  const continueDrawing = (event) => {
    if (!['rectangle', 'ellipse', 'line'].includes(tool) || !drawOrigin.current) return;
    const point = pointInLayer(event);
    const origin = drawOrigin.current;
    if (tool === 'line') {
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      const rawRotation = Math.atan2(dy, dx) * 180 / Math.PI;
      const rotation = event.shiftKey ? Math.round(rawRotation / 45) * 45 : rawRotation;
      setDraftShape({ type: 'line', x: origin.x, y: origin.y - 7, width: Math.max(8, Math.hypot(dx, dy)), height: 14, rotation });
    } else {
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      const constrainedSize = event.shiftKey ? Math.max(Math.abs(dx), Math.abs(dy)) : null;
      setDraftShape({
        type: tool,
        x: constrainedSize === null ? Math.min(origin.x, point.x) : origin.x + (dx < 0 ? -constrainedSize : 0),
        y: constrainedSize === null ? Math.min(origin.y, point.y) : origin.y + (dy < 0 ? -constrainedSize : 0),
        width: constrainedSize ?? Math.abs(dx),
        height: constrainedSize ?? Math.abs(dy),
      });
    }
  };

  const finishDrawing = () => {
    if (!draftShape || draftShape.width < 8 || draftShape.height < 8) {
      drawOrigin.current = null;
      setDraftShape(null);
      return;
    }
    const shape = {
      id: nextId(), ...draftShape, fill: '#ffffff', fillEnabled: false, border: '#20221e', color: '#20221e', fontSize: 16, strokeWidth: 1,
    };
    setShapes((current) => [...current, shape]);
    setSelectedShapeIds([shape.id]);
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

  const pointInScreen = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / zoom, y: (event.clientY - rect.top) / zoom };
  };

  const beginRangeSelection = (event) => {
    if (tool !== 'select' || event.button !== 0) return;
    setLayerMenu(null);
    const point = pointInScreen(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    selectionOrigin.current = { ...point, additive: event.shiftKey || event.metaKey || event.ctrlKey };
    setSelectionBox({ x: point.x, y: point.y, width: 0, height: 0 });
    setSelectedRegionIds([]);
    if (!selectionOrigin.current.additive) setSelectedShapeIds([]);
  };

  const continueRangeSelection = (event) => {
    if (!selectionOrigin.current) return;
    const point = pointInScreen(event);
    const origin = selectionOrigin.current;
    setSelectionBox({
      x: Math.min(origin.x, point.x),
      y: Math.min(origin.y, point.y),
      width: Math.abs(point.x - origin.x),
      height: Math.abs(point.y - origin.y),
    });
  };

  const finishRangeSelection = () => {
    const origin = selectionOrigin.current;
    if (!origin || !selectionBox) return;
    selectionOrigin.current = null;
    if (selectionBox.width < 4 && selectionBox.height < 4) {
      setSelectedShapeIds([]);
      setSelectionArea(null);
      setSelectionBox(null);
      return;
    }
    const included = shapes.filter((shape) => (
      shape.x < selectionBox.x + selectionBox.width &&
      shape.x + shape.width > selectionBox.x &&
      shape.y < selectionBox.y + selectionBox.height &&
      shape.y + shape.height > selectionBox.y
    )).map((shape) => shape.id);
    setSelectedShapeIds((current) => origin.additive ? [...new Set([...current, ...included])] : included);
    setSelectionArea(selectionBox);
    setSelectedRegionIds([]);
    setRightTab('edit');
    setSelectionBox(null);
  };

  const addDescriptionToSelection = () => {
    if (!selectedShapes.length) return;
    const fallback = selectedShapes.length === 1
      ? { x: selectedShapes[0].x, y: selectedShapes[0].y, width: selectedShapes[0].width, height: selectedShapes[0].height }
      : selectionBounds;
    const region = { id: nextId(), ...(selectionArea || fallback), note: '' };
    setRegions((current) => [...current, region]);
    setSelectedRegionIds([region.id]);
    setSelectionArea(null);
    setRightTab('edit');
  };

  const switchPage = (pageId) => {
    setActivePageId(pageId);
    setSelectedShapeIds([]);
    setSelectedRegionIds([]);
    setSelectionBox(null);
    setSelectionArea(null);
    setTool('select');
  };

  const switchProject = (projectId) => {
    setActiveProjectId(projectId);
    setSelectedShapeIds([]);
    setSelectedRegionIds([]);
    setSelectionBox(null);
    setSelectionArea(null);
    setTool('select');
  };

  const addProject = () => {
    const project = createProject(`プロジェクト ${projects.length + 1}`);
    setProjects((current) => [...current, project]);
    switchProject(project.id);
  };

  const addPage = () => {
    const page = createPage(`ページ ${pages.length + 1}`);
    setPages((current) => [...current, page]);
    switchPage(page.id);
  };

  const renameActivePage = (name) => {
    setPages((current) => current.map((page) => page.id === activePageId ? { ...page, name } : page));
  };

  const deletePage = (pageId) => {
    if (pages.length === 1) return;
    const index = pages.findIndex((page) => page.id === pageId);
    const remaining = pages.filter((page) => page.id !== pageId);
    setPages(remaining);
    if (pageId === activePageId) switchPage(remaining[Math.min(index, remaining.length - 1)].id);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Layout size={18} weight="fill" /></span><span>Framekit</span></div>
        <div className="project-title"><span>{projectName}</span><small>{activePage.name} · 保存済み</small></div>
        <div className="top-actions">
          <button className="icon-button" onClick={() => { setShapes((current) => current.slice(0, -1)); setSelectedShapeIds([]); }} aria-label="最後の図形を取り消す"><ArrowCounterClockwise size={18} /></button>
          <button className="primary-button" onClick={() => setRightTab('export')}><Export size={17} /> <span>Codexへ渡す</span></button>
        </div>
      </header>

      <main className="workspace">
        <aside className={`left-panel ${mobilePanel === 'blocks' ? 'mobile-open' : ''}`}>
          <div className="project-manager">
            <label htmlFor="project-switcher">プロジェクト</label>
            <div><select id="project-switcher" value={activeProjectId} onChange={(event) => switchProject(Number(event.target.value))}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><button onClick={addProject} aria-label="新しいプロジェクトを追加"><Plus size={15} /></button></div>
          </div>
          <div className="page-manager">
            <div className="page-manager-heading"><div><strong>ページ</strong><small>{pages.length}ページ</small></div><button onClick={addPage} aria-label="新しいページを追加"><Plus size={15} /> 新規</button></div>
            <div className="page-list">
              {pages.map((page, index) => <div key={page.id} className={page.id === activePageId ? 'active' : ''}>
                <button className="page-select" onClick={() => switchPage(page.id)}><span>{index + 1}</span><div><strong>{page.name}</strong><small>{page.platform} · {page.shapes.length}要素</small></div></button>
                {pages.length > 1 && <button className="page-delete" onClick={() => deletePage(page.id)} aria-label={`${page.name}を削除`}><Trash size={14} /></button>}
              </div>)}
            </div>
          </div>
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
            <button onClick={copySelectedShape} disabled={!selectedShapes.length}><Copy size={16} /> コピー <kbd>⌘C</kbd></button>
            <button onClick={pasteShape} disabled={!clipboardShapes.length}><ClipboardText size={16} /> ペースト <kbd>⌘V</kbd></button>
          </div>
          {regions.length > 0 && <div className="region-list"><strong>設計意図 <small>Shiftで複数選択</small></strong>{regions.map((region, index) => <button key={region.id} className={selectedRegionIds.includes(region.id) ? 'active' : ''} onClick={(event) => selectRegion(region.id, event)} onContextMenu={(event) => openRegionMenu(region.id, event)}><span>{index + 1}</span><div>{region.note || '説明未入力'}</div></button>)}</div>}
          <div className="tip"><Sparkle size={16} weight="fill" /><p><strong>描き始める</strong>長方形と楕円はドラッグ、文字は配置したい場所をクリックします。</p></div>
        </aside>

        <section className="canvas-area">
          <div className="canvas-toolbar">
            <div className="toolbar-left">
              <div className="device-switch"><button className={platform === 'モバイル' ? 'active' : ''} onClick={() => setPlatform('モバイル')}><DeviceMobile size={16} /> モバイル</button><button className={platform === 'Web' ? 'active' : ''} onClick={() => setPlatform('Web')}><Browser size={16} /> Web</button></div>
              <div className="editor-tools">{DRAW_TOOLS.map((item) => { const Icon = item.icon; return <button key={item.id} className={tool === item.id ? 'active' : ''} onClick={() => selectTool(item.id)} title={item.label} aria-label={item.label}><Icon size={16} /></button>; })}</div>
              <div className="clipboard-tools"><button onClick={copySelectedShape} disabled={!selectedShapes.length} aria-label="図形をコピー"><Copy size={16} /></button><button onClick={pasteShape} disabled={!clipboardShapes.length} aria-label="図形をペースト"><ClipboardText size={16} /></button></div>
            </div>
            <span>{shapes.length} 要素 / {Math.round(zoom * 100)}%</span>
          </div>
          <div ref={stageRef} className={`device-stage ${platform === 'Web' ? 'web-stage' : ''}`}>
            <div className="zoom-shell">
              <div className="device-frame">
                <div className="device-chrome">{platform === 'モバイル' ? <><span>9:41</span><i /></> : <><div><i /><i /><i /></div><span>app.local</span></>}</div>
                <div className="screen-viewport">
                  <div className="screen blank-screen" style={{ '--canvas-zoom': zoom }} onPointerDown={beginRangeSelection} onPointerMove={continueRangeSelection} onPointerUp={finishRangeSelection}>
                    {!shapes.length && <div className="canvas-empty-hint"><Rectangle size={28} /><strong>最初の図形を追加</strong><span>長方形、楕円、文字を使って描き始めます。</span></div>}
                    <div className={`free-layer ${tool !== 'select' ? 'is-drawing' : ''}`} onPointerDown={startDrawing} onPointerMove={continueDrawing} onPointerUp={finishDrawing}>
                      {shapes.map((shape) => <FreeShape key={shape.id} shape={shape} active={selectedShapeIds.includes(shape.id)} selectedCount={selectedShapeIds.length} tool={tool} zoom={zoom} onMoveStart={(event) => startShapeMove(shape, event)} onContextMenu={(event) => openLayerMenu(shape, event)} onChange={(patch) => updateShape(shape.id, patch)} onMove={(patch) => moveSelectionWithSnap(shape, patch)} onInteractionEnd={() => { groupMove.current = null; setSnapGuides({ x: null, y: null }); }} onTextChange={(text) => updateShape(shape.id, { text })} />)}
                      {draftShape && <div className={`draft-rectangle ${draftShape.type === 'ellipse' ? 'is-ellipse' : ''} ${draftShape.type === 'line' ? 'is-line' : ''}`} style={{ left: draftShape.x, top: draftShape.y, width: draftShape.width, height: draftShape.height, transform: draftShape.type === 'line' ? `rotate(${draftShape.rotation}deg)` : undefined }} />}
                      {snapGuides.x !== null && <div className="snap-guide vertical" style={{ left: snapGuides.x }} />}
                      {snapGuides.y !== null && <div className="snap-guide horizontal" style={{ top: snapGuides.y }} />}
                    </div>
                    {selectionBox && <div className="selection-marquee" style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.width, height: selectionBox.height }} />}
                    {selectionBounds && <div className="multi-selection-box" style={{ left: selectionBounds.x, top: selectionBounds.y, width: selectionBounds.width, height: selectionBounds.height }}><span>{selectedShapeIds.length}個</span></div>}
                    {regions.map((region, index) => <div key={region.id} className={`intent-region ${selectedRegionIds.includes(region.id) ? 'is-active' : ''}`} style={{ left: region.x, top: region.y, width: region.width, height: region.height }}><span onClick={(event) => { event.stopPropagation(); selectRegion(region.id, event); }} onContextMenu={(event) => openRegionMenu(region.id, event)} title="クリックで選択、Shiftクリックで追加選択">{index + 1}</span></div>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className={`right-panel ${mobilePanel === 'settings' ? 'mobile-open' : ''}`}>
          <div className="right-tabs"><button className={rightTab === 'edit' ? 'active' : ''} onClick={() => setRightTab('edit')}>編集</button><button className={rightTab === 'export' ? 'active' : ''} onClick={() => setRightTab('export')}>Codex用</button><button className="mobile-close" onClick={() => setMobilePanel(null)}><X size={18} /></button></div>
          {rightTab === 'edit' ? (
            <div className="settings-body">
              <div className="settings-intro"><span className="selected-icon">{selectedShape?.type === 'text' ? <TextAa size={18} /> : selectedShape?.type === 'ellipse' ? <Circle size={18} /> : selectedShape?.type === 'line' ? <LineSegment size={18} /> : <Rectangle size={18} />}</span><div><small>選択中</small><strong>{selectedRegions.length > 1 ? `${selectedRegions.length}個の設計意図` : selectedRegion ? '設計意図の範囲' : selectedShapes.length > 1 ? `${selectedShapes.length}個の要素` : selectedShape ? (selectedShape.type === 'text' ? selectedShape.text : selectedShape.type === 'ellipse' ? '楕円' : selectedShape.type === 'line' ? '直線' : '長方形') : '未選択'}</strong></div></div>
              <label>プロジェクト名<input value={projectName} onChange={(event) => setProjectName(event.target.value)} /></label>
              <label>ページ名<input value={activePage.name} onChange={(event) => renameActivePage(event.target.value)} /></label>
              {selectedRegions.length > 1 ? <>
                <div className="empty-settings compact"><p>Shiftクリックで選択した設計意図をまとめて削除できます。</p></div>
                <button className="danger-button" onClick={() => deleteSelectedRegions()}><Trash size={16} /> 選択した設計意図を削除</button>
              </> : selectedRegion ? <>
                <label>この範囲の設計意図<textarea rows="5" value={selectedRegion.note} onChange={(event) => updateRegion(selectedRegion.id, { note: event.target.value })} placeholder="例: 主要アクションをまとめ、片手で操作しやすくする" /></label>
                <div className="coordinate-grid">
                  <label>X<input type="number" value={Math.round(selectedRegion.x)} onChange={(event) => updateRegion(selectedRegion.id, { x: Number(event.target.value) })} /></label>
                  <label>Y<input type="number" value={Math.round(selectedRegion.y)} onChange={(event) => updateRegion(selectedRegion.id, { y: Number(event.target.value) })} /></label>
                  <label>幅<input type="number" value={Math.round(selectedRegion.width)} onChange={(event) => updateRegion(selectedRegion.id, { width: Number(event.target.value) })} /></label>
                  <label>高さ<input type="number" value={Math.round(selectedRegion.height)} onChange={(event) => updateRegion(selectedRegion.id, { height: Number(event.target.value) })} /></label>
                </div>
                <button className="danger-button" onClick={() => deleteSelectedRegions([selectedRegion.id])}><Trash size={16} /> この設計意図を削除</button>
              </> : selectedShapes.length > 1 ? <>
                <button className="description-button" onClick={addDescriptionToSelection}><Plus size={16} /> この選択に説明を追加</button>
                <div className="multi-edit-block">
                  <span>左右の整列</span>
                  <div className="align-actions"><button onClick={() => alignSelectedShapes('left')}>左</button><button onClick={() => alignSelectedShapes('center')}>中央</button><button onClick={() => alignSelectedShapes('right')}>右</button></div>
                </div>
                <div className="group-actions"><button onClick={groupSelectedShapes}>グループ化</button><button onClick={ungroupSelectedShapes}>グループ解除</button></div>
                <button className="danger-button" onClick={() => { setShapes((current) => current.filter((shape) => !selectedShapeIds.includes(shape.id))); setSelectedShapeIds([]); }}><Trash size={16} /> 選択した要素を削除</button>
              </> : selectedShape ? <>
                <button className="description-button" onClick={addDescriptionToSelection}><Plus size={16} /> この選択に説明を追加</button>
                {selectedShape.type === 'text' && <label>文字<input value={selectedShape.text} onChange={(event) => updateShape(selectedShape.id, { text: event.target.value })} /></label>}
                <div className="coordinate-grid">
                  <label>X<input type="number" value={Math.round(selectedShape.x)} onChange={(event) => updateShape(selectedShape.id, { x: Number(event.target.value) })} /></label>
                  <label>Y<input type="number" value={Math.round(selectedShape.y)} onChange={(event) => updateShape(selectedShape.id, { y: Number(event.target.value) })} /></label>
                  <label>幅<input type="number" min="24" value={Math.round(selectedShape.width)} onChange={(event) => updateShape(selectedShape.id, { width: Number(event.target.value) })} /></label>
                  <label>高さ<input type="number" min="20" value={Math.round(selectedShape.height)} onChange={(event) => updateShape(selectedShape.id, { height: Number(event.target.value) })} /></label>
                </div>
                {selectedShape.type === 'text' ? <div className="color-grid"><label>文字色<input type="color" value={selectedShape.color} onChange={(event) => updateShape(selectedShape.id, { color: event.target.value })} /></label><label>文字サイズ<input type="number" min="8" max="72" value={selectedShape.fontSize} onChange={(event) => updateShape(selectedShape.id, { fontSize: Number(event.target.value) })} /></label></div> : selectedShape.type === 'line' ? <div className="color-grid"><label>線色<input type="color" value={selectedShape.border} onChange={(event) => updateShape(selectedShape.id, { border: event.target.value })} /></label><label>太さ<input type="number" min="1" max="12" value={selectedShape.strokeWidth || 2} onChange={(event) => updateShape(selectedShape.id, { strokeWidth: Number(event.target.value) })} /></label></div> : <><label className="fill-toggle"><input type="checkbox" checked={selectedShape.fillEnabled !== false} onChange={(event) => updateShape(selectedShape.id, { fillEnabled: event.target.checked })} /> 塗りつぶし</label><div className="color-grid"><label>塗り色<input type="color" disabled={selectedShape.fillEnabled === false} value={selectedShape.fill || '#ffffff'} onChange={(event) => updateShape(selectedShape.id, { fill: event.target.value, fillEnabled: true })} /></label><label>線<input type="color" value={selectedShape.border} onChange={(event) => updateShape(selectedShape.id, { border: event.target.value })} /></label></div></>}
                <button className="danger-button" onClick={() => { setShapes((current) => current.filter((shape) => shape.id !== selectedShape.id)); setSelectedShapeIds([]); }}><Trash size={16} /> この要素を削除</button>
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

      {layerMenu && <div className="layer-menu" style={{ left: layerMenu.x, top: layerMenu.y }} role="menu">
        {layerMenu.kind === 'region' ? <button className="delete-item" role="menuitem" onClick={() => deleteSelectedRegions(layerMenu.regionIds)}>{layerMenu.regionIds.length > 1 ? '選択した設計意図を削除' : 'この設計意図を削除'}</button> : <><button role="menuitem" onClick={() => moveShapeLayer(layerMenu.shapeId, 'front')}>最前面へ</button><button role="menuitem" onClick={() => moveShapeLayer(layerMenu.shapeId, 'back')}>最背面へ</button></>}
      </div>}

      <nav className="mobile-dock" aria-label="編集パネル">
        <button onClick={() => setMobilePanel('blocks')}><Rectangle size={19} /><span>描画</span></button>
        <button onClick={() => setMobilePanel('settings')}><GearSix size={19} /><span>編集</span></button>
        <button onClick={() => { setRightTab('export'); setMobilePanel('settings'); }}><Export size={19} /><span>Codex</span></button>
      </nav>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
