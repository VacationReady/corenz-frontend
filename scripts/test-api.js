async function testAPI() {
  const employeeId = 'cmf8cwzvs0001ie04g8rq4wma';

  console.log('Testing offboarding GET endpoint...');
  try {
    const response = await fetch(`http://localhost:3000/api/offboarding/${employeeId}`);
    const data = await response.json();
    console.log('GET response status:', response.status);
    if (!response.ok) {
      console.log('GET error:', data);
    } else {
      console.log('GET success:', data.employee.firstName, data.employee.lastName);
    }
  } catch (error) {
    console.error('GET request failed:', error.message);
  }

  console.log('\nTesting exit interview POST endpoint...');
  try {
    const response = await fetch(`http://localhost:3000/api/offboarding/${employeeId}/exit-interview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scheduledAt: '2024-09-10T14:00:00.000Z',
        interviewerId: null,
        location: 'Online',
        notes: 'Test interview',
        sendForm: true,
        formTemplateId: null,
        formTiming: 'NOW'
      })
    });
    const data = await response.json();
    console.log('POST response status:', response.status);
    if (!response.ok) {
      console.log('POST error:', data);
    } else {
      console.log('POST success');
    }
  } catch (error) {
    console.error('POST request failed:', error.message);
  }
}

testAPI();
