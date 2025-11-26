const https = require('https');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
});

const BASE_URL = env.BASE_URL || 'http://localhost'; // Adjust if needed
const TOKEN = env.MOODLE_TOKEN;

if (!TOKEN) {
    console.error('No MOODLE_TOKEN found in .env.local');
    process.exit(1);
}

const userId = 2; // Assuming admin/teacher user ID, or fetch site info first

function callMoodle(wsfunction, params = {}) {
    const url = new URL(`${BASE_URL}/webservice/rest/server.php`);
    url.searchParams.append('wstoken', TOKEN);
    url.searchParams.append('wsfunction', wsfunction);
    url.searchParams.append('moodlewsrestformat', 'json');

    Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
    });

    return new Promise((resolve, reject) => {
        const req = require('http').get(url.toString(), (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.error('Raw data:', data);
                    reject(e);
                }
            });
        });
        req.on('error', reject);
    });
}

async function main() {
    try {
        console.log('Fetching site info...');
        const siteInfo = await callMoodle('core_webservice_get_site_info');
        console.log('User ID:', siteInfo.userid);

        console.log('Fetching today sessions...');
        const sessions = await callMoodle('mod_attendance_get_courses_with_today_sessions', { userid: siteInfo.userid });
        console.log(JSON.stringify(sessions, null, 2));
    } catch (e) {
        console.error(e);
    }
}

main();
