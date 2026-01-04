// 药品索引系统 - 主程序

// 用户凭证配置
const CREDENTIALS = {
    pharmacist: {
        username: 'pharmacist',
        password: 'pharma2024',
        role: 'pharmacist'
    },
    nurse: {
        username: 'nurse',
        password: 'nurse2024',
        role: 'nurse'
    }
};

// 使用 localStorage 作为本地存储
const STORAGE_KEY = 'medicineDatabase';

// 当前登录状态
let currentUser = null;
let selectedRole = 'pharmacist';

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // 检查是否已登录
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showPanel(currentUser.role);
    } else {
        showLoginPage();
    }

    // 角色选择按钮
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedRole = this.dataset.role;
        });
    });

    // 登录表单
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // 药师端上传表单
    document.getElementById('uploadForm').addEventListener('submit', handleUpload);

    // 图片预览
    document.getElementById('medicineImage').addEventListener('change', handleImagePreview);

    // 护士端搜索
    document.getElementById('searchInput').addEventListener('input', searchMedicine);
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchMedicine();
        }
    });
}

// 显示登录页面
function showLoginPage() {
    document.getElementById('loginPage').style.display = 'block';
    document.getElementById('pharmacistPanel').style.display = 'none';
    document.getElementById('nursePanel').style.display = 'none';
}

// 处理登录
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('loginError');

    // 验证凭证
    const credential = CREDENTIALS[selectedRole];
    
    if (username === credential.username && password === credential.password) {
        currentUser = {
            username: username,
            role: selectedRole
        };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        errorMsg.style.display = 'none';
        showPanel(selectedRole);
    } else {
        errorMsg.textContent = '用户名或密码错误！';
        errorMsg.style.display = 'block';
    }
}

// 显示对应面板
function showPanel(role) {
    document.getElementById('loginPage').style.display = 'none';
    
    if (role === 'pharmacist') {
        document.getElementById('pharmacistPanel').style.display = 'block';
        document.getElementById('nursePanel').style.display = 'none';
        loadMedicineList();
    } else {
        document.getElementById('pharmacistPanel').style.display = 'none';
        document.getElementById('nursePanel').style.display = 'block';
        loadNurseView();
    }
}

// 退出登录
function logout() {
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    document.getElementById('loginForm').reset();
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    showLoginPage();
}

// 图片预览
function handleImagePreview(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('imagePreview');
    const fileName = document.getElementById('fileName');
    
    if (file) {
        fileName.textContent = file.name;
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// 处理药品上传
function handleUpload(e) {
    e.preventDefault();
    
    const name = document.getElementById('medicineName').value.trim();
    const imageFile = document.getElementById('medicineImage').files[0];
    
    if (!name || !imageFile) {
        alert('请填写完整信息！');
        return;
    }

    // 读取图片并转换为 Base64
    const reader = new FileReader();
    reader.onload = function(e) {
        const medicine = {
            id: Date.now(),
            name: name,
            image: e.target.result,
            uploadDate: new Date().toISOString()
        };

        // 保存到数据库
        saveMedicine(medicine);

        // 重置表单
        document.getElementById('uploadForm').reset();
        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('fileName').textContent = '';

        // 刷新列表
        loadMedicineList();

        alert('药品添加成功！');
    };
    reader.readAsDataURL(imageFile);
}

// 保存药品到数据库
function saveMedicine(medicine) {
    const medicines = getMedicines();
    medicines.push(medicine);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
}

// 获取所有药品
function getMedicines() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

// 删除药品
function deleteMedicine(id) {
    if (confirm('确定要删除这个药品吗？')) {
        let medicines = getMedicines();
        medicines = medicines.filter(m => m.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
        loadMedicineList();
    }
}

// 加载药品列表（药师端）
function loadMedicineList() {
    const medicines = getMedicines();
    const container = document.getElementById('medicineList');
    const countElement = document.getElementById('medicineCount');
    
    countElement.textContent = medicines.length;
    
    if (medicines.length === 0) {
        container.innerHTML = '<div class="no-results">暂无药品数据，请添加药品</div>';
        return;
    }

    container.innerHTML = medicines.map(medicine => `
        <div class="medicine-card">
            <img src="${medicine.image}" alt="${medicine.name}" class="medicine-image">
            <div class="medicine-info">
                <div class="medicine-name">${medicine.name}</div>
                <div style="font-size: 12px; color: #999; margin-top: 5px;">
                    添加时间: ${new Date(medicine.uploadDate).toLocaleDateString('zh-CN')}
                </div>
                <div class="medicine-actions">
                    <button class="delete-btn" onclick="deleteMedicine(${medicine.id})">删除</button>
                </div>
            </div>
        </div>
    `).join('');
}

// 加载护士端视图
function loadNurseView() {
    searchMedicine();
}

// 搜索药品
function searchMedicine() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const medicines = getMedicines();
    const container = document.getElementById('nurseSearchResults');
    
    let filteredMedicines = medicines;
    
    if (searchTerm) {
        filteredMedicines = medicines.filter(m => 
            m.name.toLowerCase().includes(searchTerm)
        );
    }

    if (filteredMedicines.length === 0) {
        container.innerHTML = '<div class="no-results">😔 未找到相关药品</div>';
        return;
    }

    container.innerHTML = filteredMedicines.map(medicine => `
        <div class="medicine-card">
            <img src="${medicine.image}" alt="${medicine.name}" class="medicine-image">
            <div class="medicine-info">
                <div class="medicine-name">${medicine.name}</div>
                <div style="font-size: 12px; color: #999; margin-top: 5px;">
                    添加时间: ${new Date(medicine.uploadDate).toLocaleDateString('zh-CN')}
                </div>
            </div>
        </div>
    `).join('');
}
