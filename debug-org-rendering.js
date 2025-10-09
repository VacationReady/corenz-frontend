// Comprehensive org chart debugging
console.log('🔍 COMPREHENSIVE ORG CHART DEBUG');

// Wait for page to load, then check everything
setTimeout(() => {
  console.log('\n📊 1. REACT COMPONENT STATE:');

  // Try to access React DevTools if available (this might not work)
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('✅ React DevTools available');
  }

  console.log('\n🏗️  2. DOM STRUCTURE:');
  const body = document.body;
  console.log('Body classes:', body.className);

  // Look for org chart specific elements
  const orgContainers = document.querySelectorAll('[class*="org"], [data-testid*="org"], .org-chart');
  console.log('Org chart containers:', orgContainers.length);

  orgContainers.forEach((container, i) => {
    console.log(`  Container ${i + 1}:`, {
      classes: container.className,
      children: container.children.length,
      innerHTML: container.innerHTML.substring(0, 200) + '...'
    });
  });

  console.log('\n🎯 3. SPECIFIC ELEMENT CHECKS:');
  const possibleElements = [
    { selector: '[class*="loading"]', name: 'Loading spinners' },
    { selector: '[class*="error"]', name: 'Error messages' },
    { selector: '[class*="empty"]', name: 'Empty states' },
    { selector: '[class*="node"]', name: 'Org nodes' },
    { selector: 'svg', name: 'SVG elements' },
    { selector: '[class*="zoom"]', name: 'Zoom controls' },
    { selector: 'input, select', name: 'Form inputs' }
  ];

  possibleElements.forEach(({ selector, name }) => {
    const elements = document.querySelectorAll(selector);
    console.log(`${name}: ${elements.length} found`);
  });

  console.log('\n🔧 4. REACT COMPONENT TREE (if accessible):');
  // Try to find React fiber nodes
  const reactRoots = document.querySelectorAll('[data-reactroot], #__next');
  console.log('React roots found:', reactRoots.length);

  console.log('\n📋 5. CHECKLIST FOR DEBUGGING:');
  console.log('❓ Is there a loading spinner? (Stuck loading)');
  console.log('❓ Is there an error message? (API or data error)');
  console.log('❓ Is there an empty state? (No data or filtered out)');
  console.log('❓ Are there org chart nodes? (Tree building failed)');
  console.log('❓ Are there zoom/filter controls? (Component not rendering)');

  console.log('\n💡 Next steps:');
  console.log('1. Check browser console for JavaScript errors');
  console.log('2. Check Network tab for failed API requests');
  console.log('3. Try hard refresh (Ctrl+Shift+R)');
  console.log('4. Check if org chart appears after a few seconds');

}, 3000);
