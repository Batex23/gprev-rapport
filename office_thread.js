// SPDX-License-Identifier: MIT
// Partie « LibreOffice » du widget Rapport. Ce script tourne dans le thread de ZetaOffice
// et pilote Writer via l'API UNO. Il reçoit des commandes de la page (index.html).
'use strict';
let zetajs, css, ctx, desktop, xModel = null, repaired = false;

const prop = (Name, Value) => new css.beans.PropertyValue({ Name, Value });
const reply = (d, extra) => zetajs.mainPort.postMessage({ cmd: 'ok', id: d.id, ...extra });

function setUser(prenom, nom) {
  const cp = zetajs.fromAny(ctx.getValueByName('/singletons/com.sun.star.configuration.theDefaultProvider'));
  const acc = cp.createInstanceWithArguments('com.sun.star.configuration.ConfigurationUpdateAccess',
    [prop('nodepath', '/org.openoffice.UserProfile/Data')]);
  acc.replaceByName('givenname', prenom || '');
  acc.replaceByName('sn', nom || '');
  acc.commitChanges();
}

function closeDoc() {
  if (!xModel) return;
  try { xModel.setModified(false); } catch (e) {}
  try { xModel.close(true); } catch (e) { try { xModel.dispose(); } catch (e2) {} }
  xModel = null;
}

function open(d) {
  closeDoc();
  const args = [prop('ReadOnly', !!d.readOnly)];
  xModel = desktop.loadComponentFromURL('file://' + d.path, '_default', 0, args);
  repaired = false;
  if (!xModel) {
    // Fichier endommagé (archive .odt mal fermée…) : LibreOffice tente de le réparer.
    xModel = desktop.loadComponentFromURL('file://' + d.path, '_default', 0, args.concat([prop('RepairPackage', true)]));
    repaired = !!xModel;
  }
  if (!xModel) throw new Error('LibreOffice n’a pas pu lire ce fichier, même en mode réparation. Ouvrez-le dans OpenOffice, faites « Enregistrer sous… » au format .odt, puis importez le nouveau fichier.');
  const frame = xModel.getCurrentController().getFrame();
  frame.getContainerWindow().FullScreen = true;
  const disp = css.frame.DispatchHelper.create(ctx);
  if (d.compareWith) {
    // Affiche les différences entre ce document et une autre version (outil Comparer de Writer).
    disp.executeDispatch(frame, '.uno:CompareDocuments', '', 0,
      [prop('URL', 'file://' + d.compareWith), prop('NoAcceptDialog', true)]);
  }
  // Les modèles Prevarisc masquent les modifications suivies (ShowRedlineChanges=false) : on les affiche.
  try { disp.executeDispatch(frame, '.uno:ShowTrackedChanges', '', 0, [prop('ShowTrackedChanges', true)]); } catch (e) {}
  try { xModel.setModified(false); } catch (e) {}
  if (!d.readOnly && d.track) xModel.setPropertyValue('RecordChanges', true);
}

// Liste des commentaires (notes de marge) présents dans le document.
function annotations() {
  const out = [];
  if (!xModel) return out;
  const en = xModel.getTextFields().createEnumeration();
  while (en.hasMoreElements()) {
    const f = zetajs.fromAny(en.nextElement());
    if (!f.supportsService('com.sun.star.text.textfield.Annotation')) continue;
    let date = '';
    try {
      const t = f.getPropertyValue('DateTimeValue');
      if (t && t.Year) date = new Date(Date.UTC(t.Year, t.Month - 1, t.Day, t.Hours, t.Minutes, t.Seconds)).toISOString();
    } catch (e) {}
    let extrait = '';
    try { extrait = String(f.getAnchor().getString() || ''); } catch (e) {}
    let parent = '';
    try { parent = String(f.getPropertyValue('ParentName') || ''); } catch (e) {}
    out.push({
      name: String(f.getPropertyValue('Name') || ''),
      parent,
      auteur: String(f.getPropertyValue('Author') || ''),
      texte: String(f.getPropertyValue('Content') || ''),
      resolu: !!f.getPropertyValue('Resolved'),
      date,
      extrait: extrait.slice(0, 300),
    });
  }
  return out;
}

function nbModifsSuivies() {
  if (!xModel) return 0;
  let n = 0;
  try { const en = zetajs.fromAny(xModel.getRedlines()).createEnumeration(); while (en.hasMoreElements()) { en.nextElement(); n++; } } catch (e) {}
  return n;
}

function handle(d) {
  switch (d.cmd) {
    case 'user': setUser(d.prenom, d.nom); return reply(d);
    case 'open': open(d); return reply(d, { repaired });
    case 'close': closeDoc(); return reply(d);
    case 'modified': return reply(d, { modified: !!(xModel && xModel.isModified()) });
    case 'track':
      if (xModel) xModel.setPropertyValue('RecordChanges', !!d.on);
      return reply(d, { on: !!(xModel && xModel.getPropertyValue('RecordChanges')) });
    case 'save':
      xModel.storeToURL('file://' + d.path, [prop('FilterName', 'writer8'), prop('Overwrite', true)]);
      xModel.setModified(false);
      return reply(d, { annotations: annotations(), redlines: nbModifsSuivies() });
    case 'pdf':
      xModel.storeToURL('file://' + d.path, [prop('FilterName', 'writer_pdf_Export'), prop('Overwrite', true)]);
      return reply(d);
    case 'annotations': return reply(d, { annotations: annotations() });
    default: throw new Error('Commande inconnue : ' + d.cmd);
  }
}

Module.zetajs.then((z) => {
  zetajs = z;
  css = z.uno.com.sun.star;
  ctx = z.getUnoComponentContext();
  desktop = css.frame.Desktop.create(ctx);
  zetajs.mainPort.onmessage = (e) => {
    try { handle(e.data); }
    catch (err) { zetajs.mainPort.postMessage({ cmd: 'error', id: e.data.id, message: String((err && err.message) || err) }); }
  };
  zetajs.mainPort.postMessage({ cmd: 'ready' });
});
