const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const dynamoService = require('../services/dynamoService');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

// ─── PROJECTS ─────────────────────────────────────────────────────────────────

// GET /api/admin/projects — Listar todos los proyectos
router.get('/projects', async (req, res) => {
  try {
    const projects = await dynamoService.getAllProjects();
    res.json({ success: true, data: projects });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/admin/projects/:id — Obtener un proyecto
router.get('/projects/:id', async (req, res) => {
  try {
    const project = await dynamoService.getProject(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: 'Proyecto no encontrado' });
    res.json({ success: true, data: project });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT /api/admin/projects/:id — Crear o actualizar proyecto
// :id = valor de bld_cliente_padre en Zammad (ej. "5")
router.put('/projects/:id',
  param('id').notEmpty().withMessage('id es requerido'),
  body('empresa').notEmpty().withMessage('empresa es requerido'),
  body('calendar_type').isIn(['laboral', 'continuo', '24x7']).withMessage('calendar_type debe ser laboral, continuo o 24x7'),
  validate,
  async (req, res) => {
    try {
      const project = {
        id: req.params.id,
        empresa: req.body.empresa,
        calendar_type: req.body.calendar_type,
        active: req.body.active !== false,
        ...(req.body.sla_targets && { sla_targets: req.body.sla_targets })
      };
      const result = await dynamoService.putProject(project);
      res.json({ success: true, data: result });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
);

// DELETE /api/admin/projects/:id — Eliminar proyecto
router.delete('/projects/:id', async (req, res) => {
  try {
    await dynamoService.deleteProject(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── TEAMS ────────────────────────────────────────────────────────────────────

// GET /api/admin/teams — Listar todos los equipos
router.get('/teams', async (req, res) => {
  try {
    const teams = await dynamoService.getAllTeams();
    res.json({ success: true, data: teams });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/admin/teams/:id — Obtener un equipo
router.get('/teams/:id', async (req, res) => {
  try {
    const team = await dynamoService.getTeam(req.params.id);
    if (!team) return res.status(404).json({ success: false, error: 'Equipo no encontrado' });
    res.json({ success: true, data: team });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT /api/admin/teams/:id — Crear o actualizar equipo
// :id = slug único del equipo (ej. "soporte-n1", "cloud")
router.put('/teams/:id',
  param('id').notEmpty().withMessage('id es requerido'),
  body('name').notEmpty().withMessage('name es requerido'),
  body('agent_ids').isArray().withMessage('agent_ids debe ser un array de IDs numéricos'),
  validate,
  async (req, res) => {
    try {
      const team = {
        id: req.params.id,
        name: req.body.name,
        agent_ids: req.body.agent_ids,
        active: req.body.active !== false
      };
      const result = await dynamoService.putTeam(team);
      res.json({ success: true, data: result });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
);

// DELETE /api/admin/teams/:id — Eliminar equipo
router.delete('/teams/:id', async (req, res) => {
  try {
    await dynamoService.deleteTeam(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
