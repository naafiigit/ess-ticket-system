async function run() {
  const base64Data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  try {
    const response = await fetch('http://localhost:5000/api/users/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'mana@statsethiopia.gov.et',
        avatar_url: base64Data
      })
    });
    
    console.log('Status:', response.status);
    const json = await response.json();
    console.log('Response body:', JSON.stringify(json, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}
run();
