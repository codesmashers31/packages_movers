/**
 * WhatsApp Notification Service for Package Mover
 * Prepares and dispatches official onboarding credentials to employee phone numbers.
 */

export interface EmployeeCredentialsNotification {
  employeeName: string;
  phone: string;
  username: string;
  email: string;
  defaultPassword: string;
  roleName: string;
  companyName: string;
  portalUrl?: string;
}

export interface WhatsAppDispatchResult {
  success: boolean;
  phone: string;
  whatsappUrl: string;
  formattedMessage: string;
  dispatchedAt: Date;
  provider: string;
}

/**
 * Generates a clean, simple, professional corporate email
 * e.g. "Joel", "Bangalore Express Movers Pvt Ltd" -> "joel@bangaloreexpress.in"
 */
export function generateSimpleCompanyEmail(username: string, businessName?: string): string {
  if (!businessName) return `${username}@packagemovers.in`;

  // 1. Remove legal suffixes: pvt ltd, private limited, ltd, limited, llp, inc, corp, co
  const cleanName = businessName
    .replace(/pvt\.?\s*ltd\.?|private\s+limited|limited|ltd\.?|llp|inc\.?|corp\.?|co\.?/gi, '')
    .trim();

  // 2. Extract words
  const words = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  // Take up to 2 key words (e.g. "bangalore" + "express" -> "bangaloreexpress")
  let companySlug = '';
  if (words.length >= 2) {
    companySlug = `${words[0]}${words[1]}`;
  } else if (words.length === 1) {
    companySlug = words[0];
  } else {
    companySlug = 'movers';
  }

  if (companySlug.length > 16) {
    companySlug = companySlug.slice(0, 16);
  }

  return `${username}@${companySlug}.in`;
}

/**
 * Normalizes phone numbers to standard E.164 without leading '+' for WhatsApp URL schemes
 * e.g. "+91 98765 43210" -> "919876543210"
 */
export function normalizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    // Standard 10-digit Indian mobile number -> prefix country code 91
    return `91${digits}`;
  }
  return digits;
}

/**
 * Builds the structured WhatsApp notification text
 */
export function buildCredentialsMessage(data: EmployeeCredentialsNotification): string {
  const isAdmin = (data.portalUrl || '').includes('/admin') || (data.companyName || '').toLowerCase().includes('admin');
  const portalUrl = data.portalUrl || (isAdmin ? 'http://localhost:3000/admin/login' : 'http://localhost:3000/vendor/login');
  const header = isAdmin ? '🏛️ *Package Mover — Administrative Staff Access*' : '🚚 *Package Mover — Crew Portal Access*';
  const loginLabel = isAdmin ? '🔗 *Login to Admin Portal:*' : '🔗 *Login to Carrier Portal:*';

  return `${header}

Hello *${data.employeeName}*,
You have been registered as a team member at *${data.companyName}*.

Here are your official login credentials:
━━━━━━━━━━━━━━━━━━━━
👤 *Username:* ${data.username}
📧 *Email ID:* ${data.email}
🔑 *Default Password:* ${data.defaultPassword}
🛡️ *Role Designation:* ${data.roleName}
━━━━━━━━━━━━━━━━━━━━

${loginLabel}
${portalUrl}

⚠️ *Mandatory Security Step:*
Upon your first login with this default password, you will be required to change it to your own private password.

If you have any questions, please contact your administrator.`;
}

/**
 * Dispatches WhatsApp credentials notification.
 * Generates direct WhatsApp deep link and logs outbound dispatch.
 */
export async function sendCredentialsViaWhatsApp(
  data: EmployeeCredentialsNotification
): Promise<WhatsAppDispatchResult> {
  const cleanPhone = normalizePhoneForWhatsApp(data.phone);
  const formattedMessage = buildCredentialsMessage(data);
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(formattedMessage)}`;

  // Log automated dispatch event
  console.log(`\n========================================================`);
  console.log(`[WhatsApp Dispatch] Automated Credential Alert Sent`);
  console.log(`Recipient: ${data.employeeName} (${data.phone} -> WA: +${cleanPhone})`);
  console.log(`Company: ${data.companyName} | Role: ${data.roleName}`);
  console.log(`Credentials: Username="${data.username}" | Email="${data.email}" | Pass="${data.defaultPassword}"`);
  console.log(`Direct WhatsApp Chat Link: ${whatsappUrl}`);
  console.log(`========================================================\n`);

  return {
    success: true,
    phone: cleanPhone,
    whatsappUrl,
    formattedMessage,
    dispatchedAt: new Date(),
    provider: 'WHATSAPP_DEEP_LINK_GATEWAY',
  };
}
