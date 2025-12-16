let floatingToolbar = null;
let currentEditorView = null;

function createFloatingToolbar() {
  if (floatingToolbar) return floatingToolbar;
  
  const toolbar = document.createElement('div');
  toolbar.className = 'prosemirror-floating-toolbar';
  
  const boldBtn = document.createElement('button');
  boldBtn.textContent = 'Bold';
  boldBtn.className = 'toolbar-btn toolbar-btn-bold';
  boldBtn.onmousedown = (e) => {
    e.preventDefault(); // Prevent focus loss
    toggleMark('strong');
  };
  
  const italicBtn = document.createElement('button');
  italicBtn.textContent = 'Italic';
  italicBtn.className = 'toolbar-btn toolbar-btn-italic';
  italicBtn.onmousedown = (e) => {
    e.preventDefault(); // Prevent focus loss
    toggleMark('em');
  };
  
  toolbar.appendChild(boldBtn);
  toolbar.appendChild(italicBtn);
  document.body.appendChild(toolbar);
  
  floatingToolbar = toolbar;
  return toolbar;
}

function toggleMark(markType) {
  if (!currentEditorView) return;
  
  const { state, dispatch } = currentEditorView;
  const { schema, selection, tr, storedMarks } = state;
  const mark = schema.marks[markType];
  
  if (!mark) return;
  
  if (selection.empty) {
    // No selection - toggle stored marks for future typing
    const activeMarks = storedMarks || selection.$from.marks();
    const hasMark = activeMarks.some(m => m.type === mark);
    
    if (hasMark) {
      dispatch(tr.removeStoredMark(mark));
    } else {
      dispatch(tr.addStoredMark(mark.create()));
    }
  } else {
    // Has selection - toggle mark on selected text
    const hasMark = state.doc.rangeHasMark(selection.from, selection.to, mark);
    
    if (hasMark) {
      dispatch(tr.removeMark(selection.from, selection.to, mark));
    } else {
      dispatch(tr.addMark(selection.from, selection.to, mark.create()));
    }
  }
}

function updateToolbarState() {
  if (!currentEditorView || !floatingToolbar) return;
  
  const { state } = currentEditorView;
  const { schema, selection, storedMarks } = state;
  
  // Get the marks at the current position (includes stored marks)
  const activeMarks = storedMarks || selection.$from.marks();
  
  // Update bold button
  const boldBtn = floatingToolbar.querySelector('.toolbar-btn-bold');
  const boldMark = schema.marks.strong;
  if (boldMark) {
    let hasBold = false;
    if (selection.empty) {
      // Check stored marks or marks at cursor position
      hasBold = activeMarks.some(m => m.type === boldMark);
    } else {
      // Check if the entire selection has the mark
      hasBold = state.doc.rangeHasMark(selection.from, selection.to, boldMark);
    }
    boldBtn.classList.toggle('active', hasBold);
  }
  
  // Update italic button
  const italicBtn = floatingToolbar.querySelector('.toolbar-btn-italic');
  const italicMark = schema.marks.em;
  if (italicMark) {
    let hasItalic = false;
    if (selection.empty) {
      // Check stored marks or marks at cursor position
      hasItalic = activeMarks.some(m => m.type === italicMark);
    } else {
      // Check if the entire selection has the mark
      hasItalic = state.doc.rangeHasMark(selection.from, selection.to, italicMark);
    }
    italicBtn.classList.toggle('active', hasItalic);
  }
}

export function showToolbar() {
  const toolbar = createFloatingToolbar();
  toolbar.style.display = 'block';
  updateToolbarState();
}

export function hideToolbar() {
  if (floatingToolbar) {
    floatingToolbar.style.display = 'none';
  }
}

export function setCurrentEditorView(view) {
  currentEditorView = view;
}

export function handleToolbarKeydown(event) {
  // Handle Ctrl+B for bold (Cmd+B on Mac)
  if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
    event.preventDefault();
    toggleMark('strong');
    return true;
  }
  // Handle Ctrl+I for italic (Cmd+I on Mac)
  if ((event.metaKey || event.ctrlKey) && event.key === 'i') {
    event.preventDefault();
    toggleMark('em');
    return true;
  }
  return false;
}

export { updateToolbarState };

