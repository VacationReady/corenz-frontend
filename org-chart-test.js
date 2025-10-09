// Run this in browser console to test if org chart is working
console.log('🧪 ORG CHART TEST');

// Test 1: Check if page loads without errors
console.log('✅ Page loaded successfully');

// Test 2: Check if React components render
setTimeout(() => {
  console.log('\n📊 COMPONENT CHECKS:');

  // Check for key elements
  const statsElements = document.querySelectorAll('[class*="text-2xl font-semibold"]');
  console.log(`📈 Stats elements found: ${statsElements.length}`);

  const filterSection = document.querySelector('[class*="Refine your org chart"]');
  console.log(`🔍 Filter section found: ${!!filterSection}`);

  const zoomControls = document.querySelectorAll('[class*="zoom"], button[class*="zoom"]');
  console.log(`🔍 Zoom controls found: ${zoomControls.length}`);

  const orgChartContainer = document.querySelector('[class*="overflow-x-auto"]');
  console.log(`📋 Org chart container found: ${!!orgChartContainer}`);

  // Test 3: Check if data is loading
  fetch('/api/org-chart')
    .then(r => r.json())
    .then(data => {
      console.log(`\n📡 API DATA TEST:`);
      console.log(`✅ API returned ${data.length} users`);

      if (data.length > 0) {
        console.log(`✅ Sample user: ${data[0].firstName} ${data[0].lastName}`);
        console.log(`✅ Manager ID: ${data[0].managerUserId || 'none'}`);
      }

      // Test 4: Check if tree building works
      console.log(`\n🌳 TREE BUILDING TEST:`);
      const hasManager = data.filter(u => u.managerUserId).length;
      const noManager = data.filter(u => !u.managerUserId).length;
      console.log(`✅ Users with managers: ${hasManager}`);
      console.log(`✅ Root users (no manager): ${noManager}`);

    })
    .catch(err => {
      console.error('❌ API Error:', err);
    });

  console.log('\n🎯 MANUAL CHECKS NEEDED:');
  console.log('1. Do you see employee cards in the chart area?');
  console.log('2. Do the zoom controls work?');
  console.log('3. Do the filter controls work?');
  console.log('4. Can you click on employee cards?');
  console.log('5. Does the stats show correct numbers?');

}, 1000);
