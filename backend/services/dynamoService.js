const { dynamodb, TABLES } = require('../config/dynamodb');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// ─── Cache en memoria ─────────────────────────────────────────────────────────
let _projectsCache = null;
let _projectsExpiry = 0;
let _teamsCache = null;
let _teamsExpiry = 0;

function _invalidateProjects() { _projectsCache = null; }
function _invalidateTeams() { _teamsCache = null; }

// ─── PROJECTS ─────────────────────────────────────────────────────────────────

async function getAllProjects() {
  if (_projectsCache && Date.now() < _projectsExpiry) return _projectsCache;

  const result = await dynamodb.scan({ TableName: TABLES.PROJECTS }).promise();
  _projectsCache = result.Items || [];
  _projectsExpiry = Date.now() + CACHE_TTL_MS;
  return _projectsCache;
}

async function getProject(id) {
  const result = await dynamodb.get({
    TableName: TABLES.PROJECTS,
    Key: { id: id.toString() }
  }).promise();
  return result.Item || null;
}

/**
 * Crea o actualiza un proyecto.
 * @param {Object} project
 * @param {string} project.id           - ID del cliente padre (bld_cliente_padre)
 * @param {string} project.empresa      - Nombre de la empresa
 * @param {string} project.calendar_type - laboral | continuo | 24x7
 * @param {boolean} [project.active]
 * @param {Object} [project.sla_targets] - Targets SLA personalizados (opcional)
 */
async function putProject(project) {
  const item = { ...project, id: project.id.toString() };
  await dynamodb.put({ TableName: TABLES.PROJECTS, Item: item }).promise();
  _invalidateProjects();
  return item;
}

async function deleteProject(id) {
  await dynamodb.delete({
    TableName: TABLES.PROJECTS,
    Key: { id: id.toString() }
  }).promise();
  _invalidateProjects();
}

/**
 * Devuelve un mapa de id → project para búsquedas O(1) por bld_cliente_padre.
 */
async function getProjectsMap() {
  const projects = await getAllProjects();
  return Object.fromEntries(projects.map(p => [p.id, p]));
}

// ─── TEAMS ────────────────────────────────────────────────────────────────────

async function getAllTeams() {
  if (_teamsCache && Date.now() < _teamsExpiry) return _teamsCache;

  const result = await dynamodb.scan({ TableName: TABLES.TEAMS }).promise();
  _teamsCache = result.Items || [];
  _teamsExpiry = Date.now() + CACHE_TTL_MS;
  return _teamsCache;
}

async function getTeam(id) {
  const result = await dynamodb.get({
    TableName: TABLES.TEAMS,
    Key: { id }
  }).promise();
  return result.Item || null;
}

/**
 * Crea o actualiza un equipo.
 * @param {Object} team
 * @param {string} team.id        - Identificador único del equipo (ej. "soporte-n1")
 * @param {string} team.name      - Nombre del equipo
 * @param {number[]} team.agent_ids - IDs de agentes Zammad que pertenecen al equipo
 * @param {boolean} [team.active]
 */
async function putTeam(team) {
  await dynamodb.put({ TableName: TABLES.TEAMS, Item: team }).promise();
  _invalidateTeams();
  return team;
}

async function deleteTeam(id) {
  await dynamodb.delete({
    TableName: TABLES.TEAMS,
    Key: { id }
  }).promise();
  _invalidateTeams();
}

/**
 * Devuelve un mapa de agentId (Number) → team para búsquedas O(1).
 */
async function getAgentTeamMap() {
  const teams = await getAllTeams();
  const map = {};
  for (const team of teams) {
    if (team.active === false) continue;
    for (const agentId of (team.agent_ids || [])) {
      map[agentId] = { id: team.id, name: team.name };
    }
  }
  return map;
}

module.exports = {
  getAllProjects,
  getProject,
  putProject,
  deleteProject,
  getProjectsMap,
  getAllTeams,
  getTeam,
  putTeam,
  deleteTeam,
  getAgentTeamMap
};
