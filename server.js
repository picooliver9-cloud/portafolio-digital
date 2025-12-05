const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const pdf = require('pdf-parse');

const app = express();
const PORT = 3000;

// Configurar CORS para permitir acceso desde cualquier sitio
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Crear carpetas necesarias
const uploadsDir = path.join(__dirname, 'uploads');
const thumbnailsDir = path.join(__dirname, 'public', 'thumbnails');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(thumbnailsDir)) fs.mkdirSync(thumbnailsDir, { recursive: true });

// Configurar almacenamiento de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueName + ext);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Aceptar solo PDFs
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  }
});

// Ruta para subir archivos
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const section = req.body.section;
    const filename = req.file.filename;
    const originalname = req.file.originalname;
    
    // Aquí normalmente guardarías en una base de datos
    // Por simplicidad, guardamos en un archivo JSON
    const fileData = {
      id: filename,
      name: originalname,
      section: section,
      date: new Date().toISOString(),
      path: `/uploads/${filename}`,
      thumbnail: `/thumbnails/${filename}.jpg`
    };
    
    // Guardar en archivo JSON
    let files = [];
    if (fs.existsSync('files.json')) {
      files = JSON.parse(fs.readFileSync('files.json', 'utf8'));
    }
    files.push(fileData);
    fs.writeFileSync('files.json', JSON.stringify(files, null, 2));
    
    res.json({
      success: true,
      message: 'Archivo subido correctamente',
      file: fileData
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para obtener archivos por sección
app.get('/files/:section', (req, res) => {
  try {
    const section = req.params.section;
    
    if (!fs.existsSync('files.json')) {
      return res.json({ files: [] });
    }
    
    const allFiles = JSON.parse(fs.readFileSync('files.json', 'utf8'));
    const sectionFiles = allFiles.filter(file => file.section === section);
    
    res.json({ files: sectionFiles });
  } catch (error) {
    res.json({ files: [] });
  }
});

// Servir archivos subidos
app.use('/uploads', express.static(uploadsDir));

// Ruta principal para servir el HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en: http://localhost:${PORT}`);
  console.log(`📁 Sube tus PDFs desde: http://localhost:${PORT}`);
  console.log(`🔗 Comparte este link con tu ingeniero`);
});