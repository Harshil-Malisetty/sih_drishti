const faces = ['roof', 'left', 'right', 'front', 'back', 'wheels'] as const;

/** A small CSS 3D solid; local geometry, no external model or WebGL context per bus. */
export function BusModel() {
  return <span className="bus-model" aria-hidden="true"><span className="bus-model-solid">{faces.map(face => <span key={face} className={`bus-face bus-face-${face}`}/>)}</span></span>;
}

export function createBusModel() {
  const model = document.createElement('span'); model.className = 'bus-model'; model.setAttribute('aria-hidden', 'true');
  const solid = document.createElement('span'); solid.className = 'bus-model-solid';
  faces.forEach(face => { const node = document.createElement('span'); node.className = `bus-face bus-face-${face}`; solid.append(node); });
  model.append(solid);
  return model;
}