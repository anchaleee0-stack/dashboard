// deploy-github.mjs
// สคริปต์เชื่อมต่อบัญชี GitHub ใหม่ (Device Flow + Browser), อัปโหลดโค้ดทั้งหมด และเปิดใช้งาน GitHub Pages อัตโนมัติ

import fs from 'fs';
import { execSync } from 'child_process';

const TARGET_REPO = process.env.TARGET_REPO_NAME || 'dashboard';
// GitHub CLI Official OAuth App Client ID (รองรับ repo + workflow + pages)
const GITHUB_CLIENT_ID = '178c6fc778ccc68e1d6a';

function tryGetStoredToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const listOut = execSync('git credential-manager github list', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!listOut) return null;
    const output = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const passMatch = output.match(/password=(.+)/);
    return passMatch ? passMatch[1].trim() : null;
  } catch {
    return null;
  }
}

async function loginWithGitHubDeviceFlow() {
  const codeRes = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      scope: 'repo workflow',
    }),
  });

  const codeData = await codeRes.json();
  if (!codeData.device_code) {
    throw new Error(`ไม่สามารถขอ Device Code ได้: ${JSON.stringify(codeData)}`);
  }

  const { device_code, user_code, verification_uri, interval = 5 } = codeData;

  console.log('\n========================================================');
  console.log(`🔑 รหัสยืนยัน GitHub ของคุณคือ:  ${user_code}`);
  console.log(`🌐 ลิงก์ยืนยันตัวตน: ${verification_uri}`);
  console.log('========================================================\n');

  // คัดลอกรหัสเข้า Clipboard และเปิดเบราว์เซอร์อัตโนมัติ
  try {
    execSync(`powershell -NoProfile -Command "Set-Clipboard -Value '${user_code}'; Start-Process '${verification_uri}'"`);
    console.log('📋 คัดลอกรหัสเข้า Clipboard ให้แล้ว (กด Ctrl+V เพื่อวางในหน้าเว็บได้เลย)');
  } catch {
    // ignore
  }

  // รอผู้ใช้กดยืนยันในเบราว์เซอร์
  while (true) {
    await new Promise((r) => setTimeout(r, (interval + 1) * 1000));
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.access_token) {
      return tokenData.access_token;
    }
    if (tokenData.error === 'authorization_pending') {
      continue;
    }
    if (tokenData.error === 'slow_down') {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    throw new Error(`การยืนยันตัวตนล้มเหลว: ${tokenData.error_description || tokenData.error}`);
  }
}

async function ghApi(token, endpoint, method = 'GET', body = undefined) {
  const res = await fetch(`https://api.github.com${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'thaluang-deploy-script',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GitHub API ${method} ${endpoint} failed (${res.status}): ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

async function main() {
  let token = tryGetStoredToken();
  if (!token) {
    token = await loginWithGitHubDeviceFlow();
  }

  const user = await ghApi(token, '/user');
  const username = user.login;
  console.log(`👤 เชื่อมต่อบัญชี GitHub สำเร็จ: ${username}`);

  // บันทึก Credential ลงใน Git Credential Manager เพื่อให้ git จำบัญชีนี้ถาวร
  try {
    execSync('git credential approve', {
      input: `protocol=https\nhost=github.com\nusername=${username}\npassword=${token}\n\n`,
      encoding: 'utf-8',
    });
    execSync(`git config --global user.name "${username}"`);
  } catch {
    // ignore
  }

  let repoName = TARGET_REPO;
  try {
    await ghApi(token, `/repos/${username}/${repoName}`);
    console.log(`📦 พบ Repository เดิม: ${username}/${repoName}`);
  } catch {
    console.log(`📦 กำลังสร้าง Repository ใหม่: ${username}/${repoName} ...`);
    await ghApi(token, '/user/repos', 'POST', {
      name: repoName,
      description:
        'ระบบจองห้องประชุม วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์ (Digital Booking & Approval Workflow Dashboard)',
      private: false,
      auto_init: true,
    });
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Push โค้ดพร้อมไฟล์ Static Export ขึ้น branch main
  const authedUrl = `https://${username}:${token}@github.com/${username}/${repoName}.git`;
  const cleanUrl = `https://github.com/${username}/${repoName}.git`;

  console.log(`📤 กำลังอัปโหลดไฟล์ทั้งหมดขึ้น ${cleanUrl} ...`);
  execSync(`git push "${authedUrl}" HEAD:refs/heads/main --force`, { stdio: 'inherit' });
  try {
    execSync(`git remote set-url origin ${cleanUrl}`);
  } catch {
    execSync(`git remote add origin ${cleanUrl}`);
  }

  // เปิดใช้งาน GitHub Pages ให้ชี้ไปที่ branch main / (root) ซึ่งมี index.html พร้อมใช้งานทันที
  try {
    await ghApi(token, `/repos/${username}/${repoName}/pages`, 'POST', {
      source: { branch: 'main', path: '/' },
    });
    console.log('🌐 เปิดใช้งาน GitHub Pages สำเร็จ (Branch: main / root)');
  } catch {
    try {
      await ghApi(token, `/repos/${username}/${repoName}/pages`, 'PUT', {
        source: { branch: 'main', path: '/' },
        build_type: 'legacy',
      });
      console.log('🌐 อัปเดตการตั้งค่า GitHub Pages เป็น Branch: main / root สำเร็จ');
    } catch (e) {
      console.log('ℹ️ สถานะ GitHub Pages:', e.message);
    }
  }

  const repoUrl = `https://github.com/${username}/${repoName}`;
  const pagesUrl = `https://${username}.github.io/${repoName}/`;

  console.log(`\n✅ Repository URL: ${repoUrl}`);
  console.log(`🌍 Live GitHub Pages URL: ${pagesUrl}`);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
