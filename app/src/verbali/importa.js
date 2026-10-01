'use strict';
// Importazione una tantum dal vecchio Verbale Studio locale (cartella con data\, Archivio\, Registrazioni\).
// COPIA tutto nelle cartelle dei progetti del portale: la cartella di origine non viene toccata.
// Si puo' rilanciare: i checkpoint gia' importati vengono saltati.
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const config = require('../config');
const db = require('../db');
const ex = require('../explorer');
const projects = require('../routes/projects');
const A = require('./archivio');
const { HttpError } = require('../http');

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

function findWorkDir(dir) {
  const abs = path.resolve(String(dir || '').trim().replace(/^"|"$/g, ''));
  if (fs.existsSync(path.join(abs, 'data', 'projects'))) return abs;
  if (path.basename(abs).toLowerCase() === 'data' && fs.existsSync(path.join(abs, 'projects'))) return path.dirname(abs);
  throw new HttpError(400, `In "${abs}" non trovo la cartella data\\projects del vecchio Verbale Studio. Indica la cartella che contiene data, Archivio e Registrazioni.`);
}

// Percorso relativo alla vecchia cartella di lavoro, senza uscirne.
function inside(workDir, rel) {
  if (!rel) return null;
  const abs = path.resolve(workDir, String(rel));
  return abs === workDir || abs.startsWith(workDir + path.sep) ? abs : null;
}

async function copyFile(src, dest, report) {
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  await fsp.copyFile(src, dest);
  report.copiedBytes += fs.statSync(dest).size;
}

function portalProjectFor(oldProject, user, report, dryRun) {
  const wanted = norm(oldProject.name);
  const hit = db.all('SELECT * FROM projects').find((p) => norm(p.name) === wanted || norm(p.folder) === wanted);
  if (hit) return { p: hit, created: false };
  if (dryRun) return { p: null, created: true };
  const folder = projects.folderName(oldProject.name);
  fs.mkdirSync(path.join(projects.baseDir(), folder), { recursive: true });
  const r = db.run('INSERT INTO projects(name, client, description, status, onedrive_url, folder, created_by, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?)',
    String(oldProject.name).slice(0, 80), '', String(oldProject.description || '').slice(0, 500), 'attivo', '', folder, user.id, db.now(), db.now());
  report.warnings.push(`Creato il progetto "${oldProject.name}" nel portale: aggiungi le persone che devono vederlo (menu Progetti → Modifica).`);
  return { p: db.get('SELECT * FROM projects WHERE id = ?', Number(r.lastInsertRowid)), created: true };
}

async function importa(dir, user, { dryRun = false } = {}) {
  const workDir = findWorkDir(dir);
  const dataDir = path.join(workDir, 'data');
  const report = { from: workDir, dryRun, projects: [], checkpoints: 0, skipped: 0, copiedBytes: 0, warnings: [] };

  // template, preimpostazioni e impostazioni personali
  for (const name of ['templates.json', 'presets.json']) {
    const old = A.readJson(path.join(dataDir, name), null);
    if (!Array.isArray(old) || !old.length) continue;
    const target = path.join(config.VERBALI_DIR, name);
    const current = A.readJson(target, []);
    const key = (t) => t.id || t.name || JSON.stringify(t);
    const known = new Set(current.map(key));
    const add = old.filter((t) => !known.has(key(t)));
    if (add.length && !dryRun) { await A.keepCopy(target); await A.writeJson(target, [...current, ...add]); }
    if (add.length) report.warnings.push(`${name === 'templates.json' ? 'Template' : 'Preimpostazioni'} importati: ${add.length}`);
  }
  const oldSettings = A.readJson(path.join(dataDir, 'settings.json'), {});
  const userFile = path.join(config.VERBALI_DIR, 'utenti', `${user.id}.json`);
  const mine = A.readJson(userFile, {});
  if (!dryRun && (oldSettings.author || oldSettings.ollamaModel)) {
    if (mine.author == null && oldSettings.author) mine.author = oldSettings.author;
    if (!mine.ollamaModel && oldSettings.ollamaModel) mine.ollamaModel = oldSettings.ollamaModel;
    await A.writeJson(userFile, mine);
  }
  if (oldSettings.apiKey) report.warnings.push('La chiave API di Claude del vecchio programma NON e\' stata importata: nel portale si usa solo l\'AI locale.');

  const projectsDir = path.join(dataDir, 'projects');
  for (const e of fs.readdirSync(projectsDir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const oldDir = path.join(projectsDir, e.name);
    const oldProject = A.readJson(path.join(oldDir, 'project.json'), null);
    if (!oldProject || !oldProject.name) continue;
    const { p, created } = portalProjectFor(oldProject, user, report, dryRun);
    const entry = { old: oldProject.name, portal: p ? p.name : `${oldProject.name} (da creare)`, created, checkpoints: 0, skipped: 0 };
    report.projects.push(entry);
    const oldCps = [];
    for (const c of fs.readdirSync(path.join(oldDir, 'checkpoints'), { withFileTypes: true }).filter((x) => x.isDirectory()).map((x) => x.name)) {
      const data = A.readJson(path.join(oldDir, 'checkpoints', c, 'checkpoint.json'), null);
      if (data && data.id) oldCps.push({ dir: path.join(oldDir, 'checkpoints', c), data });
    }
    if (dryRun || !p) { entry.checkpoints = oldCps.length; report.checkpoints += oldCps.length; continue; }

    const P = A.openProject(user, p.id);
    // impostazioni del progetto, apprendimento e previsione: solo se nel portale non ci sono gia'
    const projFile = path.join(P.dir, '.verbale-progetto.json');
    if (!fs.existsSync(projFile)) {
      const keep = {};
      for (const k of ['description', 'recipients', 'subjectTemplate', 'glossary', 'exampleEmail', 'templateId']) if (typeof oldProject[k] === 'string') keep[k] = oldProject[k];
      await A.writeJson(projFile, { ...keep, importedFrom: workDir, importedAt: db.now() });
    }
    for (const [from, to] of [['learning.json', A.learningFile(P)], ['forecast.json', A.forecastFile(P)]]) {
      if (fs.existsSync(path.join(oldDir, from)) && !fs.existsSync(to)) await copyFile(path.join(oldDir, from), to, report);
    }

    const already = new Set((await A.list(P)).map((c) => c.importedFrom).filter(Boolean));
    for (const { dir: oldCpDir, data } of oldCps) {
      const origin = `${e.name}/${data.id}`;
      if (already.has(origin)) { entry.skipped++; report.skipped++; continue; }
      const extra = {};
      for (const k of [...A.SAVE_FIELDS, 'createdAt', 'updatedAt']) if (k in data) extra[k] = data[k];
      extra.importedFrom = origin;
      extra.video = null;
      const c = await A.create(P, { date: data.date, title: data.title, templateId: data.templateId }, user, extra);
      const folderAbs = path.join(P.root, ...c.folder.split('/'));

      // file della vecchia cartella in Archivio (tranne la copia dei dati "_dati-app")
      const oldFolder = inside(workDir, data.folder);
      if (oldFolder && fs.existsSync(oldFolder)) {
        for (const f of fs.readdirSync(oldFolder, { withFileTypes: true })) {
          if (!f.isFile() || f.name.endsWith('.tmp') || f.name.endsWith('.upload')) continue;
          await copyFile(path.join(oldFolder, f.name), path.join(folderAbs, f.name), report);
        }
      }
      // video: dentro la cartella in Archivio, collegato da un'altra cartella (es. Registrazioni) o nei dati
      let video = null;
      const v = data.video || null;
      const vAbs = v && (v.external ? inside(workDir, v.external) : v.file ? path.join(oldCpDir, path.basename(v.file)) : null);
      if (vAbs && fs.existsSync(vAbs)) {
        const inFolder = oldFolder && path.dirname(vAbs) === oldFolder;
        const name = inFolder ? path.basename(vAbs) : `Registrazione${path.extname(vAbs).toLowerCase() || '.mp4'}`;
        if (!inFolder) await copyFile(vAbs, path.join(folderAbs, name), report);
        video = { file: name, copied: true, name: v.name || path.basename(vAbs), size: fs.statSync(path.join(folderAbs, name)).size, uploadedAt: v.uploadedAt || db.now(), source: v.source || v.external || '' };
      } else if (v) report.warnings.push(`${data.date} ${data.title}: video non trovato (${v.external || v.file || v.name}).`);
      // versioni precedenti del checkpoint
      const versDir = path.join(oldCpDir, 'versioni');
      if (fs.existsSync(versDir)) {
        for (const f of fs.readdirSync(versDir)) if (f.endsWith('.json')) await copyFile(path.join(versDir, f), path.join(folderAbs, A.META, 'versioni', f), report);
      }
      const json = A.readJson(A.dataFile(P, c.folder), null);
      json.video = video;
      const original = fs.readdirSync(folderAbs).find((n) => /^Transcript originale\./i.test(n));
      if (original) json.transcriptFile = original;
      await A.writeJson(A.dataFile(P, c.folder), json);
      A.indexRow(P, json, c.folder, user.id);
      entry.checkpoints++;
      report.checkpoints++;
    }
    ex.reindex(P.space, P.root);
  }
  return report;
}

module.exports = { importa, findWorkDir };
