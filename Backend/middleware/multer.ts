import multer, { StorageEngine } from "multer";

// Configure storage for file uploads
const storage: StorageEngine = multer.diskStorage({
  // Keep original file name
  filename: (req, file, callback) => {
    callback(null, file.originalname);
  },
});

// Initialize multer with storage configuration
const upload = multer({ storage });

export default upload;