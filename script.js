
// ==================== CÁC BIẾN TOÀN CỤC ====================
const API_KEY = 'AIzaSyBlpnHlosms4dhPtJnUsVuaSGmdb_4-O5s';
let currentTestCase = "";
let currentSeleniumCommands = null;

// ==================== FETCH HTML ====================
async function fetchHTML(url) {
    try {
        const proxy = "https://corsproxy.io/?";
        const response = await fetch(proxy + encodeURIComponent(url));
        if (!response.ok) throw new Error("HTTP " + response.status);
        let html = await response.text();
        if (html.length > 65000) html = html.substring(0, 65000) + "\n... [HTML đã được rút gọn]";
        return html;
    } catch (error) {
        console.error("Lỗi fetch " + url + ":", error);
        return "[Không thể lấy HTML từ " + url + "]";
    }
}

async function fetchMultipleHTML(baseUrl) {
    const importantPages = [baseUrl, baseUrl + "/customer/account/login", baseUrl + "/customer/account/login/"];
    let combinedHTML = "=== HTML CÁC TRANG QUAN TRỌNG ===\n\n";
    for (let url of importantPages) {
        const html = await fetchHTML(url);
        combinedHTML += "--- Trang: " + url + " ---\n" + html + "\n\n";
    }
    return combinedHTML;
}

// ==================== TẠO TEST CASE (ĐÃ CHỈNH SÁT GIAO DIỆN) ====================
async function generateTestCase() {
    const input = document.getElementById('promptInput').value.trim();
    const outputDiv = document.getElementById('output');
    const btn = document.getElementById('generateBtn');
    const status = document.getElementById('status');
    const convertBtn = document.getElementById('convertToSeleniumBtn');

    if (!input) {
        alert("Vui lòng nhập chức năng cần kiểm thử!");
        return;
    }

    btn.disabled = true;
    status.innerText = "Đang tạo Test Case...";
    outputDiv.innerHTML = "<p style='color:orange'>Đang sinh test case chi tiết...</p>";
    convertBtn.style.display = 'none';
    if (document.getElementById('downloadSideBtn')) document.getElementById('downloadSideBtn').style.display = 'none';

    const prompt = `Bạn là chuyên gia kiểm thử website Hasaki.vn. 
Hãy tạo bộ test case CHI TIẾT cho chức năng "${input}" theo đúng giao diện trang đăng nhập hiện tại.

Giao diện trang Đăng nhập bao gồm:
- Nút Facebook (màu xanh dương)
- Nút "Đăng nhập bằng Google"
- Phần "Hoặc đăng nhập với Hasaki.vn"
- Ô input: "Nhập email hoặc số điện thoại" nhưng trên thực tế chỉ nhập được số điện thoại thô để đăng nhập.
- Ô input: "Nhập password"
- Checkbox "Nhớ mật khẩu"
- Nút "Đăng nhập" lớn màu xanh lá


Thông tin tài khoản test:
- SĐT: 0377787281
- Password: Kieutrang04@

LƯU Ý: khi ghi test case cho ô "Nhập email hoặc số điện thoại", chỉ sử dụng số điện thoại, không sử dụng email.

YÊU CẦU BẮT BUỘC:
- Trả về NGAY BẢNG MARKDOWN, KHÔNG viết bất kỳ lời giới thiệu nào.
- Ít nhất 8-10 test case.
- Cột: ID | Tên Test Case | Các Bước Thực Hiện | Kết Quả Mong Đợi
- Phải bao quát đầy đủ tất cả các thành phần trên giao diện.

Bắt đầu trực tiếp bằng bảng Markdown:`;

    try {
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            const message = data?.error?.message || `HTTP ${response.status} ${response.statusText}`;
            outputDiv.innerHTML = `<span style="color:red">Lỗi: ${message}</span>`;
            console.error('generateTestCase API error:', data);
        } else {
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
                || data?.candidates?.[0]?.content?.[0]?.text
                || data?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text;

            if (!text) {
                outputDiv.innerHTML = `<span style="color:red">Lỗi: Không nhận được nội dung test case từ API.</span>`;
                console.error('generateTestCase parse error:', data);
            } else {
                currentTestCase = text;
                outputDiv.innerHTML = (typeof marked !== "undefined" && marked.parse)
                    ? marked.parse(currentTestCase)
                    : `<pre style="white-space: pre-wrap; font-size:14px;">${currentTestCase}</pre>`;

                convertBtn.style.display = 'inline-block';
            }
        }
    } catch (error) {
        outputDiv.innerHTML = `<span style="color:red">Lỗi kết nối: ${error.message}</span>`;
    } finally {
        btn.disabled = false;
        status.innerText = "";
    }
}

// ==================== CHUYỂN ĐỔI SANG SELENIUM ====================
// ==================== CHUYỂN ĐỔI SANG SELENIUM ====================
// ==================== CHUYỂN ĐỔI SANG SELENIUM (ĐÃ SỬA) ====================
async function convertToSelenium() {
    if (!currentTestCase) {
        alert("Vui lòng tạo Test Case trước!");
        return;
    }

    const baseUrl = document.getElementById('urlInput').value || 'https://hasaki.vn';
    const convertBtn = document.getElementById('convertToSeleniumBtn');
    const seleniumOutputDiv = document.getElementById('seleniumOutput');
    const seleniumStatus = document.getElementById('seleniumStatus');

    convertBtn.disabled = true;
    seleniumStatus.innerText = "Đang tạo Selenium Script...";
    seleniumOutputDiv.style.display = 'block';
    seleniumOutputDiv.innerHTML = "<p style='color:orange'>Đang xử lý và parse JSON...</p>";

    const combinedHTML = await fetchMultipleHTML(baseUrl);

    const prompt = `Bạn là chuyên gia Selenium IDE cho Hasaki.vn.

HTML thực tế: ${combinedHTML}

Test Case: ${currentTestCase}

YÊU CẦU RẤT NGHIÊM NGẶT:
- Tạo đầy đủ các command Selenium để thực hiện các test case.
- CHỈ dùng các lệnh hợp lệ của Selenium IDE: open, click, type, pause, verifyText, verifyElementPresent, waitForElementPresent
- KHÔNG được dùng: setWindowSize, waitForURL, assertTitle, hay bất kỳ lệnh không tồn tại
- Nếu cần chờ URL thay đổi, dùng pause(2000) hoặc waitForElementPresent
- Locator chính:
  - Email/SĐT: xpath=//input[@placeholder="Nhập email hoặc số điện thoại"]
  - Password: xpath=//input[@placeholder="Nhập password"]
  - Nút Facebook: xpath=//button[contains(text(),"Facebook")]
  - Nút Google: xpath=//button[contains(text(),"Đăng nhập bằng Google")]
  - Nút Đăng nhập: xpath=//button[contains(text(),"Đăng nhập")]

Chỉ trả về **DUY NHẤT** một mảng JSON hợp lệ, không thêm bất kỳ chữ nào khác trước hoặc sau mảng:

[
  {"command": "open", "target": "/customer/account/login", "value": "", "description": "Mở trang đăng nhập"},
  ...
]`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            const message = data?.error?.message || `HTTP ${response.status} ${response.statusText}`;
            seleniumOutputDiv.innerHTML = `<span style="color:red">Lỗi API: ${message}</span>`;
            console.error('convertToSelenium API error:', data);
            return;
        }

        let resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text
            || data?.candidates?.[0]?.content?.[0]?.text
            || data?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text
            || '';
        console.log("Raw response:", resultText);   // Debug

        // Lấy phần JSON
        let start = resultText.indexOf('[');
        let end = resultText.lastIndexOf(']') + 1;

        if (start === -1 || end <= start) {
            seleniumOutputDiv.innerHTML = `<span style="color:red">Gemini không trả về JSON hợp lệ.</span>`;
            console.log("Không tìm thấy JSON");
            return;
        }

        resultText = resultText.substring(start, end);
        resultText = resultText.replace(/,\s*([\]}])/g, '$1'); // Fix trailing comma

        const parsedCommands = JSON.parse(resultText);
        const commands = parsedCommands.map(cmd => {
            const command = (cmd.command || '').trim();
            if (command === 'type' || command === 'sendKeys') {
                const xpath = (cmd.target || '').replace(/^xpath=/, '');
                return {
                    ...cmd,
                    command: 'execute script',
                    target: `document.evaluate(${JSON.stringify(xpath)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.value = ${JSON.stringify(cmd.value || '')};`,
                    value: ''
                };
            }
            return cmd;
        });

        currentSeleniumCommands = commands;

        // Hiển thị bảng
        let tableHTML = `<table border="1" style="width:100%; border-collapse:collapse; margin-top:10px;">
            <tr><th>Command</th><th>Target</th><th>Value</th><th>Description</th></tr>`;

        commands.forEach(cmd => {
            tableHTML += `<tr>
                <td>${cmd.command || ''}</td>
                <td style="word-break:break-all;">${cmd.target || ''}</td>
                <td>${cmd.value || ''}</td>
                <td>${cmd.description || ''}</td>
            </tr>`;
        });

        tableHTML += `</table>`;
        seleniumOutputDiv.innerHTML = tableHTML;

        if (document.getElementById('downloadSideBtn')) {
            document.getElementById('downloadSideBtn').style.display = 'inline-block';
        }

    } catch (error) {
        console.error(error);
        seleniumOutputDiv.innerHTML = `<span style="color:red">Lỗi: ${error.message}</span>`;
    } finally {
        convertBtn.disabled = false;
        seleniumStatus.innerText = "";
    }
}

// ==================== DOWNLOAD .SIDE ====================
function downloadSideFile() {
    if (!currentSeleniumCommands || currentSeleniumCommands.length === 0) {
        alert("Vui lòng tạo Selenium commands trước khi lưu file.");
        return;
    }

    const baseUrl = document.getElementById('urlInput').value || 'https://hasaki.vn';
    const testId = generateUUID();
    const suiteId = generateUUID();
    const projectId = generateUUID();
    const fileName = 'hasaki-test.side';

    const sideData = {
        id: projectId,
        version: '3.17.0',
        name: 'Hasaki Test',
        url: baseUrl,
        tests: [
            {
                id: testId,
                name: 'Generated Test',
                commands: currentSeleniumCommands.map(cmd => {
                    const command = (cmd.command || '').trim();
                    if (command === 'type' || command === 'sendKeys') {
                        const xpath = (cmd.target || '').replace(/^xpath=/, '');
                        return {
                            id: generateUUID(),
                            comment: '',
                            command: 'execute script',
                            target: `document.evaluate(${JSON.stringify(xpath)}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.value = ${JSON.stringify(cmd.value || '')};`,
                            value: ''
                        };
                    }
                    return {
                        id: generateUUID(),
                        comment: '',
                        command,
                        target: cmd.target || '',
                        value: cmd.value || ''
                    };
                })
            }
        ],
        suites: [
            {
                id: suiteId,
                name: 'Default Suite',
                tests: [
                    {
                        id: testId,
                        name: 'Generated Test'
                    }
                ]
            }
        ],
        urls: [baseUrl],
        plugins: []
    };

    const blob = new Blob([JSON.stringify(sideData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

window.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const convertBtn = document.getElementById('convertToSeleniumBtn');
    const downloadBtn = document.getElementById('downloadSideBtn');

    if (generateBtn) {
        generateBtn.addEventListener('click', generateTestCase);
    }
    if (convertBtn) {
        convertBtn.addEventListener('click', convertToSelenium);
    }
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadSideFile);
    }
    window.downloadSideFile = downloadSideFile;
});
