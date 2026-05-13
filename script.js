/* ═══════════════════════════════════════
   CONFIG – đổi key / model chỉ ở đây
═══════════════════════════════════════ */
const CONFIG = {
    API_KEY: 'AIzaSyA0nlXkcmAPekGRgLR66Xq4zp1RhMe6bBg',
    MODEL: 'gemini-2.5-flash',
    BASE_URL: 'https://hasaki.vn',
};
CONFIG.ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.MODEL}:generateContent?key=${CONFIG.API_KEY}`;

/* ═══════════════════════════════════════
   STATE
═══════════════════════════════════════ */
let seleniumCommands = [];   // mảng commands sau khi parse

/* ═══════════════════════════════════════
   TOAST
═══════════════════════════════════════ */
let _toastTimer = null;
function showToast(msg, type = 'success', duration = 4000) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    const toastIcon = document.getElementById('toastIcon');

    toast.className = `toast ${type}`;
    toastMsg.textContent = msg;
    toastIcon.textContent = type === 'success' ? '✓' : '✕';

    clearTimeout(_toastTimer);
    // micro-delay để transition kích hoạt đúng
    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('show'));
    });

    _toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

/* ═══════════════════════════════════════
   STEP INDICATOR
═══════════════════════════════════════ */
function setStep(n) {
    [1, 2, 3].forEach(i => {
        const el = document.getElementById('step' + i);
        el.classList.remove('active', 'done');
        if (i < n) el.classList.add('done');
        if (i === n) el.classList.add('active');
    });
}

/* ═══════════════════════════════════════
   PILL SELECTOR
═══════════════════════════════════════ */
document.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
        document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const customWrap = document.getElementById('customWrap');
        if (pill.dataset.value === 'Khác') {
            customWrap.style.display = 'block';
            document.getElementById('customInput').focus();
        } else {
            customWrap.style.display = 'none';
        }
    });
});

/* ═══════════════════════════════════════
   EXTRA INFO HANDLERS
═══════════════════════════════════════ */
function addExtraRow() {
    const container = document.getElementById('extraInfoContainer');
    const row = document.createElement('div');
    row.className = 'extra-info-row';
    row.innerHTML = `
        <input type="text" class="extra-info-input" placeholder="Nhập thêm thông tin hoặc lưu ý...">
        <button type="button" class="btn-remove-row" onclick="removeExtraRow(this)">✕</button>
    `;
    container.appendChild(row);
}

function removeExtraRow(btn) {
    const rows = document.querySelectorAll('.extra-info-row');
    if (rows.length > 1) {
        btn.parentElement.remove();
    } else {
        btn.parentElement.querySelector('input').value = '';
    }
}

function getExtraContext() {
    const inputs = document.querySelectorAll('.extra-info-input');
    const values = Array.from(inputs)
        .map(i => i.value.trim())
        .filter(v => v !== '');
    
    if (values.length === 0) return '';
    return '\n\n=== THÔNG TIN BỔ SUNG TỪ NGƯỜI DÙNG ===\n' + values.map(v => '- ' + v).join('\n');
}

/* ═══════════════════════════════════════
   GET SELECTED FEATURE
═══════════════════════════════════════ */
function getFeature() {
    const active = document.querySelector('.pill.active');
    if (!active) return '';
    if (active.dataset.value === 'Khác') {
        return document.getElementById('customInput').value.trim();
    }
    return active.dataset.value;
}

/* ═══════════════════════════════════════
   BUILD PROMPT – 1 bước, trả thẳng JSON
═══════════════════════════════════════ */
function buildPrompt(feature) {
    const withPause = document.getElementById('optPause').checked;
    const withWaitFor = document.getElementById('optWaitFor').checked;
    const extraContext = getExtraContext();

    return `Bạn là chuyên gia kiểm thử tự động Selenium IDE cho website Hasaki.vn.
Nhiệm vụ: Sinh bộ Selenium commands JSON hoàn chỉnh cho chức năng "${feature}" của trang Hasaki.vn.

=== THÔNG TIN TRANG HASAKI ===
- URL gốc: https://hasaki.vn
- Trang đăng nhập: https://hasaki.vn/customer/account/login

Giao diện trang Đăng nhập:
- Nút "Đăng nhập bằng Facebook" (màu xanh dương)
- Nút "Đăng nhập bằng Google"
- Ô input: placeholder="Nhập email hoặc số điện thoại"
- Ô input: placeholder="Nhập password"
- Checkbox "Nhớ mật khẩu"
- Nút submit màu xanh lá, text "Đăng nhập"

Tài khoản test mặc định:
- Email: kieutrangnguyen06012004@gmail.com  |  Password: kieutrang04
- SĐT: 0377787281  |  Password: Kieutrang04@
- Facebook: SĐT 0377787281 | Mật khẩu Kieutrang04${extraContext}

Locators cố định:
- Ô email/SĐT  : xpath=//input[@placeholder="Nhập email hoặc số điện thoại"]
- Ô password   : xpath=//input[@placeholder="Nhập password"]
- Nút Facebook : xpath=//*[contains(normalize-space(.),"Facebook")]
- Nút Google   : xpath=//*[contains(normalize-space(.),"Đăng nhập bằng Google")]
- Nút Đăng nhập: xpath=//button[contains(normalize-space(.),"Đăng nhập")]
- Lỗi sai TK   : xpath=//*[contains(normalize-space(.),"Tài khoản và mật khẩu không khớp")]

=== QUY TẮC BẮT BUỘC ===
Lệnh được phép: open, click, execute script, pause, verifyText, verifyElementPresent, waitForElementPresent
Lệnh CẤM: type, sendKeys, setWindowSize, waitForURL, assertTitle (không tồn tại trong Selenium IDE)

Khi cần nhập text vào input, PHẢI dùng "execute script" với target:
document.evaluate('XPath_tại_đây', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.value = 'giá_trị';
${withWaitFor ? '- Trước mỗi lần nhập text, PHẢI thêm waitForElementPresent cho ô đó.' : ''}
${withPause ? '- Sau mỗi bước nhập, thêm pause với value="3000".' : ''}
- Sau đăng nhập thành công (SĐT), thêm pause(5000) rồi verifyElementPresent của header trang chủ.
- Test case đăng nhập bằng email là negative: xác nhận thông báo lỗi xuất hiện.

=== CẤU TRÚC OUTPUT (QUAN TRỌNG) ===
Để tránh việc 1 test case lỗi làm dừng cả suite, bạn PHẢI tách mỗi test case thành một object riêng biệt.
Chỉ trả về MỘT mảng JSON các object test case. KHÔNG có bất kỳ chữ nào trước hoặc sau.

Định dạng:
[
  {
    "name": "Tên Test Case 1",
    "commands": [
       {"command":"open","target":"/customer/account/login","value":"","description":"..."},
       ...
    ]
  },
  {
    "name": "Tên Test Case 2",
    "commands": [...]
  }
]

Tạo ít nhất 8-10 test cases bao phủ đầy đủ: happy path (dùng thông tin bổ sung nếu có), negative, edge case.`;
}

/* ═══════════════════════════════════════
   CALL GEMINI API
═══════════════════════════════════════ */
async function callGemini(prompt) {
    const res = await fetch(CONFIG.ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
        throw new Error(data?.error?.message || `HTTP ${res.status}`);
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        || data?.candidates?.[0]?.content?.[0]?.text
        || '';
    if (!text) throw new Error('API không trả về nội dung.');
    return text;
}

/* ═══════════════════════════════════════
   PARSE & NORMALISE COMMANDS
═══════════════════════════════════════ */
function parseCommands(rawText) {
    const start = rawText.indexOf('[');
    const end = rawText.lastIndexOf(']') + 1;
    if (start === -1 || end <= start) throw new Error('Không tìm thấy JSON array trong response.');

    const jsonStr = rawText.slice(start, end).replace(/,\s*([\]}])/g, '$1');
    const parsed = JSON.parse(jsonStr);

    const ALLOWED = new Set(['open', 'click', 'execute script', 'pause', 'verifyText', 'verifyElementPresent', 'waitForElementPresent']);

    // Tương thích ngược: Nếu AI trả về mảng commands thô thay vì mảng test cases
    const testCases = parsed[0]?.commands ? parsed : [{ name: "Generated Test", commands: parsed }];

    return testCases.map(tc => ({
        name: tc.name || "Untitled Test",
        commands: tc.commands.map(cmd => {
            const c = (cmd.command || '').trim();
            if (c === 'type' || c === 'sendKeys') {
                const xpath = (cmd.target || '').replace(/^xpath=/, '');
                return {
                    ...cmd,
                    command: 'execute script',
                    target: `document.evaluate(${JSON.stringify(xpath)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.value = ${JSON.stringify(cmd.value || '')};`,
                    value: '',
                };
            }
            if (c === 'waitForElementPresent') return { ...cmd, value: cmd.value || '30000' };
            return cmd;
        }).filter(cmd => ALLOWED.has((cmd.command || '').trim()))
    }));
}

/* ═══════════════════════════════════════
   RENDER PREVIEW TABLE
═══════════════════════════════════════ */
function renderTable(testCases) {
    const tbody = document.getElementById('previewBody');
    tbody.innerHTML = '';
    let totalCmds = 0;

    testCases.forEach((tc, tcIdx) => {
        const headerTr = document.createElement('tr');
        headerTr.style.background = 'rgba(235,47,150,0.15)';
        headerTr.innerHTML = `
            <td colspan="5" style="color: var(--pink-300); font-weight: 700; padding: 10px 14px;">
                📦 TEST CASE ${tcIdx + 1}: ${esc(tc.name)}
            </td>
        `;
        tbody.appendChild(headerTr);

        tc.commands.forEach((cmd, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${esc(cmd.command || '')}</td>
                <td>${esc(cmd.target || '')}</td>
                <td>${esc(cmd.value || '')}</td>
                <td>${esc(cmd.description || '')}</td>`;
            tbody.appendChild(tr);
            totalCmds++;
        });
    });
    document.getElementById('cmdCount').textContent = `${testCases.length} tests, ${totalCmds} commands`;
}

function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ═══════════════════════════════════════
   BUILD .SIDE FILE STRUCTURE
═══════════════════════════════════════ */
function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function buildSideFile(testCases, feature) {
    const suiteId = uuid();
    const projectId = uuid();

    const tests = testCases.map(tc => ({
        id: uuid(),
        name: tc.name,
        commands: tc.commands.map(cmd => ({
            id: uuid(),
            comment: '',
            command: (cmd.command || '').trim(),
            target: cmd.target || '',
            value: cmd.value || '',
        })),
    }));

    return {
        id: projectId,
        version: '3.17.0',
        name: `Hasaki – ${feature}`,
        url: CONFIG.BASE_URL,
        tests: tests,
        suites: [{
            id: suiteId,
            name: 'Default Suite',
            tests: tests.map(t => t.id),
        }],
        urls: [CONFIG.BASE_URL],
        plugins: [],
    };
}

/* ═══════════════════════════════════════
   DOWNLOAD
═══════════════════════════════════════ */
function downloadSide() {
    if (!seleniumCommands || !seleniumCommands.length) return;
    const feature = getFeature() || 'hasaki-test';
    const sideData = buildSideFile(seleniumCommands, feature);
    const blob = new Blob([JSON.stringify(sideData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const now = new Date();
  const ts = now.getFullYear().toString()
    + String(now.getMonth() + 1).padStart(2, '0')
    + String(now.getDate()).padStart(2, '0')
    + '_'
    + String(now.getHours()).padStart(2, '0')
    + String(now.getMinutes()).padStart(2, '0')
    + String(now.getSeconds()).padStart(2, '0');
  const slug = feature.replace(/\s+/g, '_').replace(/[^\w\u00C0-\u024F]/g, '');
  a.download = `testcase_${slug}_${ts}.side`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    showToast('Đã tải file .side về máy!', 'success');
}

/* ═══════════════════════════════════════
   MAIN FLOW – Generate
═══════════════════════════════════════ */
async function generate() {
    const feature = getFeature();
    if (!feature) {
        showToast('Vui lòng chọn hoặc nhập chức năng cần kiểm thử!', 'error');
        return;
    }

    const btn = document.getElementById('generateBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    const resultPanel = document.getElementById('resultPanel');

    // Loading state
    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';
    resultPanel.style.display = 'none';
    setStep(2);

    try {
        const prompt = buildPrompt(feature);
        const rawText = await callGemini(prompt);
        const testCases = parseCommands(rawText);

        if (!testCases.length) throw new Error('Không có test case nào được tạo ra. Thử lại!');

        seleniumCommands = testCases;
        renderTable(testCases);
        resultPanel.style.display = 'block';
        setStep(3);
        showToast(`✨ Đã tạo ${testCases.length} test cases!`, 'success', 5000);

    } catch (err) {
        console.error('Generate error:', err);
        showToast(`Lỗi: ${err.message}`, 'error', 6000);
        setStep(1);
    } finally {
        btn.disabled = false;
        btnText.style.display = 'flex';
        btnLoader.style.display = 'none';
    }
}

/* ═══════════════════════════════════════
   EVENT LISTENERS
═══════════════════════════════════════ */
document.getElementById('btnAddExtra').addEventListener('click', addExtraRow);
document.getElementById('generateBtn').addEventListener('click', generate);
document.getElementById('downloadBtn').addEventListener('click', downloadSide);

// Expose handlers cho inline onclick (nếu có)
window.removeExtraRow = removeExtraRow;
window.addExtraRow = addExtraRow;