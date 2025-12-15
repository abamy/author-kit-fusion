/**
 * Source Hash Embedder Component
 * Pure function that embeds tracking markers into source HTML
 * 
 * Performance: Builds markerToSourcePath during embedding (one DOM traversal)
 */

import { generateRandomId } from '../utils.js';

/**
 * Creates a hash identifier
 * @param {string} elementType - Type of element (H1, P, IMG, etc)
 * @param {string} contentType - Type of content (TEXT, SRC, ALT, HTML)
 * @param {string} prefix - Hash prefix
 * @param {number} idLength - Length of random ID
 * @returns {string} Hash identifier
 */
function createHash(elementType, contentType, prefix, idLength) {
  const randomId = generateRandomId(idLength);
  return `${prefix}${elementType}_${randomId}_${contentType}`;
}

/**
 * Builds a stable path from root to element
 * @param {Element} el - Element to get path for
 * @param {string} rootSelector - Root selector
 * @returns {Array} Path descriptor array
 */
function getElementPath(el, rootSelector) {
  const path = [];
  let current = el;
  while (current && current.tagName !== rootSelector.toUpperCase()) {
    const parent = current.parentElement;
    if (!parent) break;
    const idx = Array.from(parent.children).indexOf(current);
    path.unshift({ tag: current.tagName, index: idx });
    current = parent;
  }
  return path;
}

/**
 * Gets the depth of an element from the root
 * @param {Element} element - Element to get depth for
 * @param {Element} root - Root element
 * @returns {number} Depth from root
 */
function getDepth(element, root) {
  let depth = 0;
  let current = element;
  while (current && current !== root) {
    depth += 1;
    current = current.parentElement;
  }
  return depth;
}

/**
 * Gets the first text node that belongs directly to the element
 * (not within a child element)
 * @param {Element} element - Element to search
 * @returns {Text|null} First text node or null
 */
function getFirstOwnTextNode(element) {
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      return node;
    }
  }
  return null;
}

/**
 * Embeds tracking markers into target elements
 * Pure function: takes HTML string and config, returns data
 * 
 * @param {string} sourceHTML - Raw HTML string
 * @param {Object} config - Configuration object (merged with defaults by orchestrator)
 * @returns {Object} Object containing markedHTML, markerMap, and markerToSourcePath
 */
function embedSourceMarkers(sourceHTML, config) {
  const {
    rootSelector,
    targetSelectors,
    hashPrefix,
    hashIdLength,
  } = config;

  const parser = new DOMParser();
  const doc = parser.parseFromString(sourceHTML, 'text/html');

  const markerMap = new Map();
  const markerToSourcePath = new Map();

  // Find root element
  const root = doc.body.querySelector(rootSelector);
  if (!root) {
    console.warn(`[Source Embedder] No ${rootSelector} element found in source HTML`);
    return { markedHTML: sourceHTML, markerMap, markerToSourcePath };
  }

  // Convert targetSelectors array to comma-separated string for querySelectorAll
  const targetSelectorsStr = Array.isArray(targetSelectors)
    ? targetSelectors.join(', ')
    : targetSelectors;
  const targetElements = root.querySelectorAll(targetSelectorsStr);

  // Convert NodeList to Array and process in reverse order (deepest first)
  // This ensures child elements get their markers before parent elements
  const elementsArray = Array.from(targetElements);

  // Sort by depth (deepest first) to process children before parents
  elementsArray.sort((a, b) => {
    const depthA = getDepth(a, root);
    const depthB = getDepth(b, root);
    return depthB - depthA; // Reverse order: deepest first
  });

  elementsArray.forEach((element) => {
    const elementType = element.tagName;
    const elementMarkers = [];

    if (elementType === 'IMG') {
      // Only modify src and alt attributes; preserve all others
      const originalSrc = element.getAttribute('src') || '';
      if (originalSrc) {
        const srcMarker = createHash(elementType, 'SRC', hashPrefix, hashIdLength);
        markerMap.set(srcMarker, {
          type: 'attribute',
          name: 'src',
          value: originalSrc,
          element: elementType,
        });
        element.setAttribute('src', srcMarker);
        elementMarkers.push(srcMarker);
      }
    } else if (['UL', 'OL'].includes(elementType)) {
      // For lists, embed markers into list items
      const listItems = element.querySelectorAll(':scope > li');
      listItems.forEach((li) => {
        const originalLiHTML = li.innerHTML || '';
        if (originalLiHTML.trim()) {
          const htmlMarker = createHash('LI', 'HTML', hashPrefix, hashIdLength);
          markerMap.set(htmlMarker, {
            type: 'html',
            value: originalLiHTML,
            element: 'LI',
          });
          // Set the entire innerHTML to preserve nested structure
          li.innerHTML = htmlMarker;
          elementMarkers.push(htmlMarker);
        }
      });
    } else {
      // For text elements, inject marker while preserving child elements
      // Only process elements that have some content (text or children)

      const hasContent = element.textContent.trim() || element.childNodes.length > 0;

      if (hasContent) {
        const htmlMarker = createHash(elementType, 'HTML', hashPrefix, hashIdLength);

        // Store the original innerHTML (with all nested structure)
        const originalHTML = element.innerHTML || '';

        markerMap.set(htmlMarker, {
          type: 'html',
          value: originalHTML,
          element: elementType,
        });

        // Inject marker at the beginning while preserving all child elements
        const markerNode = element.ownerDocument.createTextNode(htmlMarker + ' ');
        element.insertBefore(markerNode, element.firstChild);

        elementMarkers.push(htmlMarker);
      }
    }

    // Store mapping of element to its markers
    if (elementMarkers.length > 0) {
      const path = getElementPath(element, rootSelector);
      // Store the markers as a data attribute for later retrieval
      element.setAttribute('data-marker-ids', elementMarkers.join(','));
      element.setAttribute('data-source-marked', 'true');

      // Track path for each marker so we can find the source element later
      // This is done during embedding for performance (one DOM traversal)
      elementMarkers.forEach((marker) => {
        markerToSourcePath.set(marker, path);
      });
    }
  });

  // Serialize back to HTML - this should preserve all attributes
  const markedHTML = doc.body.outerHTML;

  return {
    markedHTML,
    markerMap,
    markerToSourcePath,
  };
}

export default embedSourceMarkers;

