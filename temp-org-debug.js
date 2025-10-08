console.log('🌳 Org Chart Debug:');

// 1. Check API response
fetch('/api/org-chart')
  .then(r => r.json())
  .then(data => {
    console.log('API Response:', {
      totalUsers: data.length,
      sampleUser: data[0] ? {
        name: `${data[0].firstName || ''} ${data[0].lastName || ''}`.trim() || data[0].email,
        managerUserId: data[0].managerUserId,
        hasEmployee: !!data[0].id
      } : 'none',
      managersSet: data.filter(u => u.managerUserId).length,
      noManager: data.filter(u => !u.managerUserId).length
    });

    // 2. Check if managers exist in the data
    const userIds = new Set(data.map(u => u.userId));
    const brokenRefs = data.filter(u => u.managerUserId && !userIds.has(u.managerUserId));

    console.log('Manager Reference Issues:', {
      brokenReferences: brokenRefs.length,
      sampleBroken: brokenRefs[0] ? {
        name: `${brokenRefs[0].firstName || ''} ${brokenRefs[0].lastName || ''}`.trim() || brokenRefs[0].email,
        managerUserId: brokenRefs[0].managerUserId
      } : 'none'
    });
  });
