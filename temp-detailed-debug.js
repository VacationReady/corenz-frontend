// Enhanced debug - run this in browser console
console.log('🔍 Detailed Org Chart Debug:');

fetch('/api/org-chart')
  .then(r => r.json())
  .then(data => {
    console.log('📊 API Data Analysis:');
    console.log('   Total users:', data.length);
    console.log('   Users with managers:', data.filter(u => u.managerUserId).length);
    console.log('   Users without managers:', data.filter(u => !u.managerUserId).length);

    // Check if manager IDs exist in the data
    const userIds = new Set(data.map(u => u.userId));
    const brokenRefs = data.filter(u => u.managerUserId && !userIds.has(u.managerUserId));

    console.log('   Broken manager refs:', brokenRefs.length);
    console.log('   Sample broken:', brokenRefs[0] ? {
      name: `${brokenRefs[0].firstName || ''} ${brokenRefs[0].lastName || ''}`.trim() || brokenRefs[0].email,
      managerId: brokenRefs[0].managerUserId
    } : 'none');

    // Check activation status
    const activated = data.filter(u => u.isActivated !== false);
    const notActivated = data.filter(u => u.isActivated === false);

    console.log('   Activated users:', activated.length);
    console.log('   Not activated:', notActivated.length);

    // Check if managers are activated
    const managersActivated = data.filter(u =>
      u.managerUserId && userIds.has(u.managerUserId) &&
      data.find(m => m.userId === u.managerUserId)?.isActivated !== false
    ).length;

    console.log('   Users with activated managers:', managersActivated);

    return data;
  });
