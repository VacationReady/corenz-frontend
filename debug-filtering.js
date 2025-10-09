// Enhanced debugging to check filtering issues
console.log('🔍 ORG CHART FILTERING DEBUG');

// Wait for React to load data
setTimeout(() => {
  // Check if we can access React state (this might not work, but let's try)
  console.log('\n📊 CHECKING FILTER VALUES:');

  // Check if filters exist in DOM
  const filterElements = document.querySelectorAll('input, select, [role="combobox"]');
  console.log(`Found ${filterElements.length} filter elements`);

  // Check for department filter
  const deptFilters = document.querySelectorAll('[class*="department"], [placeholder*="department"]');
  console.log(`Department filters: ${deptFilters.length}`);

  // Check for role filter
  const roleFilters = document.querySelectorAll('[class*="role"], [placeholder*="role"]');
  console.log(`Role filters: ${roleFilters.length}`);

  console.log('\n🔧 MANUAL FILTER CHECK:');
  console.log('1. Check if department filter shows "all" or specific departments');
  console.log('2. Check if role filter shows "all" or specific roles');
  console.log('3. Check if job role filter shows "all" or specific roles');
  console.log('4. Try clearing all filters manually');
  console.log('5. Check if users appear after clearing filters');

  console.log('\n💡 LIKELY ISSUES:');
  console.log('• CSV imported users might have null/empty department/jobRole fields');
  console.log('• Filtering logic might incorrectly filter null values even when "all" is selected');
  console.log('• Check if the "all" filter option actually includes null values');

  // Test API directly to see sample user data
  fetch('/api/org-chart')
    .then(r => r.json())
    .then(data => {
      console.log(`\n📡 SAMPLE USER DATA ANALYSIS:`);
      console.log(`Total users: ${data.length}`);

      if (data.length > 0) {
        const sampleUsers = data.slice(0, 3);
        sampleUsers.forEach((user, i) => {
          console.log(`User ${i + 1}:`, {
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            role: user.role,
            department: user.departmentName || 'NO DEPARTMENT',
            jobRole: user.jobRoleName || 'NO JOB ROLE',
            managerUserId: user.managerUserId || 'NO MANAGER'
          });
        });

        // Check for users without departments
        const noDept = data.filter(u => !u.departmentName).length;
        const noJobRole = data.filter(u => !u.jobRoleName).length;
        const noManager = data.filter(u => !u.managerUserId).length;

        console.log(`\n📊 DATA QUALITY ISSUES:`);
        console.log(`Users without department: ${noDept}`);
        console.log(`Users without job role: ${noJobRole}`);
        console.log(`Users without manager: ${noManager}`);

        if (noDept > 0 || noJobRole > 0) {
          console.log(`❌ ISSUE FOUND: Users with missing data are likely being filtered out`);
          console.log(`💡 SOLUTION: Fix filtering logic to handle null values correctly`);
        }
      }
    })
    .catch(err => console.error('API Error:', err));

}, 3000);
