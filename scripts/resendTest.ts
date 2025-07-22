import { Resend } from 'resend'

const resend = new Resend('re_Gic3qrtA_6KuAigMGZ8h2YGKZfMHAoG8E')

async function testSend() {
  try {
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'michael.dowdle@hotmail.com',
      subject: '✅ Resend Test Email',
      html: '<strong>This is a Resend test email.</strong>',
    })

    console.log('✅ Resend API Success:', result)
  } catch (err) {
    console.error('❌ Resend API Error:', err)
  }
}

testSend()
