const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets', 'images');

// Tạo thư mục assets/images nếu chưa tồn tại
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
  console.log('Đã tạo thư mục assets/images');
}

const sourceDir = 'C:\\Users\\HuyHoang\\.gemini\\antigravity-ide\\brain\\c023fad0-1666-40e8-9952-3f13d6adc420';
const iconSource = path.join(sourceDir, 'icon_1780499308483.png');
const splashSource = path.join(sourceDir, 'splash_1780499325099.png');
const logoSource = path.join(sourceDir, 'media__1780587915435.png');

const targets = {
  'icon.png': iconSource,
  'adaptive-icon.png': iconSource,
  'favicon.png': iconSource,
  'notification-icon.png': iconSource,
  'splash.png': splashSource,
  'logo.png': logoSource
};

Object.entries(targets).forEach(([filename, sourcePath]) => {
  const destPath = path.join(assetsDir, filename);
  try {
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Đã sao chép thành công: ${filename}`);
    } else {
      console.warn(`Không tìm thấy file nguồn: ${sourcePath}. Sẽ tạo file trống để tránh lỗi nếu là file cũ.`);
      if (!fs.existsSync(destPath)) {
        fs.writeFileSync(destPath, ''); 
      }
    }
  } catch (err) {
    console.error(`Lỗi khi sao chép ${filename}:`, err);
  }
});

console.log('Hoàn thành cấu hình assets!');
