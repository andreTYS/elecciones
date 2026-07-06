import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/auth';
import { requireRole } from '../../middlewares/rbac';
import { geminiKeyLimiter } from '../../middlewares/rateLimiter';
import { setGeminiKey, hasGeminiKey, deleteGeminiKey } from '../../services/gemini.service';
import { audit } from '../../utils/audit';

// SOLO Admin Super puede ingresar, ver (existencia) o modificar la API Key de Gemini
const router = Router();
router.use(authenticate, requireRole(['SUPER_ADMIN']));

// GET /api/config/gemini-key → nunca devuelve la key, solo si existe
router.get('/gemini-key', async (_req: Request, res: Response) => {
  return res.json({ hasKey: await hasGeminiKey() });
});

// POST /api/config/gemini-key
router.post('/gemini-key', geminiKeyLimiter, async (req: Request, res: Response) => {
  const { apiKey } = z.object({ apiKey: z.string().min(20) }).parse(req.body);
  await setGeminiKey(apiKey);
  await audit({ userId: req.user!.id, accion: 'SET_GEMINI_KEY', entidad: 'ConfigSistema', ip: req.ip });
  return res.json({ success: true });
});

// DELETE /api/config/gemini-key
router.delete('/gemini-key', geminiKeyLimiter, async (req: Request, res: Response) => {
  await deleteGeminiKey();
  await audit({ userId: req.user!.id, accion: 'DELETE_GEMINI_KEY', entidad: 'ConfigSistema', ip: req.ip });
  return res.json({ success: true });
});

export default router;
