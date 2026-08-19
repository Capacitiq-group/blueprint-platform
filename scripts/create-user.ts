/**
 * Creates an internal Blueprint user directly in Supabase Auth.
 *
 * This is a private internal platform (Section 1: "not intended to be sold
 * as a standalone SaaS product") — there is no public sign-up page by
 * design. New team members are provisioned by whoever holds the Supabase
 * service role key, using this script.
 *
 * Usage:
 *   npm run create-user -- --email you@company.com --password "..." --name "Your Name"
 *
 * Or run interactively (it will prompt for anything you omit):
 *   npm run create-user
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (Project Settings → API → service_role — keep secret)
 */
import { createClient } from '@supabase/supabase-js';
import { createInterface } from 'node:readline/promises';
import 'dotenv/config';

function parseArgs() {
  const args = process.argv.slice(2);
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : '';
      out[key] = value;
    }
  }
  return out;
}

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      '\n✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local\n' +
        '  (see .env.example — both come from Supabase Project Settings → API)\n'
    );
    process.exit(1);
  }

  const args = parseArgs();

  const email = args.email || (await prompt('Email address: '));
  const password = args.password || (await prompt('Password (min 8 characters): '));
  const fullName = args.name || (await prompt('Full name: '));

  if (!email || !password || password.length < 8) {
    console.error('\n✗ Email and a password of at least 8 characters are required.\n');
    process.exit(1);
  }

  // Service-role client — bypasses RLS, server/script use only, never ship
  // this key to the browser.
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\n→ Creating user ${email} ...`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // internal tool — no email verification flow needed
    user_metadata: { full_name: fullName },
  });

  if (error) {
    console.error(`\n✗ Failed to create user: ${error.message}\n`);
    process.exit(1);
  }

  console.log(`\n✓ User created: ${data.user?.email} (id: ${data.user?.id})`);
  console.log(
    '  A matching row in public.profiles was created automatically by the\n' +
      '  on_auth_user_created trigger. This person can now log in at /login.\n'
  );
}

main();
