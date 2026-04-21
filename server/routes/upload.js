const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path'); // 这里补上！

const router = express.Router();

// 静态资源访问（让图片可以通过 URL 访问）
router.use('/uploads', express.static('uploads'));
router.use(cors()); // 解决跨域

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // 图片保存到 uploads 文件夹
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

// 文件大小限制 5MB
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  // 只允许图片
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif') {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG/PNG/GIF 格式图片'));
    }
  },
});

// 图片上传接口（WangEditor 专用）
router.post('/upload/image', upload.single('file'), (req, res) => {
  // 返回 WangEditor 需要的格式
  res.json({
    code: 0, // 必须 0，表示成功
    data: {
      url: `http://localhost:3000/api/${req.file.path}`, // 图片可访问地址
    },
    msg: '上传成功',
  });
});

module.exports = router;