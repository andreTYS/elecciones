import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { nivel } from '../utils/roles';

/**
 * Devuelve los IDs de todos los subordinados (recursivo) de un usuario.
 * SUPER_ADMIN ve a todos.
 */
export async function getSubtreeIds(userId: number, includeSelf = true): Promise<number[]> {
  const ids: number[] = includeSelf ? [userId] : [];
  let frontier = [userId];
  while (frontier.length > 0) {
    const children = await prisma.user.findMany({
      where: { supervisorId: { in: frontier } },
      select: { id: true },
    });
    frontier = children.map((c) => c.id);
    ids.push(...frontier);
  }
  return ids;
}

/**
 * Verifica que el usuario objetivo (param :id) este dentro de la jerarquia
 * del solicitante y en un nivel inferior. SUPER_ADMIN pasa siempre.
 */
export function requireTargetInSubtree(param = 'id') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const me = req.user!;
    const targetId = Number(req.params[param]);
    if (!Number.isInteger(targetId)) return res.status(400).json({ error: 'ID inválido' });

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (me.rol !== 'SUPER_ADMIN') {
      if (nivel(target.rol) >= nivel(me.rol)) {
        return res.status(403).json({ error: 'No puedes gestionar usuarios de nivel igual o superior' });
      }
      const subtree = await getSubtreeIds(me.id, false);
      if (!subtree.includes(targetId)) {
        return res.status(403).json({ error: 'Usuario fuera de tu jerarquía' });
      }
    }
    (req as Request & { targetUser?: typeof target }).targetUser = target;
    return next();
  };
}
