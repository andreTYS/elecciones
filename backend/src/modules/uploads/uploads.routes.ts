import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { env } from '../../config/env';
import { authenticate } from '../../middlewares/auth';

const router = Router();
router.use(authenticate);

// GET /api/uploads/actas/:uuid → servir imagenes de actas (solo autenticados)
router.get('/actas/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename;
  if (!/^[0-9a-f-]{36}\.(jpg|png)$/i.test(filename)) {
    return res.status(400).json({ error: 'Nombre de archivo inválido' });
  }
  const filePath = path.resolve(env.UPLOAD_DIR, 'actas', filename);
  if (!filePath.startsWith(path.resolve(env.UPLOAD_DIR)) || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }
  return res.sendFile(filePath);
});

export default router;
