const { Resend } = require('resend');
require('dotenv').config();

console.log('Testing email configuration...');

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.FROM_EMAIL;

console.log('RESEND_API_KEY:', apiKey ? 'Set (length: ' + apiKey.length + ')' : 'NOT SET');
console.log('FROM_EMAIL:', fromEmail || 'NOT SET');

if (!apiKey) {
  console.error('❌ RESEND_API_KEY is not set!');
  process.exit(1);
}

if (!fromEmail) {
  console.error('❌ FROM_EMAIL is not set!');
  process.exit(1);
}

const resend = new Resend(apiKey);

async function testEmail() {
  try {
    console.log('Testing Resend connection...');
    // Just test the API key by trying to get domains (this doesn't send an email)
    const response = await resend.domains.list();
    console.log('✅ Resend API key is valid');
    console.log('Available domains:', response.data?.length || 0);
  } catch (error) {
    console.error('❌ Resend API key test failed:', error.message);
  }
}

testEmail();
