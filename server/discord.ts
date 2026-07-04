/**
 * Discord Bot Integration helper.
 * Uses native multipart boundary construction to send text and a PDF attachment to a Discord channel.
 */
export async function sendReportToDiscord(
  botToken: string,
  channelId: string,
  applicantName: string,
  applicantEmail: string,
  companyName: string,
  companyWebsite: string,
  pdfBuffer: Buffer
): Promise<boolean> {
  if (!botToken || !channelId) {
    console.warn('Discord Bot Token or Channel ID is empty. Skipping automatic Discord post.');
    return false;
  }

  // Clean values
  const token = botToken.trim();
  const cid = channelId.trim();
  const name = applicantName.trim() || 'Anonymous';
  const email = applicantEmail.trim() || 'no-email@example.com';
  const cName = companyName.trim();
  const cWeb = companyWebsite.trim();

  const url = `https://discord.com/api/v10/channels/${cid}/messages`;
  const fileName = `${cName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_research_report.pdf`;

  // Create boundary
  const boundary = '----Boundary' + Math.random().toString(36).substring(2);

  // Message body text
  const payloadJson = JSON.stringify({
    content: `📊 **NEW COMPANY RESEARCH COMPLETED**\n\n` +
      `👤 **Applicant Details**\n` +
      `• **Name:** ${name}\n` +
      `• **Email:** ${email}\n\n` +
      `🏢 **Research Target**\n` +
      `• **Company:** ${cName}\n` +
      `• **Website:** ${cWeb}\n\n` +
      `*A detailed PDF report has been auto-generated and attached below.*`
  });

  // Construct multipart payload
  const parts: Buffer[] = [];

  // payload_json part
  parts.push(Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="payload_json"\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    payloadJson +
    `\r\n`
  ));

  // File attachment part
  parts.push(Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="files[0]"; filename="${fileName}"\r\n` +
    `Content-Type: application/pdf\r\n\r\n`
  ));
  
  parts.push(pdfBuffer);
  
  parts.push(Buffer.from(
    `\r\n--${boundary}--\r\n`
  ));

  const body = Buffer.concat(parts);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Discord API error: ${response.status} - ${errText}`);
    }

    console.log(`Successfully posted research report to Discord channel: ${cid}`);
    return true;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error(`Discord Posting Failed:`, err.message);
    throw new Error(`Discord post failed: ${err.message}`);
  }
}
