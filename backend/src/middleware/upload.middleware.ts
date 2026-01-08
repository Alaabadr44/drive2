import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directory exists
const uploadDir = 'public/uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'public/uploads/';
        if (file.fieldname === 'logo') {
            folder += 'restaurants';
        } else if (file.fieldname === 'image') {
            folder += 'menus'; // Wait, should we organize menus better? User seed puts them in restaurants.
            // But manual uploads can go to 'menus' or 'restaurants'. Let's stick to existing logic but in public.
            // Actually, seed uses 'restaurants'. Multer separates 'menus'.
            // Let's keep separation if that's intended, but ensure it's in public/uploads/menus
        }

        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed!'), false);
    }
};

export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});
